/**
 * イベント駆動型価格パトロールAPI
 * POST /api/management/price-patrol
 *
 * 目的:
 * - 子SKUのデータ変動（原価、重量、HSコード等）を検知
 * - 関連する親SKUを特定し、最大DDPコストを再計算
 * - 現在の統一価格が新しい最大DDPコストより低い場合、赤字アラート
 *
 * 実行タイミング:
 * A. イベント駆動: inventory_masterの変更時（在庫管理ツールからのWebhook）
 * B. 週次バッチ: 全親SKUの安全性チェック（セーフティネット）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const supabase = createClient()

interface PricePatrolRequest {
  mode: 'event' | 'batch'  // イベント駆動 or 週次バッチ

  // イベント駆動モードの場合
  changed_child_skus?: string[]  // 変更された子SKUのリスト

  // バッチモードの場合
  parent_sku_filter?: string  // 特定の親SKUのみチェック（オプション）
}

interface PricePatrolResult {
  parent_sku: string
  current_unified_price_usd: number
  new_max_ddp_cost_usd: number
  price_diff_usd: number
  status: 'SAFE' | 'WARNING' | 'CRITICAL'
  affected_children: string[]
  requires_price_update: boolean
  recommended_action: string
}

export async function POST(req: NextRequest) {
  try {
    const body: PricePatrolRequest = await req.json()
    const { mode, changed_child_skus, parent_sku_filter } = body

    console.log(`\n🔍 価格パトロール開始（${mode}モード）`)

    const results: PricePatrolResult[] = []
    let affectedParentSkus: string[] = []

    // ===== モード別処理 =====

    if (mode === 'event') {
      // A. イベント駆動モード: 変更された子SKUから親SKUを特定

      if (!changed_child_skus || changed_child_skus.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'イベント駆動モードでは changed_child_skus が必要です'
        }, { status: 400 })
      }

      console.log(`📝 変更検知: ${changed_child_skus.length}件の子SKU`)

      // parent_child_map から関連する親SKUを取得
      const { data: mappings, error: mappingError } = await supabase
        .from('parent_child_map')
        .select('parent_sku_id')
        .in('child_sku_id', changed_child_skus)
        .eq('is_active', true)

      if (mappingError) {
        console.error('❌ 親SKU特定エラー:', mappingError)
        return NextResponse.json({
          success: false,
          error: '親SKUの特定に失敗しました',
          details: mappingError.message
        }, { status: 500 })
      }

      if (!mappings || mappings.length === 0) {
        console.log('ℹ️ 変更された子SKUはバリエーションに含まれていません（単品出品のみ）')
        return NextResponse.json({
          success: true,
          message: '変更された子SKUはバリエーションに含まれていません',
          results: []
        })
      }

      // 重複除去
      affectedParentSkus = [...new Set(mappings.map(m => m.parent_sku_id))]
      console.log(`🎯 影響を受ける親SKU: ${affectedParentSkus.length}件`)

    } else if (mode === 'batch') {
      // B. 週次バッチモード: 全親SKU or 特定の親SKUをチェック

      let query = supabase
        .from('products_master')
        .select('sku')
        .eq('variation_type', 'Parent')

      if (parent_sku_filter) {
        query = query.eq('sku', parent_sku_filter)
      }

      const { data: parents, error: parentError } = await query

      if (parentError) {
        console.error('❌ 親SKU取得エラー:', parentError)
        return NextResponse.json({
          success: false,
          error: '親SKUの取得に失敗しました',
          details: parentError.message
        }, { status: 500 })
      }

      if (!parents || parents.length === 0) {
        console.log('ℹ️ チェック対象の親SKUがありません')
        return NextResponse.json({
          success: true,
          message: 'チェック対象の親SKUがありません',
          results: []
        })
      }

      affectedParentSkus = parents.map(p => p.sku)
      console.log(`📊 バッチチェック対象: ${affectedParentSkus.length}件`)
    }

    // ===== 各親SKUの価格パトロール実行 =====

    for (const parentSku of affectedParentSkus) {
      try {
        const result = await checkParentSkuPricing(parentSku)
        results.push(result)
      } catch (error: any) {
        console.error(`❌ ${parentSku} のチェック失敗:`, error)
        results.push({
          parent_sku: parentSku,
          current_unified_price_usd: 0,
          new_max_ddp_cost_usd: 0,
          price_diff_usd: 0,
          status: 'CRITICAL',
          affected_children: [],
          requires_price_update: false,
          recommended_action: `エラー: ${error.message}`
        })
      }
    }

    // ===== 結果サマリー =====

    const criticalCount = results.filter(r => r.status === 'CRITICAL').length
    const warningCount = results.filter(r => r.status === 'WARNING').length
    const safeCount = results.filter(r => r.status === 'SAFE').length

    console.log(`\n📊 価格パトロール結果:`)
    console.log(`  🔴 CRITICAL: ${criticalCount}件（赤字リスク！）`)
    console.log(`  🟡 WARNING: ${warningCount}件（要注意）`)
    console.log(`  🟢 SAFE: ${safeCount}件（安全）`)

    return NextResponse.json({
      success: true,
      message: `価格パトロール完了: ${results.length}件の親SKUをチェック`,
      mode,
      summary: {
        total: results.length,
        critical: criticalCount,
        warning: warningCount,
        safe: safeCount
      },
      results: results.sort((a, b) => {
        // CRITICALを最優先で表示
        const statusOrder = { CRITICAL: 0, WARNING: 1, SAFE: 2 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
    })

  } catch (error: any) {
    console.error('❌ 価格パトロールAPIエラー:', error)
    return NextResponse.json({
      success: false,
      error: '価格パトロール中にエラーが発生しました',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * 個別の親SKUの価格安全性をチェック
 */
