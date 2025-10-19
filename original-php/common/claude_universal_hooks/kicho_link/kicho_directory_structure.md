# 📁 記帳自動化ツール ディレクトリ構造

## 🎯 作成するディレクトリ構造

```
modules/kicho/
├── index.php                    # メインエントリーポイント
├── kicho_content.php           # メインコンテンツ表示
├── config/
│   └── kicho_config.php        # 記帳専用設定
├── controllers/
│   ├── kicho_controller.php    # メインコントローラー
│   ├── transaction_controller.php
│   ├── rule_controller.php
│   └── ai_controller.php
├── models/
│   ├── transaction_model.php
│   ├── rule_model.php
│   └── statistics_model.php
├── services/
│   ├── mf_api_service.php      # MFクラウド連携
│   ├── ai_learning_service.php # AI学習エンジン
│   └── approval_service.php    # 承認フロー
├── templates/
│   ├── dashboard.php           # ダッシュボード画面
│   ├── transactions.php       # 取引管理画面
│   ├── rules.php              # ルール管理画面
│   └── components/            # 部品テンプレート
│       ├── transaction_form.php
│       ├── rule_form.php
│       └── statistics_card.php
├── assets/
│   ├── kicho.css              # 記帳専用CSS
│   ├── kicho.js               # 記帳専用JavaScript
│   └── images/                # 記帳専用画像
│       ├── icons/
│       └── logos/
└── api/
    ├── transaction_api.php     # 取引API
    ├── rule_api.php           # ルールAPI
    ├── ai_api.php             # AI学習API
    └── mf_api.php             # MFクラウド連携API
```

## 📋 作成手順

### 1. ディレクトリ作成コマンド

```bash
# modules/kicho/ディレクトリ作成
mkdir -p modules/kicho/{config,controllers,models,services,templates/components,assets/images/{icons,logos},api}

# 権限設定
chmod 755 modules/kicho
chmod 755 modules/kicho/*
```

### 2. 基本ファイル作成確認

以下のファイルを順次作成していきます：

**必須ファイル（Phase 2で作成）:**
- [x] `modules/kicho/index.php` - エントリーポイント
- [x] `modules/kicho/kicho_content.php` - メインコンテンツ
- [x] `modules/kicho/config/kicho_config.php` - 設定

**実装ファイル（Phase 3-4で作成）:**
- [ ] `modules/kicho/controllers/kicho_controller.php`
- [ ] `modules/kicho/models/transaction_model.php`
- [ ] `modules/kicho/templates/dashboard.php`
- [ ] `modules/kicho/assets/kicho.css`
- [ ] `modules/kicho/assets/kicho.js`

### 3. 既存システム統合修正

**修正対象ファイル:**
- [ ] `index.php` - ページマッピング追加
- [ ] `common/templates/sidebar.php` - ナビゲーション追加
- [ ] `common/css/style.css` - CSS インポート追加

## 🔧 実装優先順位

1. **Phase 2**: 基本ファイル作成（index.php, kicho_content.php）
2. **Phase 3**: 既存システム統合（ナビゲーション・CSS）
3. **Phase 4**: 記帳機能実装（コントローラー・モデル）
4. **Phase 5**: API・UI完成（Ajax・フォーム）

これにより段階的に安全な開発が可能です。