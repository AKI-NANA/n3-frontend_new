# 🎯 KICHO記帳ツール専用hooks開発指示書【完全版】

## 📊 **対象システム概要**

### **基本情報**
- **モジュール名**: KICHO記帳ツール
- **対象ファイル**: `modules/kicho/kicho_content.php`
- **Ajax処理**: `modules/kicho/kicho_ajax_handler.php`
- **data-actionボタン数**: 40個
- **実装方式**: 設定ファイル追記方式（手動追加・完全制御）

### **hooks適用範囲**
```javascript
// 専用hooks（KICHO記帳ツール専用）
const KICHO_SPECIFIC_ACTIONS = [
    'execute-integrated-ai-learning',    // AI学習（記帳特化）
    'execute-mf-import',                 // MFクラウド連携（記帳特化）
    'bulk-approve-transactions',         // 取引承認（記帳特化）
    'download-rules-csv',                // ルール管理（記帳特化）
    'download-pending-csv',              // 承認待ちCSV（記帳特化）
    'save-uploaded-rules-as-database',   // ルール保存（記帳特化）
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

## 📁 **ファイル構造・保存場所**

### **hooks設定ファイル配置**
```
NAGANO3_PROJECT/
├── common/
│   ├── config/
│   │   ├── hooks/
│   │   │   ├── kicho_hooks.json         ← KICHO専用hooks設定
│   │   │   ├── common_hooks.json        ← 共通hooks設定（将来用）
│   │   │   └── ui_animations.json       ← UIアニメーション設定
│   │   └── modules_config.php           ← 既存のモジュール設定
│   ├── js/
│   │   ├── hooks/
│   │   │   ├── kicho_hooks_engine.js    ← KICHO hooks実行エンジン
│   │   │   ├── ui_controller.js         ← UI制御専用
│   │   │   └── error_handler.js         ← エラー処理専用
│   │   └── pages/
│   │       └── kicho.js                 ← 既存KICHO JavaScript
└── modules/kicho/
    ├── kicho_content.php                ← メインHTML（40個ボタン）
    ├── kicho_ajax_handler.php           ← Ajax処理
    └── kicho_hooks_override.json        ← KICHO個別カスタマイズ
```

### **JSON設定データ構造**
```json
// common/config/hooks/kicho_hooks.json
{
  "module_name": "kicho",
  "version": "1.0.0",
  "hooks_engine": "kicho_hooks_engine.js",
  "ui_patterns": {
    "delete_animation": {
      "duration": "300ms",
      "easing": "ease-out",
      "css_class": "kicho__delete-animation"
    },
    "add_animation": {
      "duration": "400ms", 
      "easing": "ease-in",
      "css_class": "kicho__add-animation"
    },
    "loading_animation": {
      "duration": "infinite",
      "css_class": "kicho__loading-spinner"
    }
  },
  "error_handling": {
    "notification_type": "toast",
    "position": "top-right",
    "duration": 5000,
    "retry_enabled": true
  },
  "mf_integration": {
    "backup_before_send": true,
    "approval_required": true,
    "dry_run_mode": false
  },
  "actions": {
    "delete-data-item": {
      "ui_update": "delete_animation",
      "success_message": "データを削除しました",
      "error_retry": true,
      "backup_required": true
    },
    "execute-mf-import": {
      "ui_update": "loading_animation",
      "success_message": "MFデータを取得しました",
      "backup_before": true,
      "approval_flow": true
    },
    "execute-integrated-ai-learning": {
      "ui_update": "ai_learning_complete",
      "success_message": "AI学習が完了しました",
      "clear_input": "#aiTextInput",
      "show_results": true
    }
  }
}
```

---

## 🔧 **実装手順（段階的）**

### **Phase 1: 基本hooks作成**

#### **Step 1-1: hooks設定ファイル作成**
```bash
# ディレクトリ作成
mkdir -p common/config/hooks
mkdir -p common/js/hooks

