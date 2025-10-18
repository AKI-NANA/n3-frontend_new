'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  CheckCheck,
  Search,
  AlertTriangle,
  Eye,
  TrendingUp
} from 'lucide-react';

// 型定義
interface Product {
  id: number;
  ebay_item_id: string;
  title: string;
  price: number;
  export_filter_status?: boolean | null;
  patent_filter_status?: boolean | null;
  selected_mall?: string | null;
  mall_filter_status?: boolean | null;
  final_judgment?: 'OK' | 'NG' | 'PENDING';
}

interface FilterStatistics {
  total_products: number;
  approved: number;
  rejected: number;
  pending: number;
}

interface FilterResult {
  success: boolean;
  risk_level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  can_list: boolean;
  total_detected: number;
  detected_keywords: Array<{
    keyword: string;
    type: string;
    priority: string;
    risk_level: number;
  }>;
  recommendations: Array<{
    title: string;
    message: string;
    action: string;
    type: string;
  }>;
}

export default function FilterManagementPage() {
  // State管理
  const [products, setProducts] = useState<Product[]>([]);
  const [statistics, setStatistics] = useState<FilterStatistics>({
    total_products: 0,
    approved: 0,
    rejected: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  
  // リアルタイムテスト用State
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testResult, setTestResult] = useState<FilterResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [selectedFilterTypes, setSelectedFilterTypes] = useState<string[]>([
    'EXPORT', 'VERO', 'PATENT', 'CHARACTER', 'BRAND'
  ]);

  // データ読み込み
  useEffect(() => {
    loadProductData();
  }, []);

  const loadProductData = async () => {
    setLoading(true);
    try {
      // 既存のeBayデータAPIを使用
      const response = await fetch('/api/check_ebay_data.php');
      const ebayData = await response.json();
      
      if (ebayData.success && ebayData.has_data) {
        const productsResponse = await fetch('/api/fetch_real_ebay_data.php');
        const productsData = await productsResponse.json();
        
        if (productsData.success && productsData.products) {
          setProducts(productsData.products);
          updateStatisticsFromProducts(productsData.products);
        }
      } else {
        // データがない場合
        setProducts([]);
        setStatistics({
          total_products: 0,
          approved: 0,
          rejected: 0,
          pending: 0
        });
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatisticsFromProducts = (productList: Product[]) => {
    const stats: FilterStatistics = {
      total_products: productList.length,
      approved: productList.filter(p => p.final_judgment === 'OK').length,
      rejected: productList.filter(p => p.final_judgment === 'NG').length,
      pending: productList.filter(p => !p.final_judgment || p.final_judgment === 'PENDING').length
    };
    setStatistics(stats);
  };

  // 個別商品のフィルターチェック
  const runProductFilter = async (product: Product) => {
    setTestLoading(true);
    try {
      const response = await fetch('/api/advanced_filter_check.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          description: '',
          check_types: selectedFilterTypes
        })
      });
      
      const result: FilterResult = await response.json();
      
      if (result.success) {
        // 商品の状態を更新
        const updatedProducts = products.map(p => {
          if (p.id === product.id) {
            return {
              ...p,
              export_filter_status: !result.detected_keywords.some(k => k.type === 'EXPORT'),
              patent_filter_status: !result.detected_keywords.some(k => 
                ['PATENT', 'CHARACTER', 'BRAND', 'VERO'].includes(k.type)
              ),
              final_judgment: result.can_list ? 'OK' : 'NG'
            };
          }
          return p;
        });
        
        setProducts(updatedProducts);
        updateStatisticsFromProducts(updatedProducts);
        
        // 通知表示
        alert(`フィルターチェック完了: ${result.risk_level}`);
      }
    } catch (error) {
      console.error('フィルターチェックエラー:', error);
      alert('フィルターチェックでエラーが発生しました');
    } finally {
      setTestLoading(false);
    }
  };

  // リアルタイムテスト実行
  const runRealtimeTest = async () => {
    if (!testTitle.trim()) {
      alert('商品タイトルを入力してください');
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/advanced_filter_check.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: testTitle,
          description: testDescription,
          check_types: selectedFilterTypes
        })
      });

      const result: FilterResult = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('リアルタイムテストエラー:', error);
      alert('テスト実行でエラーが発生しました');
    } finally {
      setTestLoading(false);
    }
  };

  // モール選択変更
  const handleMallChange = (productId: number, mallName: string) => {
    console.log(`商品${productId}のモール選択: ${mallName}`);
    // TODO: モール専用フィルター実行API呼び出し
  };

  // ステータスバッジのレンダリング
  const renderStatusBadge = (status: boolean | null | undefined, label: string) => {
    if (status === null || status === undefined) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          <span className="text-xs">未実行</span>
        </Badge>
      );
    }
    
    if (status) {
      return (
        <Badge variant="default" className="bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          <span className="text-xs">OK</span>
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        <span className="text-xs">NG</span>
      </Badge>
    );
  };

  // 最終判定バッジのレンダリング
  const renderFinalJudgment = (judgment?: 'OK' | 'NG' | 'PENDING') => {
    const config = {
      'OK': { variant: 'default' as const, className: 'bg-green-600', icon: CheckCircle2 },
      'NG': { variant: 'destructive' as const, className: '', icon: XCircle },
      'PENDING': { variant: 'outline' as const, className: '', icon: Clock }
    };
    
    const { variant, className, icon: Icon } = config[judgment || 'PENDING'];
    
    return (
      <Badge variant={variant} className={`${className} gap-1`}>
        <Icon className="h-3 w-3" />
        <span className="text-xs">{judgment || 'PENDING'}</span>
      </Badge>
    );
  };

  // リスクレベルのレンダリング
  const renderRiskLevel = (level: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      'SAFE': { color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
      'LOW': { color: 'text-blue-600 bg-blue-50', icon: TrendingUp },
      'MEDIUM': { color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle },
      'HIGH': { color: 'text-orange-600 bg-orange-50', icon: AlertTriangle },
      'CRITICAL': { color: 'text-red-600 bg-red-50', icon: XCircle }
    };
    
    const { color, icon: Icon } = config[level] || config['MEDIUM'];
    
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
        <span className="font-semibold">リスクレベル: {level}</span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8" />
          <h1 className="text-3xl font-bold">輸出禁止品フィルターツール</h1>
        </div>
        <p className="text-sm opacity-90">
          2段階フィルタリング・安全な出品プロセス・リアルタイム判定システム
        </p>
      </div>

      {/* 統計ダッシュボード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総商品数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.total_products}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">
              承認済み（OK）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {statistics.approved}
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700">
              審査中（PENDING）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {statistics.pending}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700">
              ブロック済み（NG）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {statistics.rejected}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">商品フィルタリング</TabsTrigger>
          <TabsTrigger value="realtime">リアルタイムテスト</TabsTrigger>
          <TabsTrigger value="keywords">キーワード管理</TabsTrigger>
        </TabsList>

        {/* 商品フィルタリングタブ */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>商品フィルタリング管理</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadProductData}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    データ更新
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    disabled={selectedProducts.length === 0}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" />
                    一括承認
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-3 text-muted-foreground">読み込み中...</span>
                </div>
              ) : products.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    商品データがありません。eBay商品データをインポートしてください。
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox />
                        </TableHead>
                        <TableHead>商品ID</TableHead>
                        <TableHead>商品タイトル</TableHead>
                        <TableHead>価格</TableHead>
                        <TableHead>輸出チェック</TableHead>
                        <TableHead>特許チェック</TableHead>
                        <TableHead>出品モール</TableHead>
                        <TableHead>モールチェック</TableHead>
                        <TableHead>最終判定</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProducts([...selectedProducts, product.id]);
                                } else {
                                  setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {product.ebay_item_id || product.id}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate" title={product.title}>
                            {product.title}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${product.price?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(product.export_filter_status, '輸出')}
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(product.patent_filter_status, '特許')}
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={product.selected_mall || ''} 
                              onValueChange={(value) => handleMallChange(product.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="モール選択" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ebay">eBay</SelectItem>
                                <SelectItem value="amazon">Amazon.com</SelectItem>
                                <SelectItem value="etsy">Etsy</SelectItem>
                                <SelectItem value="mercari">Mercari</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(product.mall_filter_status, 'モール')}
                          </TableCell>
                          <TableCell>
                            {renderFinalJudgment(product.final_judgment)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => runProductFilter(product)}
                                disabled={testLoading}
                              >
                                <Search className="h-3 w-3 mr-1" />
                                チェック
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                詳細
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* リアルタイムテストタブ */}
        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>リアルタイムフィルターテスト</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* フィルタータイプ選択 */}
              <div className="space-y-2">
                <Label>フィルタータイプ選択</Label>
                <div className="flex flex-wrap gap-3">
                  {['EXPORT', 'VERO', 'PATENT', 'CHARACTER', 'BRAND'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={type}
                        checked={selectedFilterTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedFilterTypes([...selectedFilterTypes, type]);
                          } else {
                            setSelectedFilterTypes(selectedFilterTypes.filter(t => t !== type));
                          }
                        }}
                      />
                      <label htmlFor={type} className="text-sm font-medium cursor-pointer">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 商品タイトル入力 */}
              <div className="space-y-2">
                <Label htmlFor="testTitle">商品タイトル</Label>
                <Input
                  id="testTitle"
                  placeholder="例: ナルト フィギュア 初音ミク グッズ"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                />
              </div>

              {/* 商品説明入力 */}
              <div className="space-y-2">
                <Label htmlFor="testDescription">商品説明</Label>
                <Textarea
                  id="testDescription"
                  placeholder="商品説明を入力..."
                  rows={4}
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                />
              </div>

              {/* テスト実行ボタン */}
              <Button 
                onClick={runRealtimeTest}
                disabled={testLoading || !testTitle.trim()}
                className="w-full"
              >
                {testLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    チェック中...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    フィルターテスト実行
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* テスト結果表示 */}
          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle>チェック結果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* リスクレベル */}
                {renderRiskLevel(testResult.risk_level)}

                {/* 出品可否 */}
                <div className={`p-4 rounded-lg border-2 ${
                  testResult.can_list 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.can_list ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-semibold">
                      {testResult.can_list ? '✅ 出品可能' : '❌ 出品不可'}
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    リスクスコア: {testResult.risk_score}/100
                  </p>
                </div>

                {/* 検出キーワード */}
                {testResult.detected_keywords.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      検出されたキーワード ({testResult.total_detected}件)
                    </h3>
                    <div className="space-y-2">
                      {testResult.detected_keywords.map((kw, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-muted">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">{kw.keyword}</span>
                            <Badge variant="destructive">{kw.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            優先度: {kw.priority} | リスク: {kw.risk_level}/100
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 推奨事項 */}
                {testResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">推奨事項</h3>
                    <div className="space-y-2">
                      {testResult.recommendations.map((rec, index) => (
                        <Alert key={index} variant={rec.type === 'ERROR' ? 'destructive' : 'default'}>
                          <AlertDescription>
                            <div className="font-semibold">{rec.title}</div>
                            <p className="text-sm mt-1">{rec.message}</p>
                            <p className="text-sm mt-2 font-medium">対策: {rec.action}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* キーワード管理タブ */}
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle>禁止キーワード管理システム</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  このセクションは開発中です。現在はリアルタイムテストと商品フィルタリングが利用可能です。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
