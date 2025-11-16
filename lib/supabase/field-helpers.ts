// lib/supabase/field-helpers.ts
/**
 * products_master 標準フィールド取得ヘルパー
 * 全ツールで統一されたデータ取得ロジック
 */

export const ProductFieldHelpers = {
  /**
   * 価格を取得（優先順位: price_jpy > purchase_price_jpy > current_price）
   */
  getPrice(product: any): number | null {
    const price = product.price_jpy 
      || product.purchase_price_jpy 
      || product.current_price
    
    if (!price || price <= 0) return null
    
    // 文字列の場合は数値に変換
    if (typeof price === 'string') {
      const parsed = parseFloat(price)
      return isNaN(parsed) ? null : parsed
    }
    
    return typeof price === 'number' ? price : null
  },

  /**
   * 重量を取得（g単位、型変換付き）
   */
  getWeightG(product: any): number | null {
    const listingData = product.listing_data || {}
    const weight = listingData.weight_g
    
    if (!weight) return null
    
    // 文字列の場合は数値に変換
    if (typeof weight === 'string') {
      const parsed = parseFloat(weight)
      return isNaN(parsed) || parsed <= 0 ? null : parsed
    }
    
    // 既に数値の場合
    if (typeof weight === 'number') {
      return weight > 0 ? weight : null
    }
    
    return null
  },

  /**
   * サイズを取得（cm単位、型変換付き）
   */
  getDimensions(product: any): { length: number; width: number; height: number } {
    const listingData = product.listing_data || {}
    
    const parseDimension = (value: any, defaultValue: number): number => {
      if (!value) return defaultValue
      
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed
      }
      
      if (typeof value === 'number') {
        return value > 0 ? value : defaultValue
      }
      
      return defaultValue
    }
    
    return {
      length: parseDimension(listingData.length_cm, 20),
      width: parseDimension(listingData.width_cm, 15),
      height: parseDimension(listingData.height_cm, 10)
    }
  },

  /**
   * タイトルを取得（英語優先）
   */
  getTitle(product: any): string {
    return product.title_en || product.title || ''
  },

  /**
   * 説明を取得（英語優先）
   */
  getDescription(product: any): string {
    return product.description_en || product.description || ''
  },

  /**
   * 画像を取得（複数ソース対応）
   */
  getImages(product: any): string[] {
    // images (JSONB)
    if (product.images) {
      if (Array.isArray(product.images)) {
        return product.images.filter(img => img && typeof img === 'string')
      }
    }
    
    // gallery_images (JSONB)
    if (product.gallery_images) {
      if (Array.isArray(product.gallery_images)) {
        return product.gallery_images.filter(img => img && typeof img === 'string')
      }
    }
    
    // scraped_data.images
    if (product.scraped_data?.images) {
      if (Array.isArray(product.scraped_data.images)) {
        return product.scraped_data.images.filter(img => img && typeof img === 'string')
      }
    }
    
    // image_urls (ARRAY)
    if (product.image_urls && Array.isArray(product.image_urls)) {
      return product.image_urls.filter(img => img && typeof img === 'string')
    }
    
    // primary_image_url
    if (product.primary_image_url && typeof product.primary_image_url === 'string') {
      return [product.primary_image_url]
    }
    
    return []
  },

  /**
   * カテゴリを取得
   */
  getCategory(product: any): string {
    return product.category || product.category_id || ''
  },

  /**
   * 送料計算用の必須データ検証
   */
  validateForShipping(product: any): { valid: boolean; missing: string[] } {
    const missing: string[] = []
    
    const price = this.getPrice(product)
    if (!price || price <= 0) {
      missing.push('price (price_jpy/purchase_price_jpy/current_price)')
    }
    
    const weight = this.getWeightG(product)
    if (!weight || weight <= 0) {
      missing.push('weight_g (listing_data.weight_g)')
    }
    
    return {
      valid: missing.length === 0,
      missing
    }
  },

  /**
   * 利益計算用の必須データ検証
   */
  validateForProfit(product: any): { valid: boolean; missing: string[] } {
    const missing: string[] = []
    
    const price = this.getPrice(product)
    if (!price || price <= 0) {
      missing.push('price')
    }
    
    const listingData = product.listing_data || {}
    if (!listingData.ddp_price_usd) {
      missing.push('ddp_price_usd (送料計算が未実行)')
    }
    
    return {
      valid: missing.length === 0,
      missing
    }
  },

  /**
   * SM分析/一括リサーチ用の必須データ検証
   */
  validateForResearch(product: any): { valid: boolean; missing: string[] } {
    const missing: string[] = []
    
    const title = this.getTitle(product)
    if (!title) {
      missing.push('title (title_en/title)')
    }
    
    return {
      valid: missing.length === 0,
      missing
    }
  },

  /**
   * HTML生成用の必須データ検証
   */
  validateForHTML(product: any): { valid: boolean; missing: string[] } {
    const missing: string[] = []
    
    const title = this.getTitle(product)
    if (!title) {
      missing.push('title')
    }
    
    const description = this.getDescription(product)
    if (!description) {
      missing.push('description')
    }
    
    const images = this.getImages(product)
    if (images.length === 0) {
      missing.push('images')
    }
    
    return {
      valid: missing.length === 0,
      missing
    }
  },

  /**
   * デバッグ情報を生成
   */
  getDebugInfo(product: any): any {
    return {
      id: product.id,
      title: this.getTitle(product),
      price: {
        price_jpy: product.price_jpy,
        purchase_price_jpy: product.purchase_price_jpy,
        current_price: product.current_price,
        resolved: this.getPrice(product)
      },
      weight: {
        raw: product.listing_data?.weight_g,
        type: typeof product.listing_data?.weight_g,
        resolved: this.getWeightG(product)
      },
      dimensions: this.getDimensions(product),
      images_count: this.getImages(product).length,
      listing_data_keys: product.listing_data ? Object.keys(product.listing_data) : []
    }
  }
}
