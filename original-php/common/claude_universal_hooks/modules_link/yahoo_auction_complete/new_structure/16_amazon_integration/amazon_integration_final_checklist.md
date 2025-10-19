# Amazon統合システム - 完成チェックリスト＆残り開発

## 🎯 現在の完成状況：**85%**

### ✅ 完成済み（バックエンド100%）
- [x] **データベーススキーマ** - 完全設計・自動デプロイ対応
- [x] **Amazon PA-API統合** - 認証・レート制限・エラーハンドリング
- [x] **データ取得・処理システム** - バッチ処理・UPSERT・変更検知
- [x] **在庫・価格監視エンジン** - 動的ポーリング・アラート送信
- [x] **スケジューラー統合** - Cron対応・優先度別実行
- [x] **APIエンドポイント** - フロントエンド用データ提供
- [x] **設定・デプロイシステム** - 自動セットアップ・テスト・管理

---

## ⚠️ 残り開発タスク（15%）

### 🔴 高優先度（即座対応必要）

#### 1. **07_editing UI統合**（推定2-3日）
```php
// 必要ファイル
new_structure/07_editing/amazon_integration.php
new_structure/07_editing/js/amazon_editor.js
new_structure/07_editing/css/amazon_styles.css
```

**実装内容**:
- Yahoo!/Amazon データ切り替えタブ
- Amazon商品編集モーダル
- 価格・在庫履歴グラフ表示
- 監視ルール設定UI

#### 2. **08_listing eBay出品連携**（推定1-2日）
```php
// 連携ポイント
new_structure/08_listing/ebay_listing_handler.php
- Amazon在庫切れ→eBay出品停止
- Amazon価格変動→eBay価格自動調整
```

**実装内容**:
- 在庫切れ時のeBay出品自動停止
- 価格変動時のeBay価格同期
- Amazon→eBay商品情報自動転送

#### 3. **01_dashboard 統計表示統合**（推定1日）
```php
// 追加要素
new_structure/01_dashboard/dashboard.php
- Amazon監視商品数表示
- 価格・在庫変動サマリー
- APIリクエスト使用量表示
```

### 🟡 中優先度（機能拡張）

#### 4. **06_filters フィルター統合**（推定1日）
```php
// Amazon用フィルター追加
new_structure/06_filters/amazon_filters.php
- Amazon Prime商品フィルター
- 価格帯フィルター
- レビュー評価フィルター
- 在庫状況フィルター
```

#### 5. **11_reports レポート統合**（推定1日）
```php
// Amazon統計レポート
new_structure/11_reports/amazon_reports.php
- 監視パフォーマンスレポート
- 価格変動トレンドレポート
- API使用量レポート
```

---

## 🔗 他システム連携マップ

### **既存システムとの連携ポイント**

#### **→ 01_dashboard（ダッシュボード）**
```javascript
// 必要な連携
- Amazon商品数: COUNT(amazon_research_data)
- 監視中商品: COUNT(amazon_monitoring_rules WHERE is_active=true)
- 今日の変動: COUNT(amazon_price_history WHERE DATE=today)
- API使用率: TODAY_REQUESTS/DAILY_LIMIT * 100
```

#### **→ 02_scraping（スクレイピング統合）**
```php
// 既存Yahoo!スクレイピングとの統合
class UnifiedDataProcessor {
    public function processMultiPlatform($asin, $yahoo_url) {
        // Amazon + Yahoo 並行データ取得
        $amazon_data = $this->amazonProcessor->processAsinList([$asin]);
        $yahoo_data = $this->yahooProcessor->scrapeProduct($yahoo_url);
        
        return $this->mergeProductData($amazon_data, $yahoo_data);
    }
}
```

#### **→ 03_approval（承認システム）**
```php
// Amazon商品の承認フロー統合
class AmazonApprovalIntegration {
    public function addToApprovalQueue($amazon_product) {
        $approval_data = [
            'source' => 'amazon',
            'asin' => $amazon_product['asin'],
            'title' => $amazon_product['title'],
            'price' => $amazon_product['current_price'],
            'images' => $amazon_product['images_primary'],
            'profit_margin' => $this->calculateProfitMargin($amazon_product),
            'competition_analysis' => $this->analyzeCompetition($amazon_product)
        ];
        
        return $this->addToQueue($approval_data);
    }
}
```

#### **→ 05_calculation（利益計算統合）**
```php
// Amazon商品の利益計算
class AmazonProfitCalculator extends ProfitCalculator {
    public function calculateAmazonProfit($asin) {
        $amazon_data = $this->getAmazonData($asin);
        
        return [
            'purchase_price' => $amazon_data['current_price'],
            'shipping_cost' => $this->calculateShipping($amazon_data),
            'amazon_fees' => 0, // Amazon購入時は手数料なし
            'ebay_fees' => $this->calculateEbayFees($amazon_data['current_price'] * 1.3),
            'profit_margin' => $this->calculateMargin(),
            'roi' => $this->calculateROI()
        ];
    }
}
```

