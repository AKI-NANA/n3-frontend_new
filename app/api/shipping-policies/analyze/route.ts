// /app/api/shipping-policies/analyze/route.ts
/**
 * 配送ポリシー分析API
 *
 * 目的:
 * 1. 既存の1,200個の配送ポリシーを分析
 * 2. 各ポリシーの最大許容重量と適用可能なDDPコスト範囲を抽出
 * 3. 商品グループに最適なポリシーを自動推薦
 * 4. /zaiko/tanaoroshi の自動適合性判定のバックエンドとして機能
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      maxWeightKg,
      maxDdpCostUsd,
      minWeightKg = 0,
      minDdpCostUsd = 0,
      limit = 10
    } = body as {
      maxWeightKg: number
      maxDdpCostUsd: number
      minWeightKg?: number
      minDdpCostUsd?: number
      limit?: number
    }

    console.log('🔍 配送ポリシー分析開始:', {
      weightRange: `${minWeightKg}kg - ${maxWeightKg}kg`,
      ddpRange: `$${minDdpCostUsd.toFixed(2)} - $${maxDdpCostUsd.toFixed(2)}`
    })

    // ===== ステップ1: 重量条件でフィルタリング =====

    const { data: suitablePolicies, error: policyError } = await supabase
      .from('ebay_shipping_policies_v2')
      .select('*')
      .gte('weight_max_kg', maxWeightKg)  // 最大重量をカバーできるポリシー
      .lte('weight_min_kg', minWeightKg)  // 最小重量も範囲内
      .order('weight_min_kg', { ascending: true })
      .limit(100)  // 大量取得して後でフィルタ

    if (policyError) {
      console.error('❌ 配送ポリシー取得エラー:', policyError)
      return NextResponse.json(
        { success: false, error: `ポリシー取得に失敗しました: ${policyError.message}` },
        { status: 500 }
      )
    }

    if (!suitablePolicies || suitablePolicies.length === 0) {
      return NextResponse.json({
        success: true,
        message: '適合するポリシーが見つかりませんでした',
        policies: [],
        recommendations: [],
        summary: {
          totalPolicies: 0,
          bestMatch: null
        }
      })
    }

    // ===== ステップ2: DDPコストベースのスコアリング =====

    const scoredPolicies = suitablePolicies.map(policy => {
      // ポリシーの適用可能範囲を計算
      const weightCoverage = policy.weight_max_kg - policy.weight_min_kg
      const weightMargin = policy.weight_max_kg - maxWeightKg

      // スコアリング基準:
      // 1. 重量マージンが適切（大きすぎず小さすぎず）
      // 2. 重量カバー範囲が広い（汎用性）
      // 3. ポリシー名に「Standard」「Economy」など一般的なキーワード

      let score = 100

      // 重量マージンスコア（最大20%のマージンが理想）
      const idealMargin = maxWeightKg * 0.2
      const marginDiff = Math.abs(weightMargin - idealMargin)
      score -= marginDiff * 10

      // カバー範囲スコア（広い方が良い）
      score += weightCoverage * 5

      // 汎用性ボーナス
      if (policy.policy_name?.toLowerCase().includes('standard')) score += 20
      if (policy.policy_name?.toLowerCase().includes('economy')) score += 15
      if (policy.policy_name?.toLowerCase().includes('express')) score -= 10  // 高速便はペナルティ

      return {
        ...policy,
        score: Math.max(0, score),
        weight_margin_kg: weightMargin,
        weight_coverage_kg: weightCoverage,
        suitable_for_ddp_range: {
          min: minDdpCostUsd,
          max: maxDdpCostUsd
        }
      }
    })

    // スコア順にソート
    const sortedPolicies = scoredPolicies.sort((a, b) => b.score - a.score)

    // ===== ステップ3: 推薦ポリシーの生成 =====

    const recommendations = sortedPolicies.slice(0, limit).map((policy, index) => ({
      rank: index + 1,
      policy_id: policy.id,
      policy_name: policy.policy_name,
      weight_range: `${policy.weight_min_kg}kg - ${policy.weight_max_kg}kg`,
      weight_margin: `+${policy.weight_margin_kg.toFixed(2)}kg`,
      score: policy.score.toFixed(1),
      recommendation_reason: generateRecommendationReason(policy, maxWeightKg, maxDdpCostUsd)
    }))

    const bestMatch = sortedPolicies[0]

    // ===== ステップ4: 統計サマリー =====

    return NextResponse.json({
      success: true,
      message: `${sortedPolicies.length}件の適合ポリシーを発見しました`,
      policies: sortedPolicies.slice(0, limit),
      recommendations: recommendations,
      summary: {
        totalPolicies: sortedPolicies.length,
        bestMatch: {
          id: bestMatch.id,
          name: bestMatch.policy_name,
          weight_range: `${bestMatch.weight_min_kg}kg - ${bestMatch.weight_max_kg}kg`,
          score: bestMatch.score.toFixed(1),
          weight_margin: `+${bestMatch.weight_margin_kg.toFixed(2)}kg`
        },
        searchCriteria: {
          maxWeightKg,
          maxDdpCostUsd,
          minWeightKg,
          minDdpCostUsd
        }
      }
    })

  } catch (error: any) {
    console.error('❌ 配送ポリシー分析APIエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: '配送ポリシー分析中にエラーが発生しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/shipping-policies/analyze
 *
 * 全ポリシーの統計情報を取得（パラメータなし）
 */