# 基本設定ファイル作成
touch common/config/hooks/kicho_hooks.json
touch common/config/hooks/ui_animations.json
```

#### **Step 1-2: hooks実行エンジン作成**
```javascript
// common/js/hooks/kicho_hooks_engine.js
class KichoHooksEngine {
    constructor() {
        this.config = null;
        this.uiController = new UIController();
        this.errorHandler = new ErrorHandler();
        this.loadConfig();
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/common/config/hooks/kicho_hooks.json');
            this.config = await response.json();
            console.log('✅ KICHO Hooks設定読み込み完了');
        } catch (error) {
            console.error('❌ KICHO Hooks設定読み込み失敗:', error);
        }
    }
    
    executeAction(actionName, target, data = {}) {
        const actionConfig = this.config?.actions?.[actionName];
        
        if (!actionConfig) {
            console.warn(`⚠️ 未定義アクション: ${actionName}`);
            return;
        }
        
        // 1. ローディング開始
        if (actionConfig.ui_update === 'loading_animation') {
            this.uiController.showLoading(target);
        }
        
        // 2. Ajax実行
        this.executeAjax(actionName, data)
            .then(result => this.handleSuccess(result, actionConfig, target))
            .catch(error => this.handleError(error, actionConfig, target));
    }
    
    async executeAjax(action, data) {
        const formData = new FormData();
        formData.append('action', action);
        formData.append('csrf_token', this.getCSRFToken());
        
        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        const response = await fetch(window.location.pathname, {
            method: 'POST',
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            body: formData
        });
        
        return await response.json();
    }
    
    handleSuccess(result, actionConfig, target) {
        // 1. ローディング終了
        this.uiController.hideLoading(target);
        
        // 2. UI更新実行
        if (actionConfig.ui_update) {
            this.uiController.executeUIUpdate(actionConfig.ui_update, result, target);
        }
        
        // 3. 成功メッセージ表示
        if (actionConfig.success_message) {
            this.uiController.showNotification(actionConfig.success_message, 'success');
        }
    }
    
    handleError(error, actionConfig, target) {
        this.uiController.hideLoading(target);
        this.errorHandler.handleError(error, actionConfig, target);
    }
    
    getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }
}
```

### **Phase 2: UI制御実装**

#### **Step 2-1: UI制御クラス作成**
```javascript
// common/js/hooks/ui_controller.js
class UIController {
    constructor() {
        this.loadingElements = new Map();
        this.animationQueue = [];
    }
    
    showLoading(target) {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return;
        
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'kicho__loading-spinner';
        loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        element.style.position = 'relative';
        element.appendChild(loadingSpinner);
        
        this.loadingElements.set(element, loadingSpinner);
    }
    
    hideLoading(target) {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) return;
        
