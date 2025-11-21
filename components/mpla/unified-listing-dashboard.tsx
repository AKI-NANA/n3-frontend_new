/**
 * MPLA (Multi-Platform Listing Automation) 統一UIダッシュボード
 * Phase 8: 全モールへの一括出品管理
 * 要件8-1に対応
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * マーケットプレイス設定
 */
interface MarketplaceConfig {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  icon?: string;
}

const MARKETPLACES: MarketplaceConfig[] = [
  { id: 'ebay', name: 'eBay', color: '#E53238', enabled: true },
  { id: 'amazon', name: 'Amazon', color: '#FF9900', enabled: true },
  { id: 'etsy', name: 'Etsy', color: '#F56400', enabled: true },
  { id: 'bonanza', name: 'Bonanza', color: '#0066CC', enabled: true },
  { id: 'catawiki', name: 'Catawiki', color: '#1E3A8A', enabled: true },
  { id: 'facebook-marketplace', name: 'Facebook Marketplace', color: '#1877F2', enabled: true },
  { id: 'shopee', name: 'Shopee', color: '#EE4D2D', enabled: true },
  { id: 'mercari', name: 'メルカリ', color: '#FF0211', enabled: true },
];

/**
 * リスティングデータ
 */
interface ListingData {
  title: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  sku?: string;
  condition: string;
  category?: string;
  images: string[];
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

/**
 * 出品結果
 */
interface ListingResult {
  marketplaceId: string;
  success: boolean;
  listingId?: string;
  error?: string;
}

/**
 * MPLA統一リスティングダッシュボード
 */
export function UnifiedListingDashboard() {
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([
    'ebay',
    'etsy',
    'bonanza',
    'catawiki',
  ]);
  const [listingData, setListingData] = useState<ListingData>({
    title: '',
    description: '',
    price: 0,
    currency: 'USD',
    quantity: 1,
    condition: 'new',
    images: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<ListingResult[]>([]);

  /**
   * マーケットプレイスの選択/解除
   */
  const toggleMarketplace = (marketplaceId: string) => {
    setSelectedMarketplaces((prev) =>
      prev.includes(marketplaceId)
        ? prev.filter((id) => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  /**
   * 全マーケットプレイスを選択
   */
  const selectAllMarketplaces = () => {
    setSelectedMarketplaces(MARKETPLACES.map((m) => m.id));
  };

  /**
   * 全マーケットプレイスを解除
   */
  const deselectAllMarketplaces = () => {
    setSelectedMarketplaces([]);
  };

  /**
   * 一括出品実行
   */
  const handleSubmitListings = async () => {
    setIsSubmitting(true);
    setResults([]);

    try {
      const response = await fetch('/api/mpla/bulk-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketplaces: selectedMarketplaces,
          listing: listingData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit listings');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error submitting listings:', error);
      alert('出品に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">MPLA - 多モール出品管理システム</h1>
        <p className="text-muted-foreground">
          すべてのマーケットプレイスを一元管理し、一括で出品できます
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* マーケットプレイス選択 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>出品先選択</CardTitle>
            <CardDescription>
              {selectedMarketplaces.length} / {MARKETPLACES.length} モール選択中
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={selectAllMarketplaces}>
                すべて選択
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllMarketplaces}>
                すべて解除
              </Button>
            </div>

            <div className="space-y-3">
              {MARKETPLACES.map((marketplace) => (
                <div key={marketplace.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={marketplace.id}
                    checked={selectedMarketplaces.includes(marketplace.id)}
                    onCheckedChange={() => toggleMarketplace(marketplace.id)}
                  />
                  <Label
                    htmlFor={marketplace.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: marketplace.color }}
                    />
                    <span>{marketplace.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* リスティングデータ入力 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>商品情報入力</CardTitle>
            <CardDescription>
              各マーケットプレイスに最適化されたフォーマットで自動変換されます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="details">詳細情報</TabsTrigger>
                <TabsTrigger value="shipping">配送情報</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="title">商品タイトル</Label>
                  <Input
                    id="title"
                    placeholder="例: Pokemon Card Charizard VMAX PSA 10"
                    value={listingData.title}
                    onChange={(e) =>
                      setListingData({ ...listingData, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="description">商品説明</Label>
                  <Textarea
                    id="description"
                    placeholder="商品の詳細説明を入力してください"
                    rows={6}
                    value={listingData.description}
                    onChange={(e) =>
                      setListingData({ ...listingData, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">価格</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={listingData.price}
                      onChange={(e) =>
                        setListingData({
                          ...listingData,
                          price: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="currency">通貨</Label>
                    <Select
                      value={listingData.currency}
                      onValueChange={(value) =>
                        setListingData({ ...listingData, currency: value })
                      }
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">在庫数</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={listingData.quantity}
                      onChange={(e) =>
                        setListingData({
                          ...listingData,
                          quantity: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="condition">コンディション</Label>
                    <Select
                      value={listingData.condition}
                      onValueChange={(value) =>
                        setListingData({ ...listingData, condition: value })
                      }
                    >
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">新品</SelectItem>
                        <SelectItem value="used">中古</SelectItem>
                        <SelectItem value="refurbished">整備済み</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    placeholder="商品管理コード"
                    value={listingData.sku || ''}
                    onChange={(e) =>
                      setListingData({ ...listingData, sku: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="category">カテゴリ</Label>
                  <Input
                    id="category"
                    placeholder="例: Trading Cards"
                    value={listingData.category || ''}
                    onChange={(e) =>
                      setListingData({ ...listingData, category: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>画像URL（1行に1つ）</Label>
                  <Textarea
                    placeholder="https://example.com/image1.jpg"
                    rows={4}
                    value={listingData.images.join('\n')}
                    onChange={(e) =>
                      setListingData({
                        ...listingData,
                        images: e.target.value.split('\n').filter((url) => url.trim()),
                      })
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="shipping" className="space-y-4">
                <div>
                  <Label htmlFor="weight">重量（g）</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="100"
                    value={listingData.weight || ''}
                    onChange={(e) =>
                      setListingData({
                        ...listingData,
                        weight: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>寸法（cm）</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" placeholder="長さ" />
                    <Input type="number" placeholder="幅" />
                    <Input type="number" placeholder="高さ" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Button
                onClick={handleSubmitListings}
                disabled={isSubmitting || selectedMarketplaces.length === 0}
                className="w-full"
                size="lg"
              >
                {isSubmitting
                  ? '出品中...'
                  : `${selectedMarketplaces.length}モールに一括出品`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 出品結果 */}
      {results.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>出品結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.marketplaceId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? '成功' : '失敗'}
                    </Badge>
                    <span className="font-medium">
                      {MARKETPLACES.find((m) => m.id === result.marketplaceId)?.name ||
                        result.marketplaceId}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {result.success
                      ? `Listing ID: ${result.listingId}`
                      : `Error: ${result.error}`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UnifiedListingDashboard;
