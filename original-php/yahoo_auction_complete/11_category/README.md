# eBayカテゴリー統合システム - 完全版

## 🎯 **システム概要**

Yahoo Auctionからスクレイピングした商品データから、最適なeBayカテゴリーを自動判定し、セルミラー分析、Item Specifics生成、スコアリング、出品枠管理まで統合した完全自動化システム。

## ✨ **主要機能**

### 🔍 **1. 統合カテゴリー判定**
- **ハイブリッド判定**: eBay Finding API + キーワード辞書
- **信頼度スコア**: 0-100%の精度評価
- **フォールバック機能**: API障害時の安全判定

### 🎯 **2. セルミラー分析**
- **売上実績分析**: 90日間の完売データ分析
- **競合状況把握**: 現在の競合商品数・価格帯
- **リスク評価**: LOW/MEDIUM/HIGH 3段階評価
- **利益予測**: 手数料込み利益計算

### 📋 **3. Item Specifics完全統合**
- **1セル最適化**: 32,767文字制限内で最大情報量
- **自動値推定**: Brand, Color, Condition等の自動検出
- **カテゴリー別最適化**: 必須項目の優先度付け

### 📊 **4. スコアリング・ランキング**
- **S/A/B/Cランク**: 総合評価による4段階分類
- **多角的評価**: AI信頼度 + セルミラー + 利益率 + 鮮度
- **動的更新**: データ変更時の自動スコア再計算

### 🏪 **5. 出品枠管理**
- **Select Categories対応**: eBay Store別枠管理
- **リアルタイム監視**: 残数アラート機能
- **月次自動リセット**: バッチ処理による枠管理

## 🏗️ **システム構成**

```
new_structure/11_category/
├── frontend/                           # フロントエンド
│   ├── category_massive_viewer_optimized.php  # メインUI（最適化版）
│   ├── category_massive_viewer.php           # メインUI（既存版）
│   └── ebay_category_tool.php                # 基本ツール
├── backend/                           # バックエンド
│   ├── api/
│   │   └── unified_category_api_enhanced.php # 統合API
│   ├── classes/
│   │   ├── UnifiedCategoryDetector.php       # 統合判定エンジン
│   │   ├── SellMirrorAnalyzer.php           # セルミラー分析
│   │   ├── ItemSpecificsManager.php         # Item Specifics管理
│   │   ├── EbayFindingApiConnector.php      # eBay Finding API
│   │   └── EbayTradingApiConnector.php      # eBay Trading API
│   ├── config/
│   │   └── database.php                     # 統一データベース設定
│   └── database/
│       └── complete_system_enhancement.sql  # 拡張データベーススキーマ
├── monthly_batch_processor.sh          # 月次バッチ処理
├── complete_system_setup.sh           # セットアップ・テスト
└── README.md                          # このファイル
```

## 🚀 **クイックスタート**

### **ステップ1: システムセットアップ**
```bash
cd /path/to/new_structure/11_category

# 実行権限付与
chmod +x complete_system_setup.sh
chmod +x monthly_batch_processor.sh

# 完全テスト実行
./complete_system_setup.sh --complete-test
```

### **ステップ2: データベース構築**
```bash
# 手動でデータベーススキーマ実行（必要に応じて）
psql -h localhost -U aritahiroaki -d nagano3_db -f database/complete_system_enhancement.sql
```

### **ステップ3: システム稼働確認**
```bash
# アクセスURL確認
./complete_system_setup.sh --urls
```

## 🌐 **アクセスURL**

### **メインシステム**
- **最適化UI**: `http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/category_massive_viewer_optimized.php`
- **既存UI**: `http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/category_massive_viewer.php`

### **API エンドポイント**
- **統合API**: `backend/api/unified_category_api_enhanced.php`

## 📊 **データベース設計**

### **主要テーブル**

#### **1. yahoo_scraped_products（拡張）**
```sql
-- 新規カラム
listing_score DECIMAL(8,4)      -- スコアリング（0-100）
listing_rank VARCHAR(10)        -- ランク（S/A/B/C）
ai_confidence DECIMAL(5,2)      -- AI信頼度
sell_mirror_data JSONB          -- セルミラーデータ
complete_item_specifics TEXT    -- Item Specifics統合
profit_estimation DECIMAL(10,2) -- 利益予測
listing_strategy VARCHAR(20)    -- 出品戦略
approval_status VARCHAR(20)     -- 承認状況
```

#### **2. sell_mirror_analysis（新規）**
```sql
mirror_confidence DECIMAL(5,2)  -- セルミラー信頼度
sold_count_90days INTEGER       -- 90日売上数
average_price DECIMAL(10,2)     -- 平均価格
risk_level VARCHAR(20)          -- リスクレベル
mirror_templates JSONB          -- ミラーテンプレート
```

#### **3. store_listing_limits（新規）**
```sql
plan_type VARCHAR(20)           -- Store プラン
all_categories_limit INTEGER    -- All Categories枠
select_categories_limit INTEGER -- Select Categories枠
current_all_categories INTEGER  -- 現在使用数（All）
current_select_categories INTEGER -- 現在使用数（Select）
```

