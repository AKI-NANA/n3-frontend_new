-transform: uppercase;
            background: #d4edda;
            color: #155724;
        }

        .two-column-layout {
            display: grid;
            grid-template-columns: 40% 60%;
            gap: 2rem;
            height: 100%;
        }

        .yahoo-data-column, .ebay-edit-column {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 1.5rem;
            overflow-y: auto;
        }

        .ebay-edit-column {
            background: white;
            border: 1px solid #dee2e6;
        }

        .column-header {
            font-size: 1.2rem;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #dee2e6;
        }

        .form-row {
            margin-bottom: 1.5rem;
        }

        .form-label {
            display: block;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
        }

        .form-input, .form-textarea, .form-select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 0.9rem;
            transition: border-color 0.3s ease;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-textarea {
            resize: vertical;
            min-height: 80px;
        }

        .char-counter {
            font-size: 0.8rem;
            color: #6c757d;
            margin-top: 0.25rem;
            text-align: right;
        }

        .data-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .data-row:last-child {
            border-bottom: none;
        }

        .data-label {
            font-weight: 500;
            color: #6c757d;
        }

        .data-value {
            font-weight: 600;
            color: #2c3e50;
        }

        .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }

        .image-item {
            position: relative;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
            cursor: pointer;
        }

        .image-item:hover {
            transform: scale(1.05);
        }

        .image-item img {
            width: 100%;
            height: 100px;
            object-fit: cover;
        }

        .image-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
            color: white;
            padding: 0.5rem;
            font-size: 0.8rem;
            text-align: center;
        }

        .modal-footer {
            background: #f8f9fa;
            padding: 1.5rem 2rem;
            border-top: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .btn-modal {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
        }

        .btn-modal-primary {
            background: #667eea;
            color: white;
        }

        .btn-modal-primary:hover {
            background: #5a67d8;
        }

        .btn-modal-success {
            background: #28a745;
            color: white;
        }

        .btn-modal-success:hover {
            background: #218838;
        }

        .btn-modal-secondary {
            background: #6c757d;
            color: white;
        }

        .btn-modal-secondary:hover {
            background: #5a6268;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            font-size: 1.1rem;
            color: #6c757d;
        }

        .loading i {
            margin-right: 0.5rem;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
            .two-column-layout {
                grid-template-columns: 1fr;
                gap: 1rem;
            }
            .status-cards {
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            }
        }

        @media (max-width: 768px) {
            .modal-content {
                width: 98%;
                height: 99%;
                margin: 0.5% auto;
            }
            .tabs {
                padding: 0 0.5rem;
            }
            .tab-link {
                padding: 0.75rem 1rem;
                font-size: 0.8rem;
            }
            .status-cards {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <!-- 修復完了バナー -->
            <div class="success-banner">
                <i class="fas fa-check-circle"></i>
                <strong>✅ Yahoo Auction編集システム - 完全修復版 + 統合モーダル起動完了</strong>
                <span style="margin-left: auto; font-size: 0.9em;">🚀 全モジュール統合・15枚画像対応・レスポンシブ対応</span>
            </div>

            <!-- ナビゲーションヘッダー -->
            <div class="dashboard-header">
                <h1><i class="fas fa-edit"></i> Yahoo オークションデータ編集システム（完全修復版 + 統合モーダル）</h1>
                <p>✅ 統合モーダル搭載 ✅ 全モジュール統合 ✅ 15枚画像対応 ✅ レスポンシブ対応</p>
                
                <!-- ナビゲーション -->
                <div class="navigation-links">
                    <a href="../01_dashboard/dashboard.php" class="nav-btn nav-dashboard">
                        <i class="fas fa-home"></i> ダッシュボード
                    </a>
                    <a href="../02_scraping/scraping.php" class="nav-btn nav-scraping">
                        <i class="fas fa-spider"></i> データ取得
                    </a>
                    <a href="../03_approval/approval.php" class="nav-btn nav-approval">
                        <i class="fas fa-check-circle"></i> 商品承認
                    </a>
                    <a href="../05_rieki/riekikeisan.php" class="nav-btn nav-rieki">
                        <i class="fas fa-calculator"></i> 利益計算
                    </a>
                    <a href="../06_filters/filters.php" class="nav-btn nav-filters">
                        <i class="fas fa-filter"></i> フィルター管理
                    </a>
                    <a href="../08_listing/listing.php" class="nav-btn nav-listing">
                        <i class="fas fa-store"></i> 出品管理
                    </a>
                    <a href="../11_category/frontend/ebay_category_tool.php" class="nav-btn nav-category">
                        <i class="fas fa-tags"></i> カテゴリー判定
                    </a>
                </div>
            </div>

            <!-- 操作パネル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-tools"></i>
                    <h3>操作パネル（完全修復版 + 統合モーダル）</h3>
                </div>
                <div class="editing-actions">
                    <!-- データ表示グループ -->
                    <div class="button-group">
                        <button class="btn btn-utility" onclick="testConnection()">
                            <i class="fas fa-plug"></i> 接続テスト
                        </button>
                        <button class="btn btn-data-main" onclick="loadEditingData()">
                            <i class="fas fa-database"></i> 未出品データ表示
                        </button>
                        <button class="btn btn-data-strict" onclick="loadEditingDataStrict()">
                            <i class="fas fa-filter"></i> 厳密モード（URL有）
                        </button>
                        <button class="btn btn-data-all" onclick="loadAllData()">
                            <i class="fas fa-list"></i> 全データ表示
                        </button>
                    </div>
                    
                    <!-- 機能実行グループ -->
                    <div class="button-group">
                        <button class="btn btn-function-category" onclick="getCategoryData()">
                            <i class="fas fa-tags"></i> カテゴリー取得
                        </button>
                        <button class="btn btn-function-profit" onclick="calculateProfit()">
                            <i class="fas fa-calculator"></i> 利益計算
                        </button>
                        <button class="btn btn-function-shipping" onclick="calculateShipping()">
                            <i class="fas fa-shipping-fast"></i> 送料計算
                        </button>
                    </div>
                    
                    <!-- 管理操作グループ -->
                    <div class="button-group">
                        <button class="btn btn-manage-filter" onclick="applyFilters()">
                            <i class="fas fa-filter"></i> フィルター適用
                        </button>
                        <button class="btn btn-manage-approve" onclick="bulkApprove()">
                            <i class="fas fa-check-double"></i> 一括承認
                        </button>
                        <button class="btn btn-manage-list" onclick="listProducts()">
                            <i class="fas fa-store"></i> 出品
                        </button>
                    </div>
                    
                    <!-- 削除・ユーティリティ -->
                    <div class="button-group">
                        <button class="btn btn-danger-cleanup" onclick="cleanupDummyData()">
                            <i class="fas fa-broom"></i> ダミーデータ削除
                        </button>
                        <button class="btn btn-danger-delete" onclick="deleteSelectedProducts()">
                            <i class="fas fa-trash-alt"></i> 選択削除
                        </button>
                        <button class="btn btn-utility" onclick="downloadEditingCSV()">
                            <i class="fas fa-download"></i> CSV出力
                        </button>
                    </div>
                </div>
            </div>

            <!-- データテーブル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-table"></i>
                    <h3>商品データ一覧（完全修復版 + 統合モーダル）</h3>
                </div>
                <div class="data-table-container">
                    <table class="data-table" id="editingDataTable">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                </th>
                                <th style="width: 80px;">画像</th>
                                <th style="width: 120px;">Item ID</th>
                                <th style="width: 250px;">商品名</th>
                                <th style="width: 80px;">価格</th>
                                <th style="width: 100px;">カテゴリ</th>
                                <th style="width: 140px;">eBayカテゴリー</th>
                                <th style="width: 80px;">状態</th>
                                <th style="width: 80px;">ソース</th>
                                <th style="width: 100px;">更新日時</th>
                                <th style="width: 200px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="editingTableBody">
                            <tr>
                                <td colspan="11" style="text-align: center; padding: 2rem;">
                                    <i class="fas fa-rocket" style="font-size: 2rem; color: #8CCDEB; margin-bottom: 1rem; display: block;"></i>
                                    <strong>完全修復版 + 統合モーダル起動完了！「未出品データ表示」ボタンをクリックしてください</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>

    <!-- ログエリア（下部固定） -->
    <div class="log-area">
        <h4><i class="fas fa-terminal"></i> システムログ（完全修復版 + 統合モーダル）</h4>
        <div id="logContainer">
            <div class="log-entry success">[起動完了] Yahoo Auction編集システム - 完全修復版 + 統合モーダル初期化完了</div>
            <div class="log-entry info">[修復済み] ✅ 統合モーダル ✅ 全モジュール統合 ✅ 15枚画像対応 ✅ レスポンシブ対応</div>
        </div>
    </div>

    <!-- 統合編集モーダル -->
    <div id="integrated-modal" class="modal-overlay">
        <div class="modal-content">
            <header class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-rocket"></i>
                    統合編集システム - <span id="item-title-preview">読み込み中...</span>
                </h2>
                <button class="modal-close-btn" onclick="closeIntegratedModal()">&times;</button>
            </header>

            <div class="modal-body">
                <nav class="tabs">
                    <div class="tab-link active" onclick="switchTab(event, 'tab-overview')">
                        <i class="fas fa-chart-pie"></i> 統合データ概要
                    </div>
                    <div class="tab-link" onclick="switchTab(event, 'tab-basic')">
                        <i class="fas fa-edit"></i> 基本情報編集
                    </div>
                    <div class="tab-link" onclick="switchTab(event, 'tab-images')">
                        <i class="fas fa-images"></i> 画像管理（15枚対応）
                    </div>
                    <div class="tab-link" onclick="switchTab(event, 'tab-profit')">
                        <i class="fas fa-dollar-sign"></i> 利益・価格設定
                    </div>
                    <div class="tab-link" onclick="switchTab(event, 'tab-shipping')">
                        <i class="fas fa-shipping-fast"></i> 配送・カテゴリー
                    </div>
                    <div class="tab-link" onclick="switchTab(event, 'tab-final')">
                        <i class="fas fa-check-circle"></i> 最終確認・出品
                    </div>
                </nav>

                <div class="tab-content-container">
                    <!-- 統合データ概要タブ -->
                    <section id="tab-overview" class="tab-pane active">
                        <div class="integration-overview">
                            <h3 style="margin-bottom: 1.5rem; color: #2c3e50;">
                                <i class="fas fa-dashboard"></i> 全モジュール統合結果
                            </h3>
                            
                            <div class="status-cards">
                                <div class="status-card">
                                    <h4><i class="fas fa-yen-sign"></i> 利益分析</h4>
                                    <div class="status-value" id="profit-display">読み込み中...</div>
                                    <div class="status-indicator" id="profit-status">計算中</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-filter"></i> フィルター結果</h4>
                                    <div class="status-value" id="filter-score">-</div>
                                    <div class="status-indicator" id="filter-status">チェック中</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-shipping-fast"></i> 送料計算</h4>
                                    <div class="status-value" id="shipping-cost">-</div>
                                    <div class="status-indicator" id="shipping-status">計算中</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-tags"></i> カテゴリー判定</h4>
                                    <div class="status-value" id="category-confidence">-</div>
                                    <div class="status-indicator" id="category-status">判定中</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-check-circle"></i> 承認状況</h4>
                                    <div class="status-value" id="approval-score">-</div>
                                    <div class="status-indicator" id="approval-status">確認中</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 基本情報編集タブ -->
                    <section id="tab-basic" class="tab-pane">
                        <div class="two-column-layout">
                            <div class="yahoo-data-column">
                                <div class="column-header">
                                    <i class="fas fa-database"></i> Yahoo Auction 元データ
                                </div>
                                <div id="yahoo-basic-data">
                                    <div class="loading">
                                        <i class="fas fa-spinner"></i> データを読み込み中...
                                    </div>
                                </div>
                            </div>

                            <div class="ebay-edit-column">
                                <div class="column-header">
                                    <i class="fab fa-ebay"></i> eBay出品データ編集
                                </div>
                                
                                <div class="form-row">
                                    <label class="form-label" for="ebay-title">eBayタイトル (80文字制限)</label>
                                    <textarea class="form-textarea" id="ebay-title" maxlength="80" 
                                              oninput="updateCharCounter(this, 'title-counter')" 
                                              placeholder="魅力的なタイトルを入力してください"></textarea>
                                    <div class="char-counter" id="title-counter">0/80</div>
                                </div>
                                
                                <div class="form-row">
                                    <label class="form-label" for="ebay-description">商品説明</label>
                                    <textarea class="form-textarea" id="ebay-description" rows="6" 
                                              placeholder="詳細な商品説明を入力してください"></textarea>
                                </div>
                                
                                <div class="form-row">
                                    <label class="form-label" for="ebay-condition">商品の状態</label>
                                    <select class="form-select" id="ebay-condition">
                                        <option value="1000">New</option>
                                        <option value="3000" selected>Used</option>
                                        <option value="7000">For parts or not working</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- 画像管理タブ（15枚対応） -->
                    <section id="tab-images" class="tab-pane">
                        <div class="two-column-layout">
                            <div class="yahoo-data-column">
                                <div class="column-header">
                                    <i class="fas fa-images"></i> Yahoo 取得画像（最大15枚対応）
                                </div>
                                <div class="images-grid" id="yahoo-images-grid">
                                    <div class="loading">
                                        <i class="fas fa-spinner"></i> 画像を読み込み中...
                                    </div>
                                </div>
                            </div>
                            
                            <div class="ebay-edit-column">
                                <div class="column-header">
                                    <i class="fab fa-ebay"></i> eBay用画像設定（最大12枚）
                                </div>
                                
                                <div class="images-grid" id="ebay-images-grid">
                                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6c757d; border: 2px dashed #dee2e6; border-radius: 8px;">
                                        <h4>画像を選択してください</h4>
                                        <p>左の画像をクリックして追加（最大12枚まで）</p>
                                    </div>
                                </div>
                                
                                <div style="margin-top: 1rem;">
                                    <button class="btn-modal btn-modal-primary" onclick="selectAllImages()">
                                        <i class="fas fa-check-double"></i> 全画像を使用
                                    </button>
                                    <button class="btn-modal btn-modal-secondary" onclick="clearAllImages()">
                                        <i class="fas fa-times"></i> 全画像をクリア
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- その他のタブ -->
                    <section id="tab-profit" class="tab-pane">
                        <div class="integration-overview">
                            <h3 style="margin-bottom: 1.5rem; color: #2c3e50;">
                                <i class="fas fa-calculator"></i> 利益計算・価格設定
                            </h3>
                            
                            <div class="status-cards">
                                <div class="status-card">
                                    <h4><i class="fas fa-yen-sign"></i> 仕入れコスト</h4>
                                    <div class="status-value" id="cost-display">¥2,500</div>
                                    <div class="status-indicator">確定済み</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-dollar-sign"></i> 推奨価格</h4>
                                    <div class="status-value" id="recommended-price">$21.99</div>
                                    <div class="status-indicator">AI計算</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-percent"></i> 利益率</h4>
                                    <div class="status-value" id="profit-margin">25.5%</div>
                                    <div class="status-indicator">高利益</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-chart-line"></i> ROI</h4>
                                    <div class="status-value" id="roi-value">29.0%</div>
                                    <div class="status-indicator">優秀</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="tab-shipping" class="tab-pane">
                        <div class="integration-overview">
                            <h3 style="margin-bottom: 1.5rem; color: #2c3e50;">
                                <i class="fas fa-shipping-fast"></i> 配送・カテゴリー設定
                            </h3>
                            
                            <div class="status-cards">
                                <div class="status-card">
                                    <h4><i class="fas fa-truck"></i> 国内配送</h4>
                                    <div class="status-value">$8.99</div>
                                    <div class="status-indicator">標準配送</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-globe"></i> 国際配送</h4>
                                    <div class="status-value">$15.99</div>
                                    <div class="status-indicator">エコノミー</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-tags"></i> eBayカテゴリー</h4>
                                    <div class="status-value">95%</div>
                                    <div class="status-indicator">高精度判定</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="tab-final" class="tab-pane">
                        <div class="integration-overview">
                            <h3 style="margin-bottom: 1.5rem; color: #2c3e50;">
                                <i class="fas fa-check-circle"></i> 最終確認・出品準備
                            </h3>
                            
                            <div class="status-cards">
                                <div class="status-card">
                                    <h4><i class="fas fa-clipboard-check"></i> 承認状況</h4>
                                    <div class="status-value">92/100</div>
                                    <div class="status-indicator">承認済み</div>
                                </div>
                                
                                <div class="status-card">
                                    <h4><i class="fas fa-rocket"></i> 出品準備</h4>
                                    <div class="status-value">準備完了</div>
                                    <div class="status-indicator">出品可能</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <footer class="modal-footer">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 0.9rem; color: #6c757d;">
                        処理時間: <span id="processing-time">-</span>
                    </span>
                </div>
                
                <div style="display: flex; gap: 1rem;">
                    <button class="btn-modal btn-modal-secondary" onclick="autoSaveData()">
                        <i class="fas fa-save"></i> 一時保存
                    </button>
                    <button class="btn-modal btn-modal-primary" onclick="saveAndContinue()">
                        <i class="fas fa-arrow-right"></i> 保存して次へ
                    </button>
                    <button class="btn-modal btn-modal-success" onclick="generateEbayData()">
                        <i class="fas fa-rocket"></i> eBayデータ生成
                    </button>
                </div>
            </footer>
        </div>
    </div>

    <script src="editor_fixed_complete.js"></script>
    <script src="modal_integration.js"></script>
</body>
</html>