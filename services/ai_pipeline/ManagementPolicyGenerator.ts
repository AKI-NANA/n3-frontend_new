// services/ai_pipeline/ManagementPolicyGenerator.ts
/**
 * AI経営方針策定サービス
 *
 * 指示書 IV.B: AIによる回答と経営方針の策定
 * - 蓄積された会計データに基づき、定期的に経営分析を実行
 * - 現状の評価、課題点、経営方針の提言を生成
 */

import { supabase } from '@/lib/supabase';
import type { AIAnalysisResult } from '@/src/types/accounting';

// ========================================
// 型定義
// ========================================

/**
 * 財務データ集計結果
 */
interface FinancialSummary {
  totalRevenue: number; // 総売上
  totalCOGS: number; // 売上原価（仕入れ高）
  totalExpenses: number; // 総経費
  netProfit: number; // 純利益
  grossProfit: number; // 粗利
  grossProfitRate: number; // 粗利率 (%)
  netProfitRate: number; // 純利益率 (%)
  expenseRatio: number; // 経費率 (%)
  periodStart: string; // 集計期間開始
  periodEnd: string; // 集計期間終了
}

/**
 * カテゴリー別経費内訳
 */
interface ExpenseBreakdown {
  category_id: string;
  account_title: string;
  total_amount: number;
  percentage: number; // 総経費に占める割合 (%)
}

// ========================================
// AI経営方針策定サービス
// ========================================

export class ManagementPolicyGeneratorService {
  /**
   * 指定期間の財務データを集計
   *
   * @param startDate - 開始日 (YYYY-MM-DD)
   * @param endDate - 終了日 (YYYY-MM-DD)
   * @returns 財務データサマリー
   */
  async aggregateFinancialData(
    startDate: string,
    endDate: string
  ): Promise<FinancialSummary> {
    try {
      // accounting_final_ledger から期間内のデータを取得
      const { data, error } = await supabase
        .from('accounting_final_ledger')
        .select('account_title, amount, category')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_verified', true); // 承認済みデータのみ

      if (error) {
        throw new Error(`財務データ取得エラー: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('[ManagementPolicy] 指定期間のデータがありません');
        return {
          totalRevenue: 0,
          totalCOGS: 0,
          totalExpenses: 0,
          netProfit: 0,
          grossProfit: 0,
          grossProfitRate: 0,
          netProfitRate: 0,
          expenseRatio: 0,
          periodStart: startDate,
          periodEnd: endDate,
        };
      }

      // 勘定科目ごとに集計
      let totalRevenue = 0; // 売上高
      let totalCOGS = 0; // 売上原価
      let totalExpenses = 0; // 経費

      for (const record of data) {
        const amount = Number(record.amount);

        if (record.account_title === '売上高') {
          totalRevenue += amount;
        } else if (record.account_title === '仕入高') {
          totalCOGS += Math.abs(amount); // 仕入れは負の値として記録されている場合もあるため絶対値
        } else {
          // その他はすべて経費として扱う
          totalExpenses += Math.abs(amount);
        }
      }

      // 計算
      const grossProfit = totalRevenue - totalCOGS;
      const netProfit = grossProfit - totalExpenses;
      const grossProfitRate = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netProfitRate = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

      console.log(`[ManagementPolicy] 財務データ集計完了: 売上 ¥${totalRevenue.toLocaleString()}, 純利益 ¥${netProfit.toLocaleString()}`);

      return {
        totalRevenue,
        totalCOGS,
        totalExpenses,
        netProfit,
        grossProfit,
        grossProfitRate,
        netProfitRate,
        expenseRatio,
        periodStart: startDate,
        periodEnd: endDate,
      };
    } catch (error) {
      console.error('[ManagementPolicy] 財務データ集計エラー:', error);
      throw error;
    }
  }

  /**
   * 経費の内訳を取得
   *
   * @param startDate - 開始日
   * @param endDate - 終了日
   * @returns カテゴリー別経費内訳
   */
  async getExpenseBreakdown(
    startDate: string,
    endDate: string
  ): Promise<ExpenseBreakdown[]> {
    try {
      const { data, error } = await supabase
        .from('accounting_final_ledger')
        .select('account_title, amount, category')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_verified', true)
        .neq('account_title', '売上高') // 売上は除外
        .neq('account_title', '仕入高'); // 仕入れは除外

      if (error) {
        throw new Error(`経費内訳取得エラー: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // カテゴリー別に集計
      const categoryMap = new Map<string, { account_title: string; total: number }>();

      for (const record of data) {
        const amount = Math.abs(Number(record.amount));
        const key = record.category || 'MISC';

        if (categoryMap.has(key)) {
          categoryMap.get(key)!.total += amount;
        } else {
          categoryMap.set(key, {
            account_title: record.account_title,
            total: amount,
          });
        }
      }

      // 総経費を計算
      const totalExpenses = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.total, 0);

      // 配列に変換し、割合を計算
      const breakdown: ExpenseBreakdown[] = Array.from(categoryMap.entries()).map(([category_id, data]) => ({
        category_id,
        account_title: data.account_title,
        total_amount: data.total,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      }));

      // 金額が大きい順にソート
      breakdown.sort((a, b) => b.total_amount - a.total_amount);

      return breakdown;
    } catch (error) {
      console.error('[ManagementPolicy] 経費内訳取得エラー:', error);
      return [];
    }
  }

  /**
   * AIによる経営分析の実行
   *
   * 指示書 IV.B-3: AIの出力（回答）
   * - 現状の評価
   * - 課題点
   * - 経営方針の提言
   *
   * @param financialData - 財務データサマリー
   * @param expenseBreakdown - 経費内訳
   * @returns AI分析結果
   */
  async generateAnalysis(
    financialData: FinancialSummary,
    expenseBreakdown: ExpenseBreakdown[]
  ): Promise<AIAnalysisResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('[ManagementPolicy] GEMINI_API_KEYが設定されていません。モックデータを返します。');
      return this.getMockAnalysisResult(financialData, expenseBreakdown);
    }

