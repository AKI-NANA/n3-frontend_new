// lib/ddp-ddu-api-fallback.ts
/**
 * DDP/DDU API フォールバック版
 * 
 * バックエンドAPI（localhost:5001）が起動していない場合、
 * Supabaseから直接データを取得する
 */

import { supabase } from '@/lib/supabase/client'

export class DDPDDUApiFallback {
  private useBackend: boolean = false

  constructor() {
    // バックエンドAPIの存在確認
    this.checkBackendAvailability()
  }

  private async checkBackendAvailability() {
    try {
      const response = await fetch('http://localhost:5001/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(1000), // 1秒でタイムアウト
      })
      this.useBackend = response.ok
    } catch (error) {
      console.warn('バックエンドAPI未起動 - Supabase直接アクセスモードに切り替え')
      this.useBackend = false
    }
  }

  /**
   * 為替レート取得
   */
  async getExchangeRate(): Promise<any> {
    if (this.useBackend) {
      try {
        const response = await fetch('http://localhost:5001/api/exchange-rate')
        return await response.json()
      } catch (error) {
        console.warn('バックエンドAPI接続失敗 - Supabaseから取得')
      }
    }

    // Supabaseから直接取得
    const { data, error } = await supabase
      .from('latest_exchange_rate')
      .select('*')
      .single()

    if (error) throw error

    return {
      spot_rate: data.spot_rate,
      buffer_percent: data.buffer_percent,
      safe_rate: data.safe_rate,
      last_updated: data.updated_at,
    }
  }

  /**
   * 燃油サーチャージ取得
   */
  async getFuelSurcharge(): Promise<any> {
    if (this.useBackend) {
      try {
        const response = await fetch('http://localhost:5001/api/fuel-surcharge')
        return await response.json()
      } catch (error) {
        console.warn('バックエンドAPI接続失敗 - デフォルト値を使用')
      }
    }

    // デフォルト値（5%）
    return {
      rate: 0.05,
      last_updated: new Date().toISOString(),
      note: 'Default value (Backend API unavailable)',
    }
  }

  /**
   * データベース状態取得
   */
  async getDatabaseStatus(): Promise<any> {
    // Supabaseから直接取得
    const [
      { count: hsCodesCount },
      { count: categoriesCount },
      { count: countriesCount },
      { count: policiesCount },
      { count: zonesCount },
    ] = await Promise.all([
      supabase.from('hs_codes').select('*', { count: 'exact', head: true }),
      supabase.from('ebay_pricing_category_fees').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('origin_countries').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('ebay_shipping_policies').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('ebay_shipping_zones').select('*', { count: 'exact', head: true }),
    ])

    return {
      status: 'ok',
      counts: {
        hs_codes: hsCodesCount || 0,
        categories: categoriesCount || 0,
        countries: countriesCount || 0,
        policies: policiesCount || 0,
        zones: zonesCount || 0,
      },
      source: 'supabase',
      last_updated: new Date().toISOString(),
    }
  }

  /**
   * HTSコード検索
   */
  async searchHSCodes(query: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('hs_codes')
      .select('*')
      .or(`code.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(50)

    if (error) throw error
    return data || []
  }

  /**
   * 原産国一覧取得（関税率付き）
   */
  async getOriginCountries(): Promise<any[]> {
    const { data, error } = await supabase
      .from('origin_countries')
      .select('*')
      .eq('active', true)
      .order('tariff_rate', { ascending: false })
      .order('name')

    if (error) throw error

    return (data || []).map((country: any) => ({
      ...country,
      tariff_percent: Math.round((country.tariff_rate || 0) * 100 * 100) / 100,
      display_name: `${country.name} (${Math.round((country.tariff_rate || 0) * 100)}%)`,
      display_name_ja: `${country.name_ja} (${Math.round((country.tariff_rate || 0) * 100)}%)`,
    }))
  }

  /**
   * eBayカテゴリ一覧取得
   */
  async getEbayCategories(): Promise<any[]> {
    const { data, error } = await supabase
      .from('ebay_pricing_category_fees')
      .select('*')
      .eq('active', true)
      .order('category_name')

    if (error) throw error

    return (data || []).map((category: any) => ({
      ...category,
      fvf_percent: Math.round((category.fvf_rate || 0) * 100 * 100) / 100,
      display_name: `${category.category_name} (FVF: ${Math.round((category.fvf_rate || 0) * 100)}%)`,
    }))
  }
}

// シングルトンインスタンス
export const ddpDduApi = new DDPDDUApiFallback()
