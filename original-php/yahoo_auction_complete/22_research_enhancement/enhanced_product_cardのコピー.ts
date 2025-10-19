// app/research/components/ProductSearchForm.tsx (修正版)
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { ResearchProduct } from '@/types/research';

interface ProductSearchFormProps {
  onSearch: (results: ResearchProduct[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
  setLoadingSubMessage: (message: string) => void;
}

export function ProductSearchForm({ 
  onSearch, 
  setLoading, 
  setLoadingMessage,
  setLoadingSubMessage
}: ProductSearchFormProps) {
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [dataScope, setDataScope] = useState('100');
  const [sortOrder, setSortOrder] = useState('BestMatch');
  const [enableAIAnalysis, setEnableAIAnalysis] = useState(true); // 🔥 AI分析フラグ

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keywords.trim()) {
      alert('キーワードを入力してください');
      return;
    }

    setLoading(true);
    setLoadingMessage(enableAIAnalysis ? 'AI分析実行中...' : 'eBay商品データを検索中...');
    setLoadingSubMessage(
      enableAIAnalysis 
        ? 'Finding API → Shopping API → AI分析を実行しています（2-3分）'
        : '商品データを取得・分析しています'
    );

    try {
      // Desktop Crawler APIを呼び出し
      const response = await fetch('/api/research/ebay/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          categoryId: category || undefined,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          condition: condition || undefined,
          sortOrder,
          limit: parseInt(dataScope),
          enableAIAnalysis // 🔥 AI分析フラグを送信
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '検索に失敗しました');
      }

      const data = await response.json();
      
      console.log(`✅ 検索成功: ${data.count}件（AI分析: ${data.ai_analyzed || 0}件）`);
      
      onSearch(data.products || []);
      
    } catch (error) {
      console.error('Search error:', error);
      alert(error instanceof Error ? error.message : '検索に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* キーワード入力 */}
      <div>
        <Label htmlFor="keywords" className="text-base font-semibold flex items-center gap-2">
          <i className="fas fa-search text-blue-600"></i>
          検索キーワード
        </Label>
        <Input
          id="keywords"
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="例: vintage camera, nike shoes, iphone"
          className="mt-2 text-base"
          required
        />
      </div>

      {/* フィルター */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minPrice">最低価格 (USD)</Label>
          <Input
            id="minPrice"
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <Label htmlFor="maxPrice">最高価格 (USD)</Label>
          <Input
            id="maxPrice"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="1000"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dataScope">取得件数</Label>
          <select
            id="dataScope"
            value={dataScope}
            onChange={(e) => setDataScope(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="20">20件</option>
            <option value="50">50件</option>
            <option value="100">100件</option>
          </select>
        </div>
        <div>
          <Label htmlFor="sortOrder">並び順</Label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="BestMatch">おすすめ順</option>
            <option value="PricePlusShippingLowest">価格が安い順</option>
            <option value="PricePlusShippingHighest">価格が高い順</option>
            <option value="EndTimeSoonest">終了時間が近い順</option>
          </select>
        </div>
      </div>

      {/* 🔥 AI分析オプション */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border-2 border-purple-200">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableAI"
            checked={enableAIAnalysis}
            onCheckedChange={(checked) => setEnableAIAnalysis(checked as boolean)}
          />
          <Label
            htmlFor="enableAI"
            className="text-base font-semibold cursor-pointer flex items-center gap-2"
          >
            <i className="fas fa-robot text-purple-600"></i>
            AI分析を実行する（HSコード・原産国・リスク判定）
          </Label>
        </div>
        {enableAIAnalysis && (
          <p className="mt-2 text-sm text-gray-600 ml-6">
            ⚡ AI分析により、HSコード・原産国・危険物判定・VERO/特許リスクを自動判定します。
            処理時間: 約2-3分
          </p>
        )}
      </div>

      {/* 検索ボタン */}
      <Button
        type="submit"
        className="w-full py-6 text-lg bg-[var(--research-primary)] hover:bg-blue-700"
      >
        <i className="fas fa-search mr-2"></i>
        {enableAIAnalysis ? 'AI分析付き検索を開始' : '検索開始'}
      </Button>
    </form>
  );
}
  const [showAIDetails, setShowAIDetails] = useState(false);

  // AI分析データ取得
  const aiAnalysis = product.ai_analysis;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* 商品画像 */}
      <div className="relative h-48 bg-gray-100">
        <img
          src={product.primary_image_url || '/placeholder.png'}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
        {/* リスクバッジ */}
        {product.risk_level && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
            product.risk_level === 'high' ? 'bg-red-500 text-white' :
            product.risk_level === 'medium' ? 'bg-yellow-500 text-white' :
            'bg-green-500 text-white'
          }`}>
            {product.risk_level === 'high' ? '⚠️ 高リスク' :
             product.risk_level === 'medium' ? '⚡ 中リスク' :
             '✅ 低リスク'}
          </div>
        )}
      </div>

      {/* 商品情報 */}
      <div className="p-4">
        {/* タイトル */}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 mb-2" title={product.title}>
          {product.title}
        </h3>

        {/* カテゴリ */}
        <div className="text-xs text-gray-500 mb-2">
          <i className="fas fa-tag mr-1"></i>
          {product.category_name}
        </div>

        {/* 価格情報 */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-2xl font-bold text-[var(--research-primary)]">
              ${product.current_price?.toFixed(2) || '0.00'}
            </div>
            {product.shipping_cost > 0 && (
              <div className="text-xs text-gray-500">
                + ${product.shipping_cost?.toFixed(2)} 送料
              </div>
            )}
          </div>
          
          {/* 利益率 */}
          {product.profit_rate !== undefined && (
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
              product.profit_rate >= 25 ? 'bg-green-100 text-green-800' :
              product.profit_rate >= 15 ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              利益率 {product.profit_rate}%
            </div>
          )}
        </div>

        {/* 人気度指標 */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
          {product.sold_quantity > 0 && (
            <div className="flex items-center gap-1">
              <i className="fas fa-fire text-orange-500"></i>
              <span>{product.sold_quantity}売上</span>
            </div>
          )}
          {product.watch_count > 0 && (
            <div className="flex items-center gap-1">
              <i className="fas fa-eye text-blue-500"></i>
              <span>{product.watch_count}ウォッチ</span>
            </div>
          )}
        </div>

        {/* セラー情報 */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <i className="fas fa-user-circle"></i>
            <span>{product.seller_username}</span>
          </div>
          <div className="flex items-center gap-1">
            <i className="fas fa-star text-yellow-500"></i>
            <span>{product.seller_positive_percentage}%</span>
          </div>
        </div>

        {/* 🔥 AI分析セクション */}
        {aiAnalysis && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">
                <i className="fas fa-robot mr-1"></i>
                AI分析結果
              </span>
              <button
                onClick={() => setShowAIDetails(!showAIDetails)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showAIDetails ? '閉じる' : '詳細'}
              </button>
            </div>

            {/* AI分析サマリー */}
            {!showAIDetails && aiAnalysis.sellingReasons && aiAnalysis.sellingReasons.length > 0 && (
              <div className="text-xs text-gray-600">
                💡 {aiAnalysis.sellingReasons[0]}
              </div>
            )}

            {/* AI分析詳細 */}
            {showAIDetails && (
              <div className="mt-3 space-y-2 text-xs">
                {/* 売れる理由 */}
                {aiAnalysis.sellingReasons && aiAnalysis.sellingReasons.length > 0 && (
                  <div>
                    <div className="font-semibold text-green-700 mb-1">
                      ✅ 売れる理由:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {aiAnalysis.sellingReasons.slice(0, 3).map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* リスク要因 */}
                {aiAnalysis.riskFactors && aiAnalysis.riskFactors.length > 0 && (
                  <div>
                    <div className="font-semibold text-red-700 mb-1">
                      ⚠️ リスク要因:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {aiAnalysis.riskFactors.slice(0, 2).map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 推奨アクション */}
                {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                  <div>
                    <div className="font-semibold text-blue-700 mb-1">
                      💡 推奨アクション:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {aiAnalysis.recommendations.slice(0, 2).map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 市場トレンド */}
                {aiAnalysis.marketTrend && (
                  <div>
                    <div className="font-semibold text-purple-700 mb-1">
                      📈 市場トレンド:
                    </div>
                    <p className="text-gray-700">{aiAnalysis.marketTrend}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* アクションボタン */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => window.open(product.item_url, '_blank')}
          >
            <i className="fas fa-external-link-alt mr-1"></i>
            eBay
          </Button>
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs bg-[var(--research-primary)]"
          >
            <i className="fas fa-calculator mr-1"></i>
            利益計算
          </Button>
        </div>

        {/* セラーミラー連携ボタン */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 text-xs border-2 border-green-500 text-green-700 hover:bg-green-50"
        >
          <i className="fas fa-copy mr-1"></i>
          セラーミラーへ
        </Button>
      </div>
    </div>
  );
}
