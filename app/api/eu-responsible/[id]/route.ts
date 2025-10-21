// app/api/eu-responsible/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { euResponsiblePersonService } from '@/lib/services/euResponsiblePersonService'

/**
 * PATCH /api/eu-responsible/[id]
 * EU責任者マスタ更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const result = await euResponsiblePersonService.updateResponsiblePerson(id, body)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('EU責任者更新エラー:', error)
    return NextResponse.json(
      { error: error.message || 'EU責任者の更新に失敗しました' },
      { status: 500 }
    )
  }
}
