/**
 * eBay出品データを判定キューに同期
 * POST /api/sync/ebay-to-queue
 * 
 * eBay Inventory APIから全出品を取得し、stock_classification_queueに投入
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
    const results: any[] = []
    
    for (const accountName of accounts) {
      console.log(`\n=== eBay ${accountName.toUpperCase()} アカウントの同期開始 ===`)
      
      // eBay Inventory APIから出品データを取得
      const listings = await fetchEbayInventory(accountName, limit)
      
      console.log(`取得件数: ${listings.length}件`)
      
      for (const listing of listings) {
        try {
          // 既にキューに存在するかチェック
          const { data: existing } = await supabase
            .from('stock_classification_queue')
            .select('id, is_stock')
            .eq('marketplace', 'ebay')
            .eq('account', accountName)
            .eq('listing_id', listing.listing_id)
            .maybeSingle()
          
          // 既に判定済み（is_stock != NULL）の場合はスキップ
          if (existing && existing.is_stock !== null && !force) {
            console.log(`スキップ（判定済み）: ${listing.product_name}`)
            totalSkipped++
            continue
          }
          
          // キューに投入
          const queueData = {
            marketplace: 'ebay',
            account: accountName,
            listing_id: listing.listing_id,
            product_name: listing.product_name,
            images: listing.images,
            scraped_data: {
              price: listing.price,
              condition: listing.condition,
              category: listing.category,
              quantity: listing.quantity,
              sku: listing.sku,
              url: listing.url
            }
          }
          
          if (existing) {
            // 更新
            await supabase
              .from('stock_classification_queue')
              .update(queueData)
              .eq('id', existing.id)
            
            console.log(`更新: ${listing.product_name}`)
          } else {
            // 新規挿入
            await supabase
              .from('stock_classification_queue')
              .insert(queueData)
            
            console.log(`新規: ${listing.product_name}`)
          }
          
          totalSynced++
          
        } catch (error: any) {
          console.error(`商品登録エラー:`, error)
          results.push({
            listing_id: listing.listing_id,
            error: error.message
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `eBay同期完了`,
      total_synced: totalSynced,
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
      
      return {
        listing_id: item.sku || item.inventoryItemId || 'unknown',
        product_name: product.title || 'タイトルなし',
        images: product.imageUrls || [],
        price: availability.price?.value 
          ? `$${availability.price.value}` 
          : null,
        condition: product.condition || 'USED',
        category: product.aspects?.Category?.[0] || null,
        quantity: availability.shipToLocationAvailability?.quantity || 0,
        sku: item.sku,
        url: `https://www.ebay.com/itm/${item.sku}`
      }
    })
    
    console.log(`変換完了: ${listings.length}件`)
    return listings
    
  } catch (error: any) {
    console.error('eBay API呼び出しエラー:', error)
    
    // フォールバック: モックデータを返す（開発用）
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ フォールバック: モックデータを使用')
      return generateMockEbayData(account, limit)
    }
    
    throw error
  }
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
      // TODO: リフレッシュトークンで更新
      return null
    }
    
    return data.access_token
    
  } catch (error) {
    console.error('トークン取得エラー:', error)
    return null
  }
}

/**
 * モックデータ生成（開発用）
 */
function generateMockEbayData(account: string, limit: number) {
  const mockProducts = [
    {
      listing_id: `MOCK-${account}-001`,
      product_name: 'Apple iPad Pro 12.9" 256GB WiFi',
      images: ['https://i.ebayimg.com/images/g/mock1/s-l1600.jpg'],
      price: '$799.99',
      condition: 'Used',
      category: 'Tablets & eBook Readers',
      quantity: 1,
      sku: `${account.toUpperCase()}-IPAD-001`,
      url: `https://www.ebay.com/itm/mock-${account}-001`
    },
    {
      listing_id: `MOCK-${account}-002`,
      product_name: 'Canon EOS R5 Mirrorless Camera Body',
      images: ['https://i.ebayimg.com/images/g/mock2/s-l1600.jpg'],
      price: '$3,299.00',
      condition: 'New',
      category: 'Digital Cameras',
      quantity: 2,
      sku: `${account.toUpperCase()}-CANON-002`,
      url: `https://www.ebay.com/itm/mock-${account}-002`
    },
    {
      listing_id: `MOCK-${account}-003`,
      product_name: 'DJI Mavic 3 Drone with Camera',
      images: ['https://i.ebayimg.com/images/g/mock3/s-l1600.jpg'],
      price: '$1,599.99',
      condition: 'Used',
      category: 'Camera Drones',
      quantity: 1,
      sku: `${account.toUpperCase()}-DJI-003`,
      url: `https://www.ebay.com/itm/mock-${account}-003`
    }
  ]
  
  return mockProducts.slice(0, Math.min(limit, mockProducts.length))
}
