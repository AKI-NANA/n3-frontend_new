/**
 * eBay出品データをinventory_masterに直接同期
 * POST /api/sync/ebay-to-inventory
 *
 * eBay Inventory APIから全出品を取得し、inventory_masterに直接投入
 * mjt・greenアカウント別に同期可能
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface EbaySyncRequest {
  account: 'mjt' | 'green' | 'all'
  limit?: number
  force?: boolean  // 既存データを上書き
}

export async function POST(req: NextRequest) {
  try {
    const body: EbaySyncRequest = await req.json()
    const { account, limit = 100, force = false } = body

    if (!account) {
      return NextResponse.json(
        { error: 'accountパラメータが必要です (mjt, green, all)' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // 同期対象アカウントのリスト
    const accounts = account === 'all' ? ['mjt', 'green'] : [account]

    let totalSynced = 0
    let totalSkipped = 0
    let totalUpdated = 0
    const results: any[] = []

    for (const accountName of accounts) {
      console.log(`\n=== eBay ${accountName.toUpperCase()} アカウントの同期開始 ===`)

      // eBay Inventory APIから出品データを取得
      const listings = await fetchEbayInventory(accountName, limit)

      console.log(`取得件数: ${listings.length}件`)

      for (const listing of listings) {
        try {
          // unique_id を生成（marketplace + account + listing_id）
          const uniqueId = `ebay-${accountName}-${listing.sku || listing.listing_id}`

          // 既にinventory_masterに存在するかチェック
          const { data: existing } = await supabase
            .from('inventory_master')
            .select('id, unique_id')
            .eq('unique_id', uniqueId)
            .maybeSingle()

          // 既に存在する場合はスキップ（forceの場合は更新）
          if (existing && !force) {
            console.log(`スキップ（既存）: ${listing.product_name}`)
            totalSkipped++
            continue
          }

          // inventory_masterに投入するデータ
          const inventoryData = {
            unique_id: uniqueId,
            product_name: listing.product_name,
            sku: listing.sku || listing.listing_id,
            product_type: 'stock', // eBay出品済み = 有在庫と仮定
            physical_quantity: listing.quantity || 0,
            listing_quantity: listing.quantity || 0,
            cost_price: listing.price_value || 0,
            selling_price: listing.price_value || 0,
            condition_name: listing.condition || 'Used',
            category: listing.category,
            subcategory: listing.subcategory,
            images: listing.images || [],
            marketplace: 'ebay',
            account: accountName,
            source_data: {
              listing_id: listing.listing_id,
              url: listing.url,
              weight_g: listing.weight_g,
              category_id: listing.category_id,
              ebay_condition: listing.condition,
              ebay_price: listing.price,
              synced_at: new Date().toISOString()
            },
            is_manual_entry: false,
            priority_score: 50 // デフォルト優先度
          }

          if (existing) {
            // 更新
            const { error: updateError } = await supabase
              .from('inventory_master')
              .update({
                ...inventoryData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)

            if (updateError) {
              throw updateError
            }

            console.log(`✅ 更新: ${listing.product_name}`)
            totalUpdated++
          } else {
            // 新規挿入
            const { error: insertError } = await supabase
              .from('inventory_master')
              .insert(inventoryData)

            if (insertError) {
              throw insertError
            }

            console.log(`✅ 新規: ${listing.product_name}`)
            totalSynced++
          }

        } catch (error: any) {
          console.error(`商品登録エラー:`, error)
          results.push({
            listing_id: listing.listing_id,
            product_name: listing.product_name,
            error: error.message
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `eBay → inventory_master 同期完了`,
      total_synced: totalSynced,
      total_updated: totalUpdated,
      total_skipped: totalSkipped,
      accounts: accounts,
      errors: results.filter(r => r.error)
    })

  } catch (error: any) {
    console.error('eBay同期エラー:', error)
    return NextResponse.json(
      { error: `同期失敗: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * eBay Inventory APIから出品データを取得
 */
async function fetchEbayInventory(account: string, limit: number) {
  try {
    console.log(`eBay Inventory API呼び出し: ${account}`)

    // eBay APIトークン取得
    const token = await getEbayToken(account)

    if (!token) {
      throw new Error(`eBay ${account}のトークンが取得できません`)
    }

    // eBay Inventory API呼び出し
    const response = await fetch(
      `https://api.ebay.com/sell/inventory/v1/inventory_item?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`eBay API Error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    // データ変換
    const listings = (data.inventoryItems || []).map((item: any) => {
      const product = item.product || {}
      const availability = item.availability || {}
      const packageWeightAndSize = item.packageWeightAndSize || {}

      // 価格をパース
      const priceValue = availability.price?.value
        ? parseFloat(availability.price.value)
        : 0

      // 重量を取得（グラム単位に変換）
      const weightG = packageWeightAndSize.weight?.value
        ? parseFloat(packageWeightAndSize.weight.value) *
          (packageWeightAndSize.weight.unit === 'KILOGRAM' ? 1000 :
           packageWeightAndSize.weight.unit === 'POUND' ? 453.592 : 1)
        : 0

      return {
        listing_id: item.sku || item.inventoryItemId || 'unknown',
        product_name: product.title || 'タイトルなし',
        images: product.imageUrls || [],
        price: availability.price?.value
          ? `$${availability.price.value}`
          : null,
        price_value: priceValue,
        condition: mapEbayCondition(product.condition),
        category: product.aspects?.Brand?.[0] || product.aspects?.Category?.[0] || null,
        subcategory: product.aspects?.Type?.[0] || null,
        category_id: item.categoryId || null,
        quantity: availability.shipToLocationAvailability?.quantity || 0,
        sku: item.sku,
        url: `https://www.ebay.com/itm/${item.sku}`,
        weight_g: weightG
      }
    })

    console.log(`変換完了: ${listings.length}件`)
    return listings

  } catch (error: any) {
    console.error('eBay API呼び出しエラー:', error)
    throw error
  }
}

/**
 * eBayコンディションを標準形式にマップ
 */
function mapEbayCondition(ebayCondition: string | undefined): string {
  if (!ebayCondition) return 'Used'

  const conditionMap: { [key: string]: string } = {
    'NEW': 'New',
    'NEW_WITH_DEFECTS': 'New (Open Box)',
    'CERTIFIED_REFURBISHED': 'Refurbished',
    'EXCELLENT_REFURBISHED': 'Refurbished',
    'VERY_GOOD_REFURBISHED': 'Refurbished',
    'GOOD_REFURBISHED': 'Refurbished',
    'LIKE_NEW': 'Like New',
    'USED_EXCELLENT': 'Used - Excellent',
    'USED_VERY_GOOD': 'Used - Very Good',
    'USED_GOOD': 'Used - Good',
    'USED_ACCEPTABLE': 'Used - Acceptable',
    'FOR_PARTS_OR_NOT_WORKING': 'For Parts'
  }

  return conditionMap[ebayCondition] || 'Used'
}

/**
 * eBay APIトークン取得
 */
async function getEbayToken(account: string): Promise<string | null> {
  try {
    // Supabaseからトークンを取得
    const supabase = createClient()

    const { data, error } = await supabase
      .from('ebay_tokens')
      .select('access_token, expires_at')
      .eq('account', account)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      console.warn(`トークン取得失敗: ${account}`)
      return null
    }

    // トークンの有効期限チェック
    const expiresAt = new Date(data.expires_at)
    const now = new Date()

    if (expiresAt <= now) {
      console.warn(`トークン期限切れ: ${account}`)
      return null
    }

    return data.access_token

  } catch (error) {
    console.error('トークン取得エラー:', error)
    return null
  }
}
