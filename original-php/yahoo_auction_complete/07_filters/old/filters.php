<?php
/**
 * Yahoo Auction Tool - 禁止キーワード管理システム
 * 独立ページ版
 */

// 共通機能読み込み
require_once '../shared/core/includes.php';

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>禁止キーワード管理システム - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="../../css/yahoo_auction_tool_content.css" rel="stylesheet">
    <link href="../shared/css/common.css" rel="stylesheet">
    <link href="../shared/css/layout.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- ナビゲーションヘッダー -->
        <div class="dashboard-header">
            <div class="header-navigation">
                <a href="../01_dashboard/dashboard.php" class="nav-link">
                    <i class="fas fa-tachometer-alt"></i> ダッシュボード
                </a>
                <a href="../03_approval/approval.php" class="nav-link">
                    <i class="fas fa-check-circle"></i> 商品承認
                </a>
                <a href="../04_analysis/analysis.php" class="nav-link">
                    <i class="fas fa-chart-bar"></i> 承認分析
                </a>
                <a href="../02_scraping/scraping.php" class="nav-link">
                    <i class="fas fa-spider"></i> データ取得
                </a>
                <a href="../05_editing/editing.php" class="nav-link">
                    <i class="fas fa-edit"></i> データ編集
                </a>
                <a href="../06_calculation/calculation.php" class="nav-link">
                    <i class="fas fa-calculator"></i> 送料計算
                </a>
                <a href="#" class="nav-link active">
                    <i class="fas fa-filter"></i> フィルター
                </a>
                <a href="../08_listing/listing.php" class="nav-link">
                    <i class="fas fa-store"></i> 出品管理
                </a>
                <a href="../09_inventory/inventory.php" class="nav-link">
                    <i class="fas fa-warehouse"></i> 在庫管理
                </a>
            </div>
        </div>

        <!-- メインコンテンツ -->
        <div class="main-dashboard">
            <div class="dashboard-header">
                <h1><i class="fas fa-filter"></i> 禁止キーワード管理システム</h1>
                <p>商品フィルタリング・禁止キーワード管理・リアルタイムチェック</p>
            </div>

            <!-- フィルタータブ（禁止キーワード管理システム） -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-filter"></i>
                    <h3 class="section-title">禁止キーワード管理システム</h3>
                    <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                        <button class="btn btn-success" onclick="uploadProhibitedCSV()">
                            <i class="fas fa-upload"></i> CSV アップロード
                        </button>
                        <button class="btn btn-info" onclick="addNewKeyword()">
                            <i class="fas fa-plus"></i> キーワード追加
                        </button>
                        <button class="btn btn-warning" onclick="exportKeywordCSV()">
                            <i class="fas fa-download"></i> CSV エクスポート
                        </button>
                    </div>
                </div>

                <!-- 統計ダッシュボード -->
                <div class="prohibited-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="totalKeywords">1,247</div>
                        <div class="stat-label">登録キーワード</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="highRiskKeywords">89</div>
                        <div class="stat-label">高リスク</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="detectedToday">23</div>
                        <div class="stat-label">今日の検出</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="lastUpdate">2分前</div>
                        <div class="stat-label">最終更新</div>
                    </div>
                </div>

                <!-- CSVドラッグ&ドロップエリア -->
                <div class="csv-upload-area" id="csvUploadArea">
                    <div class="drag-drop-area" onclick="document.getElementById('csvFileInput').click();" ondrop="handleCSVDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                        <input type="file" id="csvFileInput" accept=".csv" style="display: none;" onchange="handleCSVUpload(event)">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 0.5rem;"></i>
                        <div class="drag-drop-text">
                            <strong>CSVファイルをドラッグ&ドロップ</strong><br>
                            またはクリックしてファイルを選択
                        </div>
                        <div class="upload-requirements">
                            対応形式: CSV | 最大サイズ: 5MB | 最大行数: 10,000行
                        </div>
                    </div>
                </div>

                <!-- キーワードテーブル -->
                <div class="keyword-table-container">
                    <div class="table-controls">
                        <div class="selection-controls">
                            <input type="checkbox" id="selectAllKeywords" onchange="toggleAllKeywords()">
                            <label for="selectAllKeywords">全選択</label>
                            <span id="selectedKeywordCount" class="selection-count">0件選択中</span>
                        </div>
                    </div>

                    <div class="data-table-container">
                        <table class="data-table keyword-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px;"><input type="checkbox" id="selectAllTableKeywords"></th>
                                    <th style="width: 60px;">ID</th>
                                    <th style="width: 200px;">キーワード</th>
                                    <th style="width: 120px;">カテゴリ</th>
                                    <th style="width: 80px;">重要度</th>
                                    <th style="width: 80px;">検出回数</th>
                                    <th style="width: 100px;">登録日</th>
                                    <th style="width: 100px;">最終検出</th>
                                    <th style="width: 80px;">ステータス</th>
                                    <th style="width: 120px;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="keywordTableBody">
                                <tr>
                                    <td><input type="checkbox" class="keyword-checkbox" data-id="1"></td>
                                    <td>001</td>
                                    <td class="keyword-text">偽物</td>
                                    <td><span class="category-badge category-brand">ブランド</span></td>
                                    <td><span class="priority-badge priority-high">高</span></td>
                                    <td>127</td>
                                    <td>2025-09-01</td>
                                    <td>2025-09-10</td>
                                    <td><span class="status-badge status-active">有効</span></td>
                                    <td>
                                        <button class="btn-sm btn-warning" onclick="editKeyword(1)">編集</button>
                                        <button class="btn-sm btn-danger" onclick="deleteKeyword(1)">削除</button>
                                    </td>
                                </tr>
                                <tr>
                                    <td><input type="checkbox" class="keyword-checkbox" data-id="2"></td>
                                    <td>002</td>
                                    <td class="keyword-text">コピー品</td>
                                    <td><span class="category-badge category-brand">ブランド</span></td>
                                    <td><span class="priority-badge priority-medium">中</span></td>
                                    <td>89</td>
                                    <td>2025-09-02</td>
                                    <td>2025-09-09</td>
                                    <td><span class="status-badge status-active">有効</span></td>
                                    <td>
                                        <button class="btn-sm btn-warning" onclick="editKeyword(2)">編集</button>
                                        <button class="btn-sm btn-danger" onclick="deleteKeyword(2)">削除</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- リアルタイムタイトルチェック -->
                <div class="title-check-section">
                    <div class="section-header">
                        <i class="fas fa-shield-alt"></i>
                        <h4>リアルタイムタイトルチェック</h4>
                    </div>
                    <div class="title-check-container">
                        <textarea 
                            id="titleCheckInput" 
                            placeholder="商品タイトルを入力してリアルタイムチェック..."
                            class="title-input"
                            oninput="checkTitleRealtime()"
                        ></textarea>
                        <div class="check-result" id="titleCheckResult">
                            <div class="result-placeholder">
                                <i class="fas fa-info-circle"></i>
                                商品タイトルを入力すると、禁止キーワードをリアルタイムでチェックします
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="../shared/js/common.js"></script>
    <script src="../shared/js/api.js"></script>
    <script>
        // 禁止キーワード管理システム用JavaScript

        function uploadProhibitedCSV() {
            console.log('禁止キーワードCSVアップロード');
            document.getElementById('csvFileInput').click();
        }

        function addNewKeyword() {
            console.log('新規キーワード追加');
            const keyword = prompt('追加するキーワードを入力してください:');
            if (keyword) {
                // TODO: キーワード追加API呼び出し
                alert('キーワード「' + keyword + '」を追加しました。');
            }
        }

        function exportKeywordCSV() {
            console.log('キーワードCSVエクスポート');
            // TODO: CSVエクスポート実装
            alert('CSV出力機能は開発中です。');
        }

        function editKeyword(id) {
            console.log('キーワード編集:', id);
            // TODO: 編集機能実装
            alert('編集機能は開発中です。');
        }

        function deleteKeyword(id) {
            console.log('キーワード削除:', id);
            if (confirm('このキーワードを削除しますか？')) {
                // TODO: 削除API呼び出し
                alert('キーワードを削除しました。');
            }
        }

        function toggleAllKeywords() {
            const selectAll = document.getElementById('selectAllKeywords');
            const checkboxes = document.querySelectorAll('.keyword-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAll.checked);
            updateSelectedCount();
        }

        function updateSelectedCount() {
            const selected = document.querySelectorAll('.keyword-checkbox:checked').length;
            document.getElementById('selectedKeywordCount').textContent = selected + '件選択中';
        }

        function checkTitleRealtime() {
            const title = document.getElementById('titleCheckInput').value;
            const resultDiv = document.getElementById('titleCheckResult');
            
            if (title.trim() === '') {
                resultDiv.innerHTML = `
                    <div class="result-placeholder">
                        <i class="fas fa-info-circle"></i>
                        商品タイトルを入力すると、禁止キーワードをリアルタイムでチェックします
                    </div>
                `;
                return;
            }

            // 簡易チェック（実際はAPI呼び出し）
            const prohibitedWords = ['偽物', 'コピー品', 'レプリカ', 'fake', 'replica'];
            const foundWords = prohibitedWords.filter(word => 
                title.toLowerCase().includes(word.toLowerCase())
            );

            if (foundWords.length > 0) {
                resultDiv.innerHTML = `
                    <div class="check-result-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>警告: 禁止キーワードが検出されました</strong>
                        <div class="detected-words">
                            ${foundWords.map(word => `<span class="detected-word">${word}</span>`).join('')}
                        </div>
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="check-result-success">
                        <i class="fas fa-check-circle"></i>
                        <strong>安全: 禁止キーワードは検出されませんでした</strong>
                    </div>
                `;
            }
        }

        function handleCSVDrop(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                handleCSVUpload({target: {files: files}});
            }
        }

        function handleDragOver(event) {
            event.preventDefault();
            event.currentTarget.classList.add('drag-over');
        }

        function handleDragLeave(event) {
            event.preventDefault();
            event.currentTarget.classList.remove('drag-over');
        }

        function handleCSVUpload(event) {
            const file = event.target.files[0];
            if (file && file.type === 'text/csv') {
                console.log('CSVファイルアップロード:', file.name);
                // TODO: CSV処理実装
                alert('CSVファイル「' + file.name + '」をアップロードしました。処理機能は開発中です。');
            } else {
                alert('CSVファイルを選択してください。');
            }
        }

        // ページ読み込み時の初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('禁止キーワード管理システム初期化完了');
            
            // チェックボックスイベント設定
            document.querySelectorAll('.keyword-checkbox').forEach(cb => {
                cb.addEventListener('change', updateSelectedCount);
            });
        });
    </script>

    <style>
        /* フィルターシステム専用CSS */
        .prohibited-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--color-primary);
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .csv-upload-area {
            margin: 2rem 0;
        }

        .drag-drop-area {
            border: 2px dashed var(--border-color);
            border-radius: var(--radius-lg);
            padding: 3rem;
            text-align: center;
            cursor: pointer;
            transition: var(--transition-normal);
        }

        .drag-drop-area:hover,
        .drag-drop-area.drag-over {
            border-color: var(--color-primary);
            background: rgba(59, 130, 246, 0.05);
        }

        .drag-drop-text {
            margin-bottom: 1rem;
            color: var(--text-primary);
        }

        .upload-requirements {
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        .keyword-table-container {
            margin: 2rem 0;
        }

        .table-controls {
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .selection-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .selection-count {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .category-badge, .priority-badge, .status-badge {
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
        }

        .category-brand { background: #dbeafe; color: #1e40af; }
        .priority-high { background: #fecaca; color: #dc2626; }
        .priority-medium { background: #fed7aa; color: #ea580c; }
        .status-active { background: #dcfce7; color: #166534; }

        .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
            margin: 0 0.125rem;
        }

        .title-check-section {
            margin-top: 2rem;
            padding: 1.5rem;
            background: var(--bg-tertiary);
            border-radius: var(--radius-lg);
        }

        .title-check-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
        }

        .title-input {
            width: 100%;
            height: 120px;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            resize: vertical;
        }

        .check-result {
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: var(--bg-secondary);
        }

        .result-placeholder {
            text-align: center;
            color: var(--text-muted);
        }

        .check-result-danger {
            color: var(--color-danger);
        }

        .check-result-success {
            color: var(--color-success);
        }

        .detected-words {
            margin-top: 0.5rem;
        }

        .detected-word {
            display: inline-block;
            background: var(--color-danger);
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-sm);
            margin: 0.125rem;
            font-size: 0.75rem;
        }
    </style>
</body>
</html>
