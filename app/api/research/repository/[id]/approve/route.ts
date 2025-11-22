// app/api/research/repository/[id]/approve/route.ts
/**
 * リサーチアイテム承認API
 */

import { NextRequest, NextResponse } from 'next/server';
import { approveResearchItem } from '@/lib/research/research-workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reviewed_by } = await request.json();

    const result = await approveResearchItem(params.id, reviewed_by);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[API] リサーチアイテム承認エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