#### **→ 07_editing（編集システム統合）**
```javascript
// Yahoo!/Amazon統合編集UI
class UnifiedProductEditor {
    constructor() {
        this.currentDataSource = 'yahoo'; // 'yahoo' | 'amazon'
        this.yahooData = null;
        this.amazonData = null;
    }
    
    switchDataSource(source) {
        this.currentDataSource = source;
        if (source === 'amazon') {
            this.loadAmazonData();
        } else {
            this.loadYahooData();
        }
        this.renderEditor();
    }
    
    loadAmazonData() {
        fetch('/new_structure/07_editing/api/amazon_api.php?action=get_products')
            .then(response => response.json())
            .then(data => {
                this.amazonData = data;
                this.renderAmazonProducts();
            });
    }
}
```

#### **→ 08_listing（eBay出品統合）**
```php
// Amazon→eBay自動出品
class AmazonEbayBridge {
    public function createEbayListingFromAmazon($asin) {
        $amazon_product = $this->getAmazonProduct($asin);
        
        $ebay_listing = [
            'title' => $this->optimizeTitle($amazon_product['title']),
            'description' => $this->generateDescription($amazon_product),
            'images' => $this->downloadAndOptimizeImages($amazon_product['images']),
            'starting_price' => $amazon_product['current_price'] * 1.3, // 30%マークアップ
            'category' => $this->mapAmazonToEbayCategory($amazon_product['browse_nodes']),
            'item_specifics' => $this->convertItemSpecifics($amazon_product['item_specifics']),
            'condition' => 'New',
            'source_asin' => $asin // トラッキング用
        ];
        
        return $this->ebayListingService->createListing($ebay_listing);
    }
    
    // 在庫連動
    public function handleStockChange($asin, $stock_status) {
        $ebay_listings = $this->findEbayListingsByAsin($asin);
        
        foreach ($ebay_listings as $listing) {
            if ($stock_status === 'Out of Stock') {
                $this->ebayListingService->endListing($listing['item_id'], 'OUT_OF_STOCK');
            } elseif ($stock_status === 'In Stock') {
                $this->ebayListingService->relistItem($listing['item_id']);
            }
        }
    }
}
```

#### **→ 10_zaiko（在庫管理統合）**
```php
// 統合在庫管理システム
class UnifiedInventoryManager {
    public function syncInventory() {
        // Amazon在庫状況取得
        $amazon_stock = $this->amazonMonitor->getCurrentStockLevels();
        
        // Yahoo在庫と比較
        $yahoo_stock = $this->yahooInventory->getCurrentStock();
        
        // eBay出品商品と照合
        $ebay_listings = $this->ebayListings->getActiveListings();
        
        // 在庫切れ商品の自動処理
        foreach ($amazon_stock as $asin => $status) {
            if ($status === 'Out of Stock') {
                $this->handleOutOfStock($asin);
            }
        }
    }
    
    private function handleOutOfStock($asin) {
        // 1. eBay出品停止
        $this->amazonEbayBridge->handleStockChange($asin, 'Out of Stock');
        
        // 2. 監視頻度を高頻度に変更
        $this->amazonMonitor->updateMonitoringPriority($asin, 'high');
        
        // 3. アラート送信
        $this->sendStockAlert($asin, 'out_of_stock');
    }
}
```

---

## 🚀 統合実装プラン

### **Phase 1: UI統合（3-4日）**
1. **07_editing Amazon UI実装**
   - データ切り替えタブ
   - 商品編集モーダル
   - 履歴グラフ表示

2. **01_dashboard統計表示**
   - Amazon商品数・監視数表示
   - API使用量表示

### **Phase 2: eBay連携（2-3日）**
1. **08_listing連携実装**
   - Amazon→eBay出品機能
   - 在庫連動システム
   - 価格同期システム

2. **承認システム統合**
   - Amazon商品承認フロー
   - 利益計算統合

### **Phase 3: 最終統合（1-2日）**
1. **フィルター・レポート統合**
2. **全体テスト・デバッグ**
3. **パフォーマンス最適化**

---

## 📋 完成後の統合システム

### **ワークフロー例：Amazon商品発見→eBay出品**

1. **Amazon商品検索** → `AmazonApiClient->searchItems()`
2. **商品データ取得** → `AmazonDataProcessor->processAsinList()`
3. **利益計算・承認** → `AmazonProfitCalculator` + `ApprovalSystem`
4. **商品編集** → `07_editing/amazon_integration.php`
5. **eBay出品作成** → `AmazonEbayBridge->createEbayListingFromAmazon()`
6. **在庫監視開始** → `AmazonStockMonitor->addMonitoring()`
7. **価格・在庫変動** → **自動eBay更新・停止**

### **統合データフロー**
```
Amazon PA-API → データ処理 → DB保存 → 監視エンジン → 変動検知
     ↓              ↓           ↓          ↓           ↓
   承認システム → 編集UI → eBay出品 → 在庫連動 → アラート送信
```

---

## 🎯 最終目標

**完全統合されたAmazon-Yahoo-eBay転売システム**
- Amazon商品リサーチ・監視
- Yahoo!オークションデータと比較
- 利益計算・承認フロー
- eBay自動出品・在庫連動
- リアルタイム監視・アラート

**推定残り工数: 6-9日**で完全システム完成！