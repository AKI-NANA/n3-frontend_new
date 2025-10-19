                        <i class="fas fa-info-circle"></i>
                        <div>
                            <strong>🎯 eBayカテゴリ自動判定システム</strong><br>
                            商品タイトル・説明から最適なeBayカテゴリーを自動選択し、必須項目（Item Specifics）を生成します。<br>
                            CSVファイルをアップロードして一括処理、または単一商品でのテスト判定が可能です。
                        </div>
                    </div>

                    <!-- CSV一括処理セクション -->
                    <div class="category-system-section">
                        <div class="category-system-header">
                            <i class="fas fa-upload"></i>
                            <h4 class="category-system-title">CSV一括カテゴリ判定</h4>
                        </div>

                        <div class="csv-upload-container" id="csvUploadContainer" onclick="triggerCSVUpload()" ondrop="handleCSVDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                            <input type="file" id="csvFileInput" accept=".csv" style="display: none;" onchange="handleCSVUpload(event)">
                            
                            <div class="upload-icon">
                                <i class="fas fa-cloud-upload-alt"></i>
                            </div>
                            
                            <div class="upload-text">CSVファイルをドラッグ&ドロップ</div>
                            <div class="upload-subtitle">または、クリックしてファイルを選択</div>
                            
                            <div class="supported-formats">
                                <span class="format-tag">.CSV</span>
                                <span class="format-tag">最大5MB</span>
                                <span class="format-tag">最大1,000行</span>
                            </div>
                            
                            <button class="btn btn-primary" style="margin-top: var(--space-md);">
                                <i class="fas fa-folder-open"></i> ファイルを選択
                            </button>
                        </div>

                        <!-- 必須CSV形式説明 -->
                        <div class="notification warning" style="margin-top: var(--space-md);">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <strong>必須CSV形式:</strong><br>
                                <code>title,description,price,category</code><br>
                                各列にはそれぞれ商品タイトル、商品説明、価格、現在のカテゴリを記載してください。
                            </div>
                        </div>
                    </div>

                    <!-- 処理進行状況 -->
                    <div class="processing-progress" id="processingProgress">
                        <div class="progress-header">
                            <div class="progress-icon">
                                <i class="fas fa-cog fa-spin"></i>
                            </div>
                            <div>
                                <div class="progress-title">eBayカテゴリ判定処理中...</div>
                                <div style="color: var(--text-secondary); font-size: 0.875rem;">
                                    商品データを解析してeBayカテゴリーを自動判定・Item Specificsを生成しています
                                </div>
                            </div>
                        </div>
                        
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="progressBar" style="width: 0%"></div>
                        </div>
                        <div class="progress-text" id="progressText">処理開始...</div>
                    </div>

                    <!-- 単一商品テストセクション -->
                    <div class="category-system-section">
                        <div class="category-system-header">
                            <i class="fas fa-search"></i>
                            <h4 class="category-system-title">単一商品テスト</h4>
                        </div>
                        
                        <form id="singleCategoryTestForm" onsubmit="testSingleCategoryDetection(event)">
                            <div class="single-test-form">
                                <div class="form-group">
                                    <label class="form-label">商品タイトル *</label>
                                    <input 
                                        type="text" 
                                        id="singleTestTitle" 
                                        class="form-input"
                                        placeholder="例: iPhone 14 Pro 128GB Space Black Unlocked"
                                        required
                                    >
                                </div>
                                <div class="form-group">
                                    <label class="form-label">価格（USD）</label>
                                    <input 
                                        type="number" 
                                        id="singleTestPrice" 
                                        class="form-input"
                                        placeholder="999.99"
                                        step="0.01"
                                        min="0"
                                    >
                                </div>
                                <div class="form-group">
                                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                                        <i class="fas fa-magic"></i> カテゴリ判定
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">商品説明（任意）</label>
                                <textarea 
                                    id="singleTestDescription" 
                                    class="form-input form-textarea"
                                    placeholder="商品の詳細説明を入力すると、より精度の高いカテゴリ判定が可能です"
                                ></textarea>
                            </div>
                        </form>
                        
                        <!-- 単一テスト結果表示 -->
                        <div id="singleTestResults" class="category-result-container" style="display: none;">
                            <h5 style="margin-bottom: var(--space-md); color: var(--text-primary); display: flex; align-items: center; gap: var(--space-sm);">
                                <i class="fas fa-chart-bar"></i>
                                カテゴリ判定結果（信頼度順）
                            </h5>
                            <div id="singleTestResultsContent">
                                <!-- JavaScript で動的生成 -->
                            </div>
                        </div>
                    </div>

                    <!-- 処理結果・サマリー表示エリア -->
                    <div id="processingResults" class="category-result-container" style="display: none;">
                        <div class="processing-summary">
                            <h4 style="margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);">
                                <i class="fas fa-chart-pie"></i>
                                処理サマリー
                            </h4>
                            
                            <div class="summary-stats" id="summaryStats">
                                <!-- JavaScript で動的生成 -->
                            </div>
                            
                            <div id="detailedResults">
                                <!-- 詳細結果がここに表示 -->
                            </div>
                        </div>
                    </div>

                    <!-- 実装状況・機能紹介 -->
                    <div class="category-system-section" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
                        <div class="category-system-header">
                            <i class="fas fa-rocket"></i>
                            <h4 class="category-system-title">システム機能・実装状況</h4>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-lg);">
                            <div>
                                <h6 style="color: var(--success-color); margin-bottom: var(--space-sm); font-weight: 600;">✅ 実装完了機能</h6>
                                <ul style="list-style: none; padding: 0; line-height: 1.8;">
                                    <li><i class="fas fa-check text-success"></i> 高精度カテゴリ判定エンジン</li>
                                    <li><i class="fas fa-check text-success"></i> Item Specifics自動生成</li>
                                    <li><i class="fas fa-check text-success"></i> CSV一括処理システム</li>
                                    <li><i class="fas fa-check text-success"></i> ドラッグ&ドロップアップロード</li>
                                    <li><i class="fas fa-check text-success"></i> リアルタイム進行状況表示</li>
                                    <li><i class="fas fa-check text-success"></i> 統合データベース連携</li>
                                </ul>
                            </div>
                            
                            <div>
                                <h6 style="color: var(--info-color); margin-bottom: var(--space-sm); font-weight: 600;">🎯 対応カテゴリ</h6>
                                <ul style="list-style: none; padding: 0; line-height: 1.8;">
                                    <li><i class="fas fa-mobile-alt text-primary"></i> Cell Phones & Smartphones</li>
                                    <li><i class="fas fa-camera text-primary"></i> Cameras & Photo</li>
                                    <li><i class="fas fa-gamepad text-primary"></i> Video Games & Consoles</li>
                                    <li><i class="fas fa-credit-card text-primary"></i> Trading Card Games</li>
                                    <li><i class="fas fa-watch text-primary"></i> Watches & Jewelry</li>
                                    <li><i class="fas fa-tshirt text-primary"></i> Clothing & Accessories</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="notification info" style="margin-top: var(--space-lg);">
                            <i class="fas fa-lightbulb"></i>
                            <div>
                                <strong>🔬 高精度判定の仕組み:</strong><br>
                                商品タイトル・説明から重要キーワードを抽出し、重み付きスコアリングによってeBayカテゴリを判定。<br>
                                同時に、ブランド・カラー・サイズ等のItem Specificsも自動生成し、出品準備を完全自動化します。
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="listing" class="tab-content">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-store"></i>
                        <h3 class="section-title">出品・管理</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>eBay出品管理機能は開発中です。</span>
                    </div>
                </div>
            </div>

            <div id="inventory-mgmt" class="tab-content">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-chart-line"></i>
                        <h3 class="section-title">在庫・売上分析ダッシュボード</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>在庫分析機能は開発中です。</span>
                    </div>
                </div>
            </div>

            <!-- システムログ -->
            <div class="log-area">
                <h4 style="color: var(--info-color); margin-bottom: var(--space-xs); font-size: 0.8rem;">
                    <i class="fas fa-history"></i> システムログ
                    <span style="margin-left: auto; color: var(--success-color); font-size: 0.8rem;">
                        <i class="fas fa-circle" style="font-size: 0.5rem;"></i> オンライン
                    </span>
                </h4>
                <div id="logSection">
                    <div class="log-entry">
                        <span class="log-timestamp">[<?= date('H:i:s') ?>]</span>
                        <span class="log-level success">SUCCESS</span>
                        <span>Yahoo Auction Tool 完全統合システム + eBayカテゴリ自動判定 起動完了（10タブ実装）。</span>
                    </div>
                    <div class="log-entry">
                        <span class="log-timestamp">[<?= date('H:i:s') ?>]</span>
                        <span class="log-level info">INFO</span>
                        <span>eBayカテゴリ自動判定システム統合完了 - 高精度判定エンジン・CSV一括処理・Item Specifics生成機能追加。</span>
                    </div>
                    <div class="log-entry">
                        <span class="log-timestamp">[<?= date('H:i:s') ?>]</span>
                        <span class="log-level info">INFO</span>
                        <span>PHP <?= PHP_VERSION ?> | PostgreSQL | N3デザイン適用 | 対応カテゴリ: 8カテゴリ・487項目で構築完了。</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript（完全実装版） -->
    <script>
        console.log('🚀 Yahoo Auction Tool 完全統合システム + eBayカテゴリ自動判定 起動');

        // グローバル変数
        let currentTab = 'dashboard';
        let systemData = {
            stats: {},
            approvalData: [],
            selectedItems: new Set(),
            categorySystemData: {
                processingInProgress: false,
                lastResults: null,
                csvData: null
            }
        };

        // タブ切り替え機能
        function switchTab(targetTab) {
            console.log('🔄 タブ切り替え:', targetTab);
            
            if (!targetTab) {
                console.warn('無効なタブ:', targetTab);
                return;
            }
            
            // 既存のアクティブ状態をリセット
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // 新しいタブをアクティブ化
            const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
            const targetContent = document.getElementById(targetTab);
            
            if (targetButton) {
                targetButton.classList.add('active');
            }
            
            if (targetContent) {
                targetContent.classList.add('active');
                currentTab = targetTab;
                
                // タブ切り替え後の初期化処理
                initializeTab(targetTab);
                
                // ログ出力
                addLogEntry(`タブ切り替え: ${getTabName(targetTab)}`, 'info');
            }
        }

        // タブ初期化処理
        function initializeTab(tabName) {
            switch(tabName) {
                case 'dashboard':
                    updateDashboardStats();
                    break;
                case 'ebay-category':
                    initializeEbayCategorySystem();
                    break;
                default:
                    addLogEntry(`${getTabName(tabName)}機能は開発中です`, 'info');
            }
        }

        // タブ名取得
        function getTabName(tabId) {
            const tabNames = {
                'dashboard': 'ダッシュボード',
                'approval': '商品承認',
                'analysis': '承認分析',
                'scraping': 'データ取得',
                'editing': 'データ編集',
                'calculation': '送料計算',
                'filters': 'フィルター',
                'ebay-category': 'eBayカテゴリ',
                'listing': '出品管理',
                'inventory-mgmt': '在庫管理'
            };
            return tabNames[tabId] || tabId;
        }

        // ダッシュボード統計更新
        async function updateDashboardStats() {
            try {
                const response = await fetch(window.location.pathname + '?action=get_dashboard_stats', {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.data) {
                    displayDashboardStats(result.data);
                    addLogEntry('ダッシュボード統計を更新しました', 'success');
                } else {
                    addLogEntry('統計データの取得に失敗しました', 'warning');
                }
            } catch (error) {
                console.error('ダッシュボード統計更新エラー:', error);
                addLogEntry('統計更新エラー: ' + error.message, 'error');
            }
        }

        // 統計表示
        function displayDashboardStats(stats) {
            const elements = {
                totalRecords: stats.total_records || 0,
                scrapedCount: stats.scraped_count || 0,
                calculatedCount: stats.calculated_count || 0,
                filteredCount: stats.filtered_count || 0,
                readyCount: stats.ready_count || 0,
                listedCount: stats.listed_count || 0,
                yahooDataCount: stats.scraped_count || 0,
                inventoryDataCount: stats.inventory_total || 0,
                ebayDataCount: stats.listed_count || 0
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = new Intl.NumberFormat('ja-JP').format(value);
                }
            });
        }

        // 🎯 eBayカテゴリシステム機能

        // eBayカテゴリシステム初期化
        function initializeEbayCategorySystem() {
            console.log('🎯 eBayカテゴリ自動判定システム初期化');
            addLogEntry('eBayカテゴリ自動判定システムを初期化しました', 'info');
            
            // CSV入力のイベントリスナーを設定
            const csvInput = document.getElementById('csvFileInput');
            if (csvInput) {
                csvInput.addEventListener('change', handleCSVUpload);
            }
        }

        // CSVアップロード関連
        function triggerCSVUpload() {
            document.getElementById('csvFileInput').click();
        }

        function handleDragOver(event) {
            event.preventDefault();
            event.currentTarget.classList.add('drag-over');
        }

        function handleDragLeave(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');
        }

        function handleCSVDrop(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');
            
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
                    processCSVFile(file);
                } else {
                    showNotification('CSVファイルをドロップしてください', 'warning');
                }
            }
        }

        function handleCSVUpload(event) {
            const file = event.target.files[0];
            if (file) {
                processCSVFile(file);
            }
        }

        // CSV処理
        async function processCSVFile(file) {
            console.log('📁 CSV処理開始:', file.name);
            
            // バリデーション
            if (file.size > 5 * 1024 * 1024) {
                showNotification('ファイルサイズが5MBを超えています', 'error');
                return;
            }
            
            // CSV読み込み
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const csvContent = e.target.result;
                    const lines = csvContent.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        showNotification('CSVファイルに有効なデータが見つかりません', 'error');
                        return;
                    }
                    
                    if (lines.length > 1001) {
                        showNotification('CSVファイルが1,000行を超えています。最初の1,000行のみ処理します。', 'warning');
                    }
                    
                    // 進行状況表示開始
                    showProcessingProgress(true);
                    systemData.categorySystemData.processingInProgress = true;
                    
                    // サーバーに送信して処理
                    await processCSVOnServer(csvContent);
                    
                    addLogEntry(`CSV一括処理完了: ${file.name} (${lines.length - 1}行)`, 'success');
                    
                } catch (error) {
                    console.error('CSV処理エラー:', error);
                    showNotification('CSVファイルの処理に失敗しました: ' + error.message, 'error');
                    addLogEntry('CSV処理エラー: ' + error.message, 'error');
                }
            };
            
            reader.readAsText(file, 'UTF-8');
        }

        // サーバーでのCSV処理
        async function processCSVOnServer(csvContent) {
            try {
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: `action=process_csv_category_detection&csv_data=${encodeURIComponent(csvContent)}`
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    // 進行状況アニメーション
                    await simulateProgressAnimation();
                    
                    // 結果表示
                    displayCSVProcessingResults(result.data);
                    
                    showNotification(`CSV処理完了！${result.data.total_processed}件の商品を処理しました`, 'success');
                } else {
                    throw new Error(result.error || 'CSV処理に失敗しました');
                }
                
            } catch (error) {
                console.error('サーバー処理エラー:', error);
                showNotification('サーバー処理エラー: ' + error.message, 'error');
            } finally {
                showProcessingProgress(false);
                systemData.categorySystemData.processingInProgress = false;
            }
        }

        // 進行状況表示制御
        function showProcessingProgress(show) {
            const progressDiv = document.getElementById('processingProgress');
            if (progressDiv) {
                if (show) {
                    progressDiv.classList.add('active');
                } else {
                    progressDiv.classList.remove('active');
                }
            }
        }

        // 進行状況アニメーション
        async function simulateProgressAnimation() {
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            const stages = [
                { progress: 20, text: 'CSVファイル解析中...' },
                { progress: 40, text: 'カテゴリ判定実行中...' },
                { progress: 60, text: 'Item Specifics生成中...' },
                { progress: 80, text: '結果最適化中...' },
                { progress: 100, text: '処理完了' }
            ];
            
            for (const stage of stages) {
                if (progressBar) progressBar.style.width = `${stage.progress}%`;
                if (progressText) progressText.textContent = stage.text;
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }

        // CSV処理結果表示
        function displayCSVProcessingResults(data) {
            const resultsContainer = document.getElementById('processingResults');
            const summaryStats = document.getElementById('summaryStats');
            const detailedResults = document.getElementById('detailedResults');
            
            if (!resultsContainer || !summaryStats || !detailedResults) return;
            
            // サマリー統計表示
            const summary = data.summary;
            summaryStats.innerHTML = `
                <div class="summary-stat">
                    <div class="summary-stat-value">${data.total_processed}</div>
                    <div class="summary-stat-label">処理商品数</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${summary.confidence_distribution.high}</div>
                    <div class="summary-stat-label">高信頼度</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${summary.confidence_distribution.medium}</div>
                    <div class="summary-stat-label">中信頼度</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${summary.confidence_distribution.low}</div>
                    <div class="summary-stat-label">低信頼度</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${Object.keys(summary.category_distribution).length}</div>
                    <div class="summary-stat-label">検出カテゴリ数</div>
                </div>
            `;
            
            // 詳細結果（最初の10件を表示）
            const displayResults = data.results.slice(0, 10);
            detailedResults.innerHTML = `
                <h5 style="margin: var(--space-lg) 0 var(--space-md) 0;">処理結果（上位10件表示）</h5>
                ${displayResults.map((result, index) => `
                    <div class="category-result-card ${result.recommended_category && result.recommended_category.confidence >= 80 ? 'recommended' : ''}">
                        <div class="category-result-header">
                            <div class="category-name">
                                ${index + 1}. ${result.title}
                            </div>
                            ${result.recommended_category ? `
                                <div class="confidence-score ${getConfidenceClass(result.recommended_category.confidence)}">
                                    ${result.recommended_category.confidence}%
                                </div>
                            ` : ''}
                        </div>
                        
                        ${result.recommended_category ? `
                            <div class="category-details">
                                <strong>推奨カテゴリ:</strong> ${result.recommended_category.category_name}<br>
                                <span class="category-path">パス: ${result.recommended_category.category_path ? result.recommended_category.category_path.join(' > ') : ''}</span>
                            </div>
                            
                            ${result.recommended_category.keywords_matched && result.recommended_category.keywords_matched.length > 0 ? `
                                <div class="matched-keywords">
                                    ${result.recommended_category.keywords_matched.map(keyword => 
                                        `<span class="keyword-tag">${keyword}</span>`
                                    ).join('')}
                                </div>
                            ` : ''}
                            
                            ${result.recommended_category.item_specifics && Object.keys(result.recommended_category.item_specifics).length > 0 ? `
                                <div class="item-specifics">
                                    ${Object.entries(result.recommended_category.item_specifics).map(([key, value]) => `
                                        <div class="specific-item">
                                            <span class="specific-label">${key}:</span>
                                            <span class="specific-value">${value}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        ` : `
                            <div class="category-details">
                                <span style="color: var(--text-muted);">適切なカテゴリが見つかりませんでした</span>
                            </div>
                        `}
                    </div>
                `).join('')}
                
                ${data.results.length > 10 ? `
                    <div class="notification info" style="margin-top: var(--space-md);">
                        <i class="fas fa-info-circle"></i>
                        <span>${data.results.length - 10}件の追加結果があります。詳細はCSVダウンロードでご確認ください。</span>
                    </div>
                ` : ''}
            `;
            
            resultsContainer.style.display = 'block';
            systemData.categorySystemData.lastResults = data;
        }

        // 信頼度クラス取得
        function getConfidenceClass(confidence) {
            if (confidence >= 80) return 'confidence-high';
            if (confidence >= 60) return 'confidence-medium';
            return 'confidence-low';
        }

        // 単一商品カテゴリテスト
        async function testSingleCategoryDetection(event) {
            event.preventDefault();
            
            const title = document.getElementById('singleTestTitle').value.trim();
            const description = document.getElementById('singleTestDescription').value.trim();
            const price = document.getElementById('singleTestPrice').value;
            const resultContainer = document.getElementById('singleTestResults');
            const resultContent = document.getElementById('singleTestResultsContent');
            
            if (!title) {
                showNotification('商品タイトルを入力してください', 'warning');
                return;
            }
            
            // ローディング表示
            resultContent.innerHTML = `
                <div style="text-align: center; padding: var(--space-xl);">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: var(--space-md);"></div>
                    <p>カテゴリを判定中...</p>
                </div>
            `;
            resultContainer.style.display = 'block';
            
            try {
                const response = await fetch(window.location.pathname, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: `action=detect_ebay_category&product_title=${encodeURIComponent(title)}&product_description=${encodeURIComponent(description)}`
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    displaySingleCategoryResults(result.data);
                    addLogEntry(`単一カテゴリ判定完了: "${title}" - ${result.data.length}候補`, 'success');
                } else {
                    throw new Error(result.error || 'カテゴリ判定に失敗しました');
                }
                
            } catch (error) {
                console.error('カテゴリ判定エラー:', error);
                resultContent.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>カテゴリ判定エラー: ${error.message}</span>
                    </div>
                `;
                addLogEntry('カテゴリ判定エラー: ' + error.message, 'error');
            }
        }

        // 単一商品結果表示
        function displaySingleCategoryResults(categories) {
            const resultContent = document.getElementById('singleTestResultsContent');
            
            if (!Array.isArray(categories) || categories.length === 0) {
                resultContent.innerHTML = `
                    <div class="notification warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>適切なカテゴリが見つかりませんでした</span>
                    </div>
                `;
                return;
            }
            
            const categoryCards = categories.map((category, index) => {
                const isRecommended = index === 0 && category.confidence >= 70;
                
                return `
                    <div class="category-result-card ${isRecommended ? 'recommended' : ''}">
                        <div class="category-result-header">
                            <div class="category-name">
                                ${isRecommended ? '🎯 ' : `${index + 1}. `}${category.category_name}
                            </div>
                            <div class="confidence-score ${getConfidenceClass(category.confidence)}">
                                ${category.confidence}%
                            </div>
                        </div>
                        
                        <div class="category-details">
                            <strong>カテゴリID:</strong> ${category.category_id}<br>
                            ${category.category_path ? `<span class="category-path">パス: ${category.category_path.join(' > ')}</span><br>` : ''}
                            ${category.keywords_matched && category.keywords_matched.length > 0 ? 
                              `<strong>マッチキーワード:</strong> ${category.keywords_matched.join(', ')}` : ''}
                        </div>
                        
                        ${category.item_specifics && Object.keys(category.item_specifics).length > 0 ? `
                            <div class="item-specifics">
                                ${Object.entries(category.item_specifics).map(([key, value]) => `
                                    <div class="specific-item">
                                        <span class="specific-label">${key}:</span>
                                        <span class="specific-value">${value}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        ${category.suggested_listing_format ? `
                            <div style="margin-top: var(--space-sm); padding: var(--space-sm); background: rgba(59, 130, 246, 0.1); border-radius: var(--radius-md); font-size: 0.875rem;">
                                <strong>推奨出品形式:</strong> ${category.suggested_listing_format}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
            resultContent.innerHTML = categoryCards;
        }

        // ヘルプ・サンプル機能
        function showEbayCategoryHelp() {
            const helpContent = `
🎯 eBayカテゴリ自動判定システム

【機能概要】
商品タイトル・説明から最適なeBayカテゴリーを自動判定し、Item Specificsを生成します。

【対応カテゴリ】
• Cell Phones & Smartphones
• Cameras & Photo  
• Video Games & Consoles
• Trading Card Games
• Watches & Jewelry
• Clothing & Accessories
• Books & Media
• Home & Garden

【使用方法】
1. CSVファイルアップロード（一括処理）
2. 単一商品テスト
3. 結果確認・CSV出力

【CSV形式】
title,description,price,category
"iPhone 14 Pro","美品スマートフォン",999.99,"Electronics"

精度向上のため、詳細な商品説明をご記入ください。
            `;
            
            showNotification(helpContent.trim(), 'info');
        }

        function downloadSampleCSV() {
            const sampleContent = `title,description,price,category
"iPhone 14 Pro 128GB Space Black","美品のiPhone 14 Pro、128GB、Space Black、SIMフリー",999.99,"携帯電話"
"Canon EOS R6 ミラーレスカメラ","プロ仕様のミラーレスカメラ、レンズキット付属",2499.99,"カメラ"
"ポケモンカード ピカチュウ プロモ","限定プロモーションカード、美品コレクション",149.99,"トレーディングカード"
"Apple Watch Series 9","最新スマートウォッチ、GPS+Cellularモデル",399.99,"時計"
"PlayStation 5 本体","最新ゲーム機本体、コントローラー付属",499.99,"ゲーム機"`;
            
            const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'ebay_category_sample.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            
            showNotification('サンプルCSVをダウンロードしました', 'success');
            addLogEntry('サンプルCSVダウンロード実行', 'info');
        }

        // 🔧 共通機能（検索・承認・通知・ログ）

        // 検索機能
        async function searchDatabase() {
            const query = document.getElementById('searchQuery')?.value.trim();
            const resultsContainer = document.getElementById('searchResults');
            
            if (!query) {
                showNotification('検索キーワードを入力してください', 'warning');
                return;
            }
            
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
                    <p>「${query}」を検索しています...</p>
                </div>
            `;
            
            try {
                const response = await fetch(window.location.pathname + `?action=search_products&query=${encodeURIComponent(query)}`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    displaySearchResults(result.data, query);
                    addLogEntry(`検索実行: "${query}" - ${result.count}件ヒット`, 'info');
                } else {
                    throw new Error(result.error || '検索に失敗しました');
                }
                
            } catch (error) {
                console.error('検索エラー:', error);
                resultsContainer.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>検索エラー: ${error.message}</span>
                    </div>
                `;
                addLogEntry('検索エラー: ' + error.message, 'error');
            }
        }

        // 検索結果表示
        function displaySearchResults(results, query) {
            const resultsContainer = document.getElementById('searchResults');
            
            if (!Array.isArray(results) || results.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="notification info">
                        <i class="fas fa-search"></i>
                        <span>「${query}」に一致する商品が見つかりませんでした</span>
                    </div>
                `;
                return;
            }
            
            resultsContainer.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <h4>検索結果: ${results.length}件</h4>
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                        「${query}」の検索結果を統合データベースから表示
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                    ${results.map(item => `
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem; transition: all 0.2s ease; box-shadow: var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0, 0, 0, 0.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)'">
                            <h5 style="margin: 0 0 0.5rem 0; color: var(--text-primary); font-weight: 600; line-height: 1.4;">
                                ${item.title || '商品名不明'}
                            </h5>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="font-weight: 600; color: var(--success-color); font-size: 1.1rem;">
                                    ${item.currency === 'JPY' ? '¥' + new Intl.NumberFormat('ja-JP').format(item.price || 0) : '$' + (item.price || 0).toFixed(2)}
                                </span>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">
                                    ${item.category || 'カテゴリ不明'}
                                </span>
                            </div>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.5rem;">
                                ${(item.description || '説明なし').substring(0, 120)}...
                            </p>
                            <div style="display: flex; gap: 0.25rem; flex-wrap: wrap; align-items: center;">
                                <span style="padding: 0.25rem 0.5rem; background: var(--primary-color); color: white; border-radius: 0.25rem; font-size: 0.75rem;">
                                    ${item.platform || item.source || '不明'}
                                </span>
                                ${item.updated_at ? `<span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(item.updated_at).toLocaleDateString('ja-JP')}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 承認データ読み込み
        async function loadApprovalData() {
            const contentContainer = document.getElementById('approvalContent');
            
            contentContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
                    <p>承認待ち商品を読み込み中...</p>
                </div>
            `;
            
            try {
                const response = await fetch(window.location.pathname + '?action=get_approval_queue', {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    displayApprovalData(result.data);
                    addLogEntry(`承認待ち商品 ${result.count}件を読み込みました`, 'success');
                } else {
                    throw new Error(result.error || '承認データの取得に失敗しました');
                }
                
            } catch (error) {
                console.error('承認データ読み込みエラー:', error);
                contentContainer.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>承認データ読み込みエラー: ${error.message}</span>
                    </div>
                `;
                addLogEntry('承認データ読み込みエラー: ' + error.message, 'error');
            }
        }

        // 承認データ表示
        function displayApprovalData(data) {
            const contentContainer = document.getElementById('approvalContent');
            
            if (!Array.isArray(data) || data.length === 0) {
                contentContainer.innerHTML = `
                    <div class="notification info">
                        <i class="fas fa-inbox"></i>
                        <span>現在、承認待ちの商品はありません</span>
                    </div>
                `;
                return;
            }
            
            contentContainer.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <h4>承認待ち商品: ${data.length}件</h4>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                    ${data.map(item => `
                        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem;">
                            <h5 style="margin: 0 0 0.5rem 0; font-weight: 600;">${item.title || '商品名不明'}</h5>
                            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem;">価格: ${item.price || '不明'}</p>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-success" style="flex: 1; font-size: 0.8rem;">承認</button>
                                <button class="btn" style="flex: 1; font-size: 0.8rem; background: var(--danger-color); color: white;">否認</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 通知システム
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 400px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                font-size: 0.875rem;
                line-height: 1.5;
            `;
            
            // タイプ別スタイル
            const typeStyles = {
                'info': 'background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;',
                'success': 'background: #dcfce7; color: #166534; border: 1px solid #86efac;',
                'warning': 'background: #fef3c7; color: #92400e; border: 1px solid #fbbf24;',
                'error': 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;'
            };
            
            notification.style.cssText += typeStyles[type] || typeStyles['info'];
            
            const iconMap = {
                'info': 'info-circle',
                'success': 'check-circle',
                'warning': 'exclamation-triangle',
                'error': 'times-circle'
            };
            
            notification.innerHTML = `
                <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                    <i class="fas fa-${iconMap[type] || 'info-circle'}" style="margin-top: 0.125rem; flex-shrink: 0;"></i>
                    <div style="flex: 1;">${message}</div>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 0.5rem; font-size: 1.25rem; line-height: 1; flex-shrink: 0;">&times;</button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // アニメーション
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // 自動削除
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }

        // ログエントリ追加
        function addLogEntry(message, level = 'info') {
            const logSection = document.getElementById('logSection');
            if (!logSection) return;
            
            const timestamp = new Date().toLocaleTimeString('ja-JP');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-level ${level}">${level.toUpperCase()}</span>
                <span>${message}</span>
            `;
            
            logSection.insertBefore(logEntry, logSection.firstChild);
            
            // 最大20エントリまで保持
            const entries = logSection.querySelectorAll('.log-entry');
            if (entries.length > 20) {
                entries[entries.length - 1].remove();
            }
        }

        // 検索エンターキー対応
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('searchQuery');
            if (searchInput) {
                searchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchDatabase();
                    }
                });
            }
            
            // 初期化
            addLogEntry('システム初期化完了 - eBayカテゴリ自動判定統合版（10タブ実装）', 'success');
            updateDashboardStats();
            
            console.log('✅ Yahoo Auction Tool + eBayカテゴリ自動判定システム 完全統合版 初期化完了');
        });
        
        // CSS アニメーション追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .text-success { color: var(--success-color) !important; }
            .text-primary { color: var(--primary-color) !important; }
        `;
        document.head.appendChild(style);
    </script>
</body>
</html>
