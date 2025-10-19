<?php
/**
 * eBayカテゴリー自動判定システム - メイン画面
 * 既存Yahoo Auction Toolへの新機能追加
 */

// セキュリティ・セッション管理
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// APIエンドポイント処理（簡易版）
if (isset($_GET['action']) || isset($_POST['action'])) {
    header('Content-Type: application/json; charset=utf-8');
    
    $response = [
        'success' => false,
        'message' => 'この機能は開発中です。バックエンドAPI（Gemini担当）の実装をお待ちください。',
        'data' => null
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBayカテゴリー自動判定システム</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- 既存システムCSS変数の継承 -->
    <style>
        :root {
            --primary-color: #3b82f6;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --radius-md: 0.375rem;
            --radius-lg: 0.5rem;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        /* 基本リセット */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }
    </style>
    
    <!-- eBayカテゴリーシステム専用CSS -->
    <link rel="stylesheet" href="css/ebay_category_tool.css">
</head>

<body>
    <!-- メイン画面 -->
    <div id="ebay-category" class="tab-content">
        <div class="section">
            <!-- ヘッダー -->
            <div class="section-header">
                <h3 class="section-title">
                    <i class="fas fa-tags"></i>
                    eBayカテゴリー自動判定システム
                </h3>
                <div style="display: flex; gap: var(--space-sm);">
                    <button class="btn btn-info" onclick="showHelp()">
                        <i class="fas fa-question-circle"></i> ヘルプ
                    </button>
                    <button class="btn btn-success" onclick="showSampleCSV()">
                        <i class="fas fa-file-csv"></i> サンプルCSV
                    </button>
                </div>
            </div>

            <!-- 機能説明 -->
            <div class="notification info" style="margin-bottom: var(--space-lg);">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>自動カテゴリー判定システム</strong><br>
                    商品タイトルから最適なeBayカテゴリーを自動選択し、必須項目（Item Specifics）を生成します。<br>
                    CSVファイルをアップロードして一括処理が可能です。
                </div>
            </div>

            <!-- CSVアップロードセクション -->
            <div class="category-detection-section">
                <div class="section-header">
                    <h4 style="margin: 0; display: flex; align-items: center; gap: var(--space-sm);">
                        <i class="fas fa-upload"></i>
                        CSVファイルアップロード
                    </h4>
                </div>

                <div class="csv-upload-container" id="csvUploadContainer">
                    <input type="file" id="csvFileInput" accept=".csv" style="display: none;">
                    
                    <div class="upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    
                    <div class="upload-text">CSVファイルをドラッグ&ドロップ</div>
                    <div class="upload-subtitle">または、クリックしてファイルを選択</div>
                    
                    <div class="supported-formats">
                        <span class="format-tag">.CSV</span>
                        <span class="format-tag">最大5MB</span>
                        <span class="format-tag">最大10,000行</span>
                    </div>
                    
                    <button class="btn btn-primary" id="csvUploadButton" style="margin-top: var(--space-md);">
                        <i class="fas fa-folder-open"></i> ファイルを選択
                    </button>
                </div>

                <!-- 必須CSV形式説明 -->
                <div class="notification warning" style="margin-top: var(--space-md);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <strong>必須CSV形式:</strong><br>
                        <code>title,price,description,yahoo_category,image_url</code><br>
                        各列にはそれぞれ商品タイトル、価格、説明、Yahooカテゴリ、画像URLを記載してください。
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
                        <div class="progress-title">カテゴリー判定処理中...</div>
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">
                            商品データを解析してeBayカテゴリーを自動判定しています
                        </div>
                    </div>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar" style="width: 0%"></div>
                </div>
                <div class="progress-text" id="progressText">処理開始...</div>
            </div>

            <!-- 単一商品テストセクション -->
            <div class="category-detection-section" style="background: var(--bg-secondary);">
                <div class="section-header">
                    <h4 style="margin: 0; display: flex; align-items: center; gap: var(--space-sm);">
                        <i class="fas fa-search"></i>
                        単一商品テスト
                    </h4>
                </div>
                
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-md); align-items: end;">
                    <div class="form-group">
                        <label class="form-label">商品タイトル</label>
                        <input 
                            type="text" 
                            id="singleTestTitle" 
                            class="form-input" 
                            placeholder="例: iPhone 14 Pro 128GB Space Black"
                            style="width: 100%;"
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
                </div>
                
                <div style="margin-top: var(--space-md); text-align: center;">
                    <button class="btn btn-primary" onclick="testSingleProduct()" style="padding: var(--space-sm) var(--space-xl);">
                        <i class="fas fa-magic"></i> カテゴリー判定テスト
                    </button>
                </div>
                
                <div id="singleTestResult" style="margin-top: var(--space-md); display: none;">
                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--space-md);">
                        <h5 style="margin-bottom: var(--space-sm);">判定結果:</h5>
                        <div id="singleTestResultContent"></div>
                    </div>
                </div>
            </div>

            <!-- 結果表示セクション -->
            <div id="resultsSection" class="results-section" style="display: none;">
                <div class="results-header">
                    <div class="results-title">
                        <i class="fas fa-chart-bar"></i>
                        処理結果
                    </div>
                    <div class="results-stats">
                        <div class="stat-item">
                            <div class="stat-value" id="totalProcessed">0</div>
                            <div class="stat-label">総処理数</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="highConfidence">0</div>
                            <div class="stat-label">高精度</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="mediumConfidence">0</div>
                            <div class="stat-label">中精度</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="lowConfidence">0</div>
                            <div class="stat-label">低精度</div>
                        </div>
                    </div>
                </div>

                <!-- 一括操作パネル -->
                <div class="bulk-operations" id="bulkOperations">
                    <div class="bulk-selection-info">
                        <i class="fas fa-check-square"></i>
                        <span id="selectedCount">0</span>件を選択中
                    </div>
                    <div class="bulk-actions-buttons">
                        <button class="btn btn-success" id="bulkApproveBtn">
                            <i class="fas fa-check"></i> 一括承認
                        </button>
                        <button class="btn btn-danger" id="bulkRejectBtn">
                            <i class="fas fa-times"></i> 一括否認
                        </button>
                        <button class="btn btn-info" id="exportCsvBtn">
                            <i class="fas fa-download"></i> CSV出力
                        </button>
                        <button class="btn btn-secondary" onclick="ebayCategorySystem.clearSelection()">
                            <i class="fas fa-square"></i> 選択解除
                        </button>
                    </div>
                </div>

                <!-- 結果データテーブル -->
                <div style="overflow-x: auto;">
                    <table class="data-table-enhanced" id="resultsTable">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" id="selectAllResults">
                                </th>
                                <th style="width: 300px;">商品タイトル</th>
                                <th style="width: 80px;">価格</th>
                                <th style="width: 200px;">判定カテゴリー</th>
                                <th style="width: 120px;">判定精度</th>
                                <th style="width: 250px;">必須項目</th>
                                <th style="width: 100px;">ステータス</th>
                                <th style="width: 120px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="resultsTableBody">
                            <tr>
                                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                                    <i class="fas fa-upload" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i><br>
                                    CSVファイルをアップロードして処理を開始してください
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- ページネーション -->
                <div style="display: flex; justify-content: center; align-items: center; margin-top: var(--space-lg); gap: var(--space-md);">
                    <button class="btn btn-secondary" id="prevPageBtn" disabled>
                        <i class="fas fa-chevron-left"></i> 前へ
                    </button>
                    <span id="pageInfo" style="color: var(--text-secondary);">ページ 1/1</span>
                    <button class="btn btn-secondary" id="nextPageBtn" disabled>
                        次へ <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            <!-- 開発状況表示 -->
            <div class="notification warning" style="margin-top: var(--space-xl);">
                <i class="fas fa-code"></i>
                <div>
                    <strong>開発状況:</strong><br>
                    📋 <strong>フロントエンド（Claude担当）:</strong> ✅ 完成 - UI・JavaScript実装完了<br>
                    🔧 <strong>バックエンド（Gemini担当）:</strong> 🚧 開発中 - PHP API・データベース実装待ち<br>
                    📊 <strong>統合テスト:</strong> ⏳ 待機中 - バックエンド完成後に実施予定
                </div>
            </div>
        </div>
    </div>

    <!-- ヘルプモーダル -->
    <div id="helpModal" class="edit-modal">
        <div class="edit-modal-content" style="max-width: 800px;">
            <div class="edit-modal-header">
                <h3 class="edit-modal-title">
                    <i class="fas fa-question-circle"></i>
                    eBayカテゴリー自動判定システム - ヘルプ
                </h3>
                <button class="edit-modal-close" onclick="closeHelpModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="edit-modal-body">
                <div style="line-height: 1.8;">
                    <h4 style="color: var(--primary-color); margin-bottom: var(--space-md);">
                        <i class="fas fa-info-circle"></i> システム概要
                    </h4>
                    <p style="margin-bottom: var(--space-lg);">
                        このシステムは商品タイトルを解析し、最適なeBayカテゴリーを自動判定します。
                        また、選定されたカテゴリーに応じた必須項目（Item Specifics）を自動生成します。
                    </p>
                    
                    <h4 style="color: var(--primary-color); margin-bottom: var(--space-md);">
                        <i class="fas fa-file-csv"></i> CSVファイル形式
                    </h4>
                    <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-lg);">
                        <strong>必須列：</strong><br>
                        <code style="background: var(--bg-secondary); padding: 0.25rem; border-radius: 0.25rem;">
                            title, price, description, yahoo_category, image_url
                        </code><br><br>
                        <strong>例：</strong><br>
                        <code style="background: var(--bg-secondary); padding: 0.25rem; border-radius: 0.25rem; font-size: 0.8rem;">
                            "iPhone 14 Pro 128GB",999.99,"美品です","携帯電話","https://example.com/image.jpg"
                        </code>
                    </div>
                    
                    <h4 style="color: var(--primary-color); margin-bottom: var(--space-md);">
                        <i class="fas fa-cogs"></i> 処理フロー
                    </h4>
                    <ol style="margin-bottom: var(--space-lg);">
                        <li><strong>カテゴリー判定:</strong> 商品タイトルから最適なeBayカテゴリーを選択</li>
                        <li><strong>信頼度計算:</strong> 判定結果の精度を0-100%で表示</li>
                        <li><strong>必須項目生成:</strong> カテゴリーに応じたItem Specificsを自動作成</li>
                        <li><strong>結果確認:</strong> 判定結果を確認し、必要に応じて編集</li>
                        <li><strong>CSV出力:</strong> 処理結果をCSVファイルで出力</li>
                    </ol>
                    
                    <h4 style="color: var(--primary-color); margin-bottom: var(--space-md);">
                        <i class="fas fa-lightbulb"></i> 使用のコツ
                    </h4>
                    <ul style="margin-bottom: var(--space-lg);">
                        <li>商品タイトルは具体的で詳細な情報を含める</li>
                        <li>ブランド名・モデル名・色・サイズなどを明記</li>
                        <li>判定精度が低い場合は手動で編集</li>
                        <li>一括操作で効率的に承認・否認を実行</li>
                    </ul>
                    
                    <div class="notification info">
                        <i class="fas fa-phone"></i>
                        <strong>サポート:</strong> 不明な点がございましたら、システム管理者までお問い合わせください。
                    </div>
                </div>
            </div>
            
            <div class="edit-modal-footer">
                <button class="btn btn-primary" onclick="closeHelpModal()">理解しました</button>
            </div>
        </div>
    </div>

    <!-- サンプルCSVモーダル -->
    <div id="sampleCsvModal" class="edit-modal">
        <div class="edit-modal-content">
            <div class="edit-modal-header">
                <h3 class="edit-modal-title">
                    <i class="fas fa-file-csv"></i>
                    サンプルCSV
                </h3>
                <button class="edit-modal-close" onclick="closeSampleCsvModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="edit-modal-body">
                <p style="margin-bottom: var(--space-md);">以下の形式でCSVファイルを作成してください：</p>
                
                <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
                    <h5 style="margin-bottom: var(--space-sm);">ヘッダー行：</h5>
                    <code style="background: var(--bg-secondary); padding: var(--space-sm); border-radius: var(--radius-sm); display: block; overflow-x: auto;">
                        title,price,description,yahoo_category,image_url
                    </code>
                </div>
                
                <div style="background: var(--bg-tertiary); padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-md);">
                    <h5 style="margin-bottom: var(--space-sm);">データ例：</h5>
                    <code style="background: var(--bg-secondary); padding: var(--space-sm); border-radius: var(--radius-sm); display: block; overflow-x: auto; font-size: 0.8rem; line-height: 1.4;">
