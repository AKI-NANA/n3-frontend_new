/**
 * FulfillmentManager.ts
 *
 * ハイブリッド無在庫戦略: 規約遵守のための発送管理マネージャー
 *
 * 機能:
 * 1. 発送情報の上書き（仕入れ先情報 → 自社名義情報）
 * 2. 倉庫スタッフへの梱包指示（無地梱包、自社名義納品書）
 * 3. モール規約の完全遵守（ドロップシッピング規制の回避）
 *
 * 規約遵守の重要性:
 * - Amazon JP: 出品者名義での発送が必須（仕入れ先の名前が出ることを禁止）
 * - Yahoo!ショッピング: 同上
 * - メルカリ: 即日発送と自己名義での発送が必須
 */

import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/product'

// 発送指示の設定値
export interface FulfillmentConfig {
  businessName: string // 事業者名（発送者名義）
  warehouseAddress: string // 倉庫住所
  warehouseContactPhone: string // 倉庫連絡先電話番号
  enforceBlankPackaging: boolean // 無地梱包を強制するか（デフォルト: true）
  enforceOwnInvoice: boolean // 自社名義納品書を強制するか（デフォルト: true）
  dryRun?: boolean // テストモード
}

export interface ShipmentInstruction {
  orderId: string
  marketplace: 'amazon_jp' | 'yahoo_jp' | 'mercari_c2c' | 'qoo10'
  productId: string
  sku: string
  productName: string
  quantity: number
  shippingAddress: {
    name: string
    postalCode: string
    address: string
    phone?: string
  }
  packagingInstructions: {
    useBlankPackaging: boolean // 無地梱包を使用
    includeOwnInvoice: boolean // 自社名義納品書を同梱
    avoidSupplierBranding: boolean // 仕入れ先のブランドを避ける
    priorityShipping: boolean // 優先発送（メルカリ用）
  }
  shippingCarrier?: string // 配送業者
  trackingNumber?: string // 追跡番号（発送後に更新）
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  createdAt: string
  shippedAt?: string
}

export interface FulfillmentResult {
  success: boolean
  processedOrders: string[]
  errors: string[]
  message: string
}

/**
 * FulfillmentManager クラス
 *
 * 規約遵守のための発送管理を行うクラス
 */
export class FulfillmentManager {
  private supabase: ReturnType<typeof createClient>
  private config: Required<FulfillmentConfig>

  constructor(config: FulfillmentConfig) {
    this.supabase = createClient()
    this.config = {
      ...config,
      enforceBlankPackaging: config.enforceBlankPackaging ?? true,
      enforceOwnInvoice: config.enforceOwnInvoice ?? true,
      dryRun: config.dryRun ?? false,
    }

    console.log('📦 FulfillmentManager 初期化:', {
      businessName: this.config.businessName,
      warehouseAddress: this.config.warehouseAddress,
      enforceBlankPackaging: this.config.enforceBlankPackaging,
      enforceOwnInvoice: this.config.enforceOwnInvoice,
    })
  }

  /**
   * Step 1: 発送指示書の生成
   *
   * 受注情報をもとに、倉庫スタッフ向けの発送指示書を生成する。
   * 規約遵守のための必須事項を明記する。
   *
   * @param orderId 受注ID
   * @param marketplace 販売チャネル
   * @param productId 商品ID
   * @param quantity 販売個数
   * @param shippingAddress 配送先住所
   * @returns 発送指示書
   */
  async createShipmentInstruction(
    orderId: string,
    marketplace: 'amazon_jp' | 'yahoo_jp' | 'mercari_c2c' | 'qoo10',
    productId: string,
    quantity: number,
    shippingAddress: {
      name: string
      postalCode: string
      address: string
      phone?: string
    }
  ): Promise<ShipmentInstruction> {
    console.log(`\n📋 発送指示書を生成: Order ${orderId}`)

    // 商品情報を取得
    const { data: product, error: fetchError } = await this.supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      throw new Error(`商品が見つかりません: ${productId}`)
    }

