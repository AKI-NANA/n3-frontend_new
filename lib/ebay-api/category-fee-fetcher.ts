// lib/ebay-api/category-fee-fetcher.ts (改良版 - 詳細エラー表示)
/**
 * eBay APIからカテゴリとFVF手数料を取得
 */

interface EbayCategoryFee {
  categoryId: string
  categoryName: string
  categoryPath: string
  fvfRate: number
  insertionFee: number
}

interface EbayAPIResponse {
  categories: EbayCategoryFee[]
  error?: string
  details?: any
}

/**
 * eBay Trading API経由でカテゴリ情報を取得
 */
export async function fetchEbayCategories(): Promise<EbayAPIResponse> {
  try {
    console.log('Fetching eBay categories...')
    
    const response = await fetch('/api/ebay/get-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      // エラーの詳細を取得
      const errorData = await response.json().catch(() => ({}))
      console.error('API Error Details:', errorData)
      
      return {
        categories: [],
        error: errorData.error || `API Error: ${response.status}`,
        details: errorData,
      }
    }

    const data = await response.json()
    console.log('API Response:', {
      count: data.categories?.length,
      firstCategory: data.categories?.[0],
    })
    
    return { categories: data.categories || [] }
  } catch (error: any) {
    console.error('eBay API Error:', error)
    return { 
      categories: [], 
      error: error.message,
      details: { stack: error.stack },
    }
  }
}

/**
 * 特定カテゴリのFVF率を取得
 */
export async function fetchCategoryFee(categoryId: string): Promise<number | null> {
  try {
    const response = await fetch('/api/ebay/get-category-fee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    return data.fvfRate
  } catch (error: any) {
    console.error('Category Fee Fetch Error:', error)
    return null
  }
}

/**
 * 複数カテゴリのFVF率を一括取得
 */
export async function fetchMultipleCategoryFees(categoryIds: string[]): Promise<Record<string, number>> {
  try {
    const response = await fetch('/api/ebay/get-multiple-category-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds }),
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    return data.fees
  } catch (error: any) {
    console.error('Multiple Category Fees Fetch Error:', error)
    return {}
  }
}

/**
 * カテゴリ情報をSupabaseに保存
 */
export async function saveCategoryFeesToDatabase(categories: EbayCategoryFee[]): Promise<{
  success: number
  failed: number
}> {
  try {
    console.log('Saving categories to database:', categories.length)
    
    const response = await fetch('/api/ebay/save-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Save API Error:', errorData)
      throw new Error(`Save API Error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Save result:', data)
    
    return { success: data.success || 0, failed: data.failed || 0 }
  } catch (error: any) {
    console.error('Save to Database Error:', error)
    return { success: 0, failed: categories.length }
  }
}
