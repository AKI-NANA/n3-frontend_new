import { createClient } from '@supabase/supabase-js'
import { AmazonAPIClient } from './amazon-api-client'
import { AmazonUpdateQueue } from '@/types/amazon-strategy'

/**
 * Amazon更新キュープロセッサー
 * キューからASINを取り出してAmazon APIで更新し、
 * アダプティブ遅延処理でレートリミットを回避します
 */
export class QueueProcessor {
  private supabase: ReturnType<typeof createClient>
  private amazonClient: AmazonAPIClient
  private isProcessing: boolean = false
  private currentDelay: number = 5000 // 初期遅延: 5秒
  private minDelay: number = 5000 // 最小遅延: 5秒
  private maxDelay: number = 60000 // 最大遅延: 60秒
  private consecutiveErrors: number = 0
  private maxConsecutiveErrors: number = 5
  private maxRetries: number = 3

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.amazonClient = new AmazonAPIClient()
  }

  /**
   * キュー処理を開始
   */
  async startProcessing(options: {
    batchSize?: number
    maxProcessingTime?: number
  } = {}) {
    if (this.isProcessing) {
      console.log('Queue processor is already running')
      return
    }

    this.isProcessing = true
    const batchSize = options.batchSize || 10
    const maxProcessingTime = options.maxProcessingTime || 3600000 // 1時間
    const startTime = Date.now()

    console.log('Queue processor started')

    try {
      while (this.isProcessing) {
        // 最大処理時間チェック
        if (Date.now() - startTime > maxProcessingTime) {
          console.log('Max processing time reached, stopping processor')
          break
        }

        // ペンディング状態のキューアイテムを取得
        const { data: queueItems, error } = await this.supabase
          .from('amazon_update_queue')
          .select('*')
          .eq('status', 'pending')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(batchSize)

        if (error) {
          console.error('Failed to fetch queue items:', error)
          await this.sleep(this.currentDelay)
          continue
        }

        if (!queueItems || queueItems.length === 0) {
          console.log('No pending items in queue, waiting...')
          await this.sleep(30000) // 30秒待機
          continue
        }

        console.log(`Processing ${queueItems.length} items from queue`)

        // 各アイテムを処理
        for (const item of queueItems) {
          if (!this.isProcessing) break

          await this.processQueueItem(item)

          // アダプティブ遅延
          await this.sleep(this.currentDelay)
        }
      }
    } catch (error) {
      console.error('Queue processor error:', error)
    } finally {
      this.isProcessing = false
      console.log('Queue processor stopped')
    }
  }

  /**
   * キュー処理を停止
   */
  stopProcessing() {
    console.log('Stopping queue processor...')
    this.isProcessing = false
  }

  /**
   * 個別のキューアイテムを処理
   */
  private async processQueueItem(item: AmazonUpdateQueue): Promise<void> {
    try {
      // ステータスを「処理中」に更新
      await this.supabase
        .from('amazon_update_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      console.log(`Processing ASIN: ${item.asin}`)

      // Amazon APIでアイテムを取得
      const result = await this.amazonClient.getItems([item.asin])

      if (!result || !result.ItemsResult || !result.ItemsResult.Items || result.ItemsResult.Items.length === 0) {
        throw new Error('No data returned from Amazon API')
      }

      const amazonItem = result.ItemsResult.Items[0]

      // Amazon Productsテーブルを更新
      const productData = {
        asin: amazonItem.ASIN,
        title: amazonItem.ItemInfo?.Title?.DisplayValue,
        brand: amazonItem.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
        current_price: amazonItem.Offers?.Listings?.[0]?.Price?.Amount,
        currency: amazonItem.Offers?.Listings?.[0]?.Price?.Currency,
        availability_status: amazonItem.Offers?.Listings?.[0]?.Availability?.Type,
        availability_message: amazonItem.Offers?.Listings?.[0]?.Availability?.Message,
        is_prime_eligible: amazonItem.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible,
        is_amazon_fulfilled: amazonItem.Offers?.Listings?.[0]?.DeliveryInfo?.IsAmazonFulfilled,
        images_primary: amazonItem.Images?.Primary,
        images_variants: amazonItem.Images?.Variants,
        features: amazonItem.ItemInfo?.Features?.DisplayValues,
        last_api_update_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await this.supabase
        .from('amazon_products')
        .upsert(productData, { onConflict: 'asin' })

      // キューアイテムを「完了」に更新
      await this.supabase
        .from('amazon_update_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      // 成功したのでエラーカウントをリセット
      this.consecutiveErrors = 0

      // 遅延を減少（成功が続く場合）
      if (this.currentDelay > this.minDelay) {
        this.currentDelay = Math.max(this.minDelay, this.currentDelay * 0.9)
        console.log(`Delay decreased to ${this.currentDelay}ms`)
      }

      console.log(`Successfully processed ASIN: ${item.asin}`)
    } catch (error: any) {
      console.error(`Failed to process ASIN ${item.asin}:`, error)

      this.consecutiveErrors++

      // アダプティブ遅延: エラーが連続する場合、遅延を増加
      if (this.consecutiveErrors >= 3) {
        this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 2)
        console.log(`Consecutive errors detected. Delay increased to ${this.currentDelay}ms`)
      }

      // リトライ回数をチェック
      const newRetryCount = item.retry_count + 1

      if (newRetryCount >= this.maxRetries) {
        // 最大リトライ回数に達した場合、失敗としてマーク
        await this.supabase
          .from('amazon_update_queue')
          .update({
            status: 'failed',
            retry_count: newRetryCount,
            last_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        console.log(`ASIN ${item.asin} marked as failed after ${newRetryCount} retries`)
      } else {
        // ペンディングに戻してリトライ
        await this.supabase
          .from('amazon_update_queue')
          .update({
            status: 'pending',
            retry_count: newRetryCount,
            last_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        console.log(`ASIN ${item.asin} reset to pending for retry (attempt ${newRetryCount})`)
      }

      // 連続エラーが多い場合、処理を一時停止
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error(`Too many consecutive errors (${this.consecutiveErrors}), pausing for ${this.maxDelay}ms`)
        await this.sleep(this.maxDelay)
        this.consecutiveErrors = 0 // リセット
      }
    }
  }

  /**
   * 遅延処理
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 現在の処理状態を取得
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentDelay: this.currentDelay,
      consecutiveErrors: this.consecutiveErrors
    }
  }
}

/**
 * シングルトンプロセッサー（オプション）
 */
let globalProcessor: QueueProcessor | null = null

export function getGlobalQueueProcessor(supabaseUrl: string, supabaseKey: string): QueueProcessor {
  if (!globalProcessor) {
    globalProcessor = new QueueProcessor(supabaseUrl, supabaseKey)
  }
  return globalProcessor
}
