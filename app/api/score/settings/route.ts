/**
 * スコア設定API
 * GET /api/score/settings - 設定取得
 * PUT /api/score/settings - 設定更新
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getScoreSettings,
  updateScoreSettings,
  getDefaultSettings,
} from '@/lib/scoring/settings';
import { SettingsUpdateRequest } from '@/lib/scoring/types';

/**
 * GET - 設定取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id') || undefined;

    const settings = await getScoreSettings(id);

    if (!settings) {
      // 設定が見つからない場合はデフォルト設定を返す
      const defaultSettings = getDefaultSettings();
      return NextResponse.json({
        success: true,
        settings: defaultSettings,
        isDefault: true,
      });
    }

    return NextResponse.json({
      success: true,
      settings,
      isDefault: false,
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '設定取得中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - 設定更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body as SettingsUpdateRequest & { id?: string };

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '設定IDが指定されていません',
        },
        { status: 400 }
      );
    }

    const updatedSettings = await updateScoreSettings(id, updates);

    if (!updatedSettings) {
      return NextResponse.json(
        {
          success: false,
          error: '設定の更新に失敗しました',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '設定更新中にエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
