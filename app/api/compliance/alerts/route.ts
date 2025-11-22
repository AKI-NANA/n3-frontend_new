// ========================================
// コンプライアンスアラートAPI
// 作成日: 2025-11-22
// エンドポイント: GET /api/compliance/alerts
// 目的: 税務調査対策のアラート情報をダッシュボードに提供
// ========================================

import { NextResponse } from 'next/server';
import { ComplianceMonitorService } from '@/services/ComplianceMonitor';

/**
 * GET /api/compliance/alerts
 *
 * レスポンス:
 * {
 *   success: boolean,
 *   alert: ComplianceAlert,
 *   coverage?: number
 * }
 */
export async function GET() {
  try {
    // 経費証明不一致アラートをチェック
    const alert = await ComplianceMonitorService.checkMissingInvoiceProof();

    // 経費証明率（カバレッジ）を計算
    const coverage = await ComplianceMonitorService.calculateInvoiceProofCoverage();

    return NextResponse.json({
      success: true,
      alert,
      coverage,
    });
  } catch (error) {
    console.error('[ComplianceAlertAPI] エラー:', error);
    return NextResponse.json(
      {
        success: false,
        message: '予期しないエラーが発生しました。',
      },
      { status: 500 }
    );
  }
}
