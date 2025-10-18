/**
 * NAGANO-3 API統合ファイル
 * PHPバックエンドとの通信を管理
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
}

/**
 * 汎用API呼び出し関数
 */
export async function apiCall<T = any>(
  action: string,
  data?: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    const formData = new FormData()
    formData.append('action', action)
    
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value))
      })
    }

    const response = await fetch(`${API_BASE_URL}/index.php`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * ダッシュボード統計取得
 */
export async function getDashboardStats() {
  return apiCall('get_dashboard_stats')
}

/**
 * 商品一覧取得
 */
export async function getProducts(page: number = 1, perPage: number = 50) {
  return apiCall('get_data', { page, per_page: perPage })
}

/**
 * 商品追加
 */
export async function addProduct(productData: Record<string, any>) {
  return apiCall('add_item', productData)
}

/**
 * 在庫データ取得
 */
export async function getInventory(page: number = 1) {
  return apiCall('get_inventory', { page })
}

/**
 * eBayデータ取得
 */
export async function getEbayData() {
  return apiCall('get_real_data')
}

/**
 * システムヘルスチェック
 */
export async function healthCheck() {
  return apiCall('health_check')
}

/**
 * データベーステスト
 */
export async function testDatabase(type: 'mysql' | 'postgresql' = 'postgresql') {
  return apiCall('test_database', { type })
}

/**
 * eBayデータ同期開始
 */
export async function startEbaySync(quantity: number = 100) {
  return apiCall('start_data_fetch', { platform: 'ebay', quantity })
}
