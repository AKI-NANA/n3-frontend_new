# 統合モーダルシステム - 07_editing

## 📋 概要

仕入れ先（Yahoo、Amazon等）と出品先（eBay、Shopee等）を動的に切り替える、拡張可能な統合モーダルシステムです。

## 🏗️ フォルダ構造

```
07_editing/
├── editor.php                    # メインファイル（統合済み）
├── modal_system/                 # 統合モーダルシステム
│   ├── modal_base.html          # 共通モーダルHTML
│   ├── modal_base.css           # 共通CSS
│   ├── modal_controller.js      # メインコントローラー
│   ├── sources/                 # 仕入れ先別テンプレート
│   │   ├── yahoo_template.html  # Yahoo専用
│   │   └── amazon_template.html # Amazon専用
│   └── marketplaces/            # 出品先別テンプレート
│       └── ebay_template.html   # eBay専用
└── handover_docs/               # 引き継ぎドキュメント
```

## ✨ 主要機能

### 1. 仕入れ先別対応
- **Yahoo オークション**: 日本語データ、all_images配列
- **Amazon API**: 英語データ、ASIN、ブランド情報
- **汎用**: その他のデータソース

### 2. 出品先別対応
- **eBay**: 12枚画像、Best Offer、Shipping Policy
- **Shopee**: 10枚画像（テンプレート準備中）
- **Amazon海外**: 9枚画像（テンプレート準備中）

### 3. 共通機能
- 統合概要タブ（ツールステータス）
- 画像選択タブ（最大15枚対応）
- ツール連携タブ（カテゴリ判定、利益計算等）
- 最終確認タブ（検証・出品）

## 🚀 使い方

### モーダルを開く

```javascript
// テーブルの画像クリックで自動的に開く
IntegratedModal.open(itemId);
```

### 仕入れ先の追加

1. `modal_system/sources/` に新しいテンプレートを作成
2. `modal_controller.js` の `sources` オブジェクトに追加:

```javascript
sources: {
    yahoo: { ... },
    amazon: { ... },
    newSource: {  // 新しい仕入れ先
        name: '新しいソース名',
        icon: 'fas fa-icon-name',
        color: '#色コード',
        templatePath: 'modal_system/sources/new_template.html',
        dataHandler: 'handleNewSourceData'
    }
}
```

3. データハンドラー関数を追加:

```javascript
handleNewSourceData(data) {
    // データ表示処理
}
```

### 出品先の追加

1. `modal_system/marketplaces/` に新しいテンプレートを作成
2. `modal_controller.js` の `marketplaces` オブジェクトに追加:

```javascript
marketplaces: {
    ebay: { ... },
    newMarket: {  // 新しい出品先
        name: '新しいマーケット名',
        icon: 'fas fa-icon-name',
        color: '#色コード',
        maxImages: 15,
        templatePath: 'modal_system/marketplaces/new_template.html'
    }
}
```

3. マーケットプレイス選択ボタンを `modal_base.html` に追加

## 🔧 カスタマイズ

### CSS変数の変更

`modal_system/modal_base.css`:

```css
.integrated-modal-overlay {
    --integrated-primary: #667eea;     /* プライマリカラー */
    --source-yahoo: #0B1D51;           /* Yahoo色 */
    --marketplace-ebay: #0064d2;       /* eBay色 */
}
```

### タブの追加

1. `modal_base.html` にタブリンクとコンテンツを追加
2. `modal_controller.js` の `switchTab()` で処理

## 📊 データフロー

```
1. editor.php: 商品画像クリック
   ↓
2. IntegratedModal.open(itemId)
   ↓
3. API呼び出し: get_product_details
   ↓
4. 仕入れ先判定 (detectSource)
   ↓
5. テンプレートロード
   - 仕入れ先別: sources/xxx_template.html
   - 出品先別: marketplaces/xxx_template.html
   ↓
6. データ表示 (handleXXXData)
   ↓
7. ユーザー操作
   - 画像選択
   - ツール実行
   - フォーム入力
   ↓
8. 出品実行 (submitListing)
```

## 🛠️ トラブルシューティング

### モーダルが表示されない

```bash
# ファイルパスの確認
ls -la modal_system/modal_base.html
ls -la modal_system/modal_base.css
ls -la modal_system/modal_controller.js
```

### テンプレートが読み込めない

```javascript
// ブラウザコンソールでエラー確認
// 404エラーの場合はパスを確認
```

### 画像が表示されない

```javascript
// データ構造を確認
console.log('Product Data:', IntegratedModal.state.productData);
console.log('Images:', IntegratedModal.state.productData.images);
```

## 📝 今後の拡張

### 追加予定の仕入れ先
- [ ] メルカリ
- [ ] 楽天市場
- [ ] その他ECサイト

### 追加予定の出品先
- [ ] Shopee（テンプレート完成）
- [ ] Amazon海外（テンプレート完成）
- [ ] Coupang
- [ ] Shopify

### 追加予定の機能
- [ ] 一括編集機能
- [ ] テンプレート保存機能
- [ ] 自動翻訳機能
- [ ] 画像加工機能

## 📞 サポート

問題が発生した場合:

1. ブラウザのコンソールでエラーを確認
2. `modal_controller.js` のログを確認
3. `editor.php` の `addLogEntry()` でログ追加

## 🎉 完成

統合モーダルシステムは完全に動作可能な状態で、将来の拡張にも対応できる設計になっています。

**新しい仕入れ先・出品先を追加する際は、このREADMEの手順に従ってください。**
