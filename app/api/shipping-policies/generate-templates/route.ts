/**
 * テンプレート自動生成API
 * POST /api/shipping-policies/generate-templates
 *
 * 目的:
 * - 1,200個の配送ポリシーから代表的な重量帯×価格帯のテンプレートを自動生成
 * - 運用開始時の初期設定コストをゼロにする
 * - 手動でのポリシー定義作業を完全に排除
 *
 * 生成ロジック:
 * 1. ebay_shipping_policies_final から全ポリシーを取得
 * 2. 重量帯を分析して代表値を決定（0.5kg, 1kg, 2kg, 5kg, 10kg...）
 * 3. 価格帯を分析して代表値を決定（$30, $60, $100, $200...）
 * 4. 重量帯×価格帯のマトリクスで最適なポリシーを選定
 * 5. products_master に親SKUテンプレートとして登録
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const supabase = createClient()

// 代表的な重量帯（kg）
const WEIGHT_TIERS = [0.5, 1, 2, 3, 5, 10, 15, 20, 30]

// 代表的な価格帯（USD）
const PRICE_TIERS = [30, 60, 100, 150, 200, 300, 500]

interface TemplateRecord {
  weight_tier_kg: number
  price_tier_usd: number
  template_name: string
  selected_policy_id: number
  selected_policy_name: string
  policy_weight_range: string
  policy_price_range: string
  shipping_cost_usd: number
}

export async function POST(req: NextRequest) {
  try {
    console.log('\n🏭 テンプレート自動生成を開始...')

    // ===== ステップ1: 全配送ポリシーを取得 =====

    const { data: allPolicies, error: policyError } = await supabase
      .from('ebay_shipping_policies_final')
      .select('*')
      .order('weight_from_kg', { ascending: true })

    if (policyError || !allPolicies || allPolicies.length === 0) {
      console.error('❌ 配送ポリシー取得エラー:', policyError)
      return NextResponse.json({
        success: false,
        error: '配送ポリシーの取得に失敗しました',
        details: policyError?.message
      }, { status: 500 })
    }

    console.log(`📦 配送ポリシー取得: ${allPolicies.length}件`)

    // ===== ステップ2: 重量帯×価格帯のマトリクスでテンプレート生成 =====

    const templates: TemplateRecord[] = []

    for (const weightTier of WEIGHT_TIERS) {
      for (const priceTier of PRICE_TIERS) {
        // この重量帯と価格帯をカバーできる最適なポリシーを選定
        const suitablePolicy = findOptimalPolicy(
          allPolicies,
          weightTier,
          priceTier
        )

        if (suitablePolicy) {
          const templateName = `W${weightTier}-P${priceTier}`

          templates.push({
            weight_tier_kg: weightTier,
            price_tier_usd: priceTier,
            template_name: templateName,
            selected_policy_id: suitablePolicy.id,
            selected_policy_name: suitablePolicy.policy_name,
            policy_weight_range: `${suitablePolicy.weight_from_kg}-${suitablePolicy.weight_to_kg}kg`,
            policy_price_range: `$${suitablePolicy.product_price_usd}`,
            shipping_cost_usd: suitablePolicy.usa_total_shipping_usd
          })
        }
      }
    }

    console.log(`✅ テンプレート生成完了: ${templates.length}件`)

    // ===== ステップ3: products_master に親SKUテンプレートとして登録 =====

    const parentTemplates = templates.map(t => ({
      sku: `TEMPLATE-${t.template_name}`,
      title: `テンプレート: ${t.template_name} (${t.policy_weight_range}, ${t.policy_price_range})`,
      variation_type: 'Template',
      parent_sku_id: null,
      price_usd: t.price_tier_usd,
      listing_data: {
        is_template: true,
        template_name: t.template_name,
        weight_tier_kg: t.weight_tier_kg,
        price_tier_usd: t.price_tier_usd,
        recommended_policy_id: t.selected_policy_id,
        recommended_policy_name: t.selected_policy_name,
        policy_weight_range: t.policy_weight_range,
        policy_price_range: t.policy_price_range,
        shipping_cost_usd: t.shipping_cost_usd,
        created_by: 'auto-generator',
        generated_at: new Date().toISOString()
      },
      status: 'Template',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // 既存のテンプレートを削除（再生成時）
    const { error: deleteError } = await supabase
      .from('products_master')
      .delete()
      .eq('variation_type', 'Template')

    if (deleteError) {
      console.warn('⚠️ 既存テンプレート削除エラー:', deleteError)
    }

    // 新しいテンプレートを登録
    const { data: insertedTemplates, error: insertError } = await supabase
      .from('products_master')
      .insert(parentTemplates)
      .select()

    if (insertError) {
      console.error('❌ テンプレート登録エラー:', insertError)
      return NextResponse.json({
        success: false,
        error: 'テンプレートの登録に失敗しました',
        details: insertError.message
      }, { status: 500 })
    }

    console.log(`✅ テンプレート登録完了: ${insertedTemplates.length}件`)

    // ===== ステップ4: サマリー情報を返す =====

    return NextResponse.json({
      success: true,
      message: `${templates.length}件のテンプレートを自動生成し、登録しました`,
      summary: {
        total_policies_analyzed: allPolicies.length,
        templates_generated: templates.length,
        weight_tiers: WEIGHT_TIERS,
        price_tiers: PRICE_TIERS,
        templates: templates.map(t => ({
          name: t.template_name,
          weight: `${t.weight_tier_kg}kg`,
          price: `$${t.price_tier_usd}`,
          policy: t.selected_policy_name
        }))
      }
    })

  } catch (error: any) {
    console.error('❌ テンプレート自動生成APIエラー:', error)
    return NextResponse.json({
      success: false,
      error: 'テンプレート自動生成中にエラーが発生しました',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * 指定された重量帯と価格帯に最適な配送ポリシーを選定
 */
