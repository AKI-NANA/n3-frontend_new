// app/api/eu-responsible/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { euResponsiblePersonService } from '@/lib/services/euResponsiblePersonService'

/**
 * GET /api/eu-responsible/search?manufacturer=xxx&brand=xxx
 * 製造者名・ブランド名でEU責任者情報を検索
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const manufacturer = searchParams.get('manufacturer') || undefined
    const brand = searchParams.get('brand') || undefined

    if (!manufacturer && !brand) {
      return NextResponse.json(
        { error: 'manufacturer または brand パラメータが必要です' },
        { status: 400 }
      )
    }

    const result = await euResponsiblePersonService.findResponsiblePerson(
      manufacturer,
      brand
    )

    if (!result) {
      return NextResponse.json(
        { message: 'EU責任者情報が見つかりませんでした', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: result })
  } catch (error: any) {
    console.error('EU責任者検索エラー:', error)
    return NextResponse.json(
      { error: error.message || 'EU責任者の検索に失敗しました' },
      { status: 500 }
    )
  }
}
