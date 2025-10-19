// app/research/components/ProductSearchForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keywords.trim()) {
      alert('キーワードを入力してください');
      return;
    }

    setLoading(true);
    setLoadingMessage('eBay商品データを検索中...');
    setLoadingSubMessage('商品データを取得・分析しています');

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
          limit: parseInt(dataScope)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '検索に失敗しました');
      }

      const data = await response.json();
      onSearch(data.products || []);
      
    } catch (error) {
      console.error('Search error:', error);
      alert(error instanceof Error ? error.message : '検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* キーワード入力 */}
      <div className="space-y-2">
        <Label htmlFor="keywords" className="flex items-center gap-2 text-base font-semibold">
          <i className="fas fa-search text-[var(--research-primary)]"></i>
          検索キーワード（必須）
        </Label>
        <Input
          id="keywords"
          type="text"
          placeholder="例: vintage camera, gaming laptop, designer watch"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="text-base py-6"
          required
        />
      </div>

      {/* グリッドレイアウト */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* カテゴリ */}
        <div className="space-y-2">
          <Label htmlFor="category" className="flex items-center gap-2">
            <i className="fas fa-tags"></i>
            カテゴリ
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="全カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全カテゴリ</SelectItem>
              <SelectItem value="293">Cameras & Photo</SelectItem>
              <SelectItem value="550">Video Games & Consoles</SelectItem>
              <SelectItem value="15032">Watches, Parts & Accessories</SelectItem>
              <SelectItem value="625">Computers/Tablets & Networking</SelectItem>
              <SelectItem value="11450">Clothing, Shoes & Accessories</SelectItem>
              <SelectItem value="267">Books, Movies & Music</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 最低価格 */}
        <div className="space-y-2">
          <Label htmlFor="minPrice" className="flex items-center gap-2">
            <i className="fas fa-dollar-sign"></i>
            最低価格 ($)
          </Label>
          <Input
            id="minPrice"
            type="number"
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>

        {/* 最高価格 */}
        <div className="space-y-2">
          <Label htmlFor="maxPrice" className="flex items-center gap-2">
            <i className="fas fa-dollar-sign"></i>
            最高価格 ($)
          </Label>
          <Input
            id="maxPrice"
            type="number"
            placeholder="無制限"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>

        {/* 商品状態 */}
        <div className="space-y-2">
          <Label htmlFor="condition" className="flex items-center gap-2">
            <i className="fas fa-box"></i>
            商品状態
          </Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger>
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべて</SelectItem>
              <SelectItem value="New">新品</SelectItem>
              <SelectItem value="Used">中古</SelectItem>
              <SelectItem value="Refurbished">整備済み</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 取得件数 */}
        <div className="space-y-2">
          <Label htmlFor="dataScope" className="flex items-center gap-2">
            <i className="fas fa-database"></i>
            取得件数
          </Label>
          <Select value={dataScope} onValueChange={setDataScope}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50件</SelectItem>
              <SelectItem value="100">100件</SelectItem>
              <SelectItem value="200">200件</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ソート順 */}
        <div className="space-y-2">
          <Label htmlFor="sortOrder" className="flex items-center gap-2">
            <i className="fas fa-sort"></i>
            ソート順
          </Label>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BestMatch">ベストマッチ</SelectItem>
              <SelectItem value="PricePlusShippingLowest">価格が安い順</SelectItem>
              <SelectItem value="PricePlusShippingHighest">価格が高い順</SelectItem>
              <SelectItem value="EndTimeSoonest">終了間近</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 検索ボタン */}
      <div className="flex justify-center pt-4">
        <Button 
          type="submit"
          size="lg"
          className="bg-gradient-to-r from-[var(--research-primary)] to-[var(--research-teal)] hover:opacity-90 px-12 py-6 text-lg"
        >
          <i className="fas fa-search mr-2"></i>
          検索開始
        </Button>
      </div>
    </form>
  );
}
