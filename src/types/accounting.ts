// src/types/accounting.ts

/**
 * マネークラウド連携後の最終会計データ（仕訳台帳）の構造
 * 指示書 IV.A: Accounting_Final_Ledger に対応
 */
export interface AccountingFinalLedger {
  id: string; // 独自の取引IDまたは仕訳ID
  date: string; // 取引日付 (YYYY-MM-DD)
  account_title: string; // 勘定科目 (例: 売上高, 支払手数料)
  amount: number; // 金額 (正: 収益/資産増加, 負: 経費/負債増加)
  category: string; // 部門/カテゴリー (例: MUSIC_GEAR, AUDIO_CABLE)
  transaction_summary: string; // 摘要/取引内容
  order_id?: string; // 受注データと紐づく場合 (売上, COGSなど)
  is_verified: boolean; // 証憑と紐づけ/担当者承認済みフラグ
}

/**
 * 経費の自動分類に使用するマスターデータ
 * 指示書 II.B: Expense_Masterテーブル に対応
 */
export interface ExpenseMaster {
  keyword: string; // 摘要に含まれるキーワード (例: 'Amazon', 'FedEx', 'Mercado Libre Fee')
  category_id: string; // カテゴリーID (例: 'SHIPPING_FEE', 'ADVERTISING')
  account_title: string; // 提案する勘定科目 (例: '旅費交通費', '通信費')
  description: string; // マスターデータの簡単な説明
}

/**
 * AIによる経営分析結果の構造
 * 指示書 IV.B: AIの出力（回答）に対応
 */
export interface AIAnalysisResult {
  analysis_date: string; // 分析実行日 (YYYY-MM-DD)
  evaluation_summary: string; // 現状の評価 (要約文)
  key_metrics: {
    // 主要KPIの数値結果
    gross_profit_rate: number; // 粗利率 (%)
    net_profit_rate: number; // 純利益率 (%)
    expense_ratio: number; // 総経費率 (%)
    cash_balance: number; // 銀行残高モック
  };
  issues: string[]; // 課題点 (箇条書き)
  policy_recommendation: string[]; // 経営方針の提言 (具体的なアクション)
  // AIが提言を生成するために参照したデータIDなど、フィードバックに使う情報もここに含める
  reference_data_ids: string[];
}
