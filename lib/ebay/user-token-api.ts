/**
 * eBay API - User Token 直接使用版
 * 
 * User Token を使用して直接 eBay API にアクセス
 * 18ヶ月有効なので、長期運用に対応
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const USER_TOKEN = process.env.EBAY_USER_TOKEN

if (!USER_TOKEN) {
  throw new Error('EBAY_USER_TOKEN が .env.local に設定されていません')
}

/**
 * eBay API を User Token で直接呼び出し
 */
export async function callEbayApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) {
  const url = `https://api.ebay.com${endpoint}`

  console.log(`📤 eBay API 呼び出し: ${method} ${endpoint}`)

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, options)

    console.log(`   ステータス: ${response.status}`)

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ エラー: ${error}`)
      throw new Error(`API エラー (${response.status}): ${error}`)
    }

    const data = await response.json()
    console.log(`✅ 成功`)
    return data

  } catch (error: any) {
    console.error(`❌ リクエスト失敗: ${error.message}`)
    throw error
  }
}

/**
 * eBay に新しい出品を作成
 */
export async function createEbayListing(listing: {
  title: string
  description: string
  price: number
  quantity: number
  categoryId?: string
  condition?: 'USED' | 'NEW' | 'REFURBISHED'
}) {
  console.log('\n🚀 eBay 出品プロセス開始')
  console.log(`📝 商品: ${listing.title}`)
  console.log(`💰 価格: $${listing.price}`)
  console.log(`📦 数量: ${listing.quantity}`)

  try {
    // Step 1: Inventory Item を作成
    const sku = `SKU-${Date.now()}`
    
    console.log('\n1️⃣  Inventory Item を作成中...')
    const inventoryItem = {
      availability: {
        quantities: {
          availableQuantity: listing.quantity
        }
      },
      condition: listing.condition || 'USED',
      product: {
        title: listing.title,
        description: listing.description
      }
    }

    await callEbayApi(
      `/sell/inventory/v1/inventory_item/${sku}`,
      'PUT',
      inventoryItem
    )
    console.log('✅ Inventory Item 作成完了')

    // Step 2: Offer を作成
    console.log('\n2️⃣  Offer を作成中...')
    const offer = {
      listingFormat: 'FIXED_PRICE',
      pricingSummary: {
        price: {
          currency: 'USD',
          value: listing.price.toString()
        }
      },
      quantityLimitPerBuyer: 5,
      listingDuration: 'GTC'
    }

    const offerResult = await callEbayApi(
      '/sell/inventory/v1/offer',
      'POST',
      offer
    )
    const offerId = offerResult.offerId
    console.log(`✅ Offer 作成完了: ${offerId}`)

    // Step 3: Offer を公開
    console.log('\n3️⃣  Listing を公開中...')
    const publishResult = await callEbayApi(
      `/sell/inventory/v1/offer/${offerId}/publish`,
      'POST'
    )
    console.log('✅ Listing 公開完了')

    console.log('\n🎉 出品成功！')
    return {
      success: true,
      sku,
      offerId,
      listingId: publishResult.listingId,
      url: `https://www.ebay.com/itm/${publishResult.listingId}`
    }

  } catch (error: any) {
    console.error('\n❌ 出品失敗:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * eBay インベントリを取得
 */
export async function getEbayInventory(limit = 10) {
  console.log('\n📦 eBay インベントリを取得中...')
  
  try {
    const result = await callEbayApi(
      `/sell/inventory/v1/inventory_item?limit=${limit}`
    )
    
    console.log(`✅ ${result.inventoryItems?.length || 0} 件の商品を取得`)
    return result

  } catch (error: any) {
    console.error('❌ インベントリ取得失敗:', error.message)
    throw error
  }
}

// テスト実行
if (require.main === module) {
  (async () => {
    try {
      // テスト1: インベントリ取得
      console.log('='.repeat(60))
      console.log('テスト 1: インベントリ取得')
      console.log('='.repeat(60))
      await getEbayInventory(5)

      // テスト2: 新しい出品を作成
      console.log('\n' + '='.repeat(60))
      console.log('テスト 2: 新しい出品を作成')
      console.log('='.repeat(60))
      const result = await createEbayListing({
        title: 'テスト商品 - Test Item',
        description: 'これはテスト出品です。This is a test listing.',
        price: 49.99,
        quantity: 1,
        condition: 'NEW'
      })

      console.log('\n📊 結果:')
      console.log(JSON.stringify(result, null, 2))

    } catch (error) {
      console.error('テスト失敗:', error)
      process.exit(1)
    }
  })()
}
