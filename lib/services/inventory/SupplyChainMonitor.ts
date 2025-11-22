/**
 * サプライチェーン監視サービス
 *
 * Task D-4: 在庫切れ時の自動停止（ルール8）とHTML解析エラー検知（ルール14）を実装
 *
 * このサービスは：
 * - 仕入れ先の在庫切れを監視
 * - 複数仕入れ元のロジック
 * - HTML解析エラーの検知とアラート
 */

import { createClient } from '@/lib/supabase/client'
import type {
  SupplierConfig,
  HtmlParseError,
  SupplyChainStatus,
  OutOfStockAutoAction,
  SupplyChainMonitoring
} from '@/types/dynamicPricing'

const supabase = createClient()

/**
 * 在庫チェック結果
 */
export interface StockCheckResult {
  success: boolean
  stock_level: number
  supplier_id: string
  error?: HtmlParseError
  checked_at: string
}

/**
 * SupplyChainMonitor クラス
 */
export class SupplyChainMonitor {
  /**
   * ルール8: 在庫切れ時の自動停止
   *
   * 在庫がなくなった場合、該当出品の在庫を自動で「0」に更新し、
   * 売れ残りリスクを排除する
   *
   * @param product_id 商品ID
   * @param sku SKU
   * @param action 在庫切れ時のアクション
   */
  async handleOutOfStock(
    product_id: string,
    sku: string,
    action: OutOfStockAutoAction = 'set_inventory_zero'
  ): Promise<void> {
    try {
      switch (action) {
        case 'set_inventory_zero':
          // 在庫を0に設定
          await this.setInventoryToZero(product_id, sku)
          console.log(`✅ 在庫を0に設定: SKU=${sku}`)
          break

        case 'pause_listing':
          // 出品を一時停止
          await this.pauseListing(product_id, sku)
          console.log(`⏸️ 出品を一時停止: SKU=${sku}`)
          break

        case 'end_listing':
          // 出品を終了
          await this.endListing(product_id, sku)
          console.log(`🛑 出品を終了: SKU=${sku}`)
          break

        case 'notify_only':
          // 通知のみ（自動変更なし）
          await this.notifyOutOfStock(product_id, sku)
          console.log(`📧 在庫切れ通知を送信: SKU=${sku}`)
          break

        default:
          console.warn(`未知のアクション: ${action}`)
      }
    } catch (error) {
      console.error(`在庫切れ処理エラー: SKU=${sku}`, error)
      throw error
    }
  }

  /**
   * 在庫を0に設定
   */
  private async setInventoryToZero(product_id: string, sku: string): Promise<void> {
    const { error } = await supabase
      .from('products_master')
      .update({
        // listing_data JSONB フィールド内の inventory を更新
        listing_data: supabase.rpc('jsonb_set', {
          target: 'listing_data',
          path: '{inventory}',
          new_value: '0'
        })
      })
      .eq('id', product_id)

    if (error) {
      console.error('在庫0設定エラー:', error)
      throw error
    }
  }

  /**
   * 出品を一時停止
   */
  private async pauseListing(product_id: string, sku: string): Promise<void> {
    const { error } = await supabase
      .from('products_master')
      .update({
        // listing_status を 'paused' に設定
        listing_data: supabase.rpc('jsonb_set', {
          target: 'listing_data',
          path: '{listing_status}',
          new_value: '"paused"'
        })
      })
      .eq('id', product_id)

    if (error) {
      console.error('出品一時停止エラー:', error)
      throw error
    }
  }

  /**
   * 出品を終了
   */
  private async endListing(product_id: string, sku: string): Promise<void> {
    const { error } = await supabase
      .from('products_master')
      .update({
        listing_data: supabase.rpc('jsonb_set', {
          target: 'listing_data',
          path: '{listing_status}',
          new_value: '"ended"'
        })
      })
      .eq('id', product_id)

    if (error) {
      console.error('出品終了エラー:', error)
      throw error
    }
  }

  /**
   * 在庫切れ通知を送信
   */
  private async notifyOutOfStock(product_id: string, sku: string): Promise<void> {
    // TODO: 通知システムとの連携（メール、Slack、など）
    console.log(`📧 在庫切れ通知: SKU=${sku}, Product ID=${product_id}`)

    // 将来的には通知テーブルに記録
    // await supabase.from('notifications').insert({ ... })
  }

