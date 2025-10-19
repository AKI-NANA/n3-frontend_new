# Gemini引き継ぎ資料 - eBay配送ポリシー自動化プロジェクト

## Claude作成済み要素

### ✅ 完了済み項目

#### 1. データベース設計 & 基盤構築
- **shipping_database_schema.sql**: 6つのテーブル設計完了
  - shipping_zones (国・地域ゾーン)
  - usa_domestic_zones (USA国内ゾーン)
  - shipping_policies (配送ポリシーマスター)
  - shipping_rates (重量・サイズ別料金)
  - product_shipping_dimensions (商品データ)
  - shipping_calculation_log (計算履歴)

#### 2. 基本計算ロジック
- **ShippingCalculator.php**: 完全な送料計算クラス
  - 容積重量計算
  - ポリシー自動選択
  - ゾーン判定
  - USA基準価格計算
  - 燃油サーチャージ対応

#### 3. API基盤
- **api.php**: RESTfulエンドポイント
- **setup_database.php**: DB初期化API
- **shipping_integration.js**: フロントエンド統合

### 🎯 動作確認済み機能

1. **商品サイズ・重量 → ポリシー自動選択**
2. **送付先国 → ゾーン自動判定**
3. **USA基準送料計算**
4. **容積重量 vs 実重量の自動判定**
5. **計算履歴の自動保存**

## Gemini担当作業領域

### 🚀 実装が必要な要素

#### 1. eBay API統合 (最重要)
```php
// 必要な実装
class eBayPolicyManager {
    public function createShippingPolicy($policyData) {
        // eBay Trading API または Sell API使用
        // POST /sell/account/v1/fulfillment_policy
    }
    
    public function updateShippingPolicy($policyId, $data) {
        // PUT /sell/account/v1/fulfillment_policy/{policyId}
    }
    
    public function getPolicyStatus($policyId) {
        // GET /sell/account/v1/fulfillment_policy/{policyId}
    }
}
```

#### 2. 高度な地域判定・最適化アルゴリズム
```php
// 複雑なロジックが必要
class AdvancedZoneCalculator {
    public function optimizeShippingCosts($productData, $allDestinations) {
        // 複数国への送料最適化
        // 競合価格との比較
        // 利益率最大化計算
    }
    
    public function handleSpecialCases($country, $productSize) {
        // 禁止品チェック
        // 通関手続き考慮
        // 地域別制限対応
    }
}
```

#### 3. 自動化ワークフロー
```php
class AutomatedWorkflow {
    public function processCSVUpload($csvFile) {
        // AI分析による送料データ抽出
        // 自動ポリシー生成
        // eBay API経由での登録
    }
    
    public function scheduleUpdates() {
        // 定期的な料金更新
        // 為替レート反映
        // 競合価格チェック
    }
}
```

### 📋 技術仕様・制約

#### eBay API制約
- **Rate Limit**: 1日5000回
- **認証**: OAuth 2.0 (複雑な実装)
- **承認プロセス**: 新ポリシーは審査が必要

#### 既存システム連携
- Claude作成のAPIエンドポイントを活用
- データベーススキーマは変更不要
- フロントエンドとの統合は準備済み

### 🎯 実装優先順位

#### Phase 1: eBay API基盤 (Week 1-2)
1. Developer Account設定
2. OAuth認証実装
3. 基本的なポリシーCRUD操作

#### Phase 2: 自動化ロジック (Week 3-4)
1. CSV分析・処理
2. ポリシー自動生成
3. エラーハンドリング

#### Phase 3: 最適化・統合 (Week 5-6)
1. 高度な計算アルゴリズム
2. リアルタイム更新
3. パフォーマンス最適化

### 💡 技術的アドバイス

#### Claude側で解決済みの課題
- データベース設計の複雑性
- 基本的な送料計算ロジック
- フロントエンド統合

#### Gemini側で注意すべき点
- eBay APIのバージョン管理
- 国際配送の法的制約
- レート制限への対応戦略

### 🔧 テスト環境

#### 利用可能なテストデータ
- サンプル商品データ (3種類のサイズパターン)
- 国際ゾーン設定 (5ゾーン)
- USA国内ゾーン (8ゾーン + 特別地域)

#### API接続テスト方法
```bash
# データベース初期化
curl -X GET "http://localhost:8080/modules/yahoo_auction_tool/shipping_calculation/setup_database.php"

# 送料計算テスト
curl -X POST "http://localhost:8080/modules/yahoo_auction_tool/shipping_calculation/api.php?action=test_calculation" \
-H "Content-Type: application/json" \
-d '{"weight": 1.5, "length": 30, "width": 20, "height": 15, "destination": "CA"}'
```

## 連携インターフェース

Claude作成のAPIは全てGemini実装と連携可能です。`ShippingCalculator`クラスの`calculateShipping()`メソッドを、Gemini作成のeBay API統合クラスから呼び出すことで、シームレスな統合が実現できます。

ご質問があれば、Claude側の実装詳細について説明いたします。
