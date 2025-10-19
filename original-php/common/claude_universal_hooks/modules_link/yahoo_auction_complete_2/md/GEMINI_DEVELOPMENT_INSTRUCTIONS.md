# 🎯 Gemini開発指示書 - eBay配送ポリシー自動化システム

## プロジェクト概要

**目標**: Claude作成の送料計算基盤をベースに、eBay API統合と高度な自動化機能を実装

**開発期間**: 2-3週間

**技術スタック**: PHP 8.0+, JavaScript ES6+, eBay Trading/Sell API

## Claude完成済み基盤

### ✅ 利用可能な要素

1. **データベース設計**: 6テーブル完備
2. **送料計算エンジン**: `ShippingCalculator.php`
3. **API基盤**: RESTfulエンドポイント
4. **CSV処理**: アップロード・検証システム
5. **フロントエンド統合**: JavaScript連携

### 📁 既存ファイル構造
```
shipping_calculation/
├── shipping_database_schema.sql      # DB設計
├── ShippingCalculator.php           # 計算エンジン ✅
├── api.php                          # APIエンドポイント ✅
├── csv_processor.php                # CSV処理 ✅
├── shipping_integration.js          # フロント統合 ✅
└── CSV_FORMAT_SPECIFICATION.md      # CSV仕様書 ✅
```

## 🚀 Gemini担当開発領域

### Phase 1: eBay API統合基盤 (Week 1)

#### 1.1 eBay Developer Account & 認証システム
```php
// 作成ファイル: ebay_authentication.php
class eBayAuthManager {
    private $clientId;
    private $clientSecret;
    private $accessToken;
    
    public function authenticate() {
        // OAuth 2.0 Client Credentials フロー実装
        // https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html
    }
    
    public function refreshToken() {
        // トークン更新ロジック
    }
    
    public function validateToken() {
        // トークン有効性確認
    }
}
```

#### 1.2 eBay配送ポリシー管理
```php
// 作成ファイル: ebay_policy_manager.php
class eBayPolicyManager {
    private $authManager;
    
    public function createShippingPolicy($policyData) {
        // POST /sell/account/v1/fulfillment_policy
        // Claude作成のポリシーデータをeBay形式に変換
    }
    
    public function updateShippingPolicy($policyId, $data) {
        // PUT /sell/account/v1/fulfillment_policy/{policyId}
    }
    
    public function getPolicyList() {
        // GET /sell/account/v1/fulfillment_policy
    }
    
    public function deletePolicy($policyId) {
        // DELETE /sell/account/v1/fulfillment_policy/{policyId}
    }
}
```

#### 1.3 データベース連携
```php
// 作成ファイル: ebay_database_sync.php
class eBayDatabaseSync {
    private $policyManager;
    private $calculator; // Claude作成のShippingCalculator使用
    
    public function syncPolicyToEbay($localPolicyId) {
        // 1. ローカルポリシーデータ取得
        // 2. eBay形式に変換
        // 3. eBay API経由で作成
        // 4. ebay_policy_id をDBに保存
    }
    
    public function syncAllPolicies() {
        // 3つのポリシー（economy/standard/express）を一括同期
    }
}
```

### Phase 2: 高度な自動化ロジック (Week 2)

#### 2.1 インテリジェント価格最適化
```php
// 作成ファイル: intelligent_pricing.php
class IntelligentPricingEngine {
    
    public function optimizeShippingCosts($productData, $targetMargin = 0.25) {
        // 1. Claude計算エンジンで基本送料取得
        // 2. 競合価格データ分析
        // 3. 利益率最適化
        // 4. 地域別価格調整
    }
    
    public function analyzeCompetitorPricing($productTitle, $category) {
        // eBay Search API使用
        // 類似商品価格分析
    }
    
    public function calculateOptimalPolicy($productProfile) {
        // 商品プロファイルから最適ポリシー自動選択
        // サイズ・重量・価格帯・競合状況を総合判定
    }
}
```

#### 2.2 CSV AI分析・処理
```php
// 作成ファイル: csv_ai_processor.php
class CSVAIProcessor extends CSVShippingProcessor {
    
    public function analyzeCSVStructure($filePath) {
        // AI分析でCSV構造自動判定
        // ヘッダー不整合の自動修正
        // データ品質評価
    }
    
    public function autoCorrectData($rawData) {
        // 国コード正規化（"United States" → "US"）
        // 通貨単位統一
        // 重量単位変換
        // ゾーン名標準化
    }
    
    public function detectDataPatterns($csvData) {
        // データパターン自動検出
        // 異常値識別
        // 欠損データ補完提案
    }
}
```