export async function GET() {
  try {
    const { data: allPolicies, error } = await supabase
      .from('ebay_shipping_policies_v2')
      .select('id, policy_name, weight_min_kg, weight_max_kg')
      .order('weight_min_kg', { ascending: true })

    if (error) {
      console.error('❌ 全ポリシー取得エラー:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // 統計情報の計算
    const totalPolicies = allPolicies?.length || 0

    const weightRanges = allPolicies?.map(p => ({
      min: p.weight_min_kg,
      max: p.weight_max_kg
    })) || []

    const minWeight = Math.min(...weightRanges.map(r => r.min))
    const maxWeight = Math.max(...weightRanges.map(r => r.max))

    // 重量帯ごとのポリシー数
    const weightBuckets = {
      light: allPolicies?.filter(p => p.weight_max_kg <= 1).length || 0,      // ~1kg
      medium: allPolicies?.filter(p => p.weight_max_kg > 1 && p.weight_max_kg <= 5).length || 0,  // 1-5kg
      heavy: allPolicies?.filter(p => p.weight_max_kg > 5 && p.weight_max_kg <= 20).length || 0,  // 5-20kg
      extraHeavy: allPolicies?.filter(p => p.weight_max_kg > 20).length || 0  // 20kg+
    }

    return NextResponse.json({
      success: true,
      statistics: {
        totalPolicies,
        weightRange: {
          min: `${minWeight}kg`,
          max: `${maxWeight}kg`
        },
        distribution: {
          light: `${weightBuckets.light}件 (~1kg)`,
          medium: `${weightBuckets.medium}件 (1-5kg)`,
          heavy: `${weightBuckets.heavy}件 (5-20kg)`,
          extraHeavy: `${weightBuckets.extraHeavy}件 (20kg+)`
        }
      },
      policies: allPolicies
    })

  } catch (error: any) {
    console.error('❌ 統計情報取得エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: '統計情報の取得に失敗しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * 推薦理由の生成
 */
function generateRecommendationReason(
  policy: any,
  targetWeightKg: number,
  targetDdpUsd: number
): string {
  const reasons: string[] = []

  // 重量マージン
  const marginPercent = ((policy.weight_margin_kg / targetWeightKg) * 100).toFixed(0)
  if (policy.weight_margin_kg > 0 && policy.weight_margin_kg < targetWeightKg * 0.3) {
    reasons.push(`重量マージン適正（+${marginPercent}%）`)
  } else if (policy.weight_margin_kg >= targetWeightKg * 0.3) {
    reasons.push(`重量マージン大（余裕あり）`)
  }

  // カバー範囲
  if (policy.weight_coverage_kg > 5) {
    reasons.push('広範囲カバー（汎用性高）')
  }

  // ポリシー名の特徴
  const name = policy.policy_name?.toLowerCase() || ''
  if (name.includes('standard')) reasons.push('標準配送')
  if (name.includes('economy')) reasons.push('エコノミー配送')
  if (name.includes('express')) reasons.push('速達配送')

  return reasons.length > 0 ? reasons.join(', ') : '基本要件を満たしています'
}