"iPhone 14 Pro 128GB Space Black",999.99,"美品のiPhone 14 Pro","携帯電話","https://example.com/iphone.jpg"<br>
"Canon EOS R6 ミラーレスカメラ",2499.99,"プロ仕様のミラーレスカメラ","カメラ","https://example.com/camera.jpg"<br>
"ポケモンカード ピカチュウ プロモ",149.99,"限定プロモーションカード","トレーディングカード","https://example.com/pokemon.jpg"
                    </code>
                </div>
                
                <div class="notification warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>注意点:</strong><br>
                    • カンマが含まれる場合は、ダブルクォートで囲んでください<br>
                    • 日本語文字は UTF-8 エンコーディングで保存してください<br>
                    • 価格は数値のみ（通貨記号なし）で入力してください
                </div>
            </div>
            
            <div class="edit-modal-footer">
                <button class="btn btn-success" onclick="downloadSampleCSV()">
                    <i class="fas fa-download"></i> サンプルCSVダウンロード
                </button>
                <button class="btn btn-secondary" onclick="closeSampleCsvModal()">閉じる</button>
            </div>
        </div>
    </div>

    <!-- JavaScript読み込み -->
    <script src="js/ebay_category_tool.js"></script>
    
    <!-- ページ固有JavaScript -->
    <script>
        // ヘルプモーダル制御
        function showHelp() {
            document.getElementById('helpModal').classList.add('active');
        }
        
        function closeHelpModal() {
            document.getElementById('helpModal').classList.remove('active');
        }
        
        // サンプルCSVモーダル制御
        function showSampleCSV() {
            document.getElementById('sampleCsvModal').classList.add('active');
        }
        
        function closeSampleCsvModal() {
            document.getElementById('sampleCsvModal').classList.remove('active');
        }
        
        // サンプルCSVダウンロード
        function downloadSampleCSV() {
            const csvContent = `title,price,description,yahoo_category,image_url
"iPhone 14 Pro 128GB Space Black",999.99,"美品のiPhone 14 Pro","携帯電話","https://example.com/iphone.jpg"
"Canon EOS R6 ミラーレスカメラ",2499.99,"プロ仕様のミラーレスカメラ","カメラ","https://example.com/camera.jpg"
"ポケモンカード ピカチュウ プロモ",149.99,"限定プロモーションカード","トレーディングカード","https://example.com/pokemon.jpg"
"Nintendo Switch 有機ELモデル",349.99,"任天堂の最新ゲーム機","ゲーム機","https://example.com/switch.jpg"
"Apple Watch Series 9 45mm",399.99,"最新のApple Watch","時計","https://example.com/watch.jpg"`;
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'ebay_category_sample.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            // メッセージ表示（ebayCategorySystemが存在する場合）
            if (typeof ebayCategorySystem !== 'undefined') {
                ebayCategorySystem.showMessage('サンプルCSVをダウンロードしました', 'success');
            }
        }
        
        // 単一商品テスト機能
        async function testSingleProduct() {
            const title = document.getElementById('singleTestTitle').value.trim();
            const price = document.getElementById('singleTestPrice').value;
            
            if (!title) {
                alert('商品タイトルを入力してください');
                return;
            }
            
            // 結果表示エリア
            const resultDiv = document.getElementById('singleTestResult');
            const contentDiv = document.getElementById('singleTestResultContent');
            
            // ローディング表示
            resultDiv.style.display = 'block';
            contentDiv.innerHTML = `
                <div style="text-align: center; padding: var(--space-lg);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color); margin-bottom: var(--space-sm);"></i><br>
                    カテゴリーを判定中...
                </div>
            `;
            
            try {
                // APIリクエスト（モック）
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
                
                // モック結果生成
                const mockResult = generateMockCategoryResult(title, price);
                displaySingleTestResult(mockResult);
                
            } catch (error) {
                console.error('テストエラー:', error);
                contentDiv.innerHTML = `
                    <div style="color: var(--danger-color); text-align: center; padding: var(--space-lg);">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        テスト中にエラーが発生しました
                    </div>
                `;
            }
        }
        
        // モック結果生成
        function generateMockCategoryResult(title, price) {
            const titleLower = title.toLowerCase();
            
            // 簡単なキーワードマッチング
            let category = { id: '99999', name: 'その他' };
            let confidence = 30;
            
            if (titleLower.includes('iphone') || titleLower.includes('smartphone')) {
                category = { id: '9355', name: 'Cell Phones & Smartphones' };
                confidence = 95;
            } else if (titleLower.includes('camera') || titleLower.includes('カメラ')) {
                category = { id: '625', name: 'Cameras & Photo' };
                confidence = 90;
            } else if (titleLower.includes('pokemon') || titleLower.includes('ポケモン')) {
                category = { id: '2536', name: 'Trading Card Games' };
                confidence = 88;
            } else if (titleLower.includes('watch') || titleLower.includes('時計')) {
                category = { id: '31387', name: 'Wristwatches' };
                confidence = 85;
            } else if (titleLower.includes('nintendo') || titleLower.includes('switch')) {
                category = { id: '139971', name: 'Video Game Consoles' };
                confidence = 92;
            }
            
            return {
                category: category,
                confidence: confidence,
                item_specifics: generateMockItemSpecifics(category.name, title),
                matched_keywords: extractKeywords(title)
            };
        }
        
        // モック必須項目生成
        function generateMockItemSpecifics(categoryName, title) {
            const specifics = [];
            
            if (categoryName.includes('Cell Phones')) {
                specifics.push('Brand=Apple');
                specifics.push('Model=iPhone 14 Pro');
                specifics.push('Storage Capacity=128 GB');
                specifics.push('Color=Space Black');
                specifics.push('Condition=Used');
            } else if (categoryName.includes('Camera')) {
                specifics.push('Brand=Canon');
                specifics.push('Type=Mirrorless');
                specifics.push('Model=EOS R6');
                specifics.push('Condition=Used');
            } else {
                specifics.push('Brand=Unknown');
                specifics.push('Condition=Used');
                specifics.push('Material=Unknown');
            }
            
            return specifics.join('■');
        }
        
        // キーワード抽出
        function extractKeywords(title) {
            const commonKeywords = ['iPhone', 'Canon', 'Pokemon', 'Nintendo', 'Apple', 'Watch'];
            return commonKeywords.filter(keyword => 
                title.toLowerCase().includes(keyword.toLowerCase())
            );
        }
        
        // 単一テスト結果表示
        function displaySingleTestResult(result) {
            const contentDiv = document.getElementById('singleTestResultContent');
            const confidenceLevel = result.confidence >= 80 ? 'high' : result.confidence >= 50 ? 'medium' : 'low';
            
            contentDiv.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                    <div>
                        <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">判定カテゴリー</h6>
                        <div class="category-badge category-badge--${confidenceLevel}">
                            ${result.category.name}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: var(--space-xs);">
                            ID: ${result.category.id}
                        </div>
                    </div>
                    
                    <div>
                        <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">判定精度</h6>
                        <div class="confidence-meter">
                            <div class="confidence-bar" style="width: 80px;">
                                <div class="confidence-fill confidence-fill--${confidenceLevel}" style="width: ${result.confidence}%"></div>
                            </div>
                            <span style="font-weight: 600;">${result.confidence}%</span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: var(--space-md);">
                    <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">生成された必須項目</h6>
                    <div class="item-specifics-container" style="max-width: none; white-space: normal;">
                        ${result.item_specifics.replace(/■/g, ' | ')}
                    </div>
                </div>
                
                ${result.matched_keywords.length > 0 ? `
                <div style="margin-top: var(--space-md);">
                    <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">検出キーワード</h6>
                    <div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
                        ${result.matched_keywords.map(keyword => 
                            `<span style="padding: 0.25rem 0.5rem; background: var(--bg-tertiary); border-radius: 0.25rem; font-size: 0.75rem;">${keyword}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
            `;
        }
        
        // ページ初期化時の処理
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ eBayカテゴリー自動判定システム UI初期化完了');
            
            // モーダル外クリックで閉じる
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('edit-modal')) {
                    e.target.classList.remove('active');
                }
            });
        });
    </script>
</body>
</html>