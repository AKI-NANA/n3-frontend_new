# 🎯 CAIDS統合監視システム v2.0 完全ガイド

## 📋 システム概要

CAIDS統合監視システムは、クロードの開発作業をリアルタイムで監視・可視化し、開発進捗を透明化するシステムです。

### 🎯 主要機能

1. **リアルタイム進捗監視** - 開発フェーズの進捗をリアルタイム表示
2. **Hook統計・管理** - 必須・専用・汎用Hookの自動検出・分類
3. **Claude連動システム** - クロードの作業を自動検出・フィードバック
4. **品質評価機能** - コード品質の自動評価・改善提案
5. **セッション管理** - 開発セッションの完全なトレーサビリティ

## 🗂️ ファイル構成

```
/modules/caids_monitor/
├── index.php                    # メインダッシュボード
├── claude_integration_bridge.php # Claude連動ブリッジ
├── api/
│   └── get_progress.php         # API エンドポイント
├── data/
│   └── sessions/                # セッションデータ
└── assets/                      # 静的ファイル
```

## 🚀 使用方法

### 1. 基本アクセス

```bash
# メインダッシュボード
http://localhost:8080/modules/caids_monitor/

# コンパクト表示
http://localhost:8080/modules/caids_monitor/?view=compact

# API直接アクセス
http://localhost:8080/modules/caids_monitor/api/get_progress.php
```

### 2. サイドバー統合

メインindex.phpのサイドバーに以下を追加済み：

```html
<!-- 🚀 CAIDS統合サンプル -->
<div class="sidebar-section">
    <h3>🎯 CAIDS監視システム</h3>
    <ul class="sidebar-menu">
        <li><a href="modules/caids_monitor/" target="_blank">📊 リアルタイム監視</a></li>
        <li><a href="modules/caids_monitor/?view=compact" target="_blank">📋 コンパクト表示</a></li>
    </ul>
    <!-- リアルタイム状況ウィジェット -->
</div>
```

### 3. Claude連動の仕組み

システムは以下のClaude操作を自動検出します：

- **ファイル作成** → `filesystem:write_file` 検出
- **アーティファクト生成** → コードタイプ別フェーズ判定
- **Hook実装** → 命名パターンによる自動分類
- **品質チェック** → 言語別品質評価

## 📊 監視項目

### フェーズ進捗 (6段階)

1. **必須Hook読み込み** - システム基盤となるHook群
2. **CSS統合システム** - スタイル・デザイン機能
3. **JavaScript統合** - フロントエンド機能
4. **Ajax統合** - 通信・API機能
5. **PHP Backend** - サーバーサイド機能
6. **品質保証・テスト** - 最終検証

### Hook分類

- **HISSU (必須Hook)** - システム稼働に絶対必要
- **SENYO (専用Hook)** - 特定機能・業務専用
- **HANYO (汎用Hook)** - どこでも使用可能

### 品質メトリクス

- **コード品質スコア** - 0-100点での評価
- **ベストプラクティス準拠** - 言語別品質チェック
- **セキュリティ対策** - XSS・CSRF対策状況
- **ドキュメンテーション** - コメント・文書化状況

## 🔄 API エンドポイント

### GET エンドポイント

```php
// 進捗データ取得
GET /api/get_progress.php?endpoint=progress&session_id=xxx

// Hook状況取得
GET /api/get_progress.php?endpoint=hooks_status

// セッション情報取得
GET /api/get_progress.php?endpoint=session_info

// システム状態取得
GET /api/get_progress.php
```

### POST エンドポイント

```php
// Hook進捗更新
POST /api/get_progress.php
{
    "endpoint": "update_hook",
    "hook_type": "HISSU",
    "progress": 1,
    "hook_name": "エラー処理Hook"
}

// フェーズ進捗更新
POST /api/get_progress.php
{
    "endpoint": "update_phase",
    "phase": 1,
    "status": "active",
    "progress": 75
}

// ログエントリ追加
POST /api/get_progress.php
{
    "endpoint": "add_log",
    "type": "INFO",
    "message": "作業完了"
}
```

## 🔧 設定・カスタマイズ

### Claude連動設定

```php
$integrationSettings = [
    'auto_detect_filesystem_operations' => true,
    'monitor_file_changes' => true,
    'track_artifact_creation' => true,
    'detect_hook_implementations' => true,
    'real_time_feedback' => true,
    'phase_auto_progression' => true
];
```

### 監視間隔設定

```javascript
// リアルタイム更新間隔
this.updateInterval = 5000; // 5秒間隔

// サイドバーwidget更新間隔
this.updateInterval = 3000; // 3秒間隔
```

## 📈 実装例

### 1. Claude操作検出