        const spinner = this.loadingElements.get(element);
        if (spinner && spinner.parentNode) {
            spinner.parentNode.removeChild(spinner);
            this.loadingElements.delete(element);
        }
    }
    
    executeUIUpdate(updateType, result, target) {
        switch (updateType) {
            case 'delete_animation':
                this.executeDeleteAnimation(result, target);
                break;
            case 'ai_learning_complete':
                this.executeAILearningComplete(result, target);
                break;
            case 'add_animation':
                this.executeAddAnimation(result, target);
                break;
            default:
                console.warn(`⚠️ 未対応UI更新タイプ: ${updateType}`);
        }
    }
    
    executeDeleteAnimation(result, originalElement) {
        const itemId = result.data?.deleted_id;
        const targetRow = document.querySelector(`[data-item-id="${itemId}"]`);
        
        if (targetRow) {
            // 削除アニメーション実行
            targetRow.style.transition = 'all 0.3s ease';
            targetRow.style.backgroundColor = '#ffebee';
            targetRow.style.opacity = '0.5';
            targetRow.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                targetRow.style.transform = 'translateX(-100%)';
                targetRow.style.opacity = '0';
                
                setTimeout(() => {
                    if (targetRow.parentNode) {
                        targetRow.parentNode.removeChild(targetRow);
                    }
                    
                    // カウンター更新
                    this.updateCounters(-1);
                    
                    // 空状態チェック
                    this.checkEmptyState();
                    
                }, 200);
            }, 100);
        }
    }
    
    executeAILearningComplete(result, originalElement) {
        // 1. 入力フィールドクリア
        const textInput = document.querySelector('#aiTextInput');
        if (textInput) {
            textInput.value = '';
            textInput.style.borderColor = '#4caf50';
            setTimeout(() => textInput.style.borderColor = '', 2000);
        }
        
        // 2. AI結果表示
        this.displayAIResults(result.data);
        
        // 3. AI履歴更新
        this.updateAIHistory(result.data);
    }
    
    displayAIResults(aiData) {
        let resultsContainer = document.getElementById('ai-learning-results');
        
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'ai-learning-results';
            resultsContainer.className = 'ai-learning-results';
            
            const aiSection = document.querySelector('#aiTextInput').closest('.kicho__card');
            if (aiSection) {
                aiSection.appendChild(resultsContainer);
            }
        }
        
        const resultHTML = `
            <div class="ai-result-header">
                <h4>🤖 AI学習完了: ${aiData.session_id}</h4>
                <div class="ai-metrics">
                    <span><strong>精度:</strong> ${(aiData.accuracy * 100).toFixed(1)}%</span>
                    <span><strong>信頼度:</strong> ${(aiData.confidence * 100).toFixed(1)}%</span>
                </div>
            </div>
            <div class="ai-visualization">
                ${aiData.visualization || ''}
            </div>
        `;
        
        resultsContainer.innerHTML = resultHTML;
        resultsContainer.style.opacity = '0';
        resultsContainer.style.transform = 'translateY(-20px)';
        
        requestAnimationFrame(() => {
            resultsContainer.style.transition = 'all 0.5s ease';
            resultsContainer.style.opacity = '1';
            resultsContainer.style.transform = 'translateY(0)';
        });
    }
    
    updateCounters(delta) {
        const counters = document.querySelectorAll('[data-counter]');
        counters.forEach(counter => {
            const current = parseInt(counter.textContent) || 0;
            const newCount = Math.max(0, current + delta);
            
            // カウンター更新アニメーション
            counter.style.transform = 'scale(1.2)';
            counter.style.color = delta > 0 ? '#4caf50' : '#f44336';
            
            setTimeout(() => {
                counter.textContent = newCount;
                counter.style.transform = 'scale(1)';
                counter.style.color = '';
            }, 150);
        });
    }
    
    checkEmptyState() {
        const containers = document.querySelectorAll('[data-container]');
        containers.forEach(container => {
            const items = container.querySelectorAll('[data-item-id]');
            let emptyMessage = container.querySelector('.empty-state');
            
            if (items.length === 0) {
                if (!emptyMessage) {
                    emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-state';
                    emptyMessage.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                            <p>データがありません</p>
                        </div>
                    `;
                    container.appendChild(emptyMessage);
                }
            } else {
                if (emptyMessage) {
                    emptyMessage.remove();
                }
            }
        });
    }
    
    showNotification(message, type = 'info', duration = 5000) {
        // 軽量通知（Toast）の実装
        let container = document.getElementById('kicho-notifications');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'kicho-notifications';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        const notification = document.createElement('div');
        notification.className = `kicho__notification kicho__notification--${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button style="background: none; border: none; color: white; cursor: pointer; margin-left: 8px;">×</button>
            </div>
        `;
        
        container.appendChild(notification);
        
        // 表示アニメーション
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // 自動削除
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification(notification);
            }, duration);
        }
        
        // クリックで閉じる
        notification.addEventListener('click', () => {
            this.hideNotification(notification);
        });
    }
    
    hideNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    getNotificationColor(type) {
        const colors = {
            'success': '#4caf50',
            'error': '#f44336',
            'warning': '#ff9800', 
            'info': '#2196f3'
        };
        return colors[type] || colors.info;
    }
}
```

### **Phase 3: エラー処理実装**

#### **Step 3-1: エラーハンドラー作成**
```javascript
// common/js/hooks/error_handler.js
class ErrorHandler {
    constructor() {
        this.retryAttempts = new Map();
        this.maxRetries = 3;
    }
    
    handleError(error, actionConfig, target) {
        console.error('❌ KICHO Hooks エラー:', error);
        
        // エラー分類
        const errorType = this.classifyError(error);
        
        // エラータイプ別処理
        switch (errorType) {
            case 'network':
                this.handleNetworkError(error, actionConfig, target);
                break;
            case 'database':
                this.handleDatabaseError(error, actionConfig, target);
                break;
            case 'validation':
                this.handleValidationError(error, actionConfig, target);
                break;
            case 'permission':
                this.handlePermissionError(error, actionConfig, target);
                break;
            default:
                this.handleGenericError(error, actionConfig, target);
        }
    }
    
    classifyError(error) {
        const message = error.message || '';
        
        if (message.includes('ネットワーク') || message.includes('通信')) {
            return 'network';
        } else if (message.includes('データベース') || message.includes('SQL')) {
            return 'database';
        } else if (message.includes('バリデーション') || message.includes('入力')) {
            return 'validation';
        } else if (message.includes('権限') || message.includes('403')) {
            return 'permission';
        }
        
        return 'generic';
    }
    
    handleNetworkError(error, actionConfig, target) {
        const ui = new UIController();
        
        // リトライ可能な場合
        if (actionConfig.error_retry && this.canRetry(target)) {
            ui.showNotification(
                'ネットワークエラーが発生しました。再試行しています...', 
                'warning'
            );
            
            setTimeout(() => {
                this.retryAction(target, actionConfig);
            }, 2000);
        } else {
            ui.showNotification(
                'ネットワークエラーが発生しました。しばらく後に再試行してください。',
                'error'
            );
        }
    }
    
    handleDatabaseError(error, actionConfig, target) {
        const ui = new UIController();
        ui.showNotification(
            'データベースエラーが発生しました。管理者にお問い合わせください。',
            'error'
        );
    }
    
    handleValidationError(error, actionConfig, target) {
        const ui = new UIController();
        ui.showNotification(
            error.message || '入力内容に問題があります。確認してください。',
            'warning'
        );
    }
    
    handlePermissionError(error, actionConfig, target) {
        const ui = new UIController();
        ui.showNotification(
            'この操作を実行する権限がありません。',
            'error'
        );
    }
    
    handleGenericError(error, actionConfig, target) {
        const ui = new UIController();
        ui.showNotification(
            error.message || '予期しないエラーが発生しました。',
            'error'
        );
    }
    
    canRetry(target) {
        const currentAttempts = this.retryAttempts.get(target) || 0;
        return currentAttempts < this.maxRetries;
    }
    
    retryAction(target, actionConfig) {
        const currentAttempts = this.retryAttempts.get(target) || 0;
        this.retryAttempts.set(target, currentAttempts + 1);
        
        // 元のアクションを再実行
        const action = target.getAttribute('data-action');
        if (action) {
            window.KICHO_HOOKS_ENGINE?.executeAction(action, target);
        }
    }
}
```

### **Phase 4: MF連携実装**

#### **Step 4-1: MF連携設定**
```php
// modules/kicho/kicho_mf_integration.php
<?php
/**
 * MFクラウド連携設定・API接続情報取得
 */

class KichoMFIntegration {
    
    /**
     * MF API接続情報を取得
     * 優先順: .env隠しファイル → データベース → 設定ファイル
     */
    public static function getMFConfig() {
        // 1. 環境変数から取得（隠しファイル）
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $envVars = parse_ini_file($envFile);
            if (isset($envVars['MF_API_KEY']) && isset($envVars['MF_CLIENT_ID'])) {
                return [
                    'api_key' => $envVars['MF_API_KEY'],
                    'client_id' => $envVars['MF_CLIENT_ID'],
                    'client_secret' => $envVars['MF_CLIENT_SECRET'] ?? '',
                    'environment' => $envVars['ENVIRONMENT'] ?? 'production',
                    'source' => 'env_file'
                ];
            }
        }
        
        // 2. データベースから取得
        try {
            $pdo = getKichoDatabase();
            $stmt = $pdo->prepare("SELECT * FROM api_settings WHERE service = 'mf_cloud' AND active = 1 LIMIT 1");
            $stmt->execute();
            $dbConfig = $stmt->fetch();
            
            if ($dbConfig) {
                return [
                    'api_key' => $dbConfig['api_key'],
                    'client_id' => $dbConfig['client_id'],
                    'client_secret' => $dbConfig['client_secret'] ?? '',
                    'environment' => $dbConfig['environment'] ?? 'production',
                    'source' => 'database'
                ];
            }
        } catch (Exception $e) {
            error_log('MF設定データベース取得失敗: ' . $e->getMessage());
        }
        
        // 3. 設定ファイルから取得（フォールバック）
        $configFile = __DIR__ . '/../../common/config/mf_config.php';
        if (file_exists($configFile)) {
            $fileConfig = include $configFile;
            return [
                'api_key' => $fileConfig['api_key'] ?? '',
                'client_id' => $fileConfig['client_id'] ?? '',
                'client_secret' => $fileConfig['client_secret'] ?? '',
                'environment' => $fileConfig['environment'] ?? 'production',
                'source' => 'config_file'
            ];
        }
        
        throw new Exception('MF API設定が見つかりません');
    }
    
    /**
     * MF送信前バックアップ実行
     */
    public static function createBackupBeforeMFSend($data) {
        $backupData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'data_type' => 'mf_send_backup',
            'data' => $data,
            'user_id' => $_SESSION['user_id'] ?? 'system'
        ];
        
        $backupFile = __DIR__ . '/../../data/backups/mf_backup_' . date('Ymd_His') . '.json';
        
        // バックアップディレクトリ作成
        $backupDir = dirname($backupFile);
        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0755, true);
        }
        
        file_put_contents($backupFile, json_encode($backupData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        return $backupFile;
    }
    
    /**
     * MF送信実行（承認フロー付き）
     */
    public static function executeMFSend($data, $requireApproval = true) {
        // 1. バックアップ作成
        $backupFile = self::createBackupBeforeMFSend($data);
        
        // 2. 承認フロー（設定で有効な場合）
        if ($requireApproval) {
            // 承認待ち状態をデータベースに記録
            $pdo = getKichoDatabase();
            $stmt = $pdo->prepare("INSERT INTO mf_send_approvals (data, backup_file, status, created_at) VALUES (?, ?, 'pending', NOW())");
            $stmt->execute([json_encode($data), $backupFile]);
            
            return [
                'status' => 'approval_required',
                'message' => 'MF送信の承認待ちです。管理者の承認後に送信されます。',
                'approval_id' => $pdo->lastInsertId(),
                'backup_file' => $backupFile
            ];
        }
        
        // 3. 実際のMF送信実行
        return self::sendToMFCloud($data);
    }
    
    /**
     * MFクラウドへの実際の送信
     */
    private static function sendToMFCloud($data) {
        $config = self::getMFConfig();
        
        // 開発環境チェック
        if ($config['environment'] === 'development') {
            // 開発環境：ログ記録のみ
            error_log('MF送信（開発環境）: ' . json_encode($data));
            return [
                'status' => 'development_mode',
                'message' => '開発環境のため、実際の送信は行われませんでした。',
                'logged_data' => $data
            ];
        }
        
        // 実際のMF API送信処理
        $mfApiUrl = 'https://api.moneyforward.com/v1/journals';
        
        $headers = [
            'Authorization: Bearer ' . $config['api_key'],
            'Content-Type: application/json'
        ];
        
        $options = [
            'http' => [
                'header' => implode("\r\n", $headers),
                'method' => 'POST',
                'content' => json_encode($data)
            ]
        ];
        
        $context = stream_context_create($options);
        $response = file_get_contents($mfApiUrl, false, $context);
        
        if ($response === FALSE) {
            throw new Exception('MFクラウドとの通信に失敗しました');
        }
        
        $result = json_decode($response, true);
        
        return [
            'status' => 'success',
            'message' => 'MFクラウドに正常に送信されました。',
            'mf_response' => $result
        ];
    }
}
?>
```

---

## 🧪 **動作確認・テスト手順**

### **テスト環境準備**
```bash
# 1. テスト用ディレクトリ作成
mkdir -p test/kicho_hooks

# 2. テスト実行スクリプト作成
cat > test/kicho_hooks/run_tests.js << 'EOF'
/**
 * KICHO Hooks動作確認テスト
 */
console.log('🧪 KICHO Hooks テスト開始');

// 基本機能テスト
testBasicHooksEngine();
testUIController();
testErrorHandler();
testMFIntegration();

console.log('✅ KICHO Hooks テスト完了');
EOF
```

### **各ボタン動作テスト**
```javascript
// テスト対象40個ボタンの動作確認
const KICHO_TEST_ACTIONS = [
    // システム基本機能
    'refresh-all',
    'toggle-auto-refresh', 
    'health-check',
    
    // データ取り込み機能
    'execute-mf-import',
    'process-csv-upload',
    'add-text-to-learning',
    
    // データ操作機能
    'delete-data-item',
    'select-all-imported-data',
    'select-by-source',
    
    // AI学習機能
    'execute-integrated-ai-learning',
    
    // ルール管理機能
    'download-rules-csv',
    'save-uploaded-rules-as-database',
    
    // 承認・取引管理
    'bulk-approve-transactions',
    'download-pending-csv',
    
    // エクスポート・送信
    'export-to-mf',
    'execute-full-backup'
];

// 各アクションの動作テスト
KICHO_TEST_ACTIONS.forEach(action => {
    console.log(`🧪 テスト実行: ${action}`);
    
    // 1. ボタン要素取得
    const button = document.querySelector(`[data-action="${action}"]`);
    
    if (!button) {
        console.warn(`⚠️ ボタンが見つかりません: ${action}`);
        return;
    }
    
    // 2. hooks実行テスト
    try {
        window.KICHO_HOOKS_ENGINE?.executeAction(action, button, {test: true});
        console.log(`✅ ${action} - hooks実行成功`);
    } catch (error) {
        console.error(`❌ ${action} - hooks実行失敗:`, error);
    }
});
```

---

## 🔗 **統合・初期化**

### **メインエントリーポイント**
```javascript
// common/js/pages/kicho.js（既存ファイルに追加）

// KICHO Hooks Engine の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 KICHO Hooks システム初期化開始');
    
    // Hooks Engine初期化
    window.KICHO_HOOKS_ENGINE = new KichoHooksEngine();
    
    // 全data-actionボタンにイベントリスナー設定
    document.addEventListener('click', function(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        
        // KICHO専用アクション判定
        if (KICHO_ACTIONS.includes(action)) {
            event.stopImmediatePropagation();
            event.preventDefault();
            
            // データ抽出
            const data = extractDataFromTarget(target);
            
            // Hooks実行
            window.KICHO_HOOKS_ENGINE.executeAction(action, target, data);
            
            return false;
        }
    }, true);
    
    console.log('✅ KICHO Hooks システム初期化完了');
});

// data-action → PHP用データ変換
function extractDataFromTarget(target) {
    const data = {};
    
    Object.entries(target.dataset).forEach(([key, value]) => {
        if (key !== 'action') {
            const phpKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            data[phpKey] = value;
        }
    });
    
    return data;
}

// KICHO専用アクション一覧
const KICHO_ACTIONS = [
    'refresh-all', 'toggle-auto-refresh', 'health-check',
    'execute-mf-import', 'process-csv-upload', 'add-text-to-learning',
    'show-import-history', 'show-mf-history', 'execute-mf-recovery',
    'show-duplicate-history', 'show-ai-learning-history', 'show-optimization-suggestions',
    'select-all-imported-data', 'select-by-date-range', 'select-by-source',
    'delete-selected-data', 'delete-data-item',
    'execute-integrated-ai-learning',
    'download-rules-csv', 'create-new-rule', 'download-all-rules-csv',
    'rules-csv-upload', 'save-uploaded-rules-as-database',
    'edit-saved-rule', 'delete-saved-rule',
    'download-pending-csv', 'download-pending-transactions-csv',
    'approval-csv-upload', 'bulk-approve-transactions',
    'view-transaction-details', 'delete-approved-transaction',
    'refresh-ai-history', 'load-more-sessions',
    'execute-full-backup', 'export-to-mf', 'create-manual-backup',
    'generate-advanced-report', 'get_statistics', 'get-ai-status', 'get-ai-history'
];
```

---

## 📋 **実装チェックリスト**

### **Phase 1完了確認**
- [ ] `common/config/hooks/kicho_hooks.json` 作成
- [ ] `common/config/hooks/ui_animations.json` 作成  
- [ ] `common/js/hooks/kicho_hooks_engine.js` 作成
- [ ] 基本設定読み込み動作確認

### **Phase 2完了確認**
- [ ] `common/js/hooks/ui_controller.js` 作成
- [ ] 削除アニメーション動作確認
- [ ] AI学習結果表示動作確認
- [ ] 通知システム動作確認

### **Phase 3完了確認**
- [ ] `common/js/hooks/error_handler.js` 作成
- [ ] エラー分類システム動作確認
- [ ] リトライ機能動作確認
- [ ] エラー通知表示確認

### **Phase 4完了確認**
- [ ] `modules/kicho/kicho_mf_integration.php` 作成
- [ ] MF API設定取得動作確認
- [ ] バックアップ自動生成確認
- [ ] 承認フロー動作確認

### **統合テスト確認**
- [ ] 40個data-actionボタン全動作確認
- [ ] UI更新・アニメーション確認
- [ ] エラー処理・復旧確認
- [ ] MF連携・バックアップ確認

---

## 🚀 **次のステップ**

### **本指示書完成後の作業**
1. **新しいチャットで実装実行**
2. **動作確認・デバッグ**
3. **共通hooks抽出作業**
4. **他モジュール展開準備**

### **成功基準**
- 40個data-actionボタンの95%以上が正常動作
- UI更新・アニメーションが期待通り動作
- エラー処理が適切に機能
- MF連携が安全に動作（バックアップ・承認付き）

**この指示書に基づいて、実用的で安全なKICHO記帳ツール専用hooksシステムを構築してください。**