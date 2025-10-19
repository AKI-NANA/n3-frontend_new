# Yahoo Auction統合システム - システム構造設計書

## 1. プロジェクト概要

### 1.1 目的
Yahoo オークションからのデータ取得から eBay 出品までの一連のワークフローを自動化する統合システム

### 1.2 基本アーキテクチャ
モジュラーモノリス構造による責任分離型設計

### 1.3 技術スタック
- **バックエンド**: PHP 8.x
- **データベース**: PostgreSQL
- **フロントエンド**: Vanilla JavaScript + CSS
- **外部API**: eBay API, Yahoo Auction (スクレイピング)

## 2. ディレクトリ構造

### 2.1 現在の構造
```
new_structure/
├── 01_dashboard/          # システム統合ダッシュボード
├── 02_scraping/           # データ取得 (70ファイル - 要整理)
├── 03_approval/           # 商品承認システム
├── 04_analysis/           # 承認データ分析
├── 05_rieki/              # 利益計算 (22ファイル)
├── 06_filters/            # フィルター管理 (API実装済み)
├── 07_editing/            # データ編集 (48ファイル - 要整理)
├── 08_listing/            # 出品管理
├── 09_shipping/           # 送料計算
├── 10_zaiko/              # 在庫管理
├── 11_category/           # カテゴリー判定 (API実装済み)
├── 12_html_editor/        # HTML編集
├── 13_bunseki/            # 統合分析
├── 14_api_renkei/         # API統合
└── shared/                # 共通ライブラリ
```

### 2.2 標準モジュール構造 (index.php以外の名前)
```
XX_module/
├── main.php              # メインエントリーポイント (index.phpの代替)
├── dashboard.php         # ダッシュボード型の場合
├── tool.php              # ツール型の場合
├── manager.php           # 管理型の場合
├── api/
│   ├── data.php          # データ取得API
│   ├── update.php        # データ更新API
│   ├── delete.php        # データ削除API
│   └── actions.php       # その他操作API
├── assets/
│   ├── module.css        # モジュール固有CSS
│   └── module.js         # モジュール固有JavaScript
├── includes/             # モジュール内部クラス
└── config.php           # モジュール設定
```

## 3. データ設計

### 3.1 中央データベース
全モジュールが `yahoo_scraped_products` テーブルを中心として連携

### 3.2 ワークフロー管理
```sql
-- 商品の処理段階を追跡
ALTER TABLE yahoo_scraped_products 
ADD COLUMN workflow_status VARCHAR(50) DEFAULT 'scraped';

-- 処理段階の定義:
-- 'scraped'          → データ取得完了
-- 'filtered'         → フィルター処理完了
-- 'edited'           → 編集作業完了
-- 'calculated'       → 利益計算完了
-- 'approved'         → 承認完了
-- 'ready_for_listing'→ 出品準備完了
-- 'listed'           → 出品完了
```

### 3.3 モジュール間データ連携
```sql
-- 処理履歴テーブル
CREATE TABLE workflow_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES yahoo_scraped_products(id),
    module_name VARCHAR(50),
    action VARCHAR(100),
    status VARCHAR(50),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_by VARCHAR(100),
    notes TEXT
);
```

## 4. モジュール設計原則

### 4.1 責任分離
- **UI層**: HTMLレンダリング、ユーザー操作受付
- **API層**: データ処理、ビジネスロジック
- **データ層**: データベース操作

### 4.2 ファイル役割分担
- **PHP**: JSON API応答のみ、HTMLレンダリング禁止
- **JavaScript**: DOM操作、UI状態管理、API通信
- **CSS**: スタイリングのみ、ロジック分離

### 4.3 命名規則
```
メインファイル名の決定:
├── dashboard.php    # 統計・概要表示型 (01_dashboard, 13_bunseki)
├── tool.php         # 単機能ツール型 (11_category, 12_html_editor)
├── manager.php      # 管理・操作型 (06_filters, 08_listing, 10_zaiko)
├── processor.php    # 処理・計算型 (02_scraping, 05_rieki, 09_shipping)
└── editor.php       # 編集型 (07_editing, 03_approval)
```

