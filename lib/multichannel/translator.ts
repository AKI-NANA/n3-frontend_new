/**
 * 多言語翻訳ロジック
 * プラットフォームの主要言語に自動翻訳
 */

import type { Language, Platform } from './types';
import { getPrimaryLanguage } from './platformConfigs';

/**
 * 翻訳結果
 */
export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  translationMethod: 'cached' | 'api' | 'fallback';
}

/**
 * テキストを指定言語に翻訳
 * TODO: 実際の翻訳API（Google Translate、DeepL、ChatGPTなど）を統合
 */
export async function translateText(
  text: string,
  targetLanguage: Language,
  sourceLanguage?: Language
): Promise<TranslationResult> {
  // 空のテキストはそのまま返す
  if (!text || text.trim() === '') {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: sourceLanguage || 'ja',
      targetLanguage,
      translationMethod: 'fallback',
    };
  }

  // ソース言語の自動検出（簡易版）
  const detectedSourceLang = sourceLanguage || detectLanguage(text);

  // 同じ言語の場合は翻訳不要
  if (detectedSourceLang === targetLanguage) {
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: detectedSourceLang,
      targetLanguage,
      translationMethod: 'fallback',
    };
  }

  // TODO: 実際の翻訳APIを呼び出す
  // 現在はプレースホルダーとして、言語タグを追加して返す
  const translatedText = await mockTranslate(text, detectedSourceLang, targetLanguage);

  return {
    originalText: text,
    translatedText,
    sourceLanguage: detectedSourceLang,
    targetLanguage,
    translationMethod: 'fallback', // TODO: 'api' に変更
  };
}

/**
 * プラットフォームの主要言語に翻訳
 */
export async function translateForPlatform(
  text: string,
  platform: Platform,
  sourceLanguage?: Language
): Promise<string> {
  const targetLang = getPrimaryLanguage(platform) as Language;
  const result = await translateText(text, targetLang, sourceLanguage);
  return result.translatedText;
}

/**
 * タイトルと説明文を一括翻訳
 */
export async function translateProductContent(
  title: string,
  description: string,
  platform: Platform,
  sourceLanguage?: Language
): Promise<{ title: string; description: string }> {
  const targetLang = getPrimaryLanguage(platform) as Language;

  const [titleResult, descResult] = await Promise.all([
    translateText(title, targetLang, sourceLanguage),
    translateText(description, targetLang, sourceLanguage),
  ]);

  return {
    title: titleResult.translatedText,
    description: descResult.translatedText,
  };
}

/**
 * 言語を検出（簡易版）
 * TODO: より精度の高い言語検出ライブラリを使用
 */
function detectLanguage(text: string): Language {
  // 日本語の文字を含む場合
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
    return 'ja';
  }
  // 韓国語の文字を含む場合
  if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) {
    return 'ko';
  }
  // 中国語の文字を含む場合
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh';
  }
  // デフォルトは英語
  return 'en';
}

/**
 * モック翻訳（開発用）
 * TODO: 実際の翻訳APIに置き換え
 */
async function mockTranslate(
  text: string,
  sourceLang: Language,
  targetLang: Language
): Promise<string> {
  // 開発環境では、翻訳が必要であることを示すタグを追加
  if (process.env.NODE_ENV === 'development') {
    return `[${sourceLang}→${targetLang}] ${text}`;
  }

  // 本番環境では元のテキストを返す（翻訳APIが統合されるまで）
  return text;
}

/**
 * 翻訳APIのプロバイダー設定
 */
export interface TranslationProvider {
  name: 'google' | 'deepl' | 'openai' | 'azure';
  apiKey: string;
  endpoint?: string;
}

/**
 * 翻訳プロバイダーを設定
 * TODO: 実際の翻訳APIを統合する際に実装
 */
export function setTranslationProvider(provider: TranslationProvider): void {
  // TODO: プロバイダー設定を保存し、translateText() で使用
  console.log('[Translator] 翻訳プロバイダーを設定:', provider.name);
}

/**
 * Google Translate API を使用した翻訳（実装例）
 * TODO: 実際のAPIキーと設定が必要
 */
export async function translateWithGoogle(
  text: string,
  targetLang: Language,
  sourceLang?: Language
): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    console.warn('[Translator] Google Translate API キーが設定されていません');
    return text;
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
          source: sourceLang || undefined,
        }),
      }
    );

    const data = await response.json();

    if (data.data?.translations?.[0]?.translatedText) {
      return data.data.translations[0].translatedText;
    }

    return text;
  } catch (error) {
    console.error('[Translator] Google Translate API エラー:', error);
    return text;
  }
}

/**
 * DeepL API を使用した翻訳（実装例）
 * TODO: 実際のAPIキーと設定が必要
 */
export async function translateWithDeepL(
  text: string,
  targetLang: Language,
  sourceLang?: Language
): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.warn('[Translator] DeepL API キーが設定されていません');
    return text;
  }

  try {
    const langMap: Record<Language, string> = {
      ja: 'JA',
      en: 'EN',
      ko: 'KO',
      zh: 'ZH',
    };

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `DeepL-Auth-Key ${apiKey}`,
      },
      body: new URLSearchParams({
        text,
        target_lang: langMap[targetLang] || 'EN',
        source_lang: sourceLang ? langMap[sourceLang] : '',
      }),
    });

    const data = await response.json();

    if (data.translations?.[0]?.text) {
      return data.translations[0].text;
    }

    return text;
  } catch (error) {
    console.error('[Translator] DeepL API エラー:', error);
    return text;
  }
}

/**
 * OpenAI GPT を使用した翻訳（実装例）
 * TODO: 実際のAPIキーと設定が必要
 */
export async function translateWithOpenAI(
  text: string,
  targetLang: Language,
  sourceLang?: Language
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('[Translator] OpenAI API キーが設定されていません');
    return text;
  }

  try {
    const langNames: Record<Language, string> = {
      ja: 'Japanese',
      en: 'English',
      ko: 'Korean',
      zh: 'Chinese',
    };

    const prompt = `Translate the following text to ${langNames[targetLang]}. Only return the translated text, nothing else:\n\n${text}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    }

    return text;
  } catch (error) {
    console.error('[Translator] OpenAI API エラー:', error);
    return text;
  }
}
