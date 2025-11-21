/**
 * Domestic FBA Arbitrage Service
 *
 * Purpose: 自国完結型FBA刈り取りの完全自動化
 * - US→US FBA
 * - JP→JP FBA
 *
 * フロー：
 * 1. Keepaで高スコア商品をスキャン
 * 2. P-4/P-1スコアが閾値を超える商品を特定
 * 3. Amazon.comで自動購入（予定）
 * 4. FBA納品プラン作成
 * 5. FBA倉庫へ発送
 */

import { keepaClient } from '@/lib/keepa/keepa-api-client'
import { AmazonSPAPIClient } from '@/lib/amazon/sp-api-client'
import { createClient } from '@/lib/supabase/server'
import type { KeepaProduct, CombinedScore } from '@/types/keepa'

export interface ArbitrageOpportunity {
  asin: string
  title: string
  marketplace: 'US' | 'JP'
  currentPrice: number
  avgPrice: number
  bsr: number
  p4Score: number
  p1Score: number
  combinedScore: CombinedScore
  estimatedProfit: number
  estimatedMargin: number
  recommendation: 'excellent' | 'good' | 'moderate' | 'none'
}

export interface ArbitragePurchaseRequest {
  asin: string
  quantity: number
  marketplace: 'US' | 'JP'
  maxPrice: number
}

export interface ArbitrageFBAShipmentRequest {
  asins: string[]
  marketplace: 'US' | 'JP'
  shipFromAddress: {
    name: string
    addressLine1: string
    city: string
    stateOrProvinceCode: string
    postalCode: string
    countryCode: string
  }
}

export class DomesticFBAArbitrageService {
  /**
   * スキャン実行：P-4/P-1高スコア商品を検出
   */
  async scanOpportunities(
    marketplace: 'US' | 'JP',
    minScore: number = 40,
    maxResults: number = 50
  ): Promise<ArbitrageOpportunity[]> {
    const domain = keepaClient.getDomainFromCountry(marketplace)

    // Keepa Deals APIで価格下落商品を取得（P-1候補）
    const deals = await keepaClient.findDeals({
      domain,
      minDiscount: 20,
      maxCurrentPrice: 200
    })

    const opportunities: ArbitrageOpportunity[] = []

    for (const product of deals) {
      const combinedScore = keepaClient.calculateCombinedScore(product)

      if (combinedScore.primaryScore >= minScore) {
        const currentPrice = product.stats?.current?.[0] ? product.stats.current[0] / 100 : 0
        const avgPrice = product.stats?.avg?.[0] ? product.stats.avg[0] / 100 : 0
        const bsr = product.stats?.current?.[3] || 999999

        // 利益計算（簡易版）
        const fbaFee = this.estimateFBAFee(currentPrice)
        const referralFee = currentPrice * 0.15 // Amazon referral fee (15%)
        const estimatedProfit = avgPrice - currentPrice - fbaFee - referralFee
        const estimatedMargin = (estimatedProfit / avgPrice) * 100

        opportunities.push({
          asin: product.asin,
          title: product.title || 'Unknown',
          marketplace,
          currentPrice,
          avgPrice,
          bsr,
          p4Score: combinedScore.p4Score.totalScore,
          p1Score: combinedScore.p1Score.totalScore,
          combinedScore,
          estimatedProfit,
          estimatedMargin,
          recommendation: combinedScore.p4Score.recommendation
        })
      }
    }

    // スコア順にソート
    opportunities.sort((a, b) => b.combinedScore.primaryScore - a.combinedScore.primaryScore)

    return opportunities.slice(0, maxResults)
  }

  /**
   * FBA手数料の簡易推定
   */
  private estimateFBAFee(price: number): number {
    // Amazon FBA料金の簡易計算
    // 実際はサイズ・重量に基づく正確な計算が必要
    if (price < 10) return 2.50
    if (price < 25) return 3.50
    if (price < 50) return 4.50
    if (price < 100) return 6.50
    return 8.50
  }