async function checkParentSkuPricing(parentSku: string): Promise<PricePatrolResult> {
  console.log(`\n--- ${parentSku} をチェック中 ---`)

  // 1. 親SKUの現在の情報を取得
  const { data: parentProduct, error: parentError } = await supabase
    .from('products_master')
    .select('*')
    .eq('sku', parentSku)
    .eq('variation_type', 'Parent')
    .single()

  if (parentError || !parentProduct) {
    throw new Error(`親SKU取得失敗: ${parentError?.message || '見つかりません'}`)
  }

  const currentUnifiedPrice = parentProduct.listing_data?.max_ddp_cost_usd || parentProduct.price_usd || 0

  console.log(`現在の統一価格: $${currentUnifiedPrice.toFixed(2)}`)

  // 2. parent_child_map から全子SKUを取得
  const { data: childMappings, error: mappingError } = await supabase
    .from('v_parent_child_relationships')  // ビューを使用
    .select('*')
    .eq('parent_sku_id', parentSku)
    .eq('is_active', true)

  if (mappingError || !childMappings || childMappings.length === 0) {
    throw new Error(`子SKU取得失敗: ${mappingError?.message || '子SKUなし'}`)
  }

  console.log(`子SKU数: ${childMappings.length}件`)

  // 3. 各子SKUの最新DDPコストを精密計算
  const precisionCalcItems = childMappings.map(child => ({
    sku: child.child_sku,
    cost_jpy: child.cost_jpy || 0,
    weight_g: parseInt(child.ddp_weight_g) || 0,
    hs_code: child.hs_code || null,
    origin_country: child.origin_country || null
  }))

  // 精密DDP計算APIを呼び出し
  const calcResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products/calculate-precise-ddp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: precisionCalcItems })
  })

  if (!calcResponse.ok) {
    throw new Error(`精密DDP計算API失敗: ${calcResponse.status}`)
  }

  const calcResult = await calcResponse.json()

  if (!calcResult.success) {
    throw new Error(`精密DDP計算失敗: ${calcResult.error}`)
  }

  // 4. 最大DDPコストを特定
  const preciseDdpCosts = calcResult.results.map((r: any) => r.precise_ddp_cost_usd)
  const newMaxDdpCost = Math.max(...preciseDdpCosts)

  console.log(`最新の最大DDPコスト: $${newMaxDdpCost.toFixed(2)}`)

  // 5. 価格差を計算し、ステータスを判定
  const priceDiff = currentUnifiedPrice - newMaxDdpCost

  let status: 'SAFE' | 'WARNING' | 'CRITICAL'
  let recommendedAction: string

  if (priceDiff < -5) {
    // 赤字リスク: 現在価格が新DDPコストより$5以上低い
    status = 'CRITICAL'
    recommendedAction = `即座に統一価格を$${newMaxDdpCost.toFixed(2)}に更新してください（赤字リスク：$${Math.abs(priceDiff).toFixed(2)}）`
  } else if (priceDiff < 0) {
    // 警告: わずかに赤字
    status = 'WARNING'
    recommendedAction = `統一価格を$${newMaxDdpCost.toFixed(2)}に更新することを推奨（潜在的赤字：$${Math.abs(priceDiff).toFixed(2)}）`
  } else {
    // 安全: 現在価格でカバーできている
    status = 'SAFE'
    recommendedAction = '価格更新不要（現在の統一価格で全子SKUをカバーできています）'
  }

  console.log(`ステータス: ${status}`)

  return {
    parent_sku: parentSku,
    current_unified_price_usd: currentUnifiedPrice,
    new_max_ddp_cost_usd: newMaxDdpCost,
    price_diff_usd: priceDiff,
    status,
    affected_children: childMappings.map(c => c.child_sku),
    requires_price_update: priceDiff < 0,
    recommended_action: recommendedAction
  }
}

/**
 * GET: 週次バッチ実行用エンドポイント（cronジョブから呼び出し）
 */
export async function GET(req: NextRequest) {
  // クエリパラメータから認証トークンをチェック
  const authToken = req.nextUrl.searchParams.get('token')
  const expectedToken = process.env.PRICE_PATROL_CRON_TOKEN

  if (expectedToken && authToken !== expectedToken) {
    return NextResponse.json({
      success: false,
      error: '認証失敗'
    }, { status: 401 })
  }

  console.log('⏰ 週次価格パトロールバッチを開始...')

  // バッチモードで実行
  const batchRequest: PricePatrolRequest = {
    mode: 'batch'
  }

  // POST処理を再利用
  const mockRequest = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(batchRequest)
  })

  return POST(mockRequest as any)
}
