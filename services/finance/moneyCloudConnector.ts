// services/finance/moneyCloudConnector.ts
// Phase 4: マネークラウド連携サービス (T-58)

import { createClient } from '@/lib/supabase/server';
import type { SyncResult, FinanceActual } from '@/types/finance';

/**
 * 💡 T-58: マネークラウド連携モック
 * 実際にはOAuth/APIキーを使用してMoney Forward APIなどからデータを取得する
 *
 * 実装時の参考:
 * - Money Forward Cloud API: https://developer.moneyforward.com/
 * - 認証: OAuth 2.0
 * - エンドポイント: /api/v1/transactions
 */
export async function syncActualsFromMoneyCloud(apiKey: string): Promise<SyncResult> {
  try {
    if (!apiKey) {
      throw new Error('Money Cloud API Key is missing.');
    }

    console.log('[Money Cloud Sync] Attempting to sync financial data...');

    const supabase = await createClient();

    // 💡 実際の実装では、Money Forward Cloud APIにリクエストを送信
    // const response = await fetch('https://api.moneyforward.com/api/v1/transactions', {
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   params: {
    //     from_date: threeMonthsAgo.toISOString().split('T')[0],
    //     to_date: new Date().toISOString().split('T')[0],
    //   },
    // });
    //
    // const apiData = await response.json();
    // const transactions = apiData.transactions.map(t => ({
    //   transaction_date: t.updated_at,
    //   account_code: t.large_category.code,
    //   account_name: t.large_category.name,
    //   amount: t.amount,
    //   source_type: 'MF_Cloud',
    //   metadata: { original_id: t.id, sub_category: t.middle_category.name },
    // }));

    // モックデータ: 過去3ヶ月の仕入れと売上の実績
    const mockTransactions: Omit<FinanceActual, 'id'>[] = [
      {
        transaction_date: '2025-08-15',
        account_code: '101',
        account_name: '売掛金',
        amount: 1200000,
        source_type: 'MF_Cloud',
        metadata: { description: 'eBay売上入金' },
      },
      {
        transaction_date: '2025-08-20',
        account_code: '501',
        account_name: '仕入',
        amount: -650000,
        source_type: 'MF_Cloud',
        metadata: { description: '商品仕入れ' },
      },
      {
        transaction_date: '2025-08-25',
        account_code: '520',
        account_name: '地代家賃',
        amount: -150000,
        source_type: 'MF_Cloud',
        metadata: { description: '事務所家賃' },
      },
      {
        transaction_date: '2025-09-10',
        account_code: '101',
        account_name: '売掛金',
        amount: 950000,
        source_type: 'MF_Cloud',
        metadata: { description: 'Amazon売上入金' },
      },
      {
        transaction_date: '2025-09-15',
        account_code: '501',
        account_name: '仕入',
        amount: -400000,
        source_type: 'MF_Cloud',
        metadata: { description: '商品仕入れ' },
      },
      {
        transaction_date: '2025-09-25',
        account_code: '520',
        account_name: '地代家賃',
        amount: -150000,
        source_type: 'MF_Cloud',
        metadata: { description: '事務所家賃' },
      },
      {
        transaction_date: '2025-10-12',
        account_code: '101',
        account_name: '売掛金',
        amount: 1350000,
        source_type: 'MF_Cloud',
        metadata: { description: 'Shopee売上入金' },
      },
      {
        transaction_date: '2025-10-18',
        account_code: '501',
        account_name: '仕入',
        amount: -720000,
        source_type: 'MF_Cloud',
        metadata: { description: '商品仕入れ' },
      },
      {
        transaction_date: '2025-10-25',
        account_code: '520',
        account_name: '地代家賃',
        amount: -150000,
        source_type: 'MF_Cloud',
        metadata: { description: '事務所家賃' },
      },
      {
        transaction_date: '2025-11-08',
        account_code: '101',
        account_name: '売掛金',
        amount: 1580000,
        source_type: 'MF_Cloud',
        metadata: { description: 'eBay売上入金' },
      },
      {
        transaction_date: '2025-11-15',
        account_code: '501',
        account_name: '仕入',
        amount: -850000,
        source_type: 'MF_Cloud',
        metadata: { description: '商品仕入れ' },
      },
      {
        transaction_date: '2025-11-20',
        account_code: '530',
        account_name: '人件費',
        amount: -300000,
        source_type: 'MF_Cloud',
        metadata: { description: '外注スタッフ給与' },
      },
    ];

    // 重複チェック: 既存のデータと日付・金額が一致するものは除外
    const existingCheck = await supabase
      .from('finance_actuals')
      .select('transaction_date, amount, account_code')
      .eq('source_type', 'MF_Cloud');

    const existingKeys = new Set(
      (existingCheck.data || []).map(
        (item) => `${item.transaction_date}_${item.account_code}_${item.amount}`
      )
    );

    const newTransactions = mockTransactions.filter((t) => {
      const key = `${t.transaction_date}_${t.account_code}_${t.amount}`;
      return !existingKeys.has(key);
    });

    if (newTransactions.length === 0) {
      console.log('[Money Cloud Sync] No new transactions to sync');
      return {
        status: 'Success',
        count: 0,
        message: 'No new transactions found (all data already synced)',
        synced_at: new Date().toISOString(),
      };
    }

    // finance_actuals テーブルにデータを挿入
    const { error, count } = await supabase
      .from('finance_actuals')
      .insert(newTransactions);

    if (error) {
      console.error('[Money Cloud Sync] Error inserting actuals:', error);
      throw new Error('Failed to sync data from Money Cloud source.');
    }

    // 設定テーブルの最終同期日時を更新
    await supabase
      .from('cashflow_settings')
      .upsert({
        id: 1,
        last_sync_at: new Date().toISOString(),
      });

    console.log(`[Money Cloud Sync] Successfully synced ${newTransactions.length} transactions`);

    return {
      status: 'Success',
      count: newTransactions.length,
      message: `Actuals synced successfully. ${newTransactions.length} new transactions added.`,
      synced_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Money Cloud Sync] Sync failed:', error);
    return {
      status: 'Error',
      count: 0,
      message: error instanceof Error ? error.message : 'Unknown sync error',
      synced_at: new Date().toISOString(),
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * 設定からマネークラウドAPIキーを取得
 */
export async function getMoneyCloudApiKey(): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cashflow_settings')
      .select('money_cloud_api_key')
      .single();

    if (error || !data) {
      return null;
    }

    return data.money_cloud_api_key || null;
  } catch (error) {
    console.error('Error fetching Money Cloud API key:', error);
    return null;
  }
}

/**
 * マネークラウドAPIキーを設定に保存
 */
export async function saveMoneyCloudApiKey(apiKey: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('cashflow_settings')
      .upsert({
        id: 1,
        money_cloud_api_key: apiKey,
      });

    if (error) {
      console.error('Error saving Money Cloud API key:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveMoneyCloudApiKey:', error);
    return false;
  }
}
