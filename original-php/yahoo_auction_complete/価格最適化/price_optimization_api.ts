// ===============================================
// 価格最適化API - 基本エンドポイント実装
// app/api/price-optimization/ 配下に配置
// ===============================================

// ========== 1. 仕入値変更記録 API ==========
// app/api/price-optimization/cost-change/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CostChangeHistory } from '@/lib/types/price-optimization';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const { item_id, old_cost, new_cost, change_reason, change_source = 'manual' } = body;

    // バリデーション
    if (!item_id || old_cost === undefined || new_cost === undefined) {
      return NextResponse.json(
        { success: false, error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // 変動率計算
    const cost_change_percent = ((new_cost - old_cost) / old_cost) * 100;

    // 仕入値変動履歴に保存
    const { data: costChange, error: insertError } = await supabase
      .from('cost_change_history')
      .insert({
        item_id,
        old_cost,
        new_cost,
        cost_change_percent,
        change_reason,
        change_source,
        changed_at: new Date().toISOString(),
        requires_price_adjustment: Math.abs(cost_change_percent) > 5, // 5%以上変動で要調整
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 在庫テーブルも更新
    await supabase
      .from('inventory_management')
      .update({
        last_cost_update: new Date().toISOString(),
        cost_change_count: supabase.raw('cost_change_count + 1'),
      })
      .eq('item_id', item_id);

    // 価格調整が必要な場合、自動計算をトリガー
    if (Math.abs(cost_change_percent) > 5) {
      // TODO: 価格再計算APIを呼び出す
    }

    return NextResponse.json({
      success: true,
      data: {
        change_id: costChange.id,
        item_id,
        cost_difference: new_cost - old_cost,
        cost_change_percent,
        requires_adjustment: Math.abs(cost_change_percent) > 5,
      },
    });
  } catch (error: any) {
    console.error('Cost change record error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ========== 2. 価格調整キュー取得 API ==========
// app/api/price-optimization/queue/route.ts

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status') || 'pending_approval';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // キュー取得（ビューを使用）
    const { data: queue, error, count } = await supabase
      .from('v_pending_price_adjustments')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('is_red_risk', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        total: count || 0,
        items: queue || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Queue fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ========== 3. 価格調整承認 API ==========
// app/api/price-optimization/approve/route.ts

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const { adjustment_ids, approved_by, apply_immediately = false } = body;

    if (!adjustment_ids || !Array.isArray(adjustment_ids)) {
      return NextResponse.json(
        { success: false, error: '調整IDが不正です' },
        { status: 400 }
      );
    }

    const results = [];
    let approved_count = 0;
    let applied_count = 0;
    let failed_count = 0;

    for (const id of adjustment_ids) {
      try {
        // 調整キューを承認状態に更新
        const { data: adjustment, error: updateError } = await supabase
          .from('price_adjustment_queue')
          .update({
            status: apply_immediately ? 'approved' : 'approved',
            approved_by,
            approved_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        approved_count++;

        // 即時適用の場合、eBay APIを呼び出す
        if (apply_immediately) {
          // TODO: eBay Trading API統合
          // const ebayResult = await updateEbayPrice(adjustment.ebay_item_id, adjustment.proposed_price);
          
          // 成功したら履歴に記録
          await supabase.from('price_update_history').insert({
            item_id: adjustment.item_id,
            ebay_item_id: adjustment.ebay_item_id,
            adjustment_queue_id: id,
            old_price: adjustment.current_price,
            new_price: adjustment.proposed_price,
            price_change_percent: adjustment.price_change_percent,
            change_reason: adjustment.adjustment_reason,
            trigger_type: adjustment.trigger_type,
            success: true,
            updated_by: approved_by,
          });

          // キューのステータスを更新
          await supabase
            .from('price_adjustment_queue')
            .update({
              status: 'applied',
              applied_at: new Date().toISOString(),
            })
            .eq('id', id);

          applied_count++;
        }

        results.push({
          adjustment_id: id,
          item_id: adjustment.item_id,
          success: true,
          new_price: adjustment.proposed_price,
        });
      } catch (error: any) {
        failed_count++;
        results.push({
          adjustment_id: id,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        approved_count,
        applied_count,
        failed_count,
        results,
      },
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ========== 4. 価格再計算 API ==========
// app/api/price-optimization/recalculate/route.ts

import {
  calculateTotalCost,
  calculateOptimalPrice,
  checkRedRisk,
} from '@/lib/price-optimization/calculator';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const { item_id, new_cost, trigger = 'manual' } = body;

    // 商品情報取得
    const { data: item, error: itemError } = await supabase
      .from('inventory_management')
      .select('*')
      .eq('item_id', item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, error: '商品が見つかりません' },
        { status: 404 }
      );
    }

    // 自動価格設定取得
    const { data: settings } = await supabase
      .from('auto_pricing_settings')
      .select('*')
      .eq('item_id', item_id)
      .single();

    // デフォルト設定
    const pricingSettings = settings || {
      min_margin_percent: 20,
      min_profit_amount: 5,
      allow_loss: false,
      target_competitor_ratio: 0.9,
    };

    // 総コスト計算
    const totalCost = calculateTotalCost({
      purchaseCostJpy: new_cost || item.purchase_cost_jpy,
      domesticShippingJpy: item.domestic_shipping_jpy || 0,
      exchangeRate: item.exchange_rate || 150,
      internationalShippingUsd: item.international_shipping_usd || 30,
    });

    // 競合価格取得
    const { data: competitorPrices } = await supabase
      .from('v_latest_competitor_prices')
      .select('*')
      .eq('item_id', item_id);

    // 最適価格提案
    const proposal = calculateOptimalPrice({
      totalCost,
      settings: pricingSettings as any,
      competitorPrices: competitorPrices || [],
    });

    // 赤字リスクチェック
    const redRisk = checkRedRisk({
      proposedPrice: proposal.proposedPrice,
      totalCost,
      minMarginPercent: pricingSettings.min_margin_percent,
      minProfitAmount: pricingSettings.min_profit_amount,
      allowLoss: pricingSettings.allow_loss,
    });

    // 調整が必要な場合、キューに登録
    if (Math.abs(proposal.proposedPrice - item.current_price) > 1) {
      await supabase.from('price_adjustment_queue').insert({
        item_id,
        current_price: item.current_price,
        proposed_price: proposal.proposedPrice,
        price_change_percent: ((proposal.proposedPrice - item.current_price) / item.current_price) * 100,
        adjustment_reason: proposal.adjustmentReason,
        trigger_type: trigger,
        expected_margin: proposal.expectedMargin,
        expected_profit: proposal.expectedProfit,
        is_red_risk: redRisk.isRedRisk,
        risk_level: redRisk.isRedRisk ? 'high' : 'low',
        risk_reasons: redRisk.reasons,
        status: 'pending_approval',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        item_id,
        current_price: item.current_price,
        proposed_price: proposal.proposedPrice,
        expected_margin: proposal.expectedMargin,
        expected_profit: proposal.expectedProfit,
        is_red_risk: redRisk.isRedRisk,
        risk_reasons: redRisk.reasons,
        min_safe_price: redRisk.minSafePrice,
        adjustment_recommended: Math.abs(proposal.proposedPrice - item.current_price) > 1,
      },
    });
  } catch (error: any) {
    console.error('Recalculation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ========== 5. 自動価格設定 API ==========
// app/api/price-optimization/settings/route.ts

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;
    const item_id = searchParams.get('item_id');

    if (!item_id) {
      return NextResponse.json(
        { success: false, error: 'item_idが必要です' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('auto_pricing_settings')
      .select('*')
      .eq('item_id', item_id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found以外のエラー
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const { item_id, ...settings } = body;

    if (!item_id) {
      return NextResponse.json(
        { success: false, error: 'item_idが必要です' },
        { status: 400 }
      );
    }

    // Upsert（存在すれば更新、なければ挿入）
    const { data, error } = await supabase
      .from('auto_pricing_settings')
      .upsert(
        {
          item_id,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'item_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ========== 6. 統計ダッシュボード API ==========
// app/api/price-optimization/stats/route.ts

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // 統計データを並列取得
    const [
      totalItemsResult,
      autoPricingResult,
      pendingResult,
      redRiskResult,
      recentUpdatesResult,
    ] = await Promise.all([
      // 総商品数
      supabase.from('inventory_management').select('*', { count: 'exact', head: true }),
      
      // 自動価格調整有効数
      supabase
        .from('auto_pricing_settings')
        .select('*', { count: 'exact', head: true })
        .eq('auto_tracking_enabled', true),
      
      // 承認待ち数
      supabase
        .from('price_adjustment_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      
      // 赤字リスク数
      supabase
        .from('price_adjustment_queue')
        .select('*', { count: 'exact', head: true })
        .eq('is_red_risk', true)
        .eq('status', 'pending_approval'),
      
      // 直近の更新履歴
      supabase
        .from('price_update_history')
        .select('success')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
    ]);

    // 成功率計算
    const recentUpdates = recentUpdatesResult.data || [];
    const successRate = recentUpdates.length > 0
      ? (recentUpdates.filter(u => u.success).length / recentUpdates.length) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalItems: totalItemsResult.count || 0,
        autoPricingEnabled: autoPricingResult.count || 0,
        pendingAdjustments: pendingResult.count || 0,
        redRiskItems: redRiskResult.count || 0,
        successRate: parseFloat(successRate.toFixed(2)),
        recentUpdateCount: recentUpdates.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ========== 7. アラート取得 API ==========
// app/api/price-optimization/alerts/route.ts

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status') || 'unread';
    const severity = searchParams.get('severity');

    let query = supabase
      .from('system_alerts')
      .select('*')
      .eq('status', status)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}