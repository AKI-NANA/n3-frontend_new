// services/finance/cashflowPredictor.ts
// Phase 4: 資金繰り予測システム - コア予測ロジック

import { createClient } from '@/lib/supabase/server';
import type {
  CashflowForecast,
  ForecastParams,
  ForecastResult,
  ForecastWarning,
  ForecastSummary,
  PeriodType,
} from '@/types/finance';

/**
 * 過去の固定費実績（家賃、人件費、サブスクリプションなど）を推移予測
 * @param accountType 予測対象の勘定科目 (例: 500番台の固定費)
 * @param months 予測月数
 * @returns { date: Date, amount: number }[]
 */
async function forecastOverheads(
  accountType: string,
  months: number
): Promise<{ date: Date; amount: number }[]> {
  try {
    const supabase = await createClient();

    // 1. 過去6ヶ月の実績を取得
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: actuals, error } = await supabase
      .from('finance_actuals')
      .select('amount, transaction_date')
      .gte('transaction_date', sixMonthsAgo.toISOString())
      .like('account_code', `${accountType}%`); // 例: 500番台の固定費

    if (error) {
      console.error('Fixed overhead forecast error:', error);
      return [];
    }

    if (!actuals || actuals.length === 0) {
      console.warn('No overhead actuals found, using default estimate');
      // デフォルト値: 月20万円の固定費を仮定
      const defaultMonthlyOverhead = -200000;
      const forecasts = [];
      let currentDate = new Date();
      for (let i = 0; i < months; i++) {
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        forecasts.push({
          date: new Date(currentDate),
          amount: defaultMonthlyOverhead,
        });
      }
      return forecasts;
    }

    // 2. 平均値を算出し、未来の予測値とする (シンプルな移動平均モデル)
    const averageOutflow =
      actuals.reduce((sum, item) => sum + Number(item.amount), 0) /
      actuals.length;

    const forecasts = [];
    let currentDate = new Date();
    for (let i = 0; i < months; i++) {
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + 1);
      forecasts.push({
        date: new Date(currentDate),
        amount: Math.abs(averageOutflow) * -1, // 支出なので必ず負数
      });
    }

    return forecasts;
  } catch (error) {
    console.error('Error in forecastOverheads:', error);
    return [];
  }
}

/**
 * 販売データに基づき、将来の入金（売掛金回収）を予測
 * @param months 予測月数
 * @returns { date: Date, amount: number }[]
 */
async function forecastSalesInflow(
  months: number
): Promise<{ date: Date; amount: number }[]> {
  try {
    const supabase = await createClient();

    // 💡 Phase 1: ordersテーブルのデータを活用
    // 1. 過去3ヶ月の売上実績を取得して平均を算出
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: salesActuals, error } = await supabase
      .from('finance_actuals')
      .select('amount, transaction_date')
      .gte('transaction_date', threeMonthsAgo.toISOString())
      .like('account_code', '1%'); // 1xx: 売上系科目

    if (error) {
      console.error('Sales forecast error:', error);
      return [];
    }

    if (!salesActuals || salesActuals.length === 0) {
      console.warn('No sales actuals found, using default estimate');
      // デフォルト値: 月150万円の売上を仮定
      const defaultMonthlySales = 1500000;
      const forecasts = [];
      let currentDate = new Date();
      for (let i = 0; i < months; i++) {
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        forecasts.push({
          date: new Date(currentDate),
          amount: defaultMonthlySales,
        });
      }
      return forecasts;
    }

    // 2. 月別に集計
    const monthlyTotals: Record<string, number> = {};
    salesActuals.forEach((actual) => {
      const date = new Date(actual.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Number(actual.amount);
    });

    // 3. 平均月間売上を計算
    const avgMonthlySales =
      Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0) /
      Object.keys(monthlyTotals).length;

    // 4. 未来の予測値を生成
    const forecasts = [];
    let currentDate = new Date();
    for (let i = 0; i < months; i++) {
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + 1);
      // 前年同月比の成長率を考慮したい場合はここで調整
      forecasts.push({
        date: new Date(currentDate),
        amount: avgMonthlySales,
      });
    }

    return forecasts;
  } catch (error) {
    console.error('Error in forecastSalesInflow:', error);
    return [];
  }
}

/**
 * 仕入れ支出を予測（Phase 5で本格実装予定）
 * @param months 予測月数
 * @returns { date: Date, amount: number }[]
 */
async function forecastSourcingOutflow(
  months: number
): Promise<{ date: Date; amount: number }[]> {
  try {
    const supabase = await createClient();

    // 過去3ヶ月の仕入れ実績から平均を算出
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: sourcingActuals, error } = await supabase
      .from('finance_actuals')
      .select('amount, transaction_date')
      .gte('transaction_date', threeMonthsAgo.toISOString())
      .like('account_code', '5%'); // 5xx: 仕入れ系科目

    if (error || !sourcingActuals || sourcingActuals.length === 0) {
      // デフォルト値: 月80万円の仕入れを仮定
      const defaultMonthlySourcing = -800000;
      const forecasts = [];
      let currentDate = new Date();
      for (let i = 0; i < months; i++) {
        currentDate = new Date(currentDate);
        currentDate.setMonth(currentDate.getMonth() + 1);
        forecasts.push({
          date: new Date(currentDate),
          amount: defaultMonthlySourcing,
        });
      }
      return forecasts;
    }

    // 月別に集計
    const monthlyTotals: Record<string, number> = {};
    sourcingActuals.forEach((actual) => {
      const date = new Date(actual.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Number(actual.amount);
    });

    const avgMonthlySourcing =
      Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0) /
      Object.keys(monthlyTotals).length;

    const forecasts = [];
    let currentDate = new Date();
    for (let i = 0; i < months; i++) {
      currentDate = new Date(currentDate);
      currentDate.setMonth(currentDate.getMonth() + 1);
      forecasts.push({
        date: new Date(currentDate),
        amount: Math.abs(avgMonthlySourcing) * -1, // 支出なので負数
      });
    }

    return forecasts;
  } catch (error) {
    console.error('Error in forecastSourcingOutflow:', error);
    return [];
  }
}