```php
// ファイル作成時の自動検出
detectClaudeOperation('filesystem_write', [
    'file_path' => '/path/to/file.php',
    'file_size' => 12345,
    'file_type' => 'php'
]);

// Hook実装時の自動検出
detectClaudeOperation('hook_implementation', [
    'hook_name' => 'HISSU_error_handling',
    'hook_type' => 'HISSU',
    'implementation' => $code_content
]);
```

### 2. リアルタイム更新

```javascript
// ダッシュボード自動更新
class CAIDSRealtimeMonitor {
    async checkForUpdates() {
        const response = await fetch('api/get_progress.php?session_id=xxx');
        const data = await response.json();
        this.updateUI(data);
    }
}
```

### 3. 品質チェック

```php
// 自動品質評価
$qualityCheck = performAutoQualityCheck([
    'content' => $code_content,
    'language' => 'php'
]);

// 結果: quality_score, quality_level, issues, recommendations
```

## 🎨 UI表示レベル

### レベル1: サイドバー表示

```
CAIDS監視 [●]
├ 必須Hook読み込み ✅
├ CSS統合システム 🔄 75%
└ JavaScript統合 ⏳
```

### レベル2: コンパクト表示

```
📌 Phase 2/6: CSS統合システム [進行中]
🔄 進捗: 75%完了
🪝 Hooks: 34/54読み込み済み
⏱️ 経過: 02:15 | 残り推定: 01:45
```

### レベル3: フルダッシュボード

完全なグラフィカル表示：
- 進捗バー
- リアルタイムログ
- Hook統計
- 品質メトリクス

## 🛠️ トラブルシューティング

### よくある問題

1. **API通信エラー**
   ```bash
   # 権限確認
   chmod 755 /modules/caids_monitor/
   chmod 644 /modules/caids_monitor/api/get_progress.php
   ```

2. **セッションデータ未作成**
   ```bash
   # データディレクトリ確認
   mkdir -p /modules/caids_monitor/data/sessions
   chmod 755 /modules/caids_monitor/data/sessions
   ```

3. **Hook検出失敗**
   ```php
   // Hook管理システム確認
   require_once '../../hooks/subete_hooks/CAIDSUnifiedHookManager.php';
   ```

### デバッグ方法

```php
// エラー表示有効化
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ログ確認
tail -f /modules/caids_monitor/data/sessions/session_logs.json
```

## 🚀 パフォーマンス最適化

### 自動クリーンアップ

```php
// 古いセッションデータ削除
if (count($logs) > 1000) {
    $logs = array_slice($logs, -1000);
}

// データサイズ監視
if (filesize($dataFile) > 1048576) { // 1MB
    triggerCleanup();
}
```

### キャッシュ機能

```javascript
// ブラウザキャッシュ活用
const cachedData = localStorage.getItem('caids_cache');
if (cachedData && Date.now() - cachedData.timestamp < 30000) {
    return JSON.parse(cachedData.data);
}
```

## 📝 開発ガイドライン

### 新機能追加手順

1. **API エンドポイント追加**
   ```php
   // get_progress.php に新しいendpoint追加
   case 'new_feature':
       return $this->handleNewFeature();
   ```

2. **フロントエンド更新**
   ```javascript
   // ダッシュボードに新しいUI要素追加
   updateNewFeatureDisplay(data);
   ```

3. **Claude連動機能**
   ```php
   // 新しい操作タイプに対応
   case 'new_operation':
       return $this->handleNewOperation($operationData);
   ```

### コーディング規約

- **PHP**: PSR-12準拠
- **JavaScript**: ES6+ 使用
- **CSS**: BEM命名規則
- **コメント**: 日本語で詳細記述

## 🎉 運用開始

### 1. 初回セットアップ

```bash
# 1. ファイル配置確認
ls -la /modules/caids_monitor/

# 2. 権限設定
chmod -R 755 /modules/caids_monitor/

# 3. ダッシュボードアクセス
open http://localhost:8080/modules/caids_monitor/
```

### 2. 動作確認

```javascript
// ブラウザコンソールで実行
console.log('CAIDS監視システム テスト');

// API通信テスト
fetch('/modules/caids_monitor/api/get_progress.php')
    .then(r => r.json())
    .then(data => console.log('✅ API正常:', data));
```

### 3. Claude連動テスト

```php
// テスト用Hook作成
detectClaudeOperation('hook_implementation', [
    'hook_name' => 'test_hook',
    'hook_type' => 'HISSU'
]);

// ダッシュボードでHook数増加を確認
```

---

## 📞 サポート

システムに関する質問や問題は、プロジェクトの開発チームまでお問い合わせください。

**CAIDS統合監視システム v2.0 - 透明性のある開発環境を実現** 🎯