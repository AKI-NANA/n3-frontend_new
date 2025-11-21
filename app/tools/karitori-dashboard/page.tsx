'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import {
  karitoriService,
  KaritoriAlert,
  WhiteListCategory,
} from '@/lib/services/arbitrage/karitori_dashboard';
import { initializeFirebase } from '@/src/utils/firebaseUtils';

/**
 * Amazon刈り取り自動選定・自動購入プロトタイプダッシュボード
 */
export default function KaritoriDashboard() {
  // State管理
  const [alerts, setAlerts] = useState<KaritoriAlert[]>([]);
  const [categories, setCategories] = useState<WhiteListCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // フォーム入力State
  const [categoryForm, setCategoryForm] = useState({
    categoryName: '',
    searchKeyword: '',
    manufacturer: '',
  });

  // Firebase初期化とデータロード
  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        await loadData();
      } catch (error) {
        console.error('初期化エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // データロード
  const loadData = async () => {
    try {
      const [loadedAlerts, loadedCategories] = await Promise.all([
        karitoriService.loadAlerts(),
        karitoriService.loadWhiteListCategories(),
      ]);
      setAlerts(loadedAlerts);
      setCategories(loadedCategories);
    } catch (error) {
      console.error('データロードエラー:', error);
    }
  };

  // --- P3カテゴリ管理機能 ---

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.categoryName || !categoryForm.searchKeyword) {
      alert('カテゴリ名と検索キーワードは必須です');
      return;
    }

    try {
      setIsProcessing('add-category');
      await karitoriService.addWhiteListCategory(categoryForm);
      setCategoryForm({ categoryName: '', searchKeyword: '', manufacturer: '' });
      await loadData();
    } catch (error) {
      console.error('カテゴリ追加エラー:', error);
      alert('カテゴリの追加に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('このカテゴリを削除してもよろしいですか？')) return;

    try {
      setIsProcessing(`delete-category-${id}`);
      await karitoriService.deleteWhiteListCategory(id);
      await loadData();
    } catch (error) {
      console.error('カテゴリ削除エラー:', error);
      alert('カテゴリの削除に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  // --- 自動購入シミュレーション機能 ---

  const handleSimulatePurchase = async (alert: KaritoriAlert) => {
    try {
      setIsProcessing(`simulate-${alert.id}`);
      const result = await karitoriService.simulatePurchase(alert);
      console.log('シミュレーション結果:', result);
      await loadData();
    } catch (error) {
      console.error('シミュレーションエラー:', error);
      alert('購入シミュレーションに失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleManualSkip = async (alert: KaritoriAlert) => {
    try {
      setIsProcessing(`skip-${alert.id}`);
      await karitoriService.simulatePurchase(alert, 'manual-skipped');
      await loadData();
    } catch (error) {
      console.error('手動見送りエラー:', error);
      alert('手動見送りに失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  // --- シミュレーションデータのシード ---

  const handleSeedData = async () => {
    if (!confirm('サンプルデータを追加しますか？')) return;

    try {
      setIsProcessing('seed');
      await karitoriService.seedSimulationData();
      await karitoriService.seedSampleCategories();
      await loadData();
    } catch (error) {
      console.error('サンプルデータ追加エラー:', error);
      alert('サンプルデータの追加に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  // --- ステータスバッジの色分け ---

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'auto-bought':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            自動購入実行
          </Badge>
        );
      case 'manual-skipped':
        return (
          <Badge className="bg-red-600 hover:bg-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            見送り
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            判定待ち
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* ヘッダー */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Amazon刈り取り自動選定・自動購入ダッシュボード</h1>
        <p className="text-muted-foreground">
          利益率20%超 AND BSR 5000位以下の商品を自動で選定
        </p>
      </div>

      {/* デバッグ用: サンプルデータ追加ボタン */}
      <Card>
        <CardHeader>
          <CardTitle>開発・テスト用</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSeedData}
            disabled={isProcessing === 'seed'}
            variant="outline"
          >
            {isProcessing === 'seed' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            サンプルデータを追加
          </Button>
        </CardContent>
      </Card>

      {/* P3 カテゴリ管理セクション */}
      <Card>
        <CardHeader>
          <CardTitle>P3 廃盤・希少性高騰カテゴリ管理</CardTitle>
          <CardDescription>
            追跡したいジャンル・メーカーを登録し、高騰実績を蓄積します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* カテゴリ登録フォーム */}
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">カテゴリ名 *</Label>
                <Input
                  id="categoryName"
                  placeholder="例: Lego 限定版"
                  value={categoryForm.categoryName}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, categoryName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="searchKeyword">検索キーワード *</Label>
                <Input
                  id="searchKeyword"
                  placeholder="例: LEGO exclusive"
                  value={categoryForm.searchKeyword}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, searchKeyword: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">メーカー名</Label>
                <Input
                  id="manufacturer"
                  placeholder="例: LEGO"
                  value={categoryForm.manufacturer}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, manufacturer: e.target.value })
                  }
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isProcessing === 'add-category'}
            >
              {isProcessing === 'add-category' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              カテゴリを登録
            </Button>
          </form>

          {/* カテゴリ一覧テーブル */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>カテゴリ名</TableHead>
                  <TableHead>検索キーワード</TableHead>
                  <TableHead>メーカー</TableHead>
                  <TableHead className="text-right">高騰実績回数</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      登録されたカテゴリがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.categoryName}</TableCell>
                      <TableCell>{category.searchKeyword}</TableCell>
                      <TableCell>{category.manufacturer || '-'}</TableCell>
                      <TableCell className="text-right">{category.highProfitsCount}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCategory(category.id!)}
                          disabled={isProcessing === `delete-category-${category.id}`}
                        >
                          {isProcessing === `delete-category-${category.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* アラート一覧と自動購入シミュレーション */}
      <Card>
        <CardHeader>
          <CardTitle>刈り取りアラート一覧</CardTitle>
          <CardDescription>
            利益率20%超 AND BSR 5000位以下の条件で自動購入を判定します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ASIN</TableHead>
                  <TableHead>商品名</TableHead>
                  <TableHead className="text-right">価格</TableHead>
                  <TableHead className="text-right">利益率</TableHead>
                  <TableHead className="text-right">BSR順位</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>判定理由</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      アラートがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-mono text-sm">{alert.asin}</TableCell>
                      <TableCell className="max-w-xs truncate">{alert.productName}</TableCell>
                      <TableCell className="text-right">¥{alert.alertedPrice.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            alert.profitRate > 0.2
                              ? 'text-green-600 font-semibold'
                              : 'text-red-600'
                          }
                        >
                          {(alert.profitRate * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            alert.currentBSR <= 5000
                              ? 'text-green-600 font-semibold'
                              : 'text-red-600'
                          }
                        >
                          {alert.currentBSR.toLocaleString()}位
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(alert.purchaseStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {alert.skipReason || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {alert.purchaseStatus === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSimulatePurchase(alert)}
                                disabled={isProcessing === `simulate-${alert.id}`}
                              >
                                {isProcessing === `simulate-${alert.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <ShoppingCart className="w-4 h-4 mr-1" />
                                )}
                                判定
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManualSkip(alert)}
                                disabled={isProcessing === `skip-${alert.id}`}
                              >
                                見送り
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 判定基準の説明 */}
      <Card>
        <CardHeader>
          <CardTitle>自動購入判定基準</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>利益率: 20%超</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>BSR順位: 5000位以下（回転率が高い）</span>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                両方の条件を満たす場合のみ、自動購入実行と判定されます（AND条件）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
