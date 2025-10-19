/**
 * eBay API - User Token 直接使用版
 * OAuth2 リフレッシュフロー代わりに、User Token を直接使用
 * 
 * User Token について:
 * - 18ヶ月有効
 * - リフレッシュ不要（期限切れまで使用可能）
 * - Refresh Token より実装が簡単
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

const USER_TOKEN = process.env.EBAY_USER_TOKEN_GREEN || process.env.EBAY_USER_TOKEN

if (!USER_TOKEN) {
  throw new Error(
    'EBAY_USER_TOKEN または EBAY_USER_TOKEN_GREEN が .env.local に設定されていません\n' +
    '現在利用可能な環境変数を確認してください'
  )
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
  const environment = process.env.EBAY_ENVIRONMENT || 'production'

  console.log(`\n📤 eBay API 呼び出し: ${method} ${endpoint}`)
  console.log(`   URL: ${url}`)

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-EBAY-API-ENV-ID': environment === 'production' ? 'PRODUCTION' : 'SANDBOX'
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
      console.error(`❌ エラーレスポンス:`)
      console.error(error)
      throw new Error(`API エラー (${response.status}): ${error}`)
    }

    const data = await response.json()
    console.log(`✅ リクエスト成功`)
    return data

  } catch (error: any) {
    console.error(`❌ リクエスト失敗: ${error.message}`)
    throw error
  }
}

/**
 * eBay インベントリを取得
 */
export async function getEbayInventory(limit = 10) {
  console.log('\n' + '='.repeat(60))
  console.log('📦 eBay インベントリ取得テスト')
  console.log('='.repeat(60))
  
  try {
    const result = await callEbayApi(
      `/sell/inventory/v1/inventory_item?limit=${limit}`
    )
    
    const count = result.inventoryItems?.length || 0
    console.log(`✅ ${count} 件の商品を取得`)
    
    if (count > 0) {
      console.log('\n📋 最初の商品情報:')
      const item = result.inventoryItems[0]
      console.log(`   SKU: ${item.sku}`)
      console.log(`   商品名: ${item.product?.title || '(なし)'}`)
    }
    
    return result

  } catch (error: any) {
    console.error('❌ インベントリ取得失敗:', error.message)
    throw error
  }
}

/**
 * eBay ユーザー情報を取得（トークン有効性確認）
 */
export async function getUserInfo() {
  console.log('\n' + '='.repeat(60))
  console.log('👤 eBay ユーザー情報取得（トークン有効性確認）')
  console.log('='.repeat(60))
  
  try {
    const result = await callEbayApi('/sell/account/v1/account')
    
    console.log('✅ ユーザー認証成功')
    console.log(`   販売者ID: ${result.sellerAccountInfo?.sellerAccountStatus || '(取得失敗)'}`)
    
    return result

  } catch (error: any) {
    console.error('❌ ユーザー情報取得失敗:', error.message)
    throw error
  }
}

// テスト実行
if (require.main === module) {
  (async () => {
    try {
      console.log('='.repeat(60))
      console.log('🔐 eBay User Token 直接使用テスト')
      console.log('='.repeat(60))
      console.log('')
      console.log('🔧 設定確認:')
      console.log(`   環境: ${process.env.EBAY_ENVIRONMENT || 'production'}`)
      console.log(`   Token プレビュー: ${USER_TOKEN.substring(0, 40)}...`)
      console.log('')

      // テスト1: ユーザー情報確認（トークン有効性確認）
      console.log('テスト 1️⃣  トークン有効性確認')
      try {
        await getUserInfo()
      } catch (e) {
        console.log('⚠️  ユーザー情報取得は失敗しましたが、続行します')
      }

      // テスト2: インベントリ取得
      console.log('\n' + '='.repeat(60))
      console.log('テスト 2️⃣  インベントリ取得')
      console.log('='.repeat(60))
      await getEbayInventory(5)

      console.log('\n' + '='.repeat(60))
      console.log('✅ 全テスト完了')
      console.log('='.repeat(60))

    } catch (error) {
      console.error('\n❌ テスト失敗:', error)
      process.exit(1)
    }
  })()
}