  /**
   * ルール9: 複数仕入れ元と価格変動
   *
   * 複数の仕入れ先を登録し、仕入れ先の優先順位とそれぞれの原価に応じて、
   * 販売価格を自動で変動させる
   *
   * @param product_id 商品ID
   * @param sku SKU
   * @returns アクティブな仕入れ先と在庫状況
   */
  async getActiveSupplier(product_id: string, sku: string): Promise<SupplierConfig | null> {
    try {
      // 商品の現在のサプライヤーIDを取得
      const { data: product, error: productError } = await supabase
        .from('products_master')
        .select('active_supplier_id')
        .eq('id', product_id)
        .single()

      if (productError || !product?.active_supplier_id) {
        console.warn(`商品のアクティブサプライヤーが設定されていません: SKU=${sku}`)
        return null
      }

      // サプライヤー情報を取得
      const { data: supplier, error: supplierError } = await supabase
        .from('supplier_master')
        .select('*')
        .eq('id', product.active_supplier_id)
        .eq('is_active', true)
        .single()

      if (supplierError || !supplier) {
        console.warn(`サプライヤー情報が取得できません: ID=${product.active_supplier_id}`)
        return null
      }

      return {
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name,
        priority: supplier.priority,
        base_cost_usd: supplier.base_cost_multiplier || 0,
        shipping_cost_usd: supplier.shipping_cost_base_usd || 0,
        lead_time_days: supplier.lead_time_days || 0,
        is_active: supplier.is_active,
        stock_check_url: supplier.stock_check_url,
        html_selector: supplier.html_selector
      }
    } catch (error) {
      console.error('サプライヤー取得エラー:', error)
      return null
    }
  }

  /**
   * バックアップサプライヤーに切り替え
   */
  async switchToBackupSupplier(product_id: string, sku: string): Promise<SupplierConfig | null> {
    try {
      // 優先順位順にバックアップサプライヤーを取得
      const { data: suppliers, error } = await supabase
        .from('supplier_master')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .limit(5)

      if (error || !suppliers || suppliers.length === 0) {
        console.warn('バックアップサプライヤーが見つかりません')
        return null
      }

      // 最優先のサプライヤーを選択
      const newSupplier = suppliers[0]

      // 商品のactive_supplier_idを更新
      await supabase
        .from('products_master')
        .update({ active_supplier_id: newSupplier.id })
        .eq('id', product_id)

      console.log(`✅ サプライヤー切り替え: SKU=${sku}, New Supplier=${newSupplier.supplier_name}`)

      return {
        supplier_id: newSupplier.id,
        supplier_name: newSupplier.supplier_name,
        priority: newSupplier.priority,
        base_cost_usd: newSupplier.base_cost_multiplier || 0,
        shipping_cost_usd: newSupplier.shipping_cost_base_usd || 0,
        lead_time_days: newSupplier.lead_time_days || 0,
        is_active: newSupplier.is_active,
        stock_check_url: newSupplier.stock_check_url,
        html_selector: newSupplier.html_selector
      }
    } catch (error) {
      console.error('サプライヤー切り替えエラー:', error)
      return null
    }
  }

  /**
   * ルール14: HTML解析エラー表示
   *
   * 在庫管理のHTML解析時にエラーが出たら、ユーザーの管理画面に
   * エラーの原因を明確に表示する
   *
   * @param error HTML解析エラー情報
   */
  async recordHtmlParseError(error: Omit<HtmlParseError, 'error_id'>): Promise<string> {
    try {
      const error_id = `ERROR-${Date.now()}-${Math.random().toString(36).substring(7)}`

      const { data, error: insertError } = await supabase
        .from('html_parse_errors')
        .insert({
          error_id,
          supplier_id: error.supplier_id,
          product_id: error.product_id,
          sku: error.sku,
          error_type: error.error_type,
          error_message: error.error_message,
          error_details: error.error_details,
          html_snapshot: error.html_snapshot,
          occurred_at: error.occurred_at,
          resolved: false
        })
        .select()
        .single()

      if (insertError) {
        console.error('HTML解析エラー記録失敗:', insertError)
        throw insertError
      }

      console.log(`🔴 HTML解析エラーを記録: ${error_id}`)
      return error_id
    } catch (error) {
      console.error('HTML解析エラー記録エラー:', error)
      throw error
    }
  }

