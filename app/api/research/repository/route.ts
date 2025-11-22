// app/api/research/repository/route.ts
/**
 * リサーチリポジトリAPI
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  addToResearchRepository,
  getResearchRepositoryItems,
  getResearchRepositoryStats,
  type ResearchRepositoryItem,
} from '@/lib/research/research-workflow';

/**
 * GET: リサーチアイテム一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'promoted' | null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const result = await getResearchRepositoryItems(status || undefined, limit);

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
    console.error('[API] リサーチリポジトリ取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: リサーチアイテムを追加
 */
export async function POST(request: NextRequest) {
  try {
    const body: ResearchRepositoryItem = await request.json();

    const result = await addToResearchRepository(body);

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
    console.error('[API] リサーチアイテム追加エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