/**
 * 総合資金繰り予測の実行関数 (T-60)
 * @param params 予測パラメータ
 * @returns ForecastResult
 */
export async function runCashflowForecast(
  params: ForecastParams
): Promise<ForecastResult> {
  try {
    const supabase = await createClient();

    console.log('[Cashflow Forecast] Starting forecast with params:', params);

    const { months, beginning_balance, period_type, include_sourcing } = params;

    // 1. 各種予測データを取得
    const overheadForecasts = await forecastOverheads('5', months);
    const salesInflowForecasts = await forecastSalesInflow(months);
    const sourcingOutflowForecasts = include_sourcing
      ? await forecastSourcingOutflow(months)
      : [];

    // 2. 月ごとに統合して予測結果を作成
    const forecasts: CashflowForecast[] = [];
    let currentBalance = beginning_balance;

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      forecastDate.setDate(1); // 月の初日

      const salesInflow = salesInflowForecasts[i]?.amount || 0;
      const overheadOutflow = overheadForecasts[i]?.amount || 0;
      const sourcingOutflow = sourcingOutflowForecasts[i]?.amount || 0;

      const netCashflow =
        salesInflow + overheadOutflow + sourcingOutflow;
      const endingBalance = currentBalance + netCashflow;

      const forecast: CashflowForecast = {
        id: 0, // DBに保存時に生成
        forecast_date: forecastDate.toISOString().split('T')[0],
        period_type,
        beginning_balance: currentBalance,
        sales_inflow_forecast: salesInflow,
        sourcing_outflow_forecast: Math.abs(sourcingOutflow),
        overhead_outflow: Math.abs(overheadOutflow),
        other_inflow: 0,
        other_outflow: 0,
        net_cashflow: netCashflow,
        ending_balance: endingBalance,
        forecast_params: params,
        confidence_level: 0.75, // 簡易的な信頼度
      };

      forecasts.push(forecast);
      currentBalance = endingBalance;
    }

    // 3. DBに保存
    const { error: insertError } = await supabase
      .from('cashflow_forecast')
      .insert(
        forecasts.map((f) => ({
          forecast_date: f.forecast_date,
          period_type: f.period_type,
          beginning_balance: f.beginning_balance,
          sales_inflow_forecast: f.sales_inflow_forecast,
          sourcing_outflow_forecast: f.sourcing_outflow_forecast,
          overhead_outflow: f.overhead_outflow,
          other_inflow: f.other_inflow,
          other_outflow: f.other_outflow,
          forecast_params: f.forecast_params,
          confidence_level: f.confidence_level,
        }))
      );

    if (insertError) {
      console.error('[Cashflow Forecast] Error inserting forecasts:', insertError);
    }

    // 4. 警告を生成
    const warnings: ForecastWarning[] = [];
    const safetyMargin = 3000000; // 300万円（設定から取得すべき）

    forecasts.forEach((forecast) => {
      if (forecast.ending_balance < safetyMargin) {
        warnings.push({
          date: forecast.forecast_date,
          type: 'low_balance',
          message: `期末残高が安全マージン（${(safetyMargin / 10000).toFixed(0)}万円）を下回ります`,
          severity: forecast.ending_balance < 0 ? 'high' : 'medium',
          amount: forecast.ending_balance,
        });
      }

      if (forecast.net_cashflow < 0) {
        warnings.push({
          date: forecast.forecast_date,
          type: 'negative_cashflow',
          message: `純キャッシュフローがマイナスです（${(forecast.net_cashflow / 10000).toFixed(0)}万円）`,
          severity: 'medium',
          amount: forecast.net_cashflow,
        });
      }
    });

    // 5. サマリーを生成
    const summary: ForecastSummary = {
      total_months: months,
      avg_ending_balance:
        forecasts.reduce((sum, f) => sum + f.ending_balance, 0) / forecasts.length,
      min_ending_balance: Math.min(...forecasts.map((f) => f.ending_balance)),
      max_ending_balance: Math.max(...forecasts.map((f) => f.ending_balance)),
      months_below_safety_margin: forecasts.filter(
        (f) => f.ending_balance < safetyMargin
      ).length,
      total_net_cashflow: forecasts.reduce((sum, f) => sum + f.net_cashflow, 0),
    };

    console.log('[Cashflow Forecast] Forecast completed successfully');

    return {
      status: 'Success',
      forecasts,
      warnings,
      summary,
    };
  } catch (error) {
    console.error('[Cashflow Forecast] Error:', error);
    return {
      status: 'Error',
      forecasts: [],
      warnings: [
        {
          date: new Date().toISOString(),
          type: 'high_outflow',
          message: `予測実行エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
          severity: 'high',
        },
      ],
      summary: {
        total_months: 0,
        avg_ending_balance: 0,
        min_ending_balance: 0,
        max_ending_balance: 0,
        months_below_safety_margin: 0,
        total_net_cashflow: 0,
      },
    };
  }
}

/**
 * 最新の予測結果を取得
 * @param months 取得する月数
 * @returns CashflowForecast[]
 */
export async function getLatestForecasts(months: number = 12): Promise<CashflowForecast[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cashflow_forecast')
      .select('*')
      .order('forecast_date', { ascending: true })
      .limit(months);

    if (error) {
      console.error('Error fetching latest forecasts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLatestForecasts:', error);
    return [];
  }
}
