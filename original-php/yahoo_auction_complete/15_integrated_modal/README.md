# 統合モーダルシステム (15_integrated_modal)

## 📁 ディレクトリ配置決定

### 保存場所
```
modules/yahoo_auction_complete/new_structure/15_integrated_modal/
```

### 配置理由
1. **独立性**: 他モジュールの変更に影響されない
2. **転用可能性**: 他プロジェクトでも流用しやすい
3. **拡張性**: 将来的な機能追加が容易
4. **管理のしやすさ**: 統合モーダル関連が一箇所に集約

## 📂 ディレクトリ構造

```
15_integrated_modal/
├── README.md                           # このファイル
├── integrated_modal_system.php         # メインシステム
├── 統合モーダルシステム開発レポート.md     # 開発詳細レポート
├── api/                               # API群
│   ├── integrated_data.php            # 統合データ取得
│   └── modal_actions.php              # モーダル操作API
├── assets/                            # 専用アセット
│   ├── modal_system.css               # 専用CSS
│   └── modal_system.js                # 専用JavaScript
└── docs/                              # ドキュメント
    ├── api_documentation.md           # API仕様書
    └── ui_components_guide.md         # UIコンポーネントガイド
```

## 🚀 使用方法

### 基本アクセス
```
http://localhost:8080/modules/yahoo_auction_complete/new_structure/15_integrated_modal/integrated_modal_system.php
```

### 他システムからの統合
```php
// 他のモジュールから統合モーダルを呼び出し
include_once '../15_integrated_modal/api/integrated_data.php';
$modal_data = getIntegratedModalData($product_id);
```

## 🔄 他モジュールとの連携

### 依存関係
- `02_scraping`: Yahoo商品データ
- `05_rieki`: 利益計算結果
- `06_filters`: フィルター判定
- `09_shipping`: 送料計算
- `11_category`: カテゴリー判定
- `03_approval`: 承認状況

### データフロー
```
Yahoo Data → 15_integrated_modal → 各モジュールAPI → 統合表示
```

## 📋 メンテナンス・更新

### ファイル管理
- メインシステム: `integrated_modal_system.php`
- 設定変更: 各モジュールのAPI接続設定を確認
- CSS/JS更新: `assets/`フォルダ内で分離管理

### 将来的なリファクタリング
1. 単一ファイルから分散ファイルへの分割
2. API群の独立サービス化
3. フロントエンドフレームワーク導入

---

**作成**: 2025年9月18日  
**モジュール番号**: 15  
**用途**: 統合モーダル・インターフェース  
**依存**: 多モジュール統合型