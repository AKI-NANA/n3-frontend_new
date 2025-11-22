// app/api/research/repository/[id]/reject/route.ts
/**
 * リサーチアイテム拒否API
 */

import { NextRequest, NextResponse } from 'next/server';
import { rejectResearchItem } from '@/lib/research/research-workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reject_reason, reviewed_by } = await request.json();

    if (!reject_reason) {
      return NextResponse.json(
        { success: false, error: '拒否理由は必須です' },
        { status: 400 }
      );
    }

    const result = await rejectResearchItem(params.id, reject_reason, reviewed_by);

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
    console.error('[API] リサーチアイテム拒否エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
