/**
 * Amazon購入アカウント管理ロジック
 *
 * 複数のAmazonアカウントを使い分けて、アカウント停止リスクを最小化する。
 *
 * 機能:
 * 1. 利用可能なアカウントを選択（ラウンドロビン or 最小使用頻度）
 * 2. アカウントごとのプロキシ設定を管理
 * 3. 使用履歴を記録
 * 4. クールダウン期間の管理
 *
 * セキュリティ:
 * - アカウント情報は環境変数またはシークレットマネージャーから取得
 * - ログにはアカウントIDのみを記録し、認証情報は記録しない
 */

interface PurchaseAccount {
  id: string;
  name: string;
  country: 'US' | 'JP';
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_password?: string;
  last_used?: Date | null;
  usage_count: number;
  is_active: boolean;
  cooldown_until?: Date | null;
}

// モックアカウントデータ（本番環境では環境変数またはDBから取得）
const MOCK_ACCOUNTS: PurchaseAccount[] = [
  {
    id: 'CORP-001',
    name: 'Corporate Account 1',
    country: 'US',
    proxy_host: 'proxy-us-1.example.com',
    proxy_port: 8080,
    last_used: null,
    usage_count: 0,
    is_active: true,
  },
  {
    id: 'CORP-002',
    name: 'Corporate Account 2',
    country: 'US',
    proxy_host: 'proxy-us-2.example.com',
    proxy_port: 8080,
    last_used: null,
    usage_count: 0,
    is_active: true,
  },
  {
    id: 'JP-001',
    name: 'Japan Account 1',
    country: 'JP',
    proxy_host: 'proxy-jp-1.example.com',
    proxy_port: 8080,
    last_used: null,
    usage_count: 0,
    is_active: true,
  },
  {
    id: 'JP-002',
    name: 'Japan Account 2',
    country: 'JP',
    proxy_host: 'proxy-jp-2.example.com',
    proxy_port: 8080,
    last_used: null,
    usage_count: 0,
    is_active: true,
  },
];

// アカウント状態管理（メモリ内、本番ではDBまたはRedis）
let accountsState = [...MOCK_ACCOUNTS];

/**
 * 利用可能なアカウントを取得
 *
 * 選択ロジック:
 * 1. アクティブなアカウントのみ
 * 2. クールダウン期間外のアカウント
 * 3. 最も使用頻度が低いアカウント
 *
 * @param country 対象国（'US' または 'JP'）
 * @returns 選択されたアカウント、または null
 */
export async function getAvailableAccount(
  country?: 'US' | 'JP'
): Promise<PurchaseAccount | null> {
  const now = new Date();

  // 1. フィルタリング: アクティブ & クールダウン期間外
  let availableAccounts = accountsState.filter((account) => {
    if (!account.is_active) return false;
    if (country && account.country !== country) return false;
    if (account.cooldown_until && account.cooldown_until > now) return false;
    return true;
  });

  if (availableAccounts.length === 0) {
    console.error('❌ 利用可能なアカウントがありません');
    return null;
  }

  // 2. 最小使用頻度のアカウントを選択
  availableAccounts.sort((a, b) => {
    // 使用回数が少ない順
    if (a.usage_count !== b.usage_count) {
      return a.usage_count - b.usage_count;
    }
    // 使用回数が同じ場合、最終使用日が古い順
    if (!a.last_used) return -1;
    if (!b.last_used) return 1;
    return a.last_used.getTime() - b.last_used.getTime();
  });

  const selectedAccount = availableAccounts[0];
  console.log(`✅ アカウント選択: ${selectedAccount.id} (使用回数: ${selectedAccount.usage_count})`);

  return selectedAccount;
}

/**
 * アカウントを使用済みとしてマーク
 *
 * @param accountId アカウントID
 * @param cooldownMinutes クールダウン時間（分）、デフォルト60分
 */
export async function markAccountAsUsed(
  accountId: string,
  cooldownMinutes: number = 60
): Promise<void> {
  const account = accountsState.find((a) => a.id === accountId);

  if (!account) {
    console.error(`❌ アカウントが見つかりません: ${accountId}`);
    return;
  }

  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + cooldownMinutes * 60 * 1000);

  account.last_used = now;
  account.usage_count += 1;
  account.cooldown_until = cooldownUntil;

  console.log(
    `📋 アカウント使用記録: ${accountId} (次回利用可能: ${cooldownUntil.toISOString()})`
  );

  // 本番環境ではDBに永続化
  // await saveAccountStateToDatabase(account);
}

/**
 * アカウントのプロキシ設定を取得
 *
 * @param accountId アカウントID
 * @returns プロキシ設定、またはnull
 */
export function getProxyForAccount(accountId: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} | null {
  const account = accountsState.find((a) => a.id === accountId);

  if (!account || !account.proxy_host || !account.proxy_port) {
    return null;
  }

  return {
    host: account.proxy_host,
    port: account.proxy_port,
    username: account.proxy_username,
    password: account.proxy_password,
  };
}

/**
 * アカウント認証情報を取得（モック）
 *
 * ⚠️ 本番環境では、環境変数またはAWS Secrets Managerから取得してください。
 * 絶対にコード内にハードコーディングしないでください。
 *
 * @param accountId アカウントID
 * @returns 認証情報、またはnull
 */
export function getAccountCredentials(accountId: string): {
  email: string;
  password: string;
} | null {
  // モック実装
  // 本番では以下のように実装:
  // const secret = await getSecretFromSecretsManager(`amazon-account-${accountId}`);
  // return JSON.parse(secret);

  console.warn('⚠️ モック認証情報を使用しています。本番環境では環境変数から取得してください。');

  return {
    email: `${accountId.toLowerCase()}@example.com`,
    password: 'mock-password-12345',
  };
}

/**
 * アカウント使用統計を取得
 */
export function getAccountStats(): {
  total: number;
  active: number;
  in_cooldown: number;
  usage_by_account: Array<{ id: string; usage_count: number; last_used: Date | null }>;
} {
  const now = new Date();
  const inCooldown = accountsState.filter(
    (a) => a.cooldown_until && a.cooldown_until > now
  ).length;

  return {
    total: accountsState.length,
    active: accountsState.filter((a) => a.is_active).length,
    in_cooldown: inCooldown,
    usage_by_account: accountsState.map((a) => ({
      id: a.id,
      usage_count: a.usage_count,
      last_used: a.last_used,
    })),
  };
}

/**
 * アカウントをリセット（開発・テスト用）
 */
export function resetAccountStates(): void {
  accountsState = MOCK_ACCOUNTS.map((a) => ({
    ...a,
    last_used: null,
    usage_count: 0,
    cooldown_until: null,
  }));
  console.log('🔄 アカウント状態をリセットしました');
}
