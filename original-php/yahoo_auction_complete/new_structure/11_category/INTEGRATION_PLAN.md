# eBayカテゴリー統合システム最終設計書
## プロジェクト: Yahoo→eBay自動出品支援システム

### 1. システム統合方針

#### A. UI統合 - 1つのツールに集約
- **メインツール**: category_massive_viewer.php を拡張
- **削除対象**: ebay_category_tool.php（機能を統合後削除）
- **新機能**: カテゴリー自動判定 + 出品管理

#### B. 実用性重視の機能設計
```
Yahoo商品データ → カテゴリー自動判定 → 手数料計算 → 出品枠管理 → 利益計算
```

### 2. 主要機能仕様

#### A. カテゴリー自動判定エンジン
**目的**: Yahoo商品タイトルから最適なeBayカテゴリーを自動選択

**実装方針**:
- キーワード辞書方式（シンプル・高精度）
- AI判定は補助的に使用（コスト・速度考慮）
- 手動確認フロー必須

**データベース設計**:
```sql
-- キーワード→カテゴリーマッピング強化
CREATE TABLE category_auto_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(200) NOT NULL,
    category_id VARCHAR(20) NOT NULL,
    confidence_score INTEGER DEFAULT 80,
    match_type VARCHAR(20) DEFAULT 'partial', -- exact, partial, regex
    priority INTEGER DEFAULT 5,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 判定履歴テーブル
CREATE TABLE category_detection_history (
    id SERIAL PRIMARY KEY,
    yahoo_title TEXT NOT NULL,
    detected_category_id VARCHAR(20),
    confidence_score INTEGER,
    manual_category_id VARCHAR(20), -- 手動修正時
    is_correct BOOLEAN,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### B. 出品枠管理システム
**目的**: eBay Storeの無料出品枠を正確に管理

**出品カテゴリー分類**:
```sql
-- 出品枠分類テーブル
CREATE TABLE listing_quota_categories (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    quota_type VARCHAR(20) NOT NULL, -- 'all_categories', 'select_categories', 'special'
    store_level VARCHAR(20) NOT NULL, -- 'basic', 'premium', 'anchor', 'enterprise'
    is_zero_insertion_fee BOOLEAN DEFAULT FALSE,
    special_conditions TEXT,
    UNIQUE(category_id, store_level)
);

-- 現在の出品数追跡
CREATE TABLE current_listings_count (
    id SERIAL PRIMARY KEY,
    store_level VARCHAR(20) NOT NULL,
    quota_type VARCHAR(20) NOT NULL,
    current_count INTEGER DEFAULT 0,
    max_quota INTEGER NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- '2025-09'
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_level, quota_type, month_year)
);
```

**Select Categories定義**:
```
- Sports Mem, Cards & Fan Shop > Sports Trading Cards
- Toys & Hobbies > Collectible Card Games  
- Collectibles
- Music
- Books & Magazines
- Movies & TV
- Video Games & Consoles > Video Games
- Stamps
- Crafts
- Home & Garden > Greeting Cards & Party Supply > Party Supplies
```

#### C. 月次更新システム
**目的**: eBayカテゴリー変更の自動検出・更新

**実装案**:
1. **差分検出API**（月1回実行）
2. **手動確認フロー**（重要変更のみ）
3. **影響分析レポート**（既存出品への影響）

### 3. 技術実装計画

#### Phase 1: UI統合（優先度: 高）
**作業内容**:
- category_massive_viewer.php にカテゴリー判定機能追加
- Yahoo商品データ入力フォーム追加
- 判定結果表示・編集機能
- ebay_category_tool.php 削除

**所要時間**: 2-3時間

#### Phase 2: キーワード辞書構築（優先度: 高）
**作業内容**:
- 主要商品カテゴリーのキーワード登録（100-200件）
- 判定アルゴリズムの実装
- 精度テスト・改善

**キーワード例**:
```
iPhone → Cell Phones & Smartphones (293)
Camera → Cameras & Photo (625)  
Pokemon → Non-Sport Trading Cards (183454)
Guitar → Musical Instruments & Gear > Guitars & Basses (33034)
```

**所要時間**: 3-4時間

#### Phase 3: 出品枠管理（優先度: 中）
**作業内容**:
- Store level設定機能
- 出品枠リアルタイム表示
- 枠超過アラート機能

**所要時間**: 2-3時間

#### Phase 4: 月次更新機能（優先度: 低）
**作業内容**:
- eBay API差分取得
- 変更検出ロジック
- 影響分析レポート

**所要時間**: 4-5時間

### 4. 削除・簡略化対象

#### A. 削除するファイル
- `ebay_category_tool.php` → 機能統合後削除
- `CategoryDetector.php` → シンプル版に置換
- `ItemSpecificsGenerator.php` → 必要最小限に簡略化

#### B. 簡略化する機能
- AI判定機能 → キーワード辞書に統一
- 複雑なAPI連携 → 必要最小限のみ
- 過度な統計機能 → 基本的な数値のみ

### 5. 実装優先順位

1. **Phase 1**: UI統合（即効性）
2. **Phase 2**: キーワード辞書（実用性）
3. **Phase 3**: 出品枠管理（収益性）
4. **Phase 4**: 自動更新（保守性）

### 6. 成功指標

- **精度**: カテゴリー自動判定 85%以上
- **速度**: 1商品あたり1秒以内で判定
- **使いやすさ**: 手動確認・修正が容易
- **実用性**: 月100-500商品の処理に対応

### 7. リスク・課題

#### A. 技術的リスク
- **キーワード辞書の精度**: 継続的な学習・改善が必要
- **eBay API制限**: レート制限・仕様変更への対応

#### B. 運用リスク  
- **カテゴリー変更**: 月次更新の確実な実行
- **出品枠管理**: 手動出品との整合性

### 8. 次ステップ

1. **Phase 1実装**: UI統合から開始
2. **動作確認**: 基本機能のテスト
3. **段階的拡張**: 必要に応じて機能追加

この計画により、**実用的で保守しやすいeBayカテゴリー統合システム**が構築できます。