    // 発送指示書の生成
    const instruction: ShipmentInstruction = {
      orderId,
      marketplace,
      productId,
      sku: product.sku,
      productName: product.title,
      quantity,
      shippingAddress,
      packagingInstructions: {
        useBlankPackaging: this.config.enforceBlankPackaging,
        includeOwnInvoice: this.config.enforceOwnInvoice,
        avoidSupplierBranding: true, // 常に true（規約遵守のため）
        priorityShipping: marketplace === 'mercari_c2c', // メルカリは即日発送を優先
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    console.log(`✅ 発送指示書生成完了: ${product.sku}`)
    console.log(`  梱包指示:`)
    console.log(`    - 無地梱包: ${instruction.packagingInstructions.useBlankPackaging ? 'はい' : 'いいえ'}`)
    console.log(`    - 自社名義納品書: ${instruction.packagingInstructions.includeOwnInvoice ? 'はい' : 'いいえ'}`)
    console.log(`    - 仕入れ先ブランド除去: ${instruction.packagingInstructions.avoidSupplierBranding ? 'はい' : 'いいえ'}`)
    console.log(`    - 優先発送: ${instruction.packagingInstructions.priorityShipping ? 'はい' : 'いいえ'}`)

    return instruction
  }

  /**
   * Step 2: 倉庫スタッフへの発送指示
   *
   * 生成した発送指示書を倉庫スタッフに送信する。
   * Slack、メール、専用UIなどを通じて通知する。
   *
   * @param instruction 発送指示書
   */
  async sendShipmentInstructionToWarehouse(instruction: ShipmentInstruction): Promise<void> {
    console.log(`📤 倉庫スタッフへ発送指示を送信: Order ${instruction.orderId}`)

    // 指示書をデータベースに保存
    const { error: saveError } = await this.supabase
      .from('shipment_instructions')
      .insert({
        order_id: instruction.orderId,
        marketplace: instruction.marketplace,
        product_id: instruction.productId,
        sku: instruction.sku,
        product_name: instruction.productName,
        quantity: instruction.quantity,
        shipping_address: instruction.shippingAddress,
        packaging_instructions: instruction.packagingInstructions,
        status: instruction.status,
        created_at: instruction.createdAt,
      })

    if (saveError) {
      console.error('❌ 発送指示書の保存エラー:', saveError)
      // エラーがあっても続行（通知は送信する）
    }

    // TODO: 倉庫スタッフへの通知システム統合
    // 例:
    // - Slack通知: await slackClient.send('#warehouse', instruction)
    // - メール通知: await emailService.sendToWarehouse(instruction)
    // - 専用UI: データベースに保存済みなので、UIから確認可能

    console.log(`✅ 発送指示送信完了: ${instruction.sku}`)

    // dryRunモードの場合、実際の通知はスキップ
    if (this.config.dryRun) {
      console.log(`🧪 [DRY RUN] 実際の通知はスキップ（テストモード）`)
    }
  }

  /**
   * Step 3: 発送情報の上書き（規約遵守）
   *
   * モールAPIに発送通知を送信する際、仕入れ先の情報ではなく、
   * 自社名義の情報に上書きする。
   *
   * @param instruction 発送指示書
   * @param trackingNumber 追跡番号
   * @param shippingCarrier 配送業者
   */
  async notifyMarketplaceWithOwnInfo(
    instruction: ShipmentInstruction,
    trackingNumber: string,
    shippingCarrier: string
  ): Promise<void> {
    console.log(`📤 モールAPIへ発送通知: Order ${instruction.orderId}`)

    // 自社名義の発送情報を作成
    const shipmentData = {
      orderId: instruction.orderId,
      trackingNumber,
      shippingCarrier,
      shipperName: this.config.businessName, // ⚠️ 自社名義に上書き
      shipperAddress: this.config.warehouseAddress, // ⚠️ 自社住所に上書き
      shipperPhone: this.config.warehouseContactPhone, // ⚠️ 自社電話番号に上書き
      shippedAt: new Date().toISOString(),
    }

    console.log(`  発送者情報:`)
    console.log(`    - 発送者名: ${shipmentData.shipperName}`)
    console.log(`    - 発送者住所: ${shipmentData.shipperAddress}`)
    console.log(`    - 追跡番号: ${shipmentData.trackingNumber}`)

    // dryRunモードの場合、実際のAPI呼び出しはスキップ
    if (this.config.dryRun) {
      console.log(`🧪 [DRY RUN] モールAPIへの通知はスキップ（テストモード）`)
      return
    }

    // モール別のAPI呼び出し
    switch (instruction.marketplace) {
      case 'amazon_jp':
        await this.notifyAmazonJP(shipmentData)
        break
      case 'yahoo_jp':
        await this.notifyYahooJP(shipmentData)
        break
      case 'mercari_c2c':
        await this.notifyMercari(shipmentData)
        break
      case 'qoo10':
        await this.notifyQoo10(shipmentData)
        break
      default:
        throw new Error(`未対応のマーケットプレイス: ${instruction.marketplace}`)
    }

    // データベース更新: 発送ステータスと追跡番号を記録
    await this.supabase
      .from('shipment_instructions')
      .update({
        tracking_number: trackingNumber,
        shipping_carrier: shippingCarrier,
        status: 'shipped',
        shipped_at: shipmentData.shippedAt,
      })
      .eq('order_id', instruction.orderId)

    console.log(`✅ モールAPIへの発送通知完了: ${instruction.sku}`)
  }

  /**
   * Amazon JP への発送通知
   */
  private async notifyAmazonJP(shipmentData: any): Promise<void> {
    console.log(`  → Amazon JP: 発送通知を送信...`)

    // TODO: Amazon SP-API Orders APIとの統合
    // 例: await amazonSpApiClient.updateShipmentStatus(shipmentData)

    // 暫定: API呼び出しのシミュレーション
    await new Promise(resolve => setTimeout(resolve, 200))

    console.log(`  ✅ Amazon JP: 発送通知完了`)
  }

  /**
   * Yahoo!ショッピング への発送通知
   */
  private async notifyYahooJP(shipmentData: any): Promise<void> {
    console.log(`  → Yahoo!ショッピング: 発送通知を送信...`)

    // TODO: Yahoo!ショッピング APIとの統合
    // 例: await yahooShoppingApiClient.updateShipmentStatus(shipmentData)

    // 暫定: API呼び出しのシミュレーション
    await new Promise(resolve => setTimeout(resolve, 200))

    console.log(`  ✅ Yahoo!ショッピング: 発送通知完了`)
  }

  /**
   * メルカリ への発送通知
   */
  private async notifyMercari(shipmentData: any): Promise<void> {
    console.log(`  → メルカリ: 発送通知を送信...`)

    // TODO: メルカリ APIとの統合（存在する場合）
    // 例: await mercariApiClient.updateShipmentStatus(shipmentData)

    // 暫定: API呼び出しのシミュレーション
    await new Promise(resolve => setTimeout(resolve, 200))

    console.log(`  ✅ メルカリ: 発送通知完了`)
  }

  /**
   * Qoo10 への発送通知
   */
  private async notifyQoo10(shipmentData: any): Promise<void> {
    console.log(`  → Qoo10: 発送通知を送信...`)

    // TODO: Qoo10 APIとの統合
    // 例: await qoo10ApiClient.updateShipmentStatus(shipmentData)

    // 暫定: API呼び出しのシミュレーション
    await new Promise(resolve => setTimeout(resolve, 200))

    console.log(`  ✅ Qoo10: 発送通知完了`)
  }

  /**
   * 一括発送処理
   *
   * 未処理の発送指示書を一括で処理する。
   * 倉庫スタッフへの通知を一括送信する。
   *
   * @returns 処理結果
   */
  async processPendingShipments(): Promise<FulfillmentResult> {
    console.log(`\n📦 未処理発送指示の一括処理を開始...`)

    const result: FulfillmentResult = {
      success: true,
      processedOrders: [],
      errors: [],
      message: '',
    }

    try {
      // 未処理の発送指示書を取得
      const { data, error } = await this.supabase
        .from('shipment_instructions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      console.log(`📦 未処理発送指示: ${data?.length || 0}件`)

      if (!data || data.length === 0) {
        result.message = '未処理の発送指示はありません'
        return result
      }

      // 各発送指示を処理
      for (const instruction of data) {
        try {
          // 倉庫スタッフへの通知（既に保存済みなので、UIから確認可能）
          console.log(`✅ ${instruction.sku}: 発送指示を倉庫スタッフに通知`)
          result.processedOrders.push(instruction.order_id)

          // ステータスを 'processing' に更新
          await this.supabase
            .from('shipment_instructions')
            .update({ status: 'processing' })
            .eq('order_id', instruction.order_id)

        } catch (error: any) {
          console.error(`❌ ${instruction.order_id}: 発送指示処理エラー`, error)
          result.errors.push(`${instruction.order_id}: ${error.message}`)
          result.success = false
        }
      }

      result.message = `発送指示処理完了: ${result.processedOrders.length}/${data.length}件`
      console.log(`\n📊 ${result.message}`)

    } catch (error: any) {
      console.error(`❌ 一括発送処理エラー:`, error)
      result.success = false
      result.errors.push(error.message)
      result.message = `一括発送処理失敗: ${error.message}`
    }

    return result
  }

  /**
   * 規約チェック機能
   *
   * 発送前に、規約遵守の確認を行う。
   * 無地梱包、自社名義納品書、仕入れ先ブランド除去などを確認。
   *
   * @param instruction 発送指示書
   * @returns 規約遵守チェック結果
   */
  validateComplianceRequirements(instruction: ShipmentInstruction): {
    compliant: boolean
    violations: string[]
  } {
    const violations: string[] = []

    // 無地梱包チェック
    if (this.config.enforceBlankPackaging && !instruction.packagingInstructions.useBlankPackaging) {
      violations.push('無地梱包が設定されていません')
    }

    // 自社名義納品書チェック
    if (this.config.enforceOwnInvoice && !instruction.packagingInstructions.includeOwnInvoice) {
      violations.push('自社名義納品書が設定されていません')
    }

    // 仕入れ先ブランド除去チェック
    if (!instruction.packagingInstructions.avoidSupplierBranding) {
      violations.push('仕入れ先ブランド除去が設定されていません')
    }

    const compliant = violations.length === 0

    if (!compliant) {
      console.warn(`⚠️ 規約違反の可能性: Order ${instruction.orderId}`)
      violations.forEach(v => console.warn(`  - ${v}`))
    }

    return { compliant, violations }
  }
}

/**
 * ファクトリー関数
 *
 * 簡単にFulfillmentManagerを作成するためのヘルパー関数
 */
export function createFulfillmentManager(config: FulfillmentConfig): FulfillmentManager {
  return new FulfillmentManager(config)
}

/**
 * 使用例:
 *
 * // 初期化
 * const manager = createFulfillmentManager({
 *   businessName: '株式会社サンプル',
 *   warehouseAddress: '東京都千代田区...',
 *   warehouseContactPhone: '03-1234-5678',
 *   enforceBlankPackaging: true,
 *   enforceOwnInvoice: true,
 *   dryRun: false,
 * })
 *
 * // 発送指示書の生成
 * const instruction = await manager.createShipmentInstruction(
 *   'order-123',
 *   'amazon_jp',
 *   'product-id-1',
 *   1,
 *   { name: '山田太郎', postalCode: '100-0001', address: '東京都千代田区...' }
 * )
 *
 * // 倉庫スタッフへの通知
 * await manager.sendShipmentInstructionToWarehouse(instruction)
 *
 * // 発送後、モールAPIへの通知（自社名義で上書き）
 * await manager.notifyMarketplaceWithOwnInfo(instruction, 'tracking-123', 'ヤマト運輸')
 */
