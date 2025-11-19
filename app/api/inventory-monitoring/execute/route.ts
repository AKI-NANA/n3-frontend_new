// ====================================================================
// 在庫監視 + 価格変動統合実行API
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeProductScraping } from '@/lib/scraping-engine';
import { recalculateFromPriceChange } from '@/lib/pricing-engine';

/**
 * 在庫監視と価格変動を統合実行
 * GET /api/inventory-monitoring/execute
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. 監視対象商品を取得
    const { data: targets, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('inventory_monitoring_enabled', true)
      .not('store_url', 'is', null)
      .or(`next_inventory_check.is.null,next_inventory_check.lte.${new Date().toISOString()}`)
      .order('next_inventory_check', { ascending: true, nullsFirst: true })
      .limit(50); // 一度に50件まで

    if (fetchError) {
      console.error('❌ 対象商品取得エラー:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({
        success: true,
        message: '監視対象商品がありません',
        processed: 0,
      });
    }

    console.log(`📊 監視対象商品: ${targets.length}件`);

    // 2. 各商品をスクレイピング＆価格再計算
    const results = [];
    const errors = [];
    const price_changes = [];

    for (const product of targets) {
      try {
        console.log(`🔍 処理中: ${product.sku} - ${product.title}`);

        // 2-1. スクレイピング実行
        const scraping_result = await executeProductScraping({
          url: product.store_url,
          marketplace: product.source_id || 'yahoo_auctions',
          extract_price: true,
          extract_stock: true,
          check_page_exists: true,
        });

        if (!scraping_result.success) {
          errors.push({
            product_id: product.id,
            sku: product.sku,
            error: scraping_result.error || 'スクレイピング失敗',
          });
          continue;
        }

        // 2-2. 変動検知
        const changes: {
          category: 'inventory' | 'price' | 'both' | 'page_error';
          inventory_change?: any;
          price_change?: any;
        } = {
          category: 'inventory',
        };

        let has_inventory_change = false;
        let has_price_change = false;

        // ページエラーチェック
        if (!scraping_result.page_exists) {
          changes.category = 'page_error';
          changes.inventory_change = {
            page_exists: false,
            page_status: 'deleted',
            old_stock: product.current_stock || 0,
            new_stock: 0,
            available: false,
          };
          has_inventory_change = true;
        } else {
          // 在庫変動チェック
          const old_stock = product.current_stock || 0;
          const new_stock = scraping_result.stock !== undefined ? scraping_result.stock : old_stock;

          if (old_stock !== new_stock) {
            has_inventory_change = true;
            changes.inventory_change = {
              old_stock,
              new_stock,
              available: new_stock > 0,
              page_exists: true,
              page_status: 'active',
            };
          }

          // 価格変動チェック
          const old_price = product.acquired_price_jpy || 0;
          const new_price = scraping_result.price || old_price;

          if (old_price !== new_price && new_price > 0) {
            has_price_change = true;

            // 価格再計算エンジン起動
            console.log(`💰 価格変動検知: ¥${old_price} → ¥${new_price}`);

            const price_calc_result = await recalculateFromPriceChange(
              product.id,
              old_price,
              new_price,
              {
                id: product.id,
                sku: product.sku,
                title: product.title,
                acquired_price_jpy: old_price,
                calculated_ebay_price_usd: product.calculated_ebay_price_usd,
                weight_g: product.weight_g,
                length_cm: product.length_cm,
                width_cm: product.width_cm,
                height_cm: product.height_cm,
                ebay_category_id: product.ebay_category_id,
                shipping_policy_id: product.shipping_policy_id,
                pricing_rules_enabled: product.pricing_rules_enabled,
                active_pricing_rule_id: product.active_pricing_rule_id,
                min_profit_usd: product.min_profit_usd,
                max_price_adjust_percent: product.max_price_adjust_percent,
              }
            );

            // price_changesテーブルに保存
            const { data: saved_price_change, error: price_save_error } = await supabase
              .from('price_changes')
              .insert(price_calc_result)
              .select()
              .single();

            if (price_save_error) {
              console.error('❌ 価格変動データ保存エラー:', price_save_error);
            } else {
              price_changes.push(saved_price_change);
              changes.price_change = {
                old_price_jpy: old_price,
                new_price_jpy: new_price,
                price_diff_jpy: new_price - old_price,
                recalculated_ebay_price_usd: price_calc_result.new_ebay_price_usd,
                profit_impact: price_calc_result.profit_diff,
              };
            }
          }
        }

        // 変動カテゴリの決定
        if (has_inventory_change && has_price_change) {
          changes.category = 'both';
        } else if (has_price_change) {
          changes.category = 'price';
        } else if (has_inventory_change) {
          changes.category = 'inventory';
        }

        // 2-3. 変動がある場合、unified_changesに保存
        if (has_inventory_change || has_price_change) {
          const { error: unified_error } = await supabase
            .from('unified_changes')
            .insert({
              product_id: product.id,
              ebay_listing_id: product.ebay_listing_id,
              change_category: changes.category,
              inventory_change: changes.inventory_change,
              price_change: changes.price_change,
              status: 'pending',
              auto_applied: false,
            });

          if (unified_error) {
            console.error('❌ 統合変動データ保存エラー:', unified_error);
          } else {
            console.log(`✅ 変動検知: ${changes.category}`);
          }
        }

        // 2-4. 次回チェック時刻を更新
        const frequency = product.inventory_check_frequency || 'daily';
        let next_check = new Date();

        switch (frequency) {
          case 'hourly':
            next_check.setHours(next_check.getHours() + 1);
            break;
          case 'every_3h':
            next_check.setHours(next_check.getHours() + 3);
            break;
          case 'every_6h':
            next_check.setHours(next_check.getHours() + 6);
            break;
          case 'daily':
            next_check.setDate(next_check.getDate() + 1);
            break;
          case 'weekly':
            next_check.setDate(next_check.getDate() + 7);
            break;
          default:
            next_check.setDate(next_check.getDate() + 1);
        }

        await supabase
          .from('products_master')
          .update({
            last_inventory_check: new Date().toISOString(),
            next_inventory_check: next_check.toISOString(),
            current_stock: scraping_result.stock,
          })
          .eq('id', product.id);

        results.push({
          product_id: product.id,
          sku: product.sku,
          success: true,
          has_change: has_inventory_change || has_price_change,
          change_type: changes.category,
        });
      } catch (error) {
        console.error(`❌ 商品処理エラー [${product.sku}]:`, error);
        errors.push({
          product_id: product.id,
          sku: product.sku,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 3. 結果を返す
    return NextResponse.json({
      success: true,
      processed: results.length,
      changes_detected: results.filter((r) => r.has_change).length,
      price_changes_count: price_changes.length,
      error_count: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('❌ 在庫監視実行エラー:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
