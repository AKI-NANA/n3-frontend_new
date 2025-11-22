// services/accounting/FinancialMetricsService.ts
/**
 * 財務指標取得サービス
 *
 * 会計システムから取得した実際の経費率を、
 * 価格計算エンジンなど他のサービスで利用できるように提供する
 */

interface FinancialMetrics {
  expenseRatio: number; // 経費率 (%)
  grossProfitRate: number; // 粗利率 (%)
  netProfitRate: number; // 純利益率 (%)
  lastUpdated: string; // 最終更新日時
  dataSource: 'REAL_DATA' | 'DEFAULT'; // データソース
}

interface CachedMetrics extends FinancialMetrics {
  cachedAt: number; // キャッシュ時刻（Unixタイムスタンプ）
}

/**
 * 財務指標取得サービス
 */
export class FinancialMetricsService {
  private cache: CachedMetrics | null = null;
  private cacheValidityMs = 300000; // 5分間キャッシュ
  private defaultExpenseRatio = 13.0; // デフォルト経費率（既存ロジックと同じ）
  private apiBaseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

  /**
   * 財務指標を取得（キャッシュ優先）
   *
   * @param forceRefresh - キャッシュを無視して強制的に再取得
   * @returns 財務指標
   */
  async getFinancialMetrics(forceRefresh = false): Promise<FinancialMetrics> {
    // キャッシュチェック
    if (!forceRefresh && this.cache && this.isCacheValid()) {
      console.log('[FinancialMetrics] キャッシュから財務指標を返します');
      return this.cache;
    }

    // APIから最新データを取得
    try {
      const metrics = await this.fetchFinancialMetrics();

      // キャッシュに保存
      this.cache = {
        ...metrics,
        cachedAt: Date.now(),
      };

      console.log('[FinancialMetrics] 最新の財務指標を取得しました:', metrics);
      return metrics;
    } catch (error) {
      console.error('[FinancialMetrics] 財務指標の取得に失敗しました:', error);

      // エラー時はキャッシュまたはデフォルト値を返す
      if (this.cache) {
        console.warn('[FinancialMetrics] キャッシュデータを返します（期限切れ）');
        return this.cache;
      }

      return this.getDefaultMetrics();
    }
  }

  /**
   * APIから財務指標を取得
   */
  private async fetchFinancialMetrics(): Promise<FinancialMetrics> {
    // 直近30日間の財務データを取得
    const response = await fetch(`${this.apiBaseUrl}/api/accounting/financial-summary?period=MONTHLY`);

    if (!response.ok) {
      throw new Error(`API呼び出しエラー: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('財務データの取得に失敗しました');
    }

    const financialData = data.data;

    // 経費率を計算（総経費 / 総売上 × 100）
    const expenseRatio = financialData.expenseRatio || this.defaultExpenseRatio;

    return {
      expenseRatio: Number(expenseRatio.toFixed(2)),
      grossProfitRate: Number(financialData.grossProfitRate?.toFixed(2) || 0),
      netProfitRate: Number(financialData.netProfitRate?.toFixed(2) || 0),
      lastUpdated: new Date().toISOString(),
      dataSource: 'REAL_DATA',
    };
  }

  /**
   * デフォルトの財務指標を返す
   */
  private getDefaultMetrics(): FinancialMetrics {
    console.warn('[FinancialMetrics] デフォルト値を返します（API未接続またはデータなし）');
    return {
      expenseRatio: this.defaultExpenseRatio,
      grossProfitRate: 0,
      netProfitRate: 0,
      lastUpdated: new Date().toISOString(),
      dataSource: 'DEFAULT',
    };
  }

  /**
   * キャッシュが有効かどうかをチェック
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.cachedAt < this.cacheValidityMs;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache = null;
    console.log('[FinancialMetrics] キャッシュをクリアしました');
  }

  /**
   * 経費率のみを取得（価格計算エンジン用のヘルパー）
   *
   * @returns 経費率（パーセンテージ）
   */
  async getExpenseRatio(): Promise<number> {
    const metrics = await this.getFinancialMetrics();
    return metrics.expenseRatio;
  }

  /**
   * 経費率を小数（0-1）として取得
   *
   * @example
   * // 経費率が13%の場合
   * const ratio = await service.getExpenseRatioDecimal() // 0.13
   */
  async getExpenseRatioDecimal(): Promise<number> {
    const expenseRatio = await this.getExpenseRatio();
    return expenseRatio / 100;
  }
}

// ========================================
// エクスポート
// ========================================

/**
 * シングルトンインスタンス
 */
export const financialMetricsService = new FinancialMetricsService();
