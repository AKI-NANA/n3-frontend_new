// lib/services/euResponsiblePersonService.ts
import { createClient } from '@/lib/supabase/client'

export interface EUResponsiblePerson {
  company_name: string
  address_line1: string
  address_line2?: string
  city: string
  state_or_province?: string
  postal_code: string
  country: string // ISO 3166-1 (2文字)
  email?: string
  phone?: string
  contact_url?: string
}

export interface ProductWithEU {
  brand?: string
  manufacturer?: string
  title?: string
  // EU責任者フィールド
  eu_responsible_company_name?: string
  eu_responsible_address_line1?: string
  eu_responsible_address_line2?: string
  eu_responsible_city?: string
  eu_responsible_state_or_province?: string
  eu_responsible_postal_code?: string
  eu_responsible_country?: string
  eu_responsible_email?: string
  eu_responsible_phone?: string
  eu_responsible_contact_url?: string
  [key: string]: any // その他のフィールド
}

/**
 * EU責任者情報を自動補完するサービス
 */
export class EUResponsiblePersonService {
  private supabase = createClient()

  /**
   * 製造者名・ブランド名からEU責任者情報を検索
   */
  async findResponsiblePerson(
    manufacturer?: string,
    brand?: string
  ): Promise<EUResponsiblePerson | null> {
    if (!manufacturer && !brand) {
      return null
    }

    const searchTerms = [manufacturer, brand].filter(Boolean)

    try {
      // 1. 完全一致検索
      for (const term of searchTerms) {
        const { data, error } = await this.supabase
          .from('eu_responsible_persons')
          .select('*')
          .eq('manufacturer', term!)
          .eq('is_active', true)
          .single()

        if (data && !error) {
          return this.mapToEUPerson(data)
        }
      }

      // 2. 部分一致検索（大文字小文字無視）
      for (const term of searchTerms) {
        const { data, error } = await this.supabase
          .from('eu_responsible_persons')
          .select('*')
          .ilike('manufacturer', `%${term}%`)
          .eq('is_active', true)
          .limit(1)

        if (data && data.length > 0 && !error) {
          return this.mapToEUPerson(data[0])
        }
      }

      // 3. ブランド別名検索（配列検索）
      for (const term of searchTerms) {
        const { data, error } = await this.supabase
          .from('eu_responsible_persons')
          .select('*')
          .contains('brand_aliases', [term!])
          .eq('is_active', true)
          .limit(1)

        if (data && data.length > 0 && !error) {
          return this.mapToEUPerson(data[0])
        }
      }

      return null
    } catch (error) {
      console.error('EU責任者情報の検索エラー:', error)
      return null
    }
  }

  /**
   * 商品データにEU責任者情報を補完
   * - CSVに情報があればそれを使用
   * - なければDBから検索
   * - それでもなければ "N/A" を設定
   */
  async enrichProductWithEU(product: ProductWithEU): Promise<ProductWithEU> {
    // すでにEU情報が設定されている場合はスキップ
    if (product.eu_responsible_company_name && 
        product.eu_responsible_company_name !== 'N/A') {
      return product
    }

    // DBから検索
    const euPerson = await this.findResponsiblePerson(
      product.manufacturer || product.brand,
      product.brand
    )

    if (euPerson) {
      return {
        ...product,
        eu_responsible_company_name: euPerson.company_name,
        eu_responsible_address_line1: euPerson.address_line1,
        eu_responsible_address_line2: euPerson.address_line2,
        eu_responsible_city: euPerson.city,
        eu_responsible_state_or_province: euPerson.state_or_province,
        eu_responsible_postal_code: euPerson.postal_code,
        eu_responsible_country: euPerson.country,
        eu_responsible_email: euPerson.email,
        eu_responsible_phone: euPerson.phone,
        eu_responsible_contact_url: euPerson.contact_url
      }
    }

    // 見つからない場合は "N/A" を設定
    return {
      ...product,
      eu_responsible_company_name: 'N/A',
      eu_responsible_address_line1: 'N/A',
      eu_responsible_city: 'N/A',
      eu_responsible_postal_code: 'N/A',
      eu_responsible_country: 'N/A'
    }
  }

  /**
   * 複数商品を一括処理
   */
  async enrichMultipleProducts(products: ProductWithEU[]): Promise<ProductWithEU[]> {
    const enrichedProducts = await Promise.all(
      products.map(product => this.enrichProductWithEU(product))
    )
    return enrichedProducts
  }

  /**
   * DBレコードをEUResponsiblePersonオブジェクトにマッピング
   */
  private mapToEUPerson(data: any): EUResponsiblePerson {
    return {
      company_name: data.company_name,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state_or_province: data.state_or_province,
      postal_code: data.postal_code,
      country: data.country,
      email: data.email,
      phone: data.phone,
      contact_url: data.contact_url
    }
  }

  /**
   * eBay API用のresponsiblePersons配列を生成
   */
  generateEbayResponsiblePersons(product: ProductWithEU): any[] {
    if (!product.eu_responsible_company_name || 
        product.eu_responsible_company_name === 'N/A') {
      return []
    }

    const responsiblePerson: any = {
      companyName: product.eu_responsible_company_name,
      addressLine1: product.eu_responsible_address_line1,
      city: product.eu_responsible_city,
      postalCode: product.eu_responsible_postal_code,
      country: product.eu_responsible_country,
      types: ['EUResponsiblePerson']
    }

    // オプショナルフィールドを追加
    if (product.eu_responsible_address_line2) {
      responsiblePerson.addressLine2 = product.eu_responsible_address_line2
    }
    if (product.eu_responsible_state_or_province) {
      responsiblePerson.stateOrProvince = product.eu_responsible_state_or_province
    }
    if (product.eu_responsible_email) {
      responsiblePerson.email = product.eu_responsible_email
    }
    if (product.eu_responsible_phone) {
      responsiblePerson.phone = product.eu_responsible_phone
    }
    if (product.eu_responsible_contact_url) {
      responsiblePerson.contactUrl = product.eu_responsible_contact_url
    }

    return [responsiblePerson]
  }

  /**
   * EU責任者マスタに新規登録
   */
  async createResponsiblePerson(data: {
    manufacturer: string
    brand_aliases?: string[]
    company_name: string
    address_line1: string
    address_line2?: string
    city: string
    state_or_province?: string
    postal_code: string
    country: string
    email?: string
    phone?: string
    contact_url?: string
    country_of_origin?: string
    notes?: string
  }) {
    const { data: result, error } = await this.supabase
      .from('eu_responsible_persons')
      .insert([data])
      .select()
      .single()

    if (error) {
      throw new Error(`EU責任者の登録に失敗: ${error.message}`)
    }

    return result
  }

  /**
   * EU責任者マスタを更新
   */
  async updateResponsiblePerson(id: number, data: Partial<any>) {
    const { data: result, error } = await this.supabase
      .from('eu_responsible_persons')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`EU責任者の更新に失敗: ${error.message}`)
    }

    return result
  }

  /**
   * EU責任者マスタを取得（一覧）
   */
  async listResponsiblePersons(options?: {
    limit?: number
    offset?: number
    active_only?: boolean
  }) {
    let query = this.supabase
      .from('eu_responsible_persons')
      .select('*', { count: 'exact' })
      .order('manufacturer', { ascending: true })

    if (options?.active_only !== false) {
      query = query.eq('is_active', true)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`EU責任者一覧の取得に失敗: ${error.message}`)
    }

    return { data: data || [], count: count || 0 }
  }
}

export const euResponsiblePersonService = new EUResponsiblePersonService()
