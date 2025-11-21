/**
 * Shopee多言語翻訳システム
 * eBayの英語データをShopee各国の現地言語に変換
 */

// Shopee対応国と言語のマッピング
export const SHOPEE_COUNTRIES = {
  TW: { name: '台湾', language: 'zh-TW', currency: 'TWD' },
  TH: { name: 'タイ', language: 'th', currency: 'THB' },
  SG: { name: 'シンガポール', language: 'en', currency: 'SGD' },
  MY: { name: 'マレーシア', language: 'en', currency: 'MYR' },
  PH: { name: 'フィリピン', language: 'en', currency: 'PHP' },
  VN: { name: 'ベトナム', language: 'vi', currency: 'VND' },
  ID: { name: 'インドネシア', language: 'id', currency: 'IDR' },
  BR: { name: 'ブラジル', language: 'pt', currency: 'BRL' },
  MX: { name: 'メキシコ', language: 'es', currency: 'MXN' },
} as const;

export type ShopeeCountryCode = keyof typeof SHOPEE_COUNTRIES;

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslationResult {
  translatedText: string;
  originalText: string;
  targetLanguage: string;
  sourceLanguage: string;
  confidence?: number;
  provider: 'google' | 'deepl' | 'fallback';
}

/**
 * Google Translate APIを使用した翻訳
 * 環境変数 GOOGLE_TRANSLATE_API_KEY が必要
 */
async function translateWithGoogle(
  text: string,
  targetLang: string,
  sourceLang: string = 'en'
): Promise<TranslationResult> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY が設定されていません');
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: sourceLang,
          format: 'text',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }

    const data = await response.json();
    const translated = data.data.translations[0];

    return {
      translatedText: translated.translatedText,
      originalText: text,
      targetLanguage: targetLang,
      sourceLanguage: sourceLang,
      provider: 'google',
    };
  } catch (error) {
    console.error('[Translator] Google Translate失敗:', error);
    throw error;
  }
}

/**
 * フォールバック翻訳 (翻訳できない場合は英語をそのまま返す)
 */
function fallbackTranslation(
  text: string,
  targetLang: string,
  sourceLang: string = 'en'
): TranslationResult {
  console.warn(`[Translator] フォールバック: ${targetLang}への翻訳をスキップし、英語を使用`);

  return {
    translatedText: text,
    originalText: text,
    targetLanguage: targetLang,
    sourceLanguage: sourceLang,
    provider: 'fallback',
  };
}

/**
 * テキストを指定言語に翻訳 (メイン関数)
 */
export async function translateText(
  text: string,
  targetCountry: ShopeeCountryCode,
  options: {
    sourceLanguage?: string;
    useFallbackOnError?: boolean;
  } = {}
): Promise<TranslationResult> {
  const { sourceLanguage = 'en', useFallbackOnError = true } = options;

  const targetLang = SHOPEE_COUNTRIES[targetCountry].language;

  // 英語圏の場合は翻訳不要
  if (targetLang === 'en') {
    return {
      translatedText: text,
      originalText: text,
      targetLanguage: targetLang,
      sourceLanguage,
      provider: 'fallback',
    };
  }

  // 空文字チェック
  if (!text || text.trim().length === 0) {
    return {
      translatedText: '',
      originalText: text,
      targetLanguage: targetLang,
      sourceLanguage,
      provider: 'fallback',
    };
  }

  try {
    // Google Translate APIで翻訳
    return await translateWithGoogle(text, targetLang, sourceLanguage);
  } catch (error) {
    console.error(`[Translator] 翻訳エラー (${targetCountry}):`, error);

    if (useFallbackOnError) {
      // フォールバック: 英語をそのまま使用
      return fallbackTranslation(text, targetLang, sourceLanguage);
    }

    throw error;
  }
}

/**
 * 商品タイトルと説明を一括翻訳
 */
export async function translateProductListing(
  englishTitle: string,
  englishDescription: string,
  targetCountry: ShopeeCountryCode,
  options: {
    maxTitleLength?: number;
    maxDescriptionLength?: number;
  } = {}
): Promise<{
  title: TranslationResult;
  description: TranslationResult;
}> {
  const { maxTitleLength = 255, maxDescriptionLength = 5000 } = options;

  console.log(`[Translator] 翻訳開始: ${targetCountry} (${SHOPEE_COUNTRIES[targetCountry].name})`);

  // タイトル翻訳
  let titleToTranslate = englishTitle;
  if (englishTitle.length > maxTitleLength) {
    titleToTranslate = englishTitle.substring(0, maxTitleLength - 3) + '...';
    console.warn(`[Translator] タイトルが長すぎるため切り詰めました: ${englishTitle.length} → ${maxTitleLength}`);
  }

  // 説明文翻訳
  let descToTranslate = englishDescription;
  if (englishDescription.length > maxDescriptionLength) {
    descToTranslate = englishDescription.substring(0, maxDescriptionLength - 3) + '...';
    console.warn(`[Translator] 説明文が長すぎるため切り詰めました: ${englishDescription.length} → ${maxDescriptionLength}`);
  }

  // 並列翻訳で高速化
  const [title, description] = await Promise.all([
    translateText(titleToTranslate, targetCountry),
    translateText(descToTranslate, targetCountry),
  ]);

  console.log(`[Translator] 翻訳完了: ${targetCountry}`);
  console.log(`  - タイトル: "${englishTitle}" → "${title.translatedText}"`);
  console.log(`  - 説明文: ${englishDescription.length}文字 → ${description.translatedText.length}文字`);

  return { title, description };
}

/**
 * バッチ翻訳 (複数の国に同時翻訳)
 */
export async function translateProductToMultipleCountries(
  englishTitle: string,
  englishDescription: string,
  targetCountries: ShopeeCountryCode[]
): Promise<Record<ShopeeCountryCode, { title: TranslationResult; description: TranslationResult }>> {
  console.log(`[Translator] バッチ翻訳開始: ${targetCountries.length}カ国`);

  const results = await Promise.all(
    targetCountries.map(async (country) => {
      const translation = await translateProductListing(englishTitle, englishDescription, country);
      return { country, translation };
    })
  );

  const translationsMap: any = {};
  results.forEach(({ country, translation }) => {
    translationsMap[country] = translation;
  });

  console.log(`[Translator] バッチ翻訳完了: ${targetCountries.length}カ国`);
  return translationsMap;
}

/**
 * キャッシュ機能付き翻訳 (同じテキストを複数回翻訳しない)
 */
const translationCache = new Map<string, TranslationResult>();

export async function translateTextCached(
  text: string,
  targetCountry: ShopeeCountryCode,
  options?: { sourceLanguage?: string; useFallbackOnError?: boolean }
): Promise<TranslationResult> {
  const cacheKey = `${text}:${targetCountry}`;

  // キャッシュチェック
  if (translationCache.has(cacheKey)) {
    console.log(`[Translator] キャッシュヒット: ${cacheKey}`);
    return translationCache.get(cacheKey)!;
  }

  // 翻訳実行
  const result = await translateText(text, targetCountry, options);

  // キャッシュに保存 (メモリリーク防止のため最大1000件まで)
  if (translationCache.size < 1000) {
    translationCache.set(cacheKey, result);
  }

  return result;
}

/**
 * キャッシュクリア
 */
export function clearTranslationCache(): void {
  translationCache.clear();
  console.log('[Translator] キャッシュクリア完了');
}
