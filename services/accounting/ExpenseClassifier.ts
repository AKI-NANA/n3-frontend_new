// services/accounting/ExpenseClassifier.ts
/**
 * 経費自動分類サービス
 *
 * 指示書 II.B: 経費の自動分類・マスターデータの利用
 * - Expense_Master テーブルに基づく摘要と勘定科目の自動分類
 * - AI（Claude/Gemini）による提案ロジック
 */

import { supabase } from '@/lib/supabase';
import type { ExpenseMaster } from '@/src/types/accounting';
import type { MoneyCloudTransaction } from './MoneyCloudConnector';

// ========================================
// 型定義
// ========================================

/**
 * 分類結果
 */
export interface ClassificationResult {
  transaction_id: string; // 取引ID
  account_title: string; // 勘定科目
  category_id: string; // カテゴリーID
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'; // 確信度
  matched_keyword?: string; // マッチしたキーワード
  requires_approval: boolean; // 承認が必要かどうか
  ai_suggested?: boolean; // AIが提案したかどうか
}

/**
 * AI提案リクエスト
 */
interface AIClassificationRequest {
  description: string; // 摘要
  amount: number; // 金額
  date: string; // 取引日
}

// ========================================
// 経費分類サービス
// ========================================

export class ExpenseClassifierService {
  private expenseMasterCache: ExpenseMaster[] = [];
  private lastCacheUpdate: number = 0;
  private cacheValidityMs = 300000; // 5分間キャッシュ

  constructor() {
    this.loadExpenseMaster();
  }

  /**
   * Expense_Master テーブルからマスターデータを読み込む
   */
  private async loadExpenseMaster() {
    const now = Date.now();
    if (now - this.lastCacheUpdate < this.cacheValidityMs && this.expenseMasterCache.length > 0) {
      return; // キャッシュが有効
    }

    try {
      const { data, error } = await supabase
        .from('expense_master')
        .select('*');

      if (error) {
        console.error('[ExpenseClassifier] マスターデータ読み込みエラー:', error);
        return;
      }

      this.expenseMasterCache = data as ExpenseMaster[];
      this.lastCacheUpdate = now;
      console.log(`[ExpenseClassifier] ${this.expenseMasterCache.length}件のマスターデータを読み込みました`);
    } catch (error) {
      console.error('[ExpenseClassifier] マスターデータ読み込み失敗:', error);
    }
  }

  /**
   * 摘要とマスターデータのキーワードマッチング
   *
   * 指示書 II.B-2: 自動分類ロジック
   * - マネークラウドの摘要と Expense_Master.Keyword を照合
   * - 一致した場合、Account_Title を自動適用
   *
   * @param description - 摘要（取引内容）
   * @returns マッチした経費マスター（なければnull）
   */
  private matchKeyword(description: string): ExpenseMaster | null {
    if (!description) return null;

    const lowerDescription = description.toLowerCase();

    // 完全一致または部分一致を優先
    for (const master of this.expenseMasterCache) {
      const lowerKeyword = master.keyword.toLowerCase();
      if (lowerDescription.includes(lowerKeyword)) {
        console.log(`[ExpenseClassifier] キーワード一致: "${master.keyword}" → ${master.account_title}`);
        return master;
      }
    }

    return null;
  }

  /**
   * AIによる勘定科目の提案
   *
   * 指示書 II.B-2: AIの利用
   * - 照合できなかったデータをAI（Claude/Gemini）が解析
   * - 最も可能性の高い勘定科目を提案（担当者承認が必要）
   *
   * @param request - AI分類リクエスト
   * @returns 提案された勘定科目とカテゴリーID
   */
  private async classifyWithAI(
    request: AIClassificationRequest
  ): Promise<{ account_title: string; category_id: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('[ExpenseClassifier] GEMINI_API_KEYが設定されていません。モックデータを返します。');
      // モック: デフォルトの勘定科目を返す
      return {
        account_title: '雑費',
        category_id: 'MISC',
      };
    }