  /**
   * 購入実行（プレースホルダー）
   *
   * 注意：実際の自動購入にはAmazon購入APIまたはヘッドレスブラウザが必要
   * 現時点では手動購入を前提とし、購入記録のみを保存
   */
  async recordPurchase(request: ArbitragePurchaseRequest) {
    const supabase = createClient()

    // 購入記録をDBに保存
    const { data, error } = await supabase
      .from('arbitrage_purchases')
      .insert({
        asin: request.asin,
        quantity: request.quantity,
        marketplace: request.marketplace,
        max_price: request.maxPrice,
        status: 'pending_manual_purchase',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record purchase: ${error.message}`)
    }

    return data
  }

  /**
   * FBA納品プラン自動作成
   */
  async createFBAShipment(request: ArbitrageFBAShipmentRequest) {
    const spClient = new AmazonSPAPIClient(request.marketplace)

    // 各ASINの商品情報を取得
    const items = []

    for (const asin of request.asins) {
      // Catalog APIで商品情報取得
      const catalogItem = await spClient.getCatalogItem(asin)

      items.push({
        sellerSKU: `ARB-${asin}-${Date.now()}`, // 自動生成SKU
        quantity: 1, // デフォルト数量
        asin
      })
    }

    // FBA納品プラン作成
    const shipmentResult = await spClient.createInboundShipmentPlan(
      items,
      request.shipFromAddress
    )

    return shipmentResult
  }

  /**
   * 完全自動化フロー（実験的）
   *
   * 1. スキャン
   * 2. 上位N件を選択
   * 3. 購入記録
   * 4. FBA納品プラン作成（購入完了後）
   */
  async runFullAutomation(
    marketplace: 'US' | 'JP',
    minScore: number = 70,
    maxItems: number = 10,
    shipFromAddress: any
  ) {
    console.log(`🚀 Starting domestic FBA arbitrage automation for ${marketplace}...`)

    // Step 1: スキャン
    console.log('📊 Step 1: Scanning opportunities...')
    const opportunities = await this.scanOpportunities(marketplace, minScore, maxItems)
    console.log(`✅ Found ${opportunities.length} opportunities`)

    if (opportunities.length === 0) {
      return {
        success: false,
        message: 'No opportunities found with the specified criteria',
        opportunities: []
      }
    }

    // Step 2: 購入記録（上位5件）
    console.log('🛒 Step 2: Recording purchases...')
    const topOpportunities = opportunities.slice(0, Math.min(5, opportunities.length))
    const purchases = []

    for (const opp of topOpportunities) {
      try {
        const purchase = await this.recordPurchase({
          asin: opp.asin,
          quantity: 1,
          marketplace,
          maxPrice: opp.currentPrice * 1.1 // 10%バッファ
        })

        purchases.push(purchase)
        console.log(`✅ Recorded purchase for ASIN: ${opp.asin}`)
      } catch (error) {
        console.error(`❌ Failed to record purchase for ASIN: ${opp.asin}`, error)
      }
    }

    // Step 3: DBに機会を保存
    console.log('💾 Step 3: Saving opportunities to database...')
    const supabase = createClient()

    for (const opp of opportunities) {
      try {
        // Keepa同期APIを使用してDBに保存
        await fetch('/api/keepa/sync-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asin: opp.asin,
            domain: keepaClient.getDomainFromCountry(marketplace)
          })
        })
      } catch (error) {
        console.error(`Failed to sync ${opp.asin}:`, error)
      }
    }

    console.log('✅ Automation complete!')

    return {
      success: true,
      message: `Successfully processed ${opportunities.length} opportunities and recorded ${purchases.length} purchases`,
      opportunities,
      purchases,
      nextSteps: [
        '1. 手動でAmazon.comにて商品を購入',
        '2. 購入完了後、FBA納品プラン作成',
        '3. 商品をFBA倉庫へ発送'
      ]
    }
  }

  /**
   * 機会のモニタリング（定期実行用）
   */
  async monitorOpportunities(marketplace: 'US' | 'JP') {
    const opportunities = await this.scanOpportunities(marketplace, 40, 100)

    const supabase = createClient()

    // 高スコア機会を通知用テーブルに保存
    const highPriorityOpps = opportunities.filter(opp =>
      opp.combinedScore.urgency === 'high' &&
      opp.combinedScore.primaryScore >= 70
    )

    if (highPriorityOpps.length > 0) {
      await supabase
        .from('arbitrage_alerts')
        .insert(
          highPriorityOpps.map(opp => ({
            asin: opp.asin,
            marketplace,
            score: opp.combinedScore.primaryScore,
            strategy: opp.combinedScore.primaryStrategy,
            urgency: opp.combinedScore.urgency,
            estimated_profit: opp.estimatedProfit,
            current_price: opp.currentPrice,
            alert_type: 'high_score_opportunity',
            created_at: new Date().toISOString()
          }))
        )

      console.log(`🚨 ${highPriorityOpps.length} high-priority opportunities detected!`)
    }

    return {
      total: opportunities.length,
      highPriority: highPriorityOpps.length,
      opportunities: highPriorityOpps
    }
  }
}

// シングルトンインスタンス
export const domesticFBAArbitrage = new DomesticFBAArbitrageService()