## 5. 共通ライブラリ設計 (shared/)

### 5.1 新構造
```
shared/
├── core/
│   ├── Database.php      # 統合データベースクラス
│   ├── ApiResponse.php   # 標準API応答クラス
│   ├── Validator.php     # データ検証クラス
│   └── Logger.php        # ログ管理クラス
├── api/
│   ├── EbayConnector.php # eBay API統合
│   ├── YahooParser.php   # Yahoo解析エンジン
│   └── ExchangeRate.php  # 為替レート取得
├── utils/
│   ├── FileHandler.php   # ファイル操作
│   ├── ImageProcessor.php# 画像処理
│   └── CsvHandler.php    # CSV処理
├── config/
│   ├── database.php      # DB設定
│   ├── api_keys.php      # API設定
│   └── constants.php     # 定数定義
├── css/
│   ├── common.css        # 共通スタイル
│   ├── layout.css        # レイアウト
│   └── components.css    # コンポーネント
└── js/
    ├── common.js         # 共通JavaScript
    ├── api.js            # API通信ライブラリ
    └── utils.js          # ユーティリティ関数
```

### 5.2 標準API応答形式
```php
// 統一されたJSON応答形式
{
    "success": true|false,
    "data": {...},
    "message": "処理完了",
    "timestamp": "2025-09-18 12:00:00",
    "module": "module_name",
    "action": "action_name"
}
```

## 6. モジュール間連携パターン

### 6.1 データベースハブ連携
```
非同期的なワークフロー連携:
02_scraping → [DB] → 06_filters → [DB] → 07_editing → [DB] → 05_rieki
```

### 6.2 API連携
```javascript
// 同期的な機能呼び出し
async function callModuleAPI(module, action, data) {
    const response = await fetch(`../${module}/api/${action}.php`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    return await response.json();
}

// 使用例: カテゴリー判定を他モジュールから呼び出し
const categoryResult = await callModuleAPI('11_category', 'detect', {
    title: '商品タイトル'
});
```

## 7. 現状分析による開発優先度

### 7.1 S級 (高度開発済み - 要リファクタリング)
- **02_scraping** (70ファイル, 1.6MB)
- **07_editing** (48ファイル, 744KB)
- **05_rieki** (22ファイル, 768KB)

### 7.2 A級 (充実 - API統合強化)
- **06_filters** (11ファイル, 160KB) - API実装済み
- **08_listing** (9ファイル, 208KB)
- **11_category** (7ファイル, 104KB) - API実装済み

### 7.3 B級 (基本完成 - 標準化必要)
- **10_zaiko** (2ファイル, 68KB)
- **12_html_editor** (2ファイル, 56KB)
- **13_bunseki** (4ファイル, 44KB)

### 7.4 C級 (基本機能のみ - 新規開発)
- **01_dashboard** (3ファイル, 40KB)
- **03_approval** (4ファイル, 56KB)
- **04_analysis** (1ファイル, 12KB)
- **09_shipping** (3ファイル, 36KB)
- **14_api_renkei** (1ファイル, 4KB)

## 8. セキュリティとエラーハンドリング

### 8.1 共通セキュリティ
```php
// 全APIで必須の検証
- CSRF トークン検証
- 入力データサニタイゼーション
- SQLインジェクション対策
- XSS対策
```

### 8.2 エラーハンドリング
```php
// 統一されたエラー応答
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "入力データが不正です",
        "details": {...}
    },
    "timestamp": "2025-09-18 12:00:00"
}
```

## 9. パフォーマンス考慮事項

### 9.1 データベース最適化
- インデックス設計
- クエリ最適化
- 接続プーリング

### 9.2 フロントエンド最適化
- 遅延読み込み
- APIキャッシュ
- 非同期処理

定期バックアップ
- 設定ファイルバックアップ
- 重要ファイルのバージョン管理

---

この設計書に基づいて、次のステップで具体的な修正計画書を作成します。