## 🔌 **API仕様**

### **主要エンドポイント**

#### **単一商品完全分析**
```javascript
POST /unified_category_api_enhanced.php
{
    "action": "analyze_single_product",
    "product_id": 123
}
```

#### **バッチ分析**
```javascript
POST /unified_category_api_enhanced.php
{
    "action": "batch_analysis",
    "analysis_type": "complete",  // complete|category|mirror|scoring
    "limit": 50
}
```

#### **セルミラー分析**
```javascript
POST /unified_category_api_enhanced.php
{
    "action": "sell_mirror_analysis",
    "product_data": {
        "title": "商品タイトル",
        "price_jpy": 120000
    }
}
```

#### **Item Specifics生成**
```javascript
POST /unified_category_api_enhanced.php
{
    "action": "generate_item_specifics",
    "category_id": "293",
    "product_data": {...},
    "custom_values": {"Brand": "Apple"}
}
```

## 📈 **スコアリングアルゴリズム**

```sql
総合スコア = AI信頼度(25点) + カテゴリー信頼度(20点) + セルミラー(30点) 
          + 利益率(15点) + 鮮度(5点) + Select Categoriesボーナス(5点)

ランク分類:
- Sランク: 90-100点 (即出品推奨)
- Aランク: 70-89点  (高品質商品)
- Bランク: 50-69点  (標準商品)
- Cランク: 0-49点   (要検討商品)
```

## 🔄 **自動化・バッチ処理**

### **月次バッチ処理**
```bash
# Cronジョブ設定例
0 2 1 * * /path/to/monthly_batch_processor.sh

# 処理内容
# - 期限切れデータクリーンアップ
# - カテゴリー仕様更新（Trading API）
# - 出品枠月次リセット
# - データ整合性チェック
# - 統計レポート生成
# - データベースバックアップ
```

### **日次クリーンアップ**
```bash
0 3 * * * /path/to/monthly_batch_processor.sh --cleanup-only
```

## 🎯 **使用シナリオ**

### **1. 基本的なカテゴリー判定**
1. Yahoo商品データ投入
2. 統合判定実行（API + キーワード）
3. 信頼度確認
4. 手動確認（必要に応じて）

### **2. セルミラー戦略**
1. 高信頼度商品選出（Sランク）
2. セルミラー分析実行
3. リスクレベル確認（LOW推奨）
4. 「そのまま出品」実行

### **3. バッチ処理**
1. 未処理商品一括選択
2. 完全分析実行
3. スコア順ソート
4. 承認フロー連携

### **4. 出品枠管理**
1. Store設定確認
2. Select Categories商品選出
3. 残数監視
4. 枠超過アラート対応

## 🛠️ **カスタマイズ・拡張**

### **新規カテゴリー追加**
```sql
-- 1. カテゴリーマスター追加
INSERT INTO ebay_category_fees (category_id, category_name, final_value_fee_percent)
VALUES ('新規ID', 'カテゴリー名', 13.25);

-- 2. キーワード辞書追加
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight)
VALUES ('新規ID', 'キーワード', 'primary', 10);
```

### **スコアリング調整**
```sql
-- calculate_listing_score() 関数を編集
-- 各要素の重み付け変更可能
```

### **API効率化設定**
```php
// backend/classes/ 内で調整可能
private const MAX_ITEMS_PER_API_CALL = 100;  // API制限
private const ANALYSIS_CACHE_HOURS = 168;    // キャッシュ期間
```

## 📊 **パフォーマンス指標**

### **処理能力**
- **単一判定**: 1秒以内
- **バッチ処理**: 100商品/分
- **セルミラー分析**: 30秒/商品
- **Item Specifics生成**: 即時

### **精度目標**
- **カテゴリー判定**: 85%以上
- **セルミラー信頼度**: 95%以上で「そのまま出品」
- **スコア精度**: 継続学習により向上

### **API効率化**
- **月間制限**: 150万回まで対応
- **キャッシュ効率**: 70%以上
- **バッチ最適化**: 1回で100件処理

## 🔧 **トラブルシューティング**

### **よくある問題**

#### **1. データベース接続エラー**
```bash
# 設定確認
cat backend/config/database.php

# 接続テスト
psql -h localhost -U aritahiroaki -d nagano3_db -c "SELECT version();"
```

#### **2. API応答なし**
```bash
# ログ確認
tail -f logs/*.log

# 手動API テスト
curl -X POST http://localhost:8080/.../unified_category_api_enhanced.php \
  -H "Content-Type: application/json" \
  -d '{"action":"get_quick_stats"}'
```

#### **3. 権限エラー**
```bash
# 実行権限確認・付与
chmod +x *.sh
chown -R www-data:www-data logs/ temp/ backups/
```

#### **4. メモリ不足**
```bash
# PHP設定確認
php -i | grep memory_limit

# 設定変更（php.ini）
memory_limit = 512M
max_execution_time = 300
```