  /**
   * HTML解析エラーを解決済みにマーク
   */
  async resolveHtmlParseError(error_id: string, resolved_by: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('html_parse_errors')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by
        })
        .eq('error_id', error_id)

      if (error) {
        console.error('エラー解決マークエラー:', error)
        throw error
      }

      console.log(`✅ HTML解析エラーを解決済みにマーク: ${error_id}`)
    } catch (error) {
      console.error('エラー解決マークエラー:', error)
      throw error
    }
  }

  /**
   * 未解決のHTML解析エラーを取得
   */
  async getUnresolvedErrors(limit: number = 50): Promise<HtmlParseError[]> {
    try {
      const { data, error } = await supabase
        .from('html_parse_errors')
        .select('*')
        .eq('resolved', false)
        .order('occurred_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('未解決エラー取得エラー:', error)
        return []
      }

      return (data || []) as HtmlParseError[]
    } catch (error) {
      console.error('未解決エラー取得エラー:', error)
      return []
    }
  }

  /**
   * 在庫チェックを実行（HTML解析）
   */
  async checkStock(
    product_id: string,
    sku: string,
    supplier: SupplierConfig
  ): Promise<StockCheckResult> {
    const checked_at = new Date().toISOString()

    try {
      // stock_check_url が設定されていない場合
      if (!supplier.stock_check_url || !supplier.html_selector) {
        return {
          success: false,
          stock_level: 0,
          supplier_id: supplier.supplier_id,
          error: {
            error_id: '',
            supplier_id: supplier.supplier_id,
            product_id,
            sku,
            error_type: 'parsing_failed',
            error_message: '在庫チェックURLまたはHTMLセレクターが設定されていません',
            occurred_at: checked_at,
            resolved: false
          },
          checked_at
        }
      }

      // HTML解析を実行（実際の実装ではPuppeteerやCheerioを使用）
      const stockLevel = await this.parseStockFromHtml(
        supplier.stock_check_url,
        supplier.html_selector
      )

      // 在庫チェック結果を記録
      await this.recordStockCheck(product_id, sku, supplier.supplier_id, stockLevel, 'success')

      return {
        success: true,
        stock_level: stockLevel,
        supplier_id: supplier.supplier_id,
        checked_at
      }
    } catch (error) {
      // HTML解析エラーを記録
      const parseError: Omit<HtmlParseError, 'error_id'> = {
        supplier_id: supplier.supplier_id,
        product_id,
        sku,
        error_type: 'parsing_failed',
        error_message: error instanceof Error ? error.message : '不明なエラー',
        error_details: error instanceof Error ? error.stack : undefined,
        occurred_at: checked_at,
        resolved: false
      }

      const error_id = await this.recordHtmlParseError(parseError)

      // 在庫チェック結果を記録（エラー）
      await this.recordStockCheck(product_id, sku, supplier.supplier_id, 0, 'error', error_id)

      return {
        success: false,
        stock_level: 0,
        supplier_id: supplier.supplier_id,
        error: { ...parseError, error_id },
        checked_at
      }
    }
  }

  /**
   * HTMLから在庫数を解析（モック実装）
   *
   * 実際の実装では、PuppeteerやCheerioを使用してHTMLを解析します
   */
  private async parseStockFromHtml(url: string, selector: string): Promise<number> {
    // TODO: 実際のHTML解析実装
    // const browser = await puppeteer.launch()
    // const page = await browser.newPage()
    // await page.goto(url)
    // const stockText = await page.$eval(selector, el => el.textContent)
    // const stockLevel = parseInt(stockText || '0', 10)
    // await browser.close()
    // return stockLevel

    // モック実装
    console.log(`📡 在庫チェック: URL=${url}, Selector=${selector}`)
    return Math.floor(Math.random() * 100)
  }

  /**
   * 在庫チェック結果を記録
   */
  private async recordStockCheck(
    product_id: string,
    sku: string,
    supplier_id: string,
    stock_level: number,
    check_status: 'success' | 'error' | 'pending',
    error_id?: string
  ): Promise<void> {
    try {
      const next_check_at = new Date()
      next_check_at.setHours(next_check_at.getHours() + 24) // 24時間後

      const { error } = await supabase
        .from('supply_chain_monitoring')
        .insert({
          product_id,
          sku,
          supplier_id,
          stock_level,
          last_checked_at: new Date().toISOString(),
          next_check_at: next_check_at.toISOString(),
          check_status,
          error_id
        })

      if (error) {
        console.error('在庫チェック記録エラー:', error)
      }
    } catch (error) {
      console.error('在庫チェック記録エラー:', error)
    }
  }

  /**
   * サプライチェーン状態を取得
   */
  async getSupplyChainStatus(product_id: string, sku: string): Promise<SupplyChainStatus | null> {
    try {
      const activeSupplier = await this.getActiveSupplier(product_id, sku)

      if (!activeSupplier) {
        return null
      }

      // 在庫チェック履歴を取得
      const { data: monitoring, error: monitoringError } = await supabase
        .from('supply_chain_monitoring')
        .select('*')
        .eq('product_id', product_id)
        .eq('supplier_id', activeSupplier.supplier_id)
        .order('last_checked_at', { ascending: false })
        .limit(1)
        .single()

      const currentStockLevel = monitoring?.stock_level || 0
      const lastCheckedAt = monitoring?.last_checked_at || new Date().toISOString()
      const nextCheckAt = monitoring?.next_check_at || new Date().toISOString()

      // 未解決エラーを取得
      const { data: errors, error: errorsError } = await supabase
        .from('html_parse_errors')
        .select('*')
        .eq('product_id', product_id)
        .eq('supplier_id', activeSupplier.supplier_id)
        .eq('resolved', false)
        .order('occurred_at', { ascending: false })
        .limit(5)

      const recentErrors = (errors || []) as HtmlParseError[]

      return {
        product_id,
        sku,
        active_supplier: activeSupplier,
        backup_suppliers: [], // TODO: バックアップサプライヤーリストを取得
        current_stock_level: currentStockLevel,
        last_checked_at: lastCheckedAt,
        next_check_at: nextCheckAt,
        has_errors: recentErrors.length > 0,
        recent_errors: recentErrors
      }
    } catch (error) {
      console.error('サプライチェーン状態取得エラー:', error)
      return null
    }
  }
}

/**
 * シングルトンインスタンス
 */
export const supplyChainMonitor = new SupplyChainMonitor()
