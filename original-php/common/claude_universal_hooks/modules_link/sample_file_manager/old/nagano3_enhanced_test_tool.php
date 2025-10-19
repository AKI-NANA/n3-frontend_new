<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NAGANO-3 統合テストツール - CAIDS完全稼働版</title>
    
    <!-- 🔸 🛡️ CSRF Token -->
    <meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['csrf_token'] ?? '') ?>">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    
    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        color: #333;
    }
    
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .header {
        text-align: center;
        color: white;
        margin-bottom: 30px;
    }
    
    .header h1 {
        font-size: 2.5rem;
        margin-bottom: 10px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .header .subtitle {
        font-size: 1.2rem;
        opacity: 0.9;
    }
    
    .status-bar {
        background: rgba(255,255,255,0.1);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 30px;
        backdrop-filter: blur(10px);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
    }
    
    .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .status-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4CAF50;
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    .test-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
    }
    
    .test-category {
        background: white;
        border-radius: 15px;
        padding: 25px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        border: 2px solid transparent;
    }
    
    .test-category:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        border-color: #667eea;
    }
    
    .category-header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        gap: 15px;
    }
    
    .category-icon {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: white;
    }
    
    .category-icon.ui-ux { background: linear-gradient(45deg, #FF6B6B, #FF8E85); }
    .category-icon.api { background: linear-gradient(45deg, #4ECDC4, #44A08D); }
    .category-icon.data { background: linear-gradient(45deg, #45B7D1, #96C93D); }
    .category-icon.file { background: linear-gradient(45deg, #F093FB, #F5576C); }
    .category-icon.backend { background: linear-gradient(45deg, #4FACFE, #00F2FE); }
    .category-icon.system { background: linear-gradient(45deg, #43E97B, #38F9D7); }
    
    .category-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: #2c3e50;
    }
    
    .category-subtitle {
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-top: 5px;
    }
    
    .test-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
    }
    
    .test-btn {
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.85rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .test-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    .test-btn:active {
        transform: scale(0.95);
    }
    
    .run-all-btn {
        width: 100%;
        background: linear-gradient(45deg, #56ab2f, #a8e6cf);
        color: white;
        border: none;
        padding: 12px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }
    
    .run-all-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(86, 171, 47, 0.3);
    }
    
    .results-panel {
        background: white;
        border-radius: 15px;
        padding: 25px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        margin-top: 30px;
        display: none;
    }
    
    .results-panel.active {
        display: block;
        animation: fadeInUp 0.5s ease;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .result-item {
        padding: 15px;
        margin: 10px 0;
        border-radius: 10px;
        border-left: 4px solid;
        background: #f8f9fa;
    }
    
    .result-item.success {
        border-left-color: #28a745;
        background: #d4edda;
    }
    
    .result-item.error {
        border-left-color: #dc3545;
        background: #f8d7da;
    }
    
    .result-item.warning {
        border-left-color: #ffc107;
        background: #fff3cd;
    }
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .loading-spinner {
        background: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .file-upload-area {
        border: 2px dashed #ddd;
        border-radius: 10px;
        padding: 30px;
        text-align: center;
        margin: 20px 0;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .file-upload-area:hover {
        border-color: #667eea;
        background: #f8f9ff;
    }
    
    .file-upload-area.drag-over {
        border-color: #28a745;
        background: #f0fff4;
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        border-left: 4px solid;
        z-index: 1001;
        transform: translateX(400px);
        transition: all 0.3s ease;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success { border-left-color: #28a745; }
    .notification.error { border-left-color: #dc3545; }
    .notification.warning { border-left-color: #ffc107; }
    
    @media (max-width: 768px) {
        .test-grid {
            grid-template-columns: 1fr;
        }
        
        .status-bar {
            flex-direction: column;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2rem;
        }
    }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-rocket"></i> NAGANO-3 統合テストツール</h1>
            <div class="subtitle">CAIDS完全稼働版 v3.0.0 - 全28機能統合テスト</div>
        </div>
        
        <!-- ステータスバー -->
        <div class="status-bar">
            <div class="status-item">
                <div class="status-indicator"></div>
                <span><i class="fas fa-microchip"></i> CAIDSシステム: 稼働中</span>
            </div>
            <div class="status-item">
                <i class="fas fa-shield-alt"></i>
                <span>セキュリティ: 有効</span>
            </div>
            <div class="status-item">
                <i class="fas fa-database"></i>
                <span>データベース: 接続済み</span>
            </div>
            <div class="status-item">
                <i class="fas fa-plug"></i>
                <span>Hooks: 13個読み込み済み</span>
            </div>
            <div class="status-item">
                <i class="fas fa-clock"></i>
                <span id="currentTime"></span>
            </div>
        </div>
        
        <!-- テストカテゴリグリッド -->
        <div class="test-grid">
            <!-- UI/UXテスト -->
            <div class="test-category" data-category="ui_ux_tests">
                <div class="category-header">
                    <div class="category-icon ui-ux">
                        <i class="fas fa-paint-brush"></i>
                    </div>
                    <div>
                        <div class="category-title">UI/UXテスト</div>
                        <div class="category-subtitle">ユーザーインターフェース・体験テスト</div>
                    </div>
                </div>
                <div class="test-buttons">
                    <button class="test-btn" data-action="test_button_click">
                        <i class="fas fa-mouse-pointer"></i> ボタンクリック
                    </button>
                    <button class="test-btn" data-action="test_form_validation">
                        <i class="fas fa-check-circle"></i> フォーム検証
                    </button>
                    <button class="test-btn" data-action="test_modal_display">
                        <i class="fas fa-window-restore"></i> モーダル表示
                    </button>
                    <button class="test-btn" data-action="test_drag_drop">
                        <i class="fas fa-hand-rock"></i> ドラッグ&ドロップ
                    </button>
                    <button class="test-btn" data-action="test_keyboard_nav">
                        <i class="fas fa-keyboard"></i> キーボード操作
                    </button>
                </div>
                <button class="run-all-btn" data-category="ui_ux_tests">
                    <i class="fas fa-play"></i> UI/UXテスト実行
                </button>
            </div>
            
            <!-- API連携テスト -->
            <div class="test-category" data-category="api_tests">
                <div class="category-header">
                    <div class="category-icon api">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <div>
                        <div class="category-title">API連携テスト</div>
                        <div class="category-subtitle">外部API・認証・通信テスト</div>
                    </div>
                </div>
                <div class="test-buttons">
                    <button class="test-btn" data-action="test_external_api">
                        <i class="fas fa-globe"></i> 外部API接続
                    </button>
                    <button class="test-btn" data-action="check_api_key">
                        <i class="fas fa-key"></i> APIキー検証
                    </button>
                    <button class="test-btn" data-action="test_auth_flow">
                        <i class="fas fa-user-shield"></i> 認証フロー
                    </button>
                    <button class="test-btn" data-action="test_rate_limiting">
                        <i class="fas fa-tachometer-alt"></i> レート制限
                    </button>
                    <button class="test-btn" data-action="test_api_error_handling">
                        <i class="fas fa-exclamation-triangle"></i> エラー処理
                    </button>
                </div>
                <button class="run-all-btn" data-category="api_tests">
                    <i class="fas fa-play"></i> API連携テスト実行
                </button>
            </div>
            
            <!-- データ操作テスト -->
            <div class="test-category" data-category="data_tests">
                <div class="category-header">
                    <div class="category-icon data">
                        <i class="fas fa-database"></i>
                    </div>
                    <div>
                        <div class="category-title">データ操作テスト</div>
                        <div class="category-subtitle">CRUD操作・データ整合性テスト</div>
                    </div>
                </div>
                <div class="test-buttons">
                    <button class="test-btn" data-action="test_data_create">
                        <i class="fas fa-plus"></i> データ作成
                    </button>
                    <button class="test-btn" data-action="test_data_read">
                        <i class="fas fa-eye"></i> データ読み込み
                    </button>
                    <button class="test-btn" data-action="test_data_update">
                        <i class="fas fa-edit"></i> データ更新
                    </button>
                    <button class="test-btn" data-action="test_data_delete">
                        <i class="fas fa-trash"></i> データ削除
                    </button>
                    <button class="test-btn" data-action="test_data_validation">
                        <i class="fas fa-check-double"></i> データ検証
                    </button>
                </div>
                <button class="run-all-btn" data-category="data_tests">
                    <i class="fas fa-play"></i> データテスト実行
                </button>
            </div>
            
            <!-- ファイル操作テスト -->
            <div class="test-category" data-category="file_tests">
                <div class="category-header">
                    <div class="category-icon file">
                        <i class="fas fa-file-upload"></i>
                    </div>
                    <div>
                        <div class="category-title">ファイル操作テスト</div>
                        <div class="category-subtitle">アップロード・ダウンロード・セキュリティ</div>
                    </div>
                </div>
                <div class="test-buttons">
                    <button class="test-btn" data-action="test_file_upload">
                        <i class="fas fa-upload"></i> ファイルアップロード
                    </button>
                    <button class="test-btn" data-action="test_file_download">
                        <i class="fas fa-download"></i> ファイルダウンロード
                    </button>
                    <button class="test-btn" data-action="test_file_validation">
                        <i class="fas fa-file-contract"></i> ファイル検証
                    </button>
                    <button class="test-btn" data-action="test_large_file">
                        <i class="fas fa-file-archive"></i> 大容量ファイル
                    </button>
                    <button class="test-btn" data-action="test_file_security">
                        <i class="fas fa-lock"></i> ファイルセキュリティ
                    </button>
                </div>
                
                <!-- ファイルアップロードエリア -->
                <div class="file-upload-area" id="fileUploadArea">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #667eea; margin-bottom: 10px;"></i>
                    <div>ファイルをドラッグ&ドロップ または クリックして選択</div>
                    <input type="file" id="fileInput" style="display: none;" multiple>
                </div>
                
                <button class="run-all-btn" data-category="file_tests">
                    <i class="fas fa-play"></i> ファイルテスト実行
                </button>
            </div>
            
            <!-- バックエンド連携テスト -->
            <div class="test-category" data-category="backend_tests">
                <div class="category-header">
                    <div class="category-icon backend">
                        <i class="fas fa-server"></i>
                    </div>
                    <div>
                        <div class="category-title">バックエンド連携テスト</div>
                        <div class="category-subtitle">セッション・クッキー・データベース</div>
                    </div>
                </div>
                <div class="test-buttons">
                    <button class="test-btn" data-action="set_session_var">
                        <i class="fas fa-user-clock"></i> セッション設定
                    </button>
                    <button class="test-btn" data-action="get_session_var">
                        <i class="fas fa-user-check"></i> セッション取得
                    </button>
                    <button class="test-btn" data-action="set_cookie_test">
                        <i class="fas fa-cookie-bite"></i> クッキー設定
                    </button>
                    <button class="test-btn" data-action="database_connection_test">
                        <i class="fas fa-database"></i> DB接続テスト
                    </button>
                    <button class="test-btn" data-action="test_caching">
                        <i class="fas fa-memory"></i> キャッシュテスト
                    </button>
                </div>
                <button class="run-all-btn" data-category="backend_tests">
                    <i class="fas fa-play"></i> バックエンドテスト実行
                </button>
            </div>
            
            <!-- システム管理テスト -->
            <div class="test-category" data-category="system_tests">
                <div class="category-header">
                    <div class="category-icon system">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <div>
                        <div class="category-title">システム管理テスト</div>
                        <div class="category-subtitle">ヘルスチェック・パフォーマンス・セキュリティ</div>
                    </div>
                </div>
                <div class="test-buttons">
                    <button class="test-btn" data-action="system_health_check">
                        <i class="fas fa-heartbeat"></i> ヘルスチェック
                    </button>
                    <button class="test-btn" data-action="test_memory_usage">
                        <i class="fas fa-chart-line"></i> メモリ使用量
                    </button>
                    <button class="test-btn" data-action="test_security_measures">
                        <i class="fas fa-shield-alt"></i> セキュリティ検査
                    </button>
                    <button class="test-btn" data-action="test_error_recovery">
                        <i class="fas fa-first-aid"></i> エラー回復
                    </button>
                    <button class="test-btn" data-action="clear_all_data">
                        <i class="fas fa-trash-alt"></i> データクリア
                    </button>
                </div>
                <button class="run-all-btn" data-category="system_tests">
                    <i class="fas fa-play"></i> システムテスト実行
                </button>
            </div>
        </div>
        
        <!-- 全テスト実行ボタン -->
        <div style="text-align: center; margin: 30px 0;">
            <button class="run-all-btn" id="runAllTests" style="max-width: 400px; font-size: 1.2rem; padding: 15px;">
                <i class="fas fa-rocket"></i> 全テスト実行 (28機能)
            </button>
        </div>
        
        <!-- 結果表示パネル -->
        <div class="results-panel" id="resultsPanel">
            <h3><i class="fas fa-chart-bar"></i> テスト結果</h3>
            <div id="resultsContent"></div>
        </div>
    </div>
    
    <!-- ローディングオーバーレイ -->
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-spinner">
            <div class="spinner"></div>
            <div>テスト実行中...</div>
        </div>
    </div>
    
    <!-- 通知エリア -->
    <div id="notificationArea"></div>

    <script>
    // 🔸 🔄 Ajax統合_h - CAIDS JavaScript統合システム
    class CAIDSTestController {
        constructor() {
            this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
            this.apiUrl = window.location.pathname + window.location.search;
            this.testResults = [];
            
            this.initializeEventListeners();
            this.updateCurrentTime();
            this.showNotification('CAIDSシステム稼働開始', 'success');
        }
        
        // 🔸 ⚡ イベントリスナー初期化
        initializeEventListeners() {
            // 個別テストボタン
            document.querySelectorAll('.test-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.closest('.test-btn').dataset.action;
                    this.executeTest(action);
                });
            });
            
            // カテゴリ別実行ボタン
            document.querySelectorAll('.run-all-btn[data-category]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const category = e.target.closest('.run-all-btn').dataset.category;
                    this.executeCategoryTests(category);
                });
            });
            
            // 全テスト実行ボタン
            document.getElementById('runAllTests').addEventListener('click', () => {
                this.executeAllTests();
            });
            
            // ファイルアップロード
            this.initializeFileUpload();
        }
        
        // 🔸 🔄 Ajax統合_h - 統合Ajax実行
        async executeAjax(action, data = {}) {
            try {
                const formData = new FormData();
                formData.append('action', action);
                formData.append('csrf_token', this.csrfToken);
                
                Object.entries(data).forEach(([key, value]) => {
                    formData.append(key, value);
                });
                
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                // 🔸 🛡️ CSRF Token更新
                if (result.meta && result.meta.csrf_token) {
                    this.csrfToken = result.meta.csrf_token;
                    const metaTag = document.querySelector('meta[name="csrf-token"]');
                    if (metaTag) metaTag.content = result.meta.csrf_token;
                }
                
                return result;
                
            } catch (error) {
                console.error('Ajax Error:', error);
                throw error;
            }
        }
        
        // 🧪 個別テスト実行
        async executeTest(action) {
            this.showLoading(true);
            
            try {
                const result = await this.executeAjax(action);
                
                if (result.success) {
                    this.showNotification(`${action} テスト成功`, 'success');
                    this.displayTestResult(result);
                } else {
                    this.showNotification(`${action} テスト失敗: ${result.error}`, 'error');
                }
                
            } catch (error) {
                this.showNotification(`${action} 実行エラー: ${error.message}`, 'error');
            } finally {
                this.showLoading(false);
            }
        }
        
        // 🧪 カテゴリ別テスト実行
        async executeCategoryTests(category) {
            this.showLoading(true);
            
            try {
                const result = await this.executeAjax('execute_category_tests', { category });
                
                if (result.success) {
                    const data = result.data;
                    this.showNotification(`${data.category} 完了: ${data.passed_tests}/${data.total_tests} 成功`, 'success');
                    this.displayCategoryResult(data);
                } else {
                    this.showNotification(`${category} テスト失敗: ${result.error}`, 'error');
                }
                
            } catch (error) {
                this.showNotification(`${category} 実行エラー: ${error.message}`, 'error');
            } finally {
                this.showLoading(false);
            }
        }
        
        // 🚀 全テスト実行
        async executeAllTests() {
            this.showLoading(true);
            
            const categories = [
                'ui_ux_tests',
                'api_tests', 
                'data_tests',
                'file_tests',
                'backend_tests',
                'system_tests'
            ];
            
            let totalTests = 0;
            let passedTests = 0;
            const results = [];
            
            try {
                for (const category of categories) {
                    const result = await this.executeAjax('execute_category_tests', { category });
                    
                    if (result.success) {
                        const data = result.data;
                        totalTests += data.total_tests;
                        passedTests += data.passed_tests;
                        results.push(data);
                    }
                }
                
                this.showNotification(`全テスト完了: ${passedTests}/${totalTests} 成功`, 'success');
                this.displayAllTestResults(results);
                
            } catch (error) {
                this.showNotification(`全テスト実行エラー: ${error.message}`, 'error');
            } finally {
                this.showLoading(false);
            }
        }
        
        // 📁 ファイルアップロード初期化
        initializeFileUpload() {
            const uploadArea = document.getElementById('fileUploadArea');
            const fileInput = document.getElementById('fileInput');
            
            uploadArea.addEventListener('click', () => fileInput.click());
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                this.handleFileUpload(e.dataTransfer.files);
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
            });
        }
        
        // 📁 ファイルアップロード処理
        async handleFileUpload(files) {
            for (const file of files) {
                try {
                    const formData = new FormData();
                    formData.append('action', 'test_file_upload');
                    formData.append('csrf_token', this.csrfToken);
                    formData.append('test_file', file);
                    
                    const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showNotification(`${file.name} アップロード成功`, 'success');
                    } else {
                        this.showNotification(`${file.name} アップロード失敗: ${result.error}`, 'error');
                    }
                    
                } catch (error) {
                    this.showNotification(`${file.name} アップロードエラー: ${error.message}`, 'error');
                }
            }
        }
        
        // 📊 テスト結果表示
        displayTestResult(result) {
            const panel = document.getElementById('resultsPanel');
            const content = document.getElementById('resultsContent');
            
            const resultHtml = `
                <div class="result-item ${result.success ? 'success' : 'error'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>${result.data.test_name || 'テスト'}</strong>
                        <span>${result.success ? '✅ 成功' : '❌ 失敗'}</span>
                    </div>
                    <div>${result.data.message}</div>
                    ${result.data.details ? `<div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                        ${JSON.stringify(result.data.details, null, 2)}
                    </div>` : ''}
                </div>
            `;
            
            content.innerHTML = resultHtml + content.innerHTML;
            panel.classList.add('active');
        }
        
        // 📊 カテゴリ結果表示
        displayCategoryResult(data) {
            const panel = document.getElementById('resultsPanel');
            const content = document.getElementById('resultsContent');
            
            const successRate = ((data.passed_tests / data.total_tests) * 100).toFixed(1);
            
            const resultHtml = `
                <div class="result-item ${data.passed_tests === data.total_tests ? 'success' : 'warning'}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>${data.category}</strong>
                        <span>${data.passed_tests}/${data.total_tests} (${successRate}%)</span>
                    </div>
                    <div>テストカテゴリ実行完了</div>
                </div>
            `;
            
            content.innerHTML = resultHtml + content.innerHTML;
            panel.classList.add('active');
        }
        
        // 📊 全テスト結果表示
        displayAllTestResults(results) {
            const panel = document.getElementById('resultsPanel');
            const content = document.getElementById('resultsContent');
            
            const totalTests = results.reduce((sum, r) => sum + r.total_tests, 0);
            const passedTests = results.reduce((sum, r) => sum + r.passed_tests, 0);
            const successRate = ((passedTests / totalTests) * 100).toFixed(1);
            
            let resultHtml = `
                <div class="result-item ${passedTests === totalTests ? 'success' : 'warning'}" style="border: 2px solid #28a745;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <strong>🚀 全テスト実行結果</strong>
                        <span style="font-size: 1.2rem;">${passedTests}/${totalTests} (${successRate}%)</span>
                    </div>
                    <div>全28機能のテストが完了しました</div>
                    <div style="margin-top: 15px;">
            `;
            
            results.forEach(result => {
                const categorySuccessRate = ((result.passed_tests / result.total_tests) * 100).toFixed(1);
                resultHtml += `
                    <div style="margin: 5px 0; padding: 5px; background: rgba(0,0,0,0.05); border-radius: 5px;">
                        ${result.category}: ${result.passed_tests}/${result.total_tests} (${categorySuccessRate}%)
                    </div>
                `;
            });
            
            resultHtml += `
                    </div>
                </div>
            `;
            
            content.innerHTML = resultHtml + content.innerHTML;
            panel.classList.add('active');
        }
        
        // 💬 通知表示
        showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => notification.classList.add('show'), 100);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        // ⏳ ローディング表示制御
        showLoading(show) {
            const overlay = document.getElementById('loadingOverlay');
            overlay.style.display = show ? 'flex' : 'none';
        }
        
        // 🕒 現在時刻更新
        updateCurrentTime() {
            const timeElement = document.getElementById('currentTime');
            const updateTime = () => {
                timeElement.textContent = new Date().toLocaleTimeString('ja-JP');
            };
            updateTime();
            setInterval(updateTime, 1000);
        }
    }
    
    // 🚀 CAIDSシステム初期化
    document.addEventListener('DOMContentLoaded', () => {
        window.caidsController = new CAIDSTestController();
        console.log('✅ CAIDS統合テストツール初期化完了');
    });
    </script>
</body>
</html>

<?php
// 📝 ログ記録
error_log("CAIDS Test Tool Page Loaded - " . date('Y-m-d H:i:s'));
?>