### **パフォーマンス問題**

#### **処理速度低下時**
1. インデックス確認: `EXPLAIN ANALYZE` でクエリ分析
2. 統計更新: `ANALYZE テーブル名`
3. キャッシュクリア: 古いキャッシュデータ削除
4. API制限確認: 1日の使用量チェック

#### **メモリ使用量増加時**
1. バッチサイズ削減: 100件 → 50件
2. ガベージコレクション強制実行
3. 期限切れデータクリーンアップ実行

### **データ不整合時**
```bash
# 整合性チェック実行
./monthly_batch_processor.sh --integrity-check

# スコア再計算
psql -c "UPDATE yahoo_scraped_products SET listing_score = calculate_listing_score(id);"
```

## 📈 **監視・メンテナンス**

### **日次監視項目**
- [ ] エラーログ確認
- [ ] API使用量チェック
- [ ] 処理速度監視
- [ ] データベース容量確認

### **週次メンテナンス**
- [ ] パフォーマンス統計確認
- [ ] 未処理データ確認
- [ ] バックアップ状況確認

### **月次メンテナンス**
- [ ] バッチ処理実行
- [ ] データクリーンアップ
- [ ] カテゴリー仕様更新
- [ ] システム最適化

## 🔐 **セキュリティ**

### **API セキュリティ**
```php
// CSRF 保護
if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
    throw new Exception('無効なリクエスト');
}

// 入力検証
$productId = filter_var($_POST['product_id'], FILTER_VALIDATE_INT);
```

### **データベース セキュリティ**
```sql
-- 最小権限の原則
GRANT SELECT, INSERT, UPDATE ON yahoo_scraped_products TO api_user;
REVOKE DELETE ON yahoo_scraped_products FROM api_user;
```

### **ファイル権限**
```bash
# 適切な権限設定
find . -type f -name "*.php" -exec chmod 644 {} \;
find . -type f -name "*.sh" -exec chmod 755 {} \;
chmod 600 backend/config/database.php  # 設定ファイル保護
```

## 📚 **アップデート・バージョン管理**

### **現在のバージョン: 2.0.0**
- **完全統合**: セルミラー + Item Specifics + スコアリング統合
- **出品枠管理**: Select Categories 完全対応
- **API効率化**: 月間150万回制限対応
- **自動化強化**: バッチ処理・監視機能

### **アップデート手順**
1. **バックアップ作成**: `./monthly_batch_processor.sh --backup-only`
2. **新ファイル配置**: 既存ファイルを新版で置換
3. **データベース更新**: 新スキーマ適用
4. **設定確認**: config/ ディレクトリの設定ファイル確認
5. **テスト実行**: `./complete_system_setup.sh --complete-test`

### **ロールバック手順**
1. **バックアップ復元**: データベースバックアップからリストア
2. **旧ファイル復元**: 以前のバックアップファイル使用
3. **設定復元**: 設定ファイル復元
4. **動作確認**: 基本機能テスト実行

## 🤝 **サポート・お問い合わせ**

### **技術サポート**
- **ログ分析**: `logs/` ディレクトリ内のログファイル確認
- **デバッグモード**: PHP クラス内の `$debugMode = true` に設定
- **詳細テスト**: `./complete_system_setup.sh --test [TYPE]`

### **カスタム開発要望**
- **新機能追加**: 既存フレームワーク拡張による追加開発
- **他システム連携**: API インターフェース提供
- **パフォーマンス改善**: 専用の最適化実装

### **よくある質問 (FAQ)**

**Q: システムが重い時の対処方法は？**
A: 1) バッチサイズを削減、2) インデックス確認、3) 期限切れデータクリーンアップ、4) PHP memory_limit 増量

**Q: API制限に達した場合は？**
A: 1) 翌日まで待機、2) バッチ処理を小分け実行、3) キャッシュ活用、4) 不要なAPI呼び出し削減

**Q: カテゴリー判定精度が低い場合は？**
A: 1) キーワード辞書更新、2) 除外キーワード追加、3) 手動学習データ投入、4) 閾値調整

**Q: Select Categories の管理方法は？**
A: 1) eBay Seller Hub で設定確認、2) システム内の出品枠設定更新、3) 月次バッチでリセット

---

## 🎉 **システム完成**

このeBayカテゴリー統合システムは、Yahoo Auctionからの商品データを完全自動化でeBay出品に最適化する包括的なソリューションです。

**主要な達成項目:**
- ✅ 統合カテゴリー判定（API + キーワード）
- ✅ セルミラー分析・リスク評価
- ✅ Item Specifics 完全自動生成
- ✅ スコアリング・ランキングシステム
- ✅ Select Categories 出品枠管理
- ✅ 月次バッチ処理・自動化
- ✅ 完全テスト・セットアップスクリプト
- ✅ 包括的なドキュメント

システムの稼働開始により、手動作業時間の大幅削減、判定精度の向上、出品効率の最大化が実現されます。