function findOptimalPolicy(
  policies: any[],
  targetWeightKg: number,
  targetPriceUsd: number
): any | null {
  // フィルタリング条件:
  // 1. 重量帯がカバーできる（weight_from_kg <= target <= weight_to_kg）
  // 2. 価格が近い（±20%以内）

  const candidates = policies.filter(p => {
    const weightMatch = p.weight_from_kg <= targetWeightKg && p.weight_to_kg >= targetWeightKg
    const priceMatch = Math.abs(p.product_price_usd - targetPriceUsd) <= targetPriceUsd * 0.2

    return weightMatch && priceMatch
  })

  if (candidates.length === 0) {
    // 価格条件を緩めて再検索
    const relaxedCandidates = policies.filter(p => {
      return p.weight_from_kg <= targetWeightKg && p.weight_to_kg >= targetWeightKg
    })

    if (relaxedCandidates.length === 0) {
      return null
    }

    // 価格が最も近いものを選択
    return relaxedCandidates.reduce((best, current) => {
      const bestDiff = Math.abs(best.product_price_usd - targetPriceUsd)
      const currentDiff = Math.abs(current.product_price_usd - targetPriceUsd)
      return currentDiff < bestDiff ? current : best
    })
  }

  // スコアリング: 価格の近さを重視
  const scored = candidates.map(p => {
    const priceDiff = Math.abs(p.product_price_usd - targetPriceUsd)
    const weightMargin = p.weight_to_kg - targetWeightKg

    // 価格が近いほど高スコア、重量マージンがあるほど高スコア
    const score = 100 - (priceDiff * 2) + (weightMargin * 0.5)

    return { policy: p, score }
  })

  // 最高スコアのポリシーを返す
  const best = scored.reduce((best, current) => {
    return current.score > best.score ? current : best
  })

  return best.policy
}

/**
 * GET: テンプレート一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
    const { data: templates, error } = await supabase
      .from('products_master')
      .select('*')
      .eq('variation_type', 'Template')
      .order('price_usd', { ascending: true })

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'テンプレート取得に失敗しました',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      templates: templates || [],
      count: templates?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'テンプレート取得中にエラーが発生しました',
      details: error.message
    }, { status: 500 })
  }
}
