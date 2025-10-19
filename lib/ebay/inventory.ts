// lib/ebay/inventory.ts
/**
 * eBay Inventory API - 在庫・出品管理
 */

import { getAccessToken } from './oauth'

const EBAY_API_BASE = 'https://api.ebay.com'

export interface ListingProduct {
  id: number
  sku: string
  title: string
  english_title: string | null
  price_usd: number
  listing_data: {
    condition: string
    html_description: string
    ddp_price_usd: number
    ddu_price_usd: number
    shipping_service: string
    shipping_cost_usd: number
    weight_g: number
    width_cm: number
    height_cm: number
    length_cm: number
  }
  ebay_api_data: {
    category_id: string
    title?: string
  }
  scraped_data: {
    image_urls: string[]
  }
  current_stock?: number
}

export interface ListingResult {
  success: boolean
  listingId?: string
  offerId?: string
  error?: string
}

/**
 * eBayに商品を出品
 */
export async function listProductToEbay(
  product: ListingProduct,
  account: 'account1' | 'account2'
): Promise<ListingResult> {
  try {
    const accessToken = await getAccessToken(account)
    
    // Step 1: Inventory Itemを作成/更新
    const inventoryResult = await createOrUpdateInventoryItem(product, accessToken)
    if (!inventoryResult.success) {
      return inventoryResult
    }
    
    // Step 2: Offerを作成
    const offerResult = await createOffer(product, accessToken)
    if (!offerResult.success) {
      return offerResult
    }
    
    // Step 3: Offerを公開（出品）
    const publishResult = await publishOffer(offerResult.offerId!, accessToken)
    
    return publishResult
    
  } catch (error: any) {
    console.error('eBay出品エラー:', error)
    return {
      success: false,
      error: error.message || '出品に失敗しました'
    }
  }
}

/**
 * Step 1: Inventory Item作成/更新
 */
async function createOrUpdateInventoryItem(
  product: ListingProduct,
  accessToken: string
): Promise<ListingResult> {
  const sku = product.sku
  
  const inventoryItem = {
    availability: {
      shipToLocationAvailability: {
        quantity: product.current_stock || 1
      }
    },
    condition: mapCondition(product.listing_data.condition),
    product: {
      title: product.english_title || product.ebay_api_data.title || product.title,
      description: product.listing_data.html_description,
      imageUrls: product.scraped_data.image_urls.slice(0, 12), // eBayは最大12枚
      aspects: {
        Brand: ['Unbranded'],
        Type: ['Trading Card']
      }
    },
    packageWeightAndSize: {
      dimensions: {
        height: product.listing_data.height_cm || 1,
        length: product.listing_data.length_cm || 10,
        width: product.listing_data.width_cm || 7,
        unit: 'CENTIMETER'
      },
      weight: {
        value: product.listing_data.weight_g || 100,
        unit: 'GRAM'
      }
    }
  }
  
  const response = await fetch(
    `${EBAY_API_BASE}/sell/inventory/v1/inventory_item/${sku}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US'
      },
      body: JSON.stringify(inventoryItem)
    }
  )
  
  if (!response.ok) {
    const error = await response.json()
    return {
      success: false,
      error: `Inventory Item作成失敗: ${error.errors?.[0]?.message || response.statusText}`
    }
  }
  
  // 204 No Contentは成功
  return { success: true }
}

/**
 * Step 2: Offer作成
 */
async function createOffer(
  product: ListingProduct,
  accessToken: string
): Promise<ListingResult> {
  const offer = {
    sku: product.sku,
    marketplaceId: 'EBAY_US',
    format: 'FIXED_PRICE',
    availableQuantity: product.current_stock || 1,
    categoryId: product.ebay_api_data.category_id,
    listingDescription: product.listing_data.html_description,
    listingPolicies: {
      fulfillmentPolicyId: '6462624000', // デフォルトの配送ポリシー
      paymentPolicyId: '6462627000',     // デフォルトの支払いポリシー
      returnPolicyId: '6462630000'       // デフォルトの返品ポリシー
    },
    pricingSummary: {
      price: {
        currency: 'USD',
        value: product.listing_data.ddp_price_usd.toString()
      }
    },
    merchantLocationKey: 'default' // デフォルトの発送元
  }
  
  const response = await fetch(
    `${EBAY_API_BASE}/sell/inventory/v1/offer`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Language': 'en-US'
      },
      body: JSON.stringify(offer)
    }
  )
  
  if (!response.ok) {
    const error = await response.json()
    return {
      success: false,
      error: `Offer作成失敗: ${error.errors?.[0]?.message || response.statusText}`
    }
  }
  
  const result = await response.json()
  
  return {
    success: true,
    offerId: result.offerId
  }
}

/**
 * Step 3: Offer公開（出品）
 */
async function publishOffer(
  offerId: string,
  accessToken: string
): Promise<ListingResult> {
  const response = await fetch(
    `${EBAY_API_BASE}/sell/inventory/v1/offer/${offerId}/publish`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!response.ok) {
    const error = await response.json()
    return {
      success: false,
      error: `出品公開失敗: ${error.errors?.[0]?.message || response.statusText}`
    }
  }
  
  const result = await response.json()
  
  return {
    success: true,
    listingId: result.listingId,
    offerId: offerId
  }
}

/**
 * Conditionマッピング
 */
function mapCondition(condition: string): string {
  const conditionMap: Record<string, string> = {
    'New': 'NEW',
    'Used': 'USED_EXCELLENT',
    '新品': 'NEW',
    '中古': 'USED_EXCELLENT',
    'Like New': 'LIKE_NEW',
    'Very Good': 'USED_VERY_GOOD',
    'Good': 'USED_GOOD',
    'Acceptable': 'USED_ACCEPTABLE'
  }
  
  return conditionMap[condition] || 'USED_EXCELLENT'
}

/**
 * 在庫数更新
 */
export async function updateInventoryQuantity(
  sku: string,
  quantity: number,
  account: 'account1' | 'account2'
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken(account)
    
    const response = await fetch(
      `${EBAY_API_BASE}/sell/inventory/v1/inventory_item/${sku}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          availability: {
            shipToLocationAvailability: {
              quantity: quantity
            }
          }
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.errors?.[0]?.message || '在庫更新失敗'
      }
    }
    
    return { success: true }
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 価格更新
 */
export async function updateOfferPrice(
  offerId: string,
  price: number,
  account: 'account1' | 'account2'
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken(account)
    
    const response = await fetch(
      `${EBAY_API_BASE}/sell/inventory/v1/offer/${offerId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pricingSummary: {
            price: {
              currency: 'USD',
              value: price.toString()
            }
          }
        })
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      return {
        success: false,
        error: error.errors?.[0]?.message || '価格更新失敗'
      }
    }
    
    return { success: true }
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}