#### 2.3 自動化ワークフロー統合
```php
// 作成ファイル: automated_workflow.php
class AutomatedWorkflow {
    private $csvProcessor;
    private $policyManager;
    private $pricingEngine;
    
    public function processFullWorkflow($csvFile) {
        // 1. CSV AI分析・処理（Claude作成のCSV処理を拡張）
        // 2. 送料データベース更新
        // 3. ポリシー自動生成
        // 4. eBay API同期
        // 5. 価格最適化実行
        // 6. 結果レポート生成
    }
    
    public function schedulePeriodicUpdates() {
        // 定期実行設定
        // 為替レート更新
        // 競合価格チェック
        // ポリシー調整
    }
}
```

### Phase 3: エラーハンドリング & 最適化 (Week 3)

#### 3.1 堅牢なエラーハンドリング
```php
// 作成ファイル: error_handler.php
class ShippingSystemErrorHandler {
    
    public function handleEbayAPIError($error, $context) {
        // eBay API エラー分類・対応
        // Rate Limit 対応
        // 認証エラー自動復旧
    }
    
    public function implementFallbackStrategy($operation, $data) {
        // フォールバック戦略
        // オフライン処理キュー
        // 部分的成功時の継続処理
    }
    
    public function logAndNotify($error, $severity) {
        // 詳細ログ記録
        // 緊急時通知システム
    }
}
```

#### 3.2 パフォーマンス最適化
```php
// 作成ファイル: performance_optimizer.php
class PerformanceOptimizer {
    
    public function optimizeAPIRequests() {
        // バッチ処理実装
        // リクエスト最適化
        // キャッシュ戦略
    }
    
    public function implementRateLimitManagement() {
        // Rate Limit 監視
        // 自動スロットリング
        // 優先度付きキュー
    }
}
```

## 技術要件・制約

### eBay API制約
- **Rate Limit**: 5000回/日
- **認証**: OAuth 2.0 Client Credentials
- **Sandbox環境**: 必須テスト実行
- **Production移行**: 段階的リリース

### 既存システム連携
```php
// Claude作成のShippingCalculatorを活用
$calculator = new ShippingCalculator($pdo);
$result = $calculator->calculateShipping($productId, $weight, $dimensions, $country);

// 計算結果をeBay APIに連携
$ebaySync = new eBayDatabaseSync();
$ebaySync->syncCalculationResult($result);
```

### データベース更新
```sql
-- 既存テーブルに eBay連携フィールド追加
ALTER TABLE shipping_policies ADD COLUMN ebay_sync_status ENUM('pending', 'synced', 'error') DEFAULT 'pending';
ALTER TABLE shipping_policies ADD COLUMN last_ebay_sync TIMESTAMP NULL;
ALTER TABLE shipping_policies ADD COLUMN ebay_error_log TEXT NULL;
```

## 開発順序・マイルストーン

### Week 1 目標
- [ ] eBay Developer Account取得・設定
- [ ] OAuth認証システム実装
- [ ] 基本的なポリシーCRUD操作
- [ ] Claude計算エンジンとの連携テスト

### Week 2 目標
- [ ] CSV AI分析機能実装
- [ ] 価格最適化エンジン
- [ ] 自動化ワークフロー統合
- [ ] フロントエンド連携

### Week 3 目標
- [ ] エラーハンドリング強化
- [ ] パフォーマンス最適化
- [ ] 統合テスト・デバッグ
- [ ] ドキュメント作成

## テスト戦略

### 単体テスト
```php
// 各クラスのテストケース作成
class eBayPolicyManagerTest {
    public function testCreatePolicy() {
        // ポリシー作成テスト
    }
    
    public function testRateLimitHandling() {
        // Rate Limit対応テスト
    }
}
```

### 統合テスト
```php
// エンドツーエンドテスト
class WorkflowIntegrationTest {
    public function testFullCSVToEbayWorkflow() {
        // CSV → 計算 → eBay同期の完全フロー
    }
}
```

## デプロイメント

### Sandbox環境
1. eBay Sandbox APIでテスト
2. テストデータでの完全検証
3. エラーケース網羅確認

### Production移行
1. 段階的ポリシー作成（1個ずつ）
2. 監視・ログ確認
3. 本格運用開始

## 成功指標

### 技術指標
- [ ] eBay API 成功率 > 95%
- [ ] CSV処理時間 < 30秒（1000行）
- [ ] エラー自動復旧率 > 90%

### ビジネス指標
- [ ] ポリシー作成時間 90%短縮
- [ ] 送料計算精度 99%
- [ ] 運用工数 80%削減

## 📞 Claude連携インターフェース

Geminiが実装する全ての機能は、Claude作成の基盤と以下の方法で連携してください：

```php
// 送料計算連携
$calculator = new ShippingCalculator($pdo);
$shippingResult = $calculator->calculateShipping($productId, $weight, $dimensions, $country);

// eBay同期
$ebayManager = new eBayPolicyManager(); // Gemini作成
$ebayResult = $ebayManager->syncShippingData($shippingResult);
```

この指示書に基づいて実装することで、Claudeの基盤を最大限活用しながら、eBay統合の高度な機能を効率的に開発できます。

質問や不明点があれば、Claude側の実装詳細を確認いたします。
