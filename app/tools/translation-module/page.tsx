'use client'

import { useState } from 'react';

// MARK: - 型定義

interface TranslationRequest {
  text: string;
  sourceLang: 'ja' | 'en';
  targetLang: 'ja' | 'en';
  theme: string;
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  theme: string;
}

// MARK: - メインコンポーネント

export default function TranslationModulePage() {
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState<'ja' | 'en'>('ja');
  const [targetLang, setTargetLang] = useState<'ja' | 'en'>('en');
  const [theme, setTheme] = useState('General');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      alert('翻訳するテキストを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: ここに実際のGemini API呼び出しロジックを実装
      // 現在は仮の実装
      await new Promise(resolve => setTimeout(resolve, 1000));

      setResult({
        originalText: sourceText,
        translatedText: '翻訳結果がここに表示されます（API実装待ち）',
        sourceLang,
        targetLang,
        theme
      });
    } catch (error) {
      console.error('Translation error:', error);
      alert('翻訳中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            翻訳・最適化モジュール
          </h1>
          <p className="text-gray-600">
            Gemini APIを使用した高品質翻訳ツール
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                元言語
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as 'ja' | 'en')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="ja">日本語</option>
                <option value="en">英語</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ターゲット言語
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as 'ja' | 'en')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="ja">日本語</option>
                <option value="en">英語</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                コンテンツテーマ
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="例: スポーツニュース、経済分析"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                翻訳するテキスト
              </label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                rows={6}
                placeholder="ここにテキストを入力してください..."
              />
            </div>

            <button
              onClick={handleTranslate}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '翻訳中...' : '翻訳する'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">翻訳結果</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">元テキスト ({result.sourceLang})</h3>
                <p className="bg-gray-50 p-4 rounded border border-gray-200">
                  {result.originalText}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">翻訳結果 ({result.targetLang})</h3>
                <p className="bg-green-50 p-4 rounded border border-green-200">
                  {result.translatedText}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">
            <strong>注意:</strong> このページはReact/Next.js構文に移植済みです。
            Gemini APIの実装は今後追加予定です。
          </p>
        </div>
      </div>
    </div>
  );
}
