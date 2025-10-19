/**
 * eBay 出品 API
 * 
 * 新しいリスティングを eBay に作成します
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const CLIENT_ID = process.env.EBAY_CLIENT_ID_GREEN!
const CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET_GREEN!
const REFRESH_TOKEN = process.env.EBAY_REFRESH_TOKEN_PROD || process.env.EBAY_REFRESH_TOKEN_GREEN!

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error('eBay 認証情報が .env.local に設定されていません')
}

/**
 * Refresh Token から User Access Token を取得
 */
async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
      scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Access Token 取得失敗: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * eBay に出品を作成
 */
export async function createEbayListing(listing: {
  title: string
  description: string
  price: number
  quantity: number
  category?: string
  condition?: 'USED' | 'NEW' | 'REFURBISHED' | 'FOR_PARTS_OR_NOT_WORKING'
  imageUrls?: string[]
}) {
  try {
    console.log('🚀 eBay Access Token を取得中...')
    const accessToken = await getAccessToken()
    console.log('✅ Access Token 取得成功')

    console.log('📝 出品内容:')
    console.log(`  タイトル: ${listing.title}`)
    console.log(`  価格: $${listing.price}`)
    console.log(`  数量: ${listing.quantity}`)

    // Inventory Item API で商品を作成
    const inventoryItem = {
      availability: {
        quantities: {
          availableQuantity: listing.quantity
        }
      },
      condition: listing.condition || 'USED',
      product: {
        title: listing.title,
        description: listing.description,
        imageUrls: listing.imageUrls || [],
        aspects: {}
      }
    }

    console.log('\n📤 Inventory Item を作成中...')
    const inventoryResponse = await fetch(
      'https://api.ebay.com/sell/inventory/v1/inventory_item/test-sku-001',
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inventoryItem)
      }
    )

    if (!inventoryResponse.ok) {
      const error = await inventoryResponse.text()
      throw new Error(`Inventory Item 作成失敗: ${error}`)
    }

    console.log('✅ Inventory Item 作成成功')

    // Listing API で実際の出品を作成
    const listingData = {
      listingFormat: 'FIXED_PRICE',
      listingDuration: 'GTC', // Good Till Canceled
      listingPolicies: {
        fulfillmentPolicyId: 'YOUR_FULFILLMENT_POLICY_ID',
        paymentPolicyId: 'YOUR_PAYMENT_POLICY_ID',
        returnPolicyId: 'YOUR_RETURN_POLICY_ID'
      },
      pricingSummary: {
        price: {
          currency: 'USD',
          value: listing.price.toString()
        }
      },
      quantityLimitPerBuyer: 5,
      tax: {
        applyTax: false
      }
    }

    console.log('\n📤 Listing を作成中...')
    const listingResponse = await fetch(
      'https://api.ebay.com/sell/listing/v1/create_listing',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(listingData)
      }
    )

    if (!listingResponse.ok) {
      const error = await listingResponse.text()
      console.error(`\n❌ Listing 作成失敗:`)
      console.error(error)
      return {
        success: false,
        error: error
      }
    }

    const result = await listingResponse.json()
    console.log('\n✅ Listing 作成成功!')
    console.log(`📍 Listing ID: ${result.listingId}`)

    return {
      success: true,
      listingId: result.listingId,
      url: `https://www.ebay.com/itm/${result.listingId}`
    }

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

// テスト実行
if (require.main === module) {
  createEbayListing({
    title: 'テスト商品 - Test Product',
    description: 'これはテスト出品です。This is a test listing.',
    price: 29.99,
    quantity: 1,
    condition: 'NEW'
  }).then(result => {
    console.log('\n📊 結果:')
    console.log(JSON.stringify(result, null, 2))
  })
}
