// eBay API 自動更新機能

import { supabase } from '@/lib/supabase'
import { updateInventoryQuantity, updateOfferPrice } from '@/lib/ebay/inventory'
import type { InventoryChange } from './types'

export interface EbayUpdateOptions {
  account?: 'account1' | 'account2'
  dryRun?: boolean // テスト実行（実際には更新しない）
}

export interface EbayUpdateResult {
  success: boolean
  updated: number
  failed: number
  errors: Array<{
    change_id: string
    product_id: string
    error: string
  }>
}

/**
 * 変動データをeBayに自動反映
 */
export async function applyChangesToEbay(
  changeIds: string[],
  options: EbayUpdateOptions = {}
): Promise<EbayUpdateResult> {
  const { account = 'account1', dryRun = false } = options

  const result: EbayUpdateResult = {
    success: true,
    updated: 0,
    failed: 0,
    errors: [],
  }

  // 変動データを取得（商品情報も一緒に）
  const { data: changes, error: fetchError } = await supabase
    .from('inventory_changes')
    .select(`
      *,
      product:products (
        id,
        sku,
        ebay_sku,
        ebay_listing_id,
        ebay_offer_id,
        title,
        listed_marketplaces
      )
    `)
    .in('id', changeIds)
    .eq('status', 'pending')

  if (fetchError || !changes) {
    console.error('変動データ取得エラー:', fetchError)
    return {
      success: false,
      updated: 0,
      failed: changeIds.length,
      errors: [
        {
          change_id: '',
          product_id: '',
          error: fetchError?.message || 'データ取得失敗',
        },
      ],
    }
  }

  // 各変動を処理
  for (const change of changes) {
    const product = change.product

    // eBayに出品されていない商品はスキップ
    if (!product?.listed_marketplaces?.includes('ebay')) {
      console.log(`スキップ: ${product?.title} (eBayに未出品)`)
      continue
    }

    // SKUまたはOffer IDが必要
    const sku = product.ebay_sku || product.sku
    const offerId = product.ebay_offer_id

    if (!sku && !offerId) {
      result.failed++
      result.errors.push({
        change_id: change.id,
        product_id: product.id,
        error: 'SKUまたはOffer IDが設定されていません',
      })
      continue
    }

    try {
      let updateSuccess = false
      let errorMessage = ''

      if (dryRun) {
        // テスト実行
        console.log(`[DRY RUN] ${product.title}: ${change.change_type}`)
        console.log(`  SKU: ${sku}, Offer ID: ${offerId}`)

        if (change.change_type === 'stock') {
          console.log(`  在庫: ${change.old_stock} → ${change.new_stock}`)
        } else if (change.change_type === 'price') {
          console.log(
            `  価格: $${change.recalculated_ebay_price_usd || 'N/A'}`
          )
        }

        updateSuccess = true
      } else {
        // 実際に更新
        if (change.change_type === 'stock') {
          // 在庫更新
          const stockResult = await updateInventoryQuantity(
            sku,
            change.new_stock || 0,
            account
          )

          if (stockResult.success) {
            updateSuccess = true
            console.log(`✅ 在庫更新成功: ${product.title}`)
          } else {
            errorMessage = stockResult.error || '在庫更新失敗'
          }
        } else if (
          change.change_type === 'price' &&
          change.recalculated_ebay_price_usd
        ) {
          // 価格更新
          if (!offerId) {
            errorMessage = 'Offer IDが必要です'
          } else {
            const priceResult = await updateOfferPrice(
              offerId,
              change.recalculated_ebay_price_usd,
              account
            )

            if (priceResult.success) {
              updateSuccess = true
              console.log(`✅ 価格更新成功: ${product.title}`)
            } else {
              errorMessage = priceResult.error || '価格更新失敗'
            }
          }
        } else if (
          change.change_type === 'page_deleted' ||
          change.change_type === 'page_changed'
        ) {
          // ページ削除/変更の場合は在庫を0に
          const stockResult = await updateInventoryQuantity(sku, 0, account)

          if (stockResult.success) {
            updateSuccess = true
            console.log(`✅ 在庫を0に設定: ${product.title}`)
          } else {
            errorMessage = stockResult.error || '在庫更新失敗'
          }
        }
      }

      if (updateSuccess) {
        // 成功時の処理
        result.updated++

        // 変動データのステータスを更新
        await supabase
          .from('inventory_changes')
          .update({
            status: 'applied',
            applied_at: new Date().toISOString(),
            applied_to_marketplace: true,
            ebay_update_attempted_at: new Date().toISOString(),
            ebay_update_success: true,
            marketplace_update_status: {
              ebay: 'success',
            },
          })
          .eq('id', change.id)

        // 商品の在庫も更新（在庫変動の場合）
        if (change.change_type === 'stock' && !dryRun) {
          await supabase
            .from('products')
            .update({
              current_stock: change.new_stock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id)
        }

        // 商品の価格も更新（価格変動の場合）
        if (change.change_type === 'price' && !dryRun) {
          await supabase
            .from('products')
            .update({
              acquired_price_jpy: change.new_price_jpy,
              ddp_price_usd: change.recalculated_ebay_price_usd,
              profit_margin: change.recalculated_profit_margin,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id)
        }
      } else {
        // 失敗時の処理
        result.failed++
        result.errors.push({
          change_id: change.id,
          product_id: product.id,
          error: errorMessage,
        })

        // エラー情報を記録
        await supabase
          .from('inventory_changes')
          .update({
            status: 'error',
            ebay_update_attempted_at: new Date().toISOString(),
            ebay_update_success: false,
            ebay_update_error: errorMessage,
            marketplace_update_status: {
              ebay: 'failed',
            },
          })
          .eq('id', change.id)
      }
    } catch (error: any) {
      console.error(`❌ eBay更新エラー: ${product.title}`, error)
      result.failed++
      result.errors.push({
        change_id: change.id,
        product_id: product.id,
        error: error.message || 'Unknown error',
      })

      // エラー情報を記録
      await supabase
        .from('inventory_changes')
        .update({
          status: 'error',
          ebay_update_attempted_at: new Date().toISOString(),
          ebay_update_success: false,
          ebay_update_error: error.message,
        })
        .eq('id', change.id)
    }
  }

  result.success = result.failed === 0

  return result
}

/**
 * 複数の変動を一括でeBayに反映
 */
export async function batchApplyToEbay(
  changeIds: string[],
  options: EbayUpdateOptions = {}
): Promise<EbayUpdateResult> {
  console.log(`🚀 eBay一括更新開始: ${changeIds.length}件`)

  const result = await applyChangesToEbay(changeIds, options)

  console.log(`✅ eBay一括更新完了`)
  console.log(`   成功: ${result.updated}`)
  console.log(`   失敗: ${result.failed}`)

  return result
}

/**
 * 単一の変動をeBayに反映
 */
export async function applySingleChangeToEbay(
  changeId: string,
  options: EbayUpdateOptions = {}
): Promise<EbayUpdateResult> {
  return applyChangesToEbay([changeId], options)
}

/**
 * 自動更新対象の変動を取得
 */
export async function getAutoUpdateCandidates(): Promise<InventoryChange[]> {
  const { data, error } = await supabase
    .from('inventory_changes')
    .select(`
      *,
      product:products (
        id,
        sku,
        title,
        listed_marketplaces
      )
    `)
    .eq('status', 'pending')
    .eq('applied_to_marketplace', false)
    .order('detected_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('自動更新候補取得エラー:', error)
    return []
  }

  // eBayに出品済みの商品のみ
  return (data || []).filter((change: any) =>
    change.product?.listed_marketplaces?.includes('ebay')
  ) as InventoryChange[]
}
