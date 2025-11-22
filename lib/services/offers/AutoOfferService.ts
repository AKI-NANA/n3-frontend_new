/**
 * 自動オファーサービス (タスク5A - S-7)
 *
 * 機能:
 * - calculateOptimalOffer(): 最適オファー価格を算出
 * - sendOfferToBuyer(): eBay APIを使ってバイヤーに対してオファーを送信
 *
 * 要件:
 * - products_master の min_profit_margin_jpy と max_discount_rate を利用
 * - integrated-pricing-engine.ts を利用して損益分岐点を守る
 * - 実際の経費率を反映した計算
 */

import { createClient } from '@supabase/supabase-js';
import { calculateBreakEvenPrice } from '@/lib/pricing/integrated-pricing-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ========================================
// 型定義
// ========================================

export interface ProductMasterForOffer {
  id: number;
  sku: string;
  title?: string;
  acquired_price_jpy?: number;
  calculated_ebay_price_usd?: number;
  current_ebay_price_usd?: number;
  shipping_cost_jpy?: number;
  min_profit_margin_jpy?: number; // 最低利益額（円）
  max_discount_rate?: number; // 最大割引率（%）
  exchange_rate?: number;
  weight_g?: number;
  ebay_listing_id?: string;
}

export interface OptimalOfferResult {
  success: boolean;
  offer_price_usd?: number;
  original_price_usd?: number;
  discount_amount_usd?: number;
  discount_rate_percent?: number;
  profit_jpy?: number;
  profit_usd?: number;
  break_even_price_usd?: number;
  can_send_offer: boolean;
  rejection_reason?: string;
  calculation_details?: {
    base_cost_jpy: number;
    break_even_price_usd: number;
    min_acceptable_price_usd: number;
    max_discount_usd: number;
    expense_ratio: number;
  };
}

export interface SendOfferInput {
  product_id: number;
  ebay_listing_id: string;
  buyer_username: string;
  offer_price_usd: number;
  message?: string;
}

export interface SendOfferResult {
  success: boolean;
  offer_id?: string;
  error?: string;
  details?: {
    sent_at: string;
    expires_at: string;
  };
}

// ========================================
// 最適オファー価格計算
// ========================================

/**
 * 最適オファー価格を計算
 *
 * アルゴリズム:
 * 1. integrated-pricing-engine で損益分岐点を計算
 * 2. min_profit_margin_jpy を加算して最低許容価格を算出
 * 3. max_discount_rate を適用してオファー価格を算出
 * 4. 最低許容価格を下回る場合は拒否
 *
 * @param productId - 商品ID
 * @param requestedOfferPriceUsd - バイヤーからのオファー価格（オプション）
 * @returns 最適オファー結果
 */