    try {
      const prompt = `以下の取引内容から、最も適切な勘定科目を提案してください。

取引内容: ${request.description}
金額: ${request.amount}円
日付: ${request.date}

可能な勘定科目の例:
- 仕入高 (PURCHASE)
- 支払手数料 (PLATFORM_FEE)
- 発送費 (SHIPPING_FEE)
- 広告宣伝費 (ADVERTISING)
- 通信費 (IT_EXPENSE)
- 消耗品費 (SUPPLIES)
- 旅費交通費 (TRAVEL)
- 雑費 (MISC)

回答は以下のJSON形式で返してください:
{
  "account_title": "勘定科目名",
  "category_id": "カテゴリーID",
  "reason": "選択理由"
}`;

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.2, // 低温度で一貫性を高める
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API エラー: ${response.statusText}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // JSONを抽出（```json ブロックがある場合は除去）
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log(`[ExpenseClassifier] AI提案: ${result.account_title} (理由: ${result.reason})`);
        return {
          account_title: result.account_title,
          category_id: result.category_id,
        };
      }

      throw new Error('AIの応答からJSONを抽出できませんでした');

    } catch (error) {
      console.error('[ExpenseClassifier] AI分類エラー:', error);
      // フォールバック: デフォルトの勘定科目
      return {
        account_title: '雑費',
        category_id: 'MISC',
      };
    }
  }

  /**
   * 単一の取引を分類
   *
   * @param transaction - マネークラウドの取引データ
   * @returns 分類結果
   */
  async classifyTransaction(
    transaction: MoneyCloudTransaction
  ): Promise<ClassificationResult> {
    // マスターデータを最新化
    await this.loadExpenseMaster();

    // 1. キーワードマッチングを試行
    const matchedMaster = this.matchKeyword(transaction.description);

    if (matchedMaster) {
      // キーワードマッチ成功
      return {
        transaction_id: transaction.id,
        account_title: matchedMaster.account_title,
        category_id: matchedMaster.category_id,
        confidence: 'HIGH',
        matched_keyword: matchedMaster.keyword,
        requires_approval: false, // 自動分類なので承認不要
        ai_suggested: false,
      };
    }

    // 2. キーワードマッチ失敗 → AIによる提案
    console.log(`[ExpenseClassifier] キーワード未一致: "${transaction.description}" → AI提案を実行`);

    const aiResult = await this.classifyWithAI({
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
    });

    if (!aiResult) {
      // AIも失敗した場合はデフォルト
      return {
        transaction_id: transaction.id,
        account_title: '雑費',
        category_id: 'MISC',
        confidence: 'LOW',
        requires_approval: true,
        ai_suggested: true,
      };
    }

    return {
      transaction_id: transaction.id,
      account_title: aiResult.account_title,
      category_id: aiResult.category_id,
      confidence: 'MEDIUM',
      requires_approval: true, // AI提案は承認必須
      ai_suggested: true,
    };
  }

  /**
   * 複数の取引をバッチ分類
   *
   * @param transactions - マネークラウドの取引データ配列
   * @returns 分類結果の配列
   */
  async classifyTransactions(
    transactions: MoneyCloudTransaction[]
  ): Promise<ClassificationResult[]> {
    console.log(`[ExpenseClassifier] ${transactions.length}件の取引を分類します`);

    const results: ClassificationResult[] = [];

    for (const transaction of transactions) {
      const result = await this.classifyTransaction(transaction);
      results.push(result);
    }

    const highConfidenceCount = results.filter(r => r.confidence === 'HIGH').length;
    const aiSuggestedCount = results.filter(r => r.ai_suggested).length;

    console.log(`[ExpenseClassifier] 分類完了: 高信頼度 ${highConfidenceCount}件、AI提案 ${aiSuggestedCount}件`);

    return results;
  }

  /**
   * 分類結果を会計台帳に記録
   *
   * @param transaction - マネークラウドの取引データ
   * @param classification - 分類結果
   * @returns 台帳レコードID
   */
  async saveToLedger(
    transaction: MoneyCloudTransaction,
    classification: ClassificationResult
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('accounting_final_ledger')
        .insert({
          date: transaction.date,
          account_title: classification.account_title,
          amount: transaction.amount,
          category: classification.category_id,
          transaction_summary: transaction.description,
          money_cloud_transaction_id: transaction.id,
          is_verified: !classification.requires_approval, // 承認不要なら即確定
        })
        .select('id')
        .single();

      if (error) {
        console.error('[ExpenseClassifier] 台帳保存エラー:', error);
        return null;
      }

      console.log(`[ExpenseClassifier] 台帳に記録しました: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('[ExpenseClassifier] 台帳保存失敗:', error);
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
export const expenseClassifier = new ExpenseClassifierService();
