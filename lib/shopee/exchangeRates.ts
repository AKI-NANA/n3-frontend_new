/**
 * Shopee為替レート取得システム
 * JPY → 各国通貨のレートを取得
 */

import { SHOPEE_COUNTRIES, ShopeeCountryCode } from './translator';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: Date;
  provider: 'exchangerate-api' | 'fixer' | 'fallback';
}

export interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
  lastUpdated: Date;
  provider: string;
}

/**
 * フォールバックレート (APIが使えない場合の固定レート)
 * ⚠️ 本番環境では定期的に更新する必要があります
 */
const FALLBACK_RATES: Record<string, number> = {
  TWD: 0.214, // 1 JPY = 0.214 TWD (1 TWD = 4.67 JPY)
  THB: 0.234, // 1 JPY = 0.234 THB (1 THB = 4.27 JPY)
  SGD: 0.0089, // 1 JPY = 0.0089 SGD (1 SGD = 112 JPY)
  MYR: 0.0296, // 1 JPY = 0.0296 MYR (1 MYR = 33.8 JPY)
  PHP: 0.373, // 1 JPY = 0.373 PHP (1 PHP = 2.68 JPY)
  VND: 167, // 1 JPY = 167 VND (1 VND = 0.006 JPY)
  IDR: 106, // 1 JPY = 106 IDR (1 IDR = 0.0094 JPY)
  BRL: 0.038, // 1 JPY = 0.038 BRL (1 BRL = 26.3 JPY)
  MXN: 0.135, // 1 JPY = 0.135 MXN (1 MXN = 7.4 JPY)
  USD: 0.0067, // 1 JPY = 0.0067 USD (1 USD = 149 JPY)
};

/**
 * ExchangeRate-API (無料プラン利用可能)
 * https://www.exchangerate-api.com/
 */
async function fetchFromExchangeRateAPI(): Promise<ExchangeRatesResponse> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    throw new Error('EXCHANGE_RATE_API_KEY が設定されていません');
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/JPY`,
      {
        next: { revalidate: 3600 }, // 1時間キャッシュ
      }
    );

    if (!response.ok) {
      throw new Error(`ExchangeRate-API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(`ExchangeRate-API failed: ${data['error-type']}`);
    }

    return {
      base: 'JPY',
      rates: data.conversion_rates,
      lastUpdated: new Date(data.time_last_update_unix * 1000),
      provider: 'exchangerate-api',
    };
  } catch (error) {
    console.error('[ExchangeRates] ExchangeRate-API取得失敗:', error);
    throw error;
  }
}

/**
 * Fixer.io API (代替API)
 * https://fixer.io/
 */
async function fetchFromFixerAPI(): Promise<ExchangeRatesResponse> {
  const apiKey = process.env.FIXER_API_KEY;

  if (!apiKey) {
    throw new Error('FIXER_API_KEY が設定されていません');
  }

  try {
    const response = await fetch(
      `https://api.fixer.io/latest?access_key=${apiKey}&base=JPY`,
      {
        next: { revalidate: 3600 }, // 1時間キャッシュ
      }
    );

    if (!response.ok) {
      throw new Error(`Fixer API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Fixer API failed: ${data.error?.info || 'Unknown error'}`);
    }

    return {
      base: 'JPY',
      rates: data.rates,
      lastUpdated: new Date(data.timestamp * 1000),
      provider: 'fixer',
    };
  } catch (error) {
    console.error('[ExchangeRates] Fixer API取得失敗:', error);
    throw error;
  }
}

/**
 * フォールバックレートを使用
 */
function getFallbackRates(): ExchangeRatesResponse {
  console.warn('[ExchangeRates] フォールバックレートを使用します');

  return {
    base: 'JPY',
    rates: FALLBACK_RATES,
    lastUpdated: new Date(),
    provider: 'fallback',
  };
}

/**
 * 為替レートを取得 (メイン関数)
 */
export async function getExchangeRates(
  options: {
    useFallbackOnError?: boolean;
  } = {}
): Promise<ExchangeRatesResponse> {
  const { useFallbackOnError = true } = options;

  try {
    // まずExchangeRate-APIを試す
    return await fetchFromExchangeRateAPI();
  } catch (error) {
    console.error('[ExchangeRates] ExchangeRate-API失敗、Fixer APIを試します');

    try {
      // Fixer APIを試す
      return await fetchFromFixerAPI();
    } catch (error2) {
      console.error('[ExchangeRates] Fixer API失敗');

      if (useFallbackOnError) {
        // フォールバックレート使用
        return getFallbackRates();
      }

      throw new Error('全ての為替レートAPIが失敗しました');
    }
  }
}

/**
 * 特定通貨のレートを取得
 */
export async function getExchangeRate(
  currency: string,
  options?: { useFallbackOnError?: boolean }
): Promise<ExchangeRate> {
  const rates = await getExchangeRates(options);

  if (!rates.rates[currency]) {
    throw new Error(`通貨 ${currency} のレートが見つかりません`);
  }

  return {
    from: 'JPY',
    to: currency,
    rate: rates.rates[currency],
    lastUpdated: rates.lastUpdated,
    provider: rates.provider as any,
  };
}

/**
 * Shopee全対応国の為替レートを取得
 */
export async function getShopeeExchangeRates(): Promise<
  Record<ShopeeCountryCode, ExchangeRate>
> {
  const rates = await getExchangeRates();
  const shopeeRates: any = {};

  for (const [countryCode, countryInfo] of Object.entries(SHOPEE_COUNTRIES)) {
    const currency = countryInfo.currency;

    if (!rates.rates[currency]) {
      console.warn(`[ExchangeRates] ${countryCode} (${currency}) のレートが見つかりません`);
      continue;
    }

    shopeeRates[countryCode] = {
      from: 'JPY',
      to: currency,
      rate: rates.rates[currency],
      lastUpdated: rates.lastUpdated,
      provider: rates.provider,
    };
  }

  return shopeeRates;
}

/**
 * JPY → 指定通貨への換算
 */
export function convertJPYTo(
  amountJPY: number,
  rate: number,
  options: {
    precision?: number;
  } = {}
): number {
  const { precision = 2 } = options;

  const converted = amountJPY * rate;
  return parseFloat(converted.toFixed(precision));
}

/**
 * 指定通貨 → JPYへの換算
 */
export function convertToJPY(
  amount: number,
  rate: number,
  options: {
    precision?: number;
  } = {}
): number {
  const { precision = 2 } = options;

  const converted = amount / rate;
  return parseFloat(converted.toFixed(precision));
}

/**
 * 為替レートキャッシュ (60分有効)
 */
let ratesCache: {
  data: ExchangeRatesResponse | null;
  expiresAt: number;
} = {
  data: null,
  expiresAt: 0,
};

/**
 * キャッシュ付き為替レート取得
 */
export async function getExchangeRatesCached(): Promise<ExchangeRatesResponse> {
  const now = Date.now();

  // キャッシュチェック
  if (ratesCache.data && now < ratesCache.expiresAt) {
    console.log('[ExchangeRates] キャッシュヒット');
    return ratesCache.data;
  }

  // 新規取得
  const rates = await getExchangeRates();

  // キャッシュに保存 (60分)
  ratesCache = {
    data: rates,
    expiresAt: now + 60 * 60 * 1000,
  };

  console.log('[ExchangeRates] 為替レート取得完了、60分キャッシュに保存');
  return rates;
}

/**
 * キャッシュクリア
 */
export function clearExchangeRateCache(): void {
  ratesCache = { data: null, expiresAt: 0 };
  console.log('[ExchangeRates] キャッシュクリア完了');
}
