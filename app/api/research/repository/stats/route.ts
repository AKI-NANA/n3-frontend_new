// app/api/research/repository/stats/route.ts
/**
 * リサーチリポジトリ統計情報API
 */

import { NextResponse } from 'next/server';
import { getResearchRepositoryStats } from '@/lib/research/research-workflow';

export async function GET() {
  try {
    const result = await getResearchRepositoryStats();

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
    console.error('[API] 統計情報取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