    try {
      // AI分析プロンプトの構築
      const prompt = this.buildAnalysisPrompt(financialData, expenseBreakdown);

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API エラー: ${response.statusText}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // JSONを抽出
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AIの応答からJSONを抽出できませんでした');
      }

      const aiResult = JSON.parse(jsonMatch[0]);

      // AIAnalysisResult 形式に変換
      const analysisResult: AIAnalysisResult = {
        analysis_date: new Date().toISOString().split('T')[0],
        evaluation_summary: aiResult.evaluation_summary || '',
        key_metrics: {
          gross_profit_rate: financialData.grossProfitRate,
          net_profit_rate: financialData.netProfitRate,
          expense_ratio: financialData.expenseRatio,
          cash_balance: 0, // 銀行残高は別途取得（今回はモック）
        },
        issues: aiResult.issues || [],
        policy_recommendation: aiResult.policy_recommendation || [],
        reference_data_ids: [`${financialData.periodStart}_${financialData.periodEnd}`],
      };

      console.log('[ManagementPolicy] AI分析完了:', analysisResult.evaluation_summary);
      return analysisResult;

    } catch (error) {
      console.error('[ManagementPolicy] AI分析エラー:', error);
      return this.getMockAnalysisResult(financialData, expenseBreakdown);
    }
  }

  /**
   * AI分析プロンプトの構築
   */
  private buildAnalysisPrompt(
    financialData: FinancialSummary,
    expenseBreakdown: ExpenseBreakdown[]
  ): string {
    const expenseBreakdownText = expenseBreakdown
      .map(item => `- ${item.account_title} (${item.category_id}): ¥${item.total_amount.toLocaleString()} (${item.percentage.toFixed(1)}%)`)
      .join('\n');

    return `あなたは経営コンサルタントです。以下の財務データを分析し、経営方針を提言してください。

## 財務データ（期間: ${financialData.periodStart} 〜 ${financialData.periodEnd}）

**主要指標:**
- 総売上: ¥${financialData.totalRevenue.toLocaleString()}
- 売上原価: ¥${financialData.totalCOGS.toLocaleString()}
- 総経費: ¥${financialData.totalExpenses.toLocaleString()}
- 粗利: ¥${financialData.grossProfit.toLocaleString()} (粗利率: ${financialData.grossProfitRate.toFixed(1)}%)
- 純利益: ¥${financialData.netProfit.toLocaleString()} (純利益率: ${financialData.netProfitRate.toFixed(1)}%)
- 経費率: ${financialData.expenseRatio.toFixed(1)}%

**経費内訳:**
${expenseBreakdownText}

## 分析依頼

以下の項目について、具体的かつ実行可能な回答を提供してください:

1. **現状の評価**: 主要KPIの健全性を評価してください（2〜3文）
2. **課題点**: データから読み取れる課題を3〜5つ箇条書きで挙げてください
3. **経営方針の提言**: 具体的なアクション（例: 「Category Aの仕入れを30%削減し、Category Bへの在庫投資を強化すべき」）を3〜5つ箇条書きで提案してください

## 回答形式

以下のJSON形式で返してください:

\`\`\`json
{
  "evaluation_summary": "現状の評価文（2〜3文）",
  "issues": [
    "課題1",
    "課題2",
    "課題3"
  ],
  "policy_recommendation": [
    "提言1: 具体的なアクション",
    "提言2: 具体的なアクション",
    "提言3: 具体的なアクション"
  ]
}
\`\`\``;
  }

  /**
   * モック分析結果の生成（API未設定時のフォールバック）
   */
  private getMockAnalysisResult(
    financialData: FinancialSummary,
    expenseBreakdown: ExpenseBreakdown[]
  ): AIAnalysisResult {
    return {
      analysis_date: new Date().toISOString().split('T')[0],
      evaluation_summary: `粗利率${financialData.grossProfitRate.toFixed(1)}%、純利益率${financialData.netProfitRate.toFixed(1)}%で推移しています。経費率は${financialData.expenseRatio.toFixed(1)}%となっており、健全な水準を維持しています。`,
      key_metrics: {
        gross_profit_rate: financialData.grossProfitRate,
        net_profit_rate: financialData.netProfitRate,
        expense_ratio: financialData.expenseRatio,
        cash_balance: 0,
      },
      issues: [
        '経費の中で配送費が最も大きな割合を占めています',
        '一部のカテゴリーで利益率が低下傾向にあります',
        '在庫回転率の改善が必要です',
      ],
      policy_recommendation: [
        '配送費の削減: FedEx契約の見直しと代替業者の検討を優先すべき',
        '高利益率カテゴリーへの集中: 粗利率30%以上のカテゴリーへの在庫投資を強化',
        '低利益率商品の整理: 粗利率15%未満の商品の出品を段階的に縮小',
      ],
      reference_data_ids: [`${financialData.periodStart}_${financialData.periodEnd}`],
    };
  }

  /**
   * AI分析結果をデータベースに保存
   *
   * @param result - AI分析結果
   * @returns 保存されたレコードID
   */
  async saveAnalysisResult(result: AIAnalysisResult): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('ai_analysis_results')
        .insert({
          analysis_date: result.analysis_date,
          evaluation_summary: result.evaluation_summary,
          gross_profit_rate: result.key_metrics.gross_profit_rate,
          net_profit_rate: result.key_metrics.net_profit_rate,
          expense_ratio: result.key_metrics.expense_ratio,
          cash_balance: result.key_metrics.cash_balance,
          issues: result.issues,
          policy_recommendation: result.policy_recommendation,
          reference_data_ids: result.reference_data_ids,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`AI分析結果の保存エラー: ${error.message}`);
      }

      console.log(`[ManagementPolicy] AI分析結果を保存しました: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('[ManagementPolicy] AI分析結果保存エラー:', error);
      return null;
    }
  }

  /**
   * 週次/月次の自動分析実行
   *
   * 指示書 IV.B-1: 分析トリガー
   * - 毎週月曜日の早朝など、決まった時間に自動実行
   *
   * @param period - 分析期間 ('WEEKLY' | 'MONTHLY')
   * @returns AI分析結果
   */
  async runPeriodicAnalysis(period: 'WEEKLY' | 'MONTHLY' = 'WEEKLY'): Promise<AIAnalysisResult | null> {
    try {
      const today = new Date();
      let startDate: Date;

      if (period === 'WEEKLY') {
        // 過去7日間
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        // 過去30日間
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const endDateStr = today.toISOString().split('T')[0];
      const startDateStr = startDate.toISOString().split('T')[0];

      console.log(`[ManagementPolicy] ${period}分析を開始: ${startDateStr} 〜 ${endDateStr}`);

      // 財務データを集計
      const financialData = await this.aggregateFinancialData(startDateStr, endDateStr);

      // 経費内訳を取得
      const expenseBreakdown = await this.getExpenseBreakdown(startDateStr, endDateStr);

      // AI分析を実行
      const analysisResult = await this.generateAnalysis(financialData, expenseBreakdown);

      // 結果を保存
      await this.saveAnalysisResult(analysisResult);

      console.log('[ManagementPolicy] 定期分析が完了しました');
      return analysisResult;
    } catch (error) {
      console.error('[ManagementPolicy] 定期分析エラー:', error);
      return null;
    }
  }
}

// ========================================
// エクスポート
// ========================================

/**
 * シングルトンインスタンス
 */
export const managementPolicyGenerator = new ManagementPolicyGeneratorService();
