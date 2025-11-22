/**
 * 承認API（EUリスク統制統合版）
 * /api/research/decision/route.ts
 *
 * 機能:
 * - 商品の承認前にEUリスクフラグとARステータスをチェック
 * - 出品ブロック条件（eu_risk_flag = TRUE AND eu_ar_status = REQUIRED_NO_AR）の検証
 * - 承認可能な商品の承認処理
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface DecisionRequest {
  productIds: number[]
  action: 'approve' | 'reject'
  rejectionReason?: string
}

interface DecisionResponse {
  success: boolean
  message?: string
  approvedIds?: number[]
  blockedProducts?: Array<{
    id: number
    sku: string
    reason: string
    eu_risk_flag: boolean
    eu_ar_status: string
  }>
  errors?: string[]
}

/**
 * POST /api/research/decision
 * 商品の承認・否認を処理（EUリスクチェック統合）
 */
export async function POST(request: NextRequest): Promise<NextResponse<DecisionResponse>> {
  try {
    const supabase = await createClient()
    const body: DecisionRequest = await request.json()
    const { productIds, action, rejectionReason } = body

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '商品IDが指定されていません',
        },
        { status: 400 }
      )
    }

    // 商品情報を取得（EUリスク関連フィールドを含む）
    const { data: products, error: fetchError } = await supabase
      .from('products_master')
      .select('id, sku, eu_risk_flag, eu_ar_status, eu_risk_reason')
      .in('id', productIds)

    if (fetchError) {
      console.error('商品情報取得エラー:', fetchError)
      return NextResponse.json(
        {
          success: false,
          message: '商品情報の取得に失敗しました',
          errors: [fetchError.message],
        },
        { status: 500 }
      )
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '指定された商品が見つかりません',
        },
        { status: 404 }
      )
    }

    // 承認処理の場合、EUリスクブロック条件をチェック
    if (action === 'approve') {
      const blockedProducts = products.filter(
        (p) => p.eu_risk_flag === true && p.eu_ar_status === 'REQUIRED_NO_AR'
      )

      // ブロック対象商品がある場合、エラーを返す
      if (blockedProducts.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: '出品ブロック: 法的リスクのため登録できません',
            blockedProducts: blockedProducts.map((p) => ({
              id: p.id,
              sku: p.sku,
              reason: p.eu_risk_reason || '高リスクカテゴリであり、AR情報が未確保です',
              eu_risk_flag: p.eu_risk_flag,
              eu_ar_status: p.eu_ar_status,
            })),
          },
          { status: 403 }
        )
      }

      // ブロック対象外の商品を承認
      const approveIds = products.map((p) => p.id)
      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', approveIds)

      if (updateError) {
        console.error('承認更新エラー:', updateError)
        return NextResponse.json(
          {
            success: false,
            message: '承認処理に失敗しました',
            errors: [updateError.message],
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `${approveIds.length}件の商品を承認しました`,
        approvedIds: approveIds,
      })
    }

    // 否認処理
    if (action === 'reject') {
      const rejectIds = products.map((p) => p.id)
      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectionReason || 'ユーザーにより否認されました',
          rejected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', rejectIds)

      if (updateError) {
        console.error('否認更新エラー:', updateError)
        return NextResponse.json(
          {
            success: false,
            message: '否認処理に失敗しました',
            errors: [updateError.message],
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `${rejectIds.length}件の商品を否認しました`,
      })
    }

    // 不明なアクション
    return NextResponse.json(
      {
        success: false,
        message: '不正なアクションが指定されました',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('承認API予期しないエラー:', error)
    return NextResponse.json(
      {
        success: false,
        message: '予期しないエラーが発生しました',
        errors: [String(error)],
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/research/decision
 * 承認待ち商品の一覧を取得（EUリスク情報を含む）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')

    const { data: products, error } = await supabase
      .from('products_master')
      .select('id, sku, title, title_en, eu_risk_flag, eu_ar_status, eu_risk_reason, approval_status')
      .eq('approval_status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('商品取得エラー:', error)
      return NextResponse.json(
        {
          success: false,
          message: '商品の取得に失敗しました',
          errors: [error.message],
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      products: products || [],
      count: products?.length || 0,
    })
  } catch (error) {
    console.error('GET API予期しないエラー:', error)
    return NextResponse.json(
      {
        success: false,
        message: '予期しないエラーが発生しました',
        errors: [String(error)],
      },
      { status: 500 }
    )
  }
}
