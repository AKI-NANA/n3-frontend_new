// app/api/research/repository/[id]/promote/route.ts
/**
 * SKUマスターへの昇格API
 */

import { NextRequest, NextResponse } from 'next/server';
import { promoteToSKUMaster } from '@/lib/research/research-workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await promoteToSKUMaster(params.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    console.error('[API] SKUマスター昇格エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
