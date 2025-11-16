// /components/ProductModal/components/Tabs/TabData.tsx の一部（既存のボタン群の箇所を置換）
'use client'

import { useState } from 'react';
// ... 既存のimport
// 以下のコンポーネントは shadcn/ui のものとして想定
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; 
import { Button } from '@/components/ui/button'; 
import { Search, Image, Globe, FileText, CheckCircle } from 'lucide-react'; // CheckCircleを追加
import { ResearchPromptType } from '@/types/product'; // ステップ1で定義した型

// 💡 新しいプロンプト選択肢のリスト
const PROMPT_OPTIONS: { label: string, type: ResearchPromptType, icon: React.ReactNode }[] = [
    { label: "画像から商品特定（最安値適用）", type: 'IMAGE_ONLY', icon: <Image className="h-4 w-4 mr-2" /> },
    { label: "データ不足を全て補完", type: 'FILL_MISSING_DATA', icon: <FileText className="h-4 w-4 mr-2" /> },
    { label: "標準（HTS/原産国/素材）", type: 'FULL_RESEARCH_STANDARD', icon: <Globe className="h-4 w-4 mr-2" /> },
    { label: "出品必須データのみ取得", type: 'LISTING_DATA_ONLY', icon: <CheckCircle className="h-4 w-4 mr-2" /> },
    { label: "✅ HTS専用 (Claude MCP連携)", type: 'HTS_CLAUDE_MCP', icon: <Globe className="h-4 w-4 mr-2" /> },
];

export default function TabData({ product }: { product: any }) {
    // ... 既存のロジック ...
    const [isLoading, setIsLoading] = useState(false);

    const handleRunResearch = async (type: ResearchPromptType) => {
        setIsLoading(true);
        console.log(`Running research with type: ${type}`);

        try {
            const response = await fetch('/api/gemini/run-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    type: type,
                    productData: product // 全データをAPIに渡す
                }),
            });

            if (!response.ok) {
                throw new Error('API実行中にエラーが発生しました。');
            }
            
            const result = await response.json();
            console.log('AIリサーチ結果:', result);
            // 💡 ここに、結果を画面に反映させるロジック（リロードやState更新）を実装

        } catch (error) {
            console.error('リサーチエラー:', error);
            // 💡 ユーザーへのエラー通知ロジック
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            {/* ... 既存のタブコンテンツ ... */}
            
            <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">AI自動化フロー（拡張）</h3>
                <div className="flex gap-2 flex-wrap">
                    {/* ... 既存の翻訳、SM分析、詳細取得、Geminiなどのボタン ... */}
                    
                    {/* 💡 市場調査をドロップダウンに置換 */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="default" 
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
                                disabled={isLoading} // ロード中は無効化
                            >
                                {isLoading ? 'リサーチ実行中...' : 'AIリサーチを選択'}
                                <Search className="ml-2 h-4 w-4" /> 
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                            <h4 className="px-2 py-1 text-sm font-semibold">リサーチプロンプトの選択</h4>
                            {PROMPT_OPTIONS.map((option) => (
                                <DropdownMenuItem 
                                    key={option.type} 
                                    onSelect={() => handleRunResearch(option.type)}
                                    disabled={isLoading}
                                >
                                    {option.icon}
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* ... その他のボタン ... */}
                </div>
            </div>
        </div>
    );
}