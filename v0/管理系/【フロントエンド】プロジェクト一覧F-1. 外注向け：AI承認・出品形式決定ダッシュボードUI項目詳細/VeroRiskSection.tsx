// /components/outsource/VeroRiskSection.tsx

import React, { useState } from 'react';

interface VeroRiskProps {
    originalTitle: string;
    suggestedTitle: string; // Geminiが生成したタイトル案
    hasUsedCondition: boolean; // 中古コンディションの有無
}

export default function VeroRiskSection({ originalTitle, suggestedTitle, hasUsedCondition }: VeroRiskProps) {
    const [useDisclaimer, setUseDisclaimer] = useState(true);

    // (１) リスク商品専用モーダル/セクション：親コンポーネントで "VERO対象" の場合にのみ呼び出される想定

    return (
        <div className="p-4 mt-4 border-2 border-red-500 rounded-lg bg-red-50">
            <h4 className="text-lg font-bold text-red-700 mb-3">🚨 VERO/知財権リスク対策エリア (MUST)</h4>
            <p className="text-sm mb-3">以下の指示に厳密に従い、リスクを回避してください。</p>

            {/* (２) 自動タイトル変更案 */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-red-700">オリジナルタイトル:</label>
                <p className="text-xs italic mb-2">{originalTitle}</p>

                <label className="block text-sm font-medium text-red-700">💡 Geminiによる変更案 (コピー推奨):</label>
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        readOnly 
                        value={suggestedTitle} 
                        className="w-full p-2 text-sm border-dashed border-red-300 rounded-md bg-white"
                    />
                    <button 
                        onClick={() => navigator.clipboard.writeText(suggestedTitle)}
                        className="text-xs p-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        コピー
                    </button>
                </div>
            </div>
            
            {/* (３) 出品指示 */}
            <h4 className="font-semibold text-red-700 mb-2">出品時設定の指示 (2択)</h4>
            <div className="space-y-2 text-sm">
                <p className="p-2 border rounded bg-white">
                    **a. 新品/ブランド名なしのバリエーション出品** に設定すること。
                </p>
                {hasUsedCondition && (
                    <p className="p-2 border rounded bg-white">
                        **b. 中古出品** に設定すること (中古がある場合のみ)。
                    </p>
                )}
            </div>

            {/* (４) 商品ページ記載文言 */}
            <div className="mt-4 flex items-start">
                <input 
                    type="checkbox" 
                    id="disclaimer" 
                    checked={useDisclaimer} 
                    onChange={(e) => setUseDisclaimer(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 border-gray-300 rounded"
                />
                <label htmlFor="disclaimer" className="ml-2 text-sm text-red-800">
                    「この商品は○○なりの工夫をして出品しています」といった**リスク回避のための定型文を商品ページに自動追加**する設定をONにする。
                </label>
            </div>
        </div>
    );
}

// 💡 統合例: F-1のProductCard内で以下のように利用されることを想定
/*
{isVeroRisk && (
    <VeroRiskSection 
        originalTitle={product.title} 
        suggestedTitle={product.ai_analysis_data?.suggested_title || product.title}
        hasUsedCondition={product.condition === 'Used'}
    />
)}
*/