export async function calculateOptimalOffer(
  productId: number,
  requestedOfferPriceUsd?: number
): Promise<OptimalOfferResult> {
  try {
    // 1. 商品データを取得
    const { data: product, error: productError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return {
        success: false,
        can_send_offer: false,
        rejection_reason: '商品が見つかりません',
      };
    }

    // 必須フィールドの確認
    const acquiredPriceJpy = product.acquired_price_jpy || 0;
    const shippingCostJpy = product.shipping_cost_jpy || 0;
    const currentPriceUsd = product.current_ebay_price_usd || product.calculated_ebay_price_usd || 0;
    const minProfitMarginJpy = product.min_profit_margin_jpy || 1000; // デフォルト: 1,000円
    const maxDiscountRate = product.max_discount_rate || 10.0; // デフォルト: 10%
    const exchangeRate = product.exchange_rate || 150;

    if (acquiredPriceJpy === 0 || currentPriceUsd === 0) {
      return {
        success: false,
        can_send_offer: false,
        rejection_reason: '価格情報が不足しています',
      };
    }

    console.log(`[AutoOffer] 商品ID ${productId} のオファー計算開始...`);
    console.log(`  - 仕入れ価格: ${acquiredPriceJpy}円`);
    console.log(`  - 現在のeBay価格: $${currentPriceUsd}`);
    console.log(`  - 最低利益: ${minProfitMarginJpy}円`);
    console.log(`  - 最大割引率: ${maxDiscountRate}%`);

    // 2. 損益分岐点を計算（integrated-pricing-engine使用）
    const breakEvenResult = await calculateBreakEvenPrice(
      acquiredPriceJpy,
      shippingCostJpy,
      exchangeRate,
      true // 実際の経費率を使用
    );

    console.log(`[AutoOffer] 損益分岐点: $${breakEvenResult.breakEvenPriceUsd}`);
    console.log(`[AutoOffer] 経費率: ${breakEvenResult.expenseRatio}% (${breakEvenResult.dataSource})`);

    // 3. 最低許容価格を計算（損益分岐点 + 最低利益）
    const minProfitMarginUsd = minProfitMarginJpy / exchangeRate;
    const minAcceptablePriceUsd = breakEvenResult.breakEvenPriceUsd + minProfitMarginUsd;

    console.log(`[AutoOffer] 最低許容価格: $${minAcceptablePriceUsd.toFixed(2)}`);

    // 4. 最大割引額を計算
    const maxDiscountUsd = currentPriceUsd * (maxDiscountRate / 100);
    const offerPriceUsd = currentPriceUsd - maxDiscountUsd;

    console.log(`[AutoOffer] 最大割引額: $${maxDiscountUsd.toFixed(2)}`);
    console.log(`[AutoOffer] 計算されたオファー価格: $${offerPriceUsd.toFixed(2)}`);

    // 5. バイヤーからのオファー価格がある場合は評価
    let finalOfferPriceUsd = offerPriceUsd;
    let canSendOffer = true;
    let rejectionReason: string | undefined;

    if (requestedOfferPriceUsd) {
      console.log(`[AutoOffer] バイヤーからのオファー: $${requestedOfferPriceUsd}`);

      if (requestedOfferPriceUsd < minAcceptablePriceUsd) {
        canSendOffer = false;
        rejectionReason = `オファー価格が最低許容価格（$${minAcceptablePriceUsd.toFixed(2)}）を下回っています`;
        console.log(`[AutoOffer] ❌ ${rejectionReason}`);
      } else {
        finalOfferPriceUsd = requestedOfferPriceUsd;
        canSendOffer = true;
        console.log(`[AutoOffer] ✅ オファー価格は許容範囲内です`);
      }
    } else {
      // 自動計算したオファー価格が最低許容価格を下回る場合
      if (offerPriceUsd < minAcceptablePriceUsd) {
        canSendOffer = false;
        rejectionReason = `最大割引を適用しても最低利益を確保できません（現在価格: $${currentPriceUsd}, 必要価格: $${minAcceptablePriceUsd.toFixed(2)}）`;
        console.log(`[AutoOffer] ❌ ${rejectionReason}`);
      }
    }

    // 6. 利益計算
    const profitUsd = finalOfferPriceUsd - breakEvenResult.breakEvenPriceUsd;
    const profitJpy = profitUsd * exchangeRate;

    // 7. 割引情報
    const discountAmountUsd = currentPriceUsd - finalOfferPriceUsd;
    const discountRatePercent = (discountAmountUsd / currentPriceUsd) * 100;

    const result: OptimalOfferResult = {
      success: true,
      offer_price_usd: Math.round(finalOfferPriceUsd * 100) / 100,
      original_price_usd: currentPriceUsd,
      discount_amount_usd: Math.round(discountAmountUsd * 100) / 100,
      discount_rate_percent: Math.round(discountRatePercent * 100) / 100,
      profit_jpy: Math.round(profitJpy),
      profit_usd: Math.round(profitUsd * 100) / 100,
      break_even_price_usd: breakEvenResult.breakEvenPriceUsd,
      can_send_offer: canSendOffer,
      rejection_reason: rejectionReason,
      calculation_details: {
        base_cost_jpy: acquiredPriceJpy + shippingCostJpy,
        break_even_price_usd: breakEvenResult.breakEvenPriceUsd,
        min_acceptable_price_usd: Math.round(minAcceptablePriceUsd * 100) / 100,
        max_discount_usd: Math.round(maxDiscountUsd * 100) / 100,
        expense_ratio: breakEvenResult.expenseRatio,
      },
    };

    console.log('[AutoOffer] 計算完了:', result);

    return result;
  } catch (error) {
    console.error('[AutoOffer] エラー:', error);
    return {
      success: false,
      can_send_offer: false,
      rejection_reason: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

// ========================================
// オファー送信（eBay API統合）
// ========================================

/**
 * バイヤーにオファーを送信
 *
 * 注意: この関数は将来のeBay API統合タスクに依存します
 * 現在はプレースホルダー実装です
 *
 * @param input - オファー送信パラメータ
 * @returns オファー送信結果
 */
export async function sendOfferToBuyer(input: SendOfferInput): Promise<SendOfferResult> {
  try {
    console.log('[AutoOffer] オファー送信開始:', input);

    // 1. 最適オファー価格を検証
    const offerCalculation = await calculateOptimalOffer(input.product_id, input.offer_price_usd);

    if (!offerCalculation.can_send_offer) {
      return {
        success: false,
        error: offerCalculation.rejection_reason || 'オファーを送信できません',
      };
    }

    // 2. eBay API呼び出し（プレースホルダー）
    // TODO: eBay Trading API の AddMemberMessageAAQToPartner または SendOfferToInterested を実装
    console.warn('[AutoOffer] ⚠️ eBay API統合は未実装です。将来のタスクで実装されます。');

    // プレースホルダーレスポンス
    const mockOfferId = `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sentAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48時間後

    // 3. オファー履歴を保存（将来実装）
    // await supabase.from('offer_history').insert({
    //   product_id: input.product_id,
    //   ebay_listing_id: input.ebay_listing_id,
    //   buyer_username: input.buyer_username,
    //   offer_price_usd: input.offer_price_usd,
    //   status: 'sent',
    //   sent_at: sentAt,
    //   expires_at: expiresAt,
    // });

    console.log(`[AutoOffer] ✅ オファー送信成功（モック）: ${mockOfferId}`);

    return {
      success: true,
      offer_id: mockOfferId,
      details: {
        sent_at: sentAt,
        expires_at: expiresAt,
      },
    };
  } catch (error) {
    console.error('[AutoOffer] オファー送信エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

// ========================================
// バッチオファー処理
// ========================================

/**
 * 複数の商品に対してオファーを一括評価
 *
 * @param productIds - 商品ID配列
 * @returns 各商品のオファー評価結果
 */
export async function evaluateBulkOffers(
  productIds: number[]
): Promise<Map<number, OptimalOfferResult>> {
  const results = new Map<number, OptimalOfferResult>();

  console.log(`[AutoOffer] ${productIds.length}件の商品をバッチ評価開始...`);

  for (const productId of productIds) {
    const result = await calculateOptimalOffer(productId);
    results.set(productId, result);
  }

  console.log(`[AutoOffer] バッチ評価完了: ${productIds.length}件`);

  return results;
}
