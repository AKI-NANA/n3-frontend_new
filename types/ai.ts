// ファイル: /types/ai.ts

/**
 * 金融市場のリアルタイムデータ
 */
export interface MarketData {
  ticker: string; // 銘柄または通貨ペア
  current_price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  sentiment_data: string; // 関連ニュースやSNSセンチメントの要約
}

/**
 * AIによる取引判断結果
 */
export interface TradeDecision {
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_POSITION';
  target_quantity: number; // 取引推奨数量（株数またはロット数）
  justification: string; // 判断の根拠（LLMが生成）
  confidence_score: number; // 確信度 (0.00-1.00)
}

/**
 * 金融戦略のレコード
 */
export interface FinanceStrategy {
    id: number;
    strategy_name: string;
    target_asset: string;
    risk_level: string;
    capital_allocation: number;
    current_position: number;
    average_entry_price: number | null;
    pnl_realized: number;
    ai_recommendation: string | null;
    last_executed_at: string | null;
}
