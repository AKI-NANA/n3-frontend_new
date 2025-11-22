// types/finance.ts
// Phase 4: 資金繰り予測システム - 型定義

export type PeriodType = 'Monthly' | 'Weekly';

export interface FinanceActual {
  id: number;
  transaction_date: Date | string;
  account_code: string;
  account_name?: string;
  amount: number;
  source_type?: string;
  metadata?: Record<string, any>;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CashflowForecast {
  id: number;
  forecast_date: Date | string;
  period_type: PeriodType;

  // 予測項目
  beginning_balance: number;
  sales_inflow_forecast: number;
  sourcing_outflow_forecast: number;
  overhead_outflow: number;
  other_inflow: number;
  other_outflow: number;

  // 計算項目（自動生成）
  net_cashflow: number;
  ending_balance: number;

  // メタデータ
  forecast_params?: Record<string, any>;
  confidence_level?: number;
  notes?: string;

  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CashflowSettings {
  id: number;
  user_id?: string;
  current_balance: number;
  safety_margin: number;
  default_forecast_months: number;
  money_cloud_api_key?: string;
  auto_sync_enabled: boolean;
  last_sync_at?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// 予測パラメータ
export interface ForecastParams {
  months: number;
  period_type: PeriodType;
  beginning_balance: number;
  include_sourcing?: boolean; // 仕入れ予測を含めるか
  custom_overheads?: number; // カスタム固定費
}

// 予測結果
export interface ForecastResult {
  status: 'Success' | 'Error';
  forecasts: CashflowForecast[];
  warnings: ForecastWarning[];
  summary: ForecastSummary;
}

export interface ForecastWarning {
  date: Date | string;
  type: 'low_balance' | 'negative_cashflow' | 'high_outflow';
  message: string;
  severity: 'high' | 'medium' | 'low';
  amount?: number;
}

export interface ForecastSummary {
  total_months: number;
  avg_ending_balance: number;
  min_ending_balance: number;
  max_ending_balance: number;
  months_below_safety_margin: number;
  total_net_cashflow: number;
}

// マネークラウド同期結果
export interface SyncResult {
  status: 'Success' | 'Error';
  count: number;
  message: string;
  synced_at: Date | string;
  errors?: string[];
}
