# 📚 NAGANO3共通ルール整理【次チャット継承用】

## 🎯 **このチャットで確定した重要事項**

### **開発方針・戦略**
1. **開発順序**: まず記帳hooks作成 → 共通部分抽出 → 他モジュール展開
2. **実装方式**: 設定ファイル追記方式（手動追加・完全制御）
3. **UI制御**: CSS transition基本レベル、全ツール共通
4. **エラー処理**: SaaS企業参考の軽量通知（Toast）方式
5. **MF連携**: 自動バックアップ + 人間承認待ち + 承認後送信

---

## 🔧 **技術的確定事項**

### **API接続情報取得の共通ルール**
```php
// 優先順序（共通ルール）
// 1. .env隠しファイル（最優先）
// 2. データベース（api_settingsテーブル）
// 3. 設定ファイル（フォールバック）

// ⚠️ 課題：共通のAPI格納場所ルールが不明確
// → 今後共通hooks作成時に統一する必要あり
```

### **ディレクトリ構造（確定）**
```
NAGANO3_PROJECT/
├── common/
│   ├── config/
│   │   ├── hooks/                    ← hooks設定専用（新規）
│   │   │   ├── kicho_hooks.json      ← KICHO専用
│   │   │   ├── common_hooks.json     ← 共通（将来）
│   │   │   └── ui_animations.json    ← UIアニメーション
│   │   └── modules_config.php         ← 既存
│   └── js/
│       ├── hooks/                     ← hooks実行JS（新規）
│       │   ├── kicho_hooks_engine.js  ← KICHO専用エンジン
│       │   ├── ui_controller.js       ← UI制御共通
│       │   └── error_handler.js       ← エラー処理共通
│       └── pages/kicho.js             ← 既存KICHO JS
└── modules/kicho/
    ├── kicho_content.php              ← 40個ボタン
    ├── kicho_ajax_handler.php         ← Ajax処理
    └── kicho_mf_integration.php       ← MF連携（新規）
```

### **40個data-actionボタン分類**
```javascript
// 専用hooks（KICHO記帳ツール専用）
const KICHO_SPECIFIC = [
    'execute-integrated-ai-learning',    // AI学習（記帳特化）
    'execute-mf-import',                 // MFクラウド連携
    'bulk-approve-transactions',         // 取引承認
    'download-rules-csv',                // ルール管理
];

// 汎用hooks（他モジュールでも使用予定）
const COMMON_ACTIONS = [
    'delete-data-item',                  // データ削除
    'select-all-imported-data',          // 一括選択
    'refresh-all',                       // 画面更新
    'process-csv-upload',                // CSV処理
    'execute-full-backup'                // バックアップ
];
```

---

## 🎨 **UI・UX確定仕様**

### **アニメーション仕様**
```css
/* 削除アニメーション（全ツール共通） */
.delete-animation {
    transition: all 0.3s ease;
    background-color: #ffebee;
    opacity: 0.5;
    transform: translateX(-20px);
}

/* 追加アニメーション（全ツール共通） */
.add-animation {
    transition: all 0.4s ease;
    background-color: #e8f5e8;
    opacity: 0;
    transform: translateY(-20px);
}
```

### **エラー通知仕様**
```javascript
// 軽量通知（Toast）- SaaS企業参考
showNotification({
    type: 'error',           // success/error/warning/info
    message: 'エラーメッセージ',
    position: 'top-right',   // 固定位置
    duration: 5000,          // 5秒自動消去
    clickToClose: true       // クリックで閉じる
});
```

---

## 🔗 **共通hooks作成が必要な領域**

### **1. API接続情報管理（最優先）**
```php
// 現在の課題：MF以外のAPIも統一ルールが必要
// - MFクラウドAPI
// - AI学習API（Python FastAPI）
// - その他外部API

// 共通hooks作成予定：
// - getAPIConfig($service_name)
// - validateAPIConnection($config)
// - logAPIUsage($service, $action, $result)
```

### **2. モジュール自動検出**
```javascript
// 現在：手動でKICHO_ACTIONSを定義
// 将来：modules/xxx を自動検出してhooks生成

// 共通hooks作成予定：
// - autoDetectModules()
// - generateModuleHooks($module_name)
// - validateModuleStructure($module_path)
```

### **3. data-action命名規則**
```javascript
// 現在：個別に定義
// 将来：統一命名規則 + 自動検証

// 統一ルール例：
// [action-type]-[target-noun]
// - delete-data-item（削除-データ-項目）
// - execute-mf-import（実行-MF-インポート）
// - download-rules-csv（ダウンロード-ルール-CSV）
```

### **4. データベーステーブル規約**
```sql
-- 現在：個別テーブル設計
-- 将来：全モジュール共通スキーマ

-- 共通テーブル例：
-- module_actions（アクション実行ログ）
-- module_settings（モジュール別設定）
-- api_connections（API接続管理）
-- backup_history（バックアップ履歴）
```

### **5. Ajax通信プロトコル**
```php
// 現在：KICHO用レスポンス形式
// 将来：全モジュール統一形式

// 統一レスポンス形式：
{
    "success": true,
    "message": "処理完了",
    "data": {
        "module": "kicho",
        "action": "delete-data-item",
        "result": {...},
        "ui_update": {...}
    },
    "timestamp": "2025-01-15T10:30:00Z",
    "csrf_token": "updated_token"
}
```

---

## 🚀 **次チャットでの作業内容**

### **即座実行タスク**
1. ✅ **KICHO hooks実装**（上記指示書に基づく）
2. ✅ **40個ボタン動作確認**
3. ✅ **UI更新・エラー処理テスト**
4. ✅ **MF連携・バックアップ確認**

### **並行検討タスク**
1. 🔍 **API接続情報の現状調査**
   - `.env`ファイルの場所・形式確認
   - `api_settings`テーブル存在確認
   - 他のAPI（AI学習等）の設定確認

2. 📋 **共通hooks設計**
   - API管理共通化
   - モジュール自動検出
   - 命名規則統一

---

## ⚠️ **重要な引き継ぎ事項**

### **既存システム保護**
- 既存の`common/js/pages/kicho.js`は保護
- 既存の`modules/kicho/kicho_ajax_handler.php`は基本保護
- 新機能は追加のみ、既存機能の削除・変更は禁止

### **段階的実装原則**
- Phase 1: 基本hooks作成
- Phase 2: UI制御実装
- Phase 3: エラー処理実装
- Phase 4: MF連携実装
- 各Phase完了後に動作確認必須

### **品質基準**
- 40個data-actionボタンの95%以上正常動作
- UI更新アニメーション期待通り動作
- エラー処理適切機能
- MF連携安全動作（バックアップ・承認付き）

### **開発環境対応**
- MF送信：開発環境ではログ記録のみ
- AI学習：実際のPython FastAPI連携
- バックアップ：重要操作前に自動実行

---

## 📋 **最終確認項目**

### **チャット限界前の確認**
- [x] KICHO hooks開発指示書完成
- [x] 共通ルール整理完了
- [x] 次チャット継承情報整備
- [x] API接続課題の明確化
- [x] 実装方針の確定

### **次チャット開始時に必要な情報**
1. **本指示書**（KICHO hooks開発指示書）
2. **共通ルール整理**（このドキュメント）
3. **40個data-actionボタンリスト**
4. **既存Ajax処理コード**
5. **MF API設定の現状**

**準備完了：次チャットで実装開始可能です！**