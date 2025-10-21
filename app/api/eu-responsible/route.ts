// app/api/eu-responsible/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { euResponsiblePersonService } from '@/lib/services/euResponsiblePersonService'

/**
 * GET /api/eu-responsible
 * EU責任者マスタ一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const activeOnly = searchParams.get('active_only') !== 'false'

    const result = await euResponsiblePersonService.listResponsiblePersons({
      limit,
      offset,
      active_only: activeOnly
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('EU責任者一覧取得エラー:', error)
    return NextResponse.json(
      { error: error.message || 'EU責任者一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/eu-responsible
 * EU責任者マスタ新規登録
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 必須フィールドチェック
    const requiredFields = ['manufacturer', 'company_name', 'address_line1', 'city', 'postal_code', 'country']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `必須フィールドが不足しています: ${field}` },
          { status: 400 }
        )
      }
    }

    const result = await euResponsiblePersonService.createResponsiblePerson(body)

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('EU責任者登録エラー:', error)
    return NextResponse.json(
      { error: error.message || 'EU責任者の登録に失敗しました' },
      { status: 500 }
    )
  }
}
