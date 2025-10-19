<?php
/**
 * Yahoo Auction Tool - eBayカテゴリー自動判定タブ統合版
 * 既存システムに新機能を安全に追加
 */

// 既存ファイルを読み込み
$existing_file = '/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/content_php/yahoo_auction_tool_content.php';

if (file_exists($existing_file)) {
    $existing_content = file_get_contents($existing_file);
    
    // タブナビゲーションに新しいタブを追加
    $new_tab_button = '
                <button class="tab-btn" data-tab="ebay-category" onclick="switchTab(\'ebay-category\')">
                    <i class="fas fa-tags"></i>
                    カテゴリー自動判定
                </button>';
    
    // タブナビゲーションの最後に追加
    $tab_nav_end = '</div>';
    $existing_content = str_replace(
        $tab_nav_end,
        $new_tab_button . "\n            " . $tab_nav_end,
        $existing_content
    );
    
    // 新しいタブコンテンツを追加
    $new_tab_content = '
            <!-- eBayカテゴリー自動判定タブ -->
            <div id="ebay-category" class="tab-content fade-in">
                <div class="section">
                    <!-- ヘッダー -->
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fas fa-tags"></i>
                            eBayカテゴリー自動判定システム
                        </h3>
                        <div style="display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="showEbayCategoryHelp()">
                                <i class="fas fa-question-circle"></i> ヘルプ
                            </button>
                            <button class="btn btn-success" onclick="showSampleCSV()">
                                <i class="fas fa-file-csv"></i> サンプル
                            </button>
                        </div>
                    </div>

                    <!-- 機能説明 -->
                    <div class="notification info" style="margin-bottom: var(--space-lg);">
                        <i class="fas fa-info-circle"></i>
                        <div>
                            <strong>自動カテゴリー判定システム</strong><br>
                            商品タイトルから最適なeBayカテゴリーを自動選択し、必須項目（Item Specifics）を生成します。<br>
                            <strong>開発状況:</strong> 📋 フロントエンド完成 | 🔧 バックエンドAPI開発中（Gemini担当）
                        </div>
                    </div>

                    <!-- CSVアップロードセクション -->
                    <div class="card" style="margin-bottom: var(--space-lg);">
                        <div class="section-header">
                            <h4 style="margin: 0; display: flex; align-items: center; gap: var(--space-sm);">
                                <i class="fas fa-upload"></i>
                                CSVファイルアップロード
                            </h4>
                        </div>

                        <div class="csv-upload-container" 
                             id="ebayCsvUploadContainer" 
                             onclick="document.getElementById(\'ebayCsvFileInput\').click()"
                             ondrop="handleEbayCsvDrop(event)" 
                             ondragover="handleDragOver(event)" 
                             ondragleave="handleDragLeave(event)"
                             style="border: 2px dashed var(--border-color); border-radius: var(--radius-lg); padding: var(--space-xl); text-align: center; cursor: pointer; transition: all 0.3s ease; margin: var(--space-md) 0;">
                            
                            <input type="file" id="ebayCsvFileInput" accept=".csv" style="display: none;" onchange="handleEbayCsvUpload(event)">
                            
                            <i class="fas fa-cloud-upload-alt" style="font-size: 3rem; color: var(--primary-color); margin-bottom: var(--space-md);"></i>
                            
                            <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-sm);">
                                CSVファイルをドラッグ&ドロップ
                            </div>
                            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: var(--space-md);">
                                または、クリックしてファイルを選択
                            </div>
                            
                            <div style="display: flex; justify-content: center; gap: var(--space-sm); flex-wrap: wrap;">
                                <span style="padding: 0.25rem 0.5rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 0.25rem; font-size: 0.75rem;">.CSV</span>
                                <span style="padding: 0.25rem 0.5rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 0.25rem; font-size: 0.75rem;">最大5MB</span>
                                <span style="padding: 0.25rem 0.5rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 0.25rem; font-size: 0.75rem;">最大10,000行</span>
                            </div>
                        </div>

                        <!-- 必須CSV形式説明 -->
                        <div class="notification warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <strong>必須CSV形式:</strong><br>
                                <code style="background: var(--bg-tertiary); padding: 0.25rem; border-radius: 0.25rem;">title,price,description,yahoo_category,image_url</code><br>
                                各列には商品タイトル、価格、説明、Yahooカテゴリ、画像URLを記載してください。
                            </div>
                        </div>
                    </div>

                    <!-- 処理進行状況 -->
                    <div id="ebayProcessingProgress" style="display: none; background: var(--bg-secondary); border-radius: var(--radius-lg); padding: var(--space-lg); margin-bottom: var(--space-lg); box-shadow: var(--shadow-md);">
                        <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md);">
                            <i class="fas fa-cog fa-spin" style="font-size: 1.5rem; color: var(--primary-color);"></i>
                            <div>
                                <div style="font-size: 1.125rem; font-weight: 700;">カテゴリー判定処理中...</div>
                                <div style="color: var(--text-secondary); font-size: 0.875rem;">商品データを解析してeBayカテゴリーを自動判定しています</div>
                            </div>
                        </div>
                        
                        <div style="background: var(--bg-tertiary); border-radius: 0.5rem; height: 1rem; overflow: hidden; margin-bottom: var(--space-sm);">
                            <div id="ebayProgressBar" style="height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--success-color)); border-radius: 0.5rem; width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <div id="ebayProgressText" style="font-size: 0.875rem; color: var(--text-secondary); text-align: center;">処理開始...</div>
                    </div>

                    <!-- 単一商品テストセクション -->
                    <div class="card" style="background: var(--bg-secondary); margin-bottom: var(--space-lg);">
                        <div class="section-header">
                            <h4 style="margin: 0; display: flex; align-items: center; gap: var(--space-sm);">
                                <i class="fas fa-search"></i>
                                単一商品テスト
                            </h4>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-md); align-items: end;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品タイトル</label>
                                <input 
                                    type="text" 
                                    id="ebaySingleTestTitle" 
                                    placeholder="例: iPhone 14 Pro 128GB Space Black"
                                    style="width: 100%; padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md);"
                                >
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">価格（USD）</label>
                                <input 
                                    type="number" 
                                    id="ebaySingleTestPrice" 
                                    placeholder="999.99"
                                    step="0.01"
                                    min="0"
                                    style="width: 100%; padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md);"
                                >
                            </div>
                        </div>
                        
                        <div style="margin-top: var(--space-md); text-align: center;">
                            <button class="btn btn-primary" onclick="testEbaySingleProduct()" style="padding: var(--space-sm) var(--space-xl);">
                                <i class="fas fa-magic"></i> カテゴリー判定テスト
                            </button>
                        </div>
                        
                        <div id="ebaySingleTestResult" style="margin-top: var(--space-md); display: none;">
                            <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--space-md);">
                                <h5 style="margin-bottom: var(--space-sm);">判定結果:</h5>
                                <div id="ebaySingleTestResultContent"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 結果表示（デモ用） -->
                    <div class="card">
                        <h4 style="margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);">
                            <i class="fas fa-chart-bar"></i>
                            処理結果プレビュー（デモ）
                        </h4>
                        
                        <div style="overflow-x: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>商品タイトル</th>
                                        <th>価格</th>
                                        <th>判定カテゴリー</th>
                                        <th>判定精度</th>
                                        <th>必須項目</th>
                                        <th>ステータス</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>iPhone 14 Pro 128GB</td>
                                        <td>$999.99</td>
                                        <td>
                                            <span style="padding: 0.25rem 0.5rem; background: #dcfce7; color: #166534; border-radius: 0.25rem; font-size: 0.75rem;">
                                                Cell Phones & Smartphones
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 0.25rem;">
                                                <div style="width: 60px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                                                    <div style="width: 95%; height: 100%; background: #10b981; border-radius: 3px;"></div>
                                                </div>
                                                <span>95%</span>
                                            </div>
                                        </td>
                                        <td style="font-family: monospace; font-size: 0.75rem;">Brand=Apple■Model=iPhone 14 Pro■Storage=128GB</td>
                                        <td>
                                            <span style="padding: 0.25rem 0.5rem; background: #fef3c7; color: #92400e; border-radius: 0.25rem; font-size: 0.75rem;">
                                                承認待ち
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Canon EOS R6 ミラーレス</td>
                                        <td>$2,499.99</td>
                                        <td>
                                            <span style="padding: 0.25rem 0.5rem; background: #dcfce7; color: #166534; border-radius: 0.25rem; font-size: 0.75rem;">
                                                Cameras & Photo
                                            </span>
                                        </td>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 0.25rem;">
                                                <div style="width: 60px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                                                    <div style="width: 88%; height: 100%; background: #10b981; border-radius: 3px;"></div>
                                                </div>
                                                <span>88%</span>
                                            </div>
                                        </td>
                                        <td style="font-family: monospace; font-size: 0.75rem;">Brand=Canon■Type=Mirrorless■Model=EOS R6</td>
                                        <td>
                                            <span style="padding: 0.25rem 0.5rem; background: #fef3c7; color: #92400e; border-radius: 0.25rem; font-size: 0.75rem;">
                                                承認待ち
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 開発状況表示 -->
                    <div class="notification warning" style="margin-top: var(--space-xl);">
                        <i class="fas fa-code"></i>
                        <div>
                            <strong>開発状況:</strong><br>
                            📋 <strong>フロントエンド（Claude担当）:</strong> ✅ 完成<br>
                            🔧 <strong>バックエンド（Gemini担当）:</strong> 🚧 開発中<br>
                            📊 <strong>統合テスト:</strong> ⏳ バックエンド完成後実施予定
                        </div>
                    </div>
                </div>
            </div>';
    
    // 最後のタブコンテンツの後に追加（</div>直前）
    $content_end_marker = '        </div>

    <!-- システムログ -->';
    $existing_content = str_replace($content_end_marker, $new_tab_content . "\n" . $content_end_marker, $existing_content);
    
    // eBayカテゴリー機能用JavaScriptを追加
    $ebay_js = '
        // eBayカテゴリー自動判定機能
        function showEbayCategoryHelp() {
            alert("eBayカテゴリー自動判定システム\\n\\n商品タイトルから最適なeBayカテゴリーを自動判定し、必須項目を生成します。\\n\\n現在、バックエンドAPIの開発中です（Gemini担当）。");
        }
        
        function showSampleCSV() {
            const sampleContent = `title,price,description,yahoo_category,image_url
"iPhone 14 Pro 128GB",999.99,"美品です","携帯電話","https://example.com/image.jpg"
"Canon EOS R6",2499.99,"ミラーレスカメラ","カメラ","https://example.com/camera.jpg"`;
            
            const blob = new Blob([sampleContent], { type: \'text/csv\' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement(\'a\');
            a.href = url;
            a.download = \'ebay_category_sample.csv\';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        function handleEbayCsvDrop(e) {
            e.preventDefault();
            e.stopPropagation();
            const container = document.getElementById(\'ebayCsvUploadContainer\');
            container.classList.remove(\'drag-over\');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processEbayCsvFile(files[0]);
            }
        }
        
        function handleEbayCsvUpload(e) {
            const file = e.target.files[0];
            if (file) {
                processEbayCsvFile(file);
            }
        }
        
        function processEbayCsvFile(file) {
            console.log(\'CSVファイル処理:\', file.name);
            
            // プログレス表示
            const progressDiv = document.getElementById(\'ebayProcessingProgress\');
            progressDiv.style.display = \'block\';
            
            // デモ用プログレス
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    
                    setTimeout(() => {
                        progressDiv.style.display = \'none\';
                        alert(\'処理完了（デモ）\\n\\n実際の処理はバックエンドAPI実装後に動作します。\');
                    }, 1000);
                }
                
                document.getElementById(\'ebayProgressBar\').style.width = progress + \'%\';
                document.getElementById(\'ebayProgressText\').textContent = `処理中... ${Math.round(progress)}%`;
            }, 500);
        }
        
        function testEbaySingleProduct() {
            const title = document.getElementById(\'ebaySingleTestTitle\').value.trim();
            const price = document.getElementById(\'ebaySingleTestPrice\').value;
            
            if (!title) {
                alert(\'商品タイトルを入力してください\');
                return;
            }
            
            // 結果表示エリア
            const resultDiv = document.getElementById(\'ebaySingleTestResult\');
            const contentDiv = document.getElementById(\'ebaySingleTestResultContent\');
            
            resultDiv.style.display = \'block\';
            contentDiv.innerHTML = `
                <div style="text-align: center; padding: var(--space-lg);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color); margin-bottom: var(--space-sm);"></i><br>
                    カテゴリーを判定中...
                </div>
            `;
            
            // デモ用結果生成
            setTimeout(() => {
                const mockResult = generateMockEbayResult(title, price);
                contentDiv.innerHTML = mockResult;
            }, 2000);
        }
        
        function generateMockEbayResult(title, price) {
            const titleLower = title.toLowerCase();
            let category = \'その他\';
            let confidence = 30;
            let itemSpecifics = \'Brand=Unknown■Condition=Used\';
            
            if (titleLower.includes(\'iphone\')) {
                category = \'Cell Phones & Smartphones\';
                confidence = 95;
                itemSpecifics = \'Brand=Apple■Model=iPhone 14 Pro■Storage=128GB■Color=Space Black■Condition=Used\';
            } else if (titleLower.includes(\'camera\') || titleLower.includes(\'カメラ\')) {
                category = \'Cameras & Photo\';
                confidence = 90;
                itemSpecifics = \'Brand=Canon■Type=Mirrorless■Model=EOS R6■Condition=Used\';
            } else if (titleLower.includes(\'pokemon\') || titleLower.includes(\'ポケモン\')) {
                category = \'Trading Card Games\';
                confidence = 88;
                itemSpecifics = \'Game=Pokémon■Card Type=Promo■Condition=Near Mint\';
            }
            
            const confidenceColor = confidence >= 80 ? \'#10b981\' : confidence >= 50 ? \'#f59e0b\' : \'#ef4444\';
            
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-md);">
                    <div>
                        <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">判定カテゴリー</h6>
                        <div style="padding: 0.25rem 0.5rem; background: #dcfce7; color: #166534; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; display: inline-block;">
                            ${category}
                        </div>
                    </div>
                    
                    <div>
                        <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">判定精度</h6>
                        <div style="display: flex; align-items: center; gap: 0.25rem;">
                            <div style="width: 80px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                                <div style="width: ${confidence}%; height: 100%; background: ${confidenceColor}; border-radius: 3px;"></div>
                            </div>
                            <span style="font-weight: 600;">${confidence}%</span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">生成された必須項目</h6>
                    <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--space-sm); font-family: monospace; font-size: 0.75rem; color: var(--text-secondary);">
                        ${itemSpecifics.replace(/■/g, \' | \')}
                    </div>
                </div>
                
                <div class="notification info" style="margin-top: var(--space-md);">
                    <i class="fas fa-info-circle"></i>
                    <span><strong>デモ結果:</strong> 実際の判定はバックエンドAPI実装後に動作します。</span>
                </div>
            `;
        }
        
        // ドラッグ&ドロップ用イベントハンドラー
        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.classList.add(\'drag-over\');
            e.currentTarget.style.borderColor = \'var(--success-color)\';
            e.currentTarget.style.background = \'rgba(16, 185, 129, 0.1)\';
        }
        
        function handleDragLeave(e) {
            e.preventDefault();
            e.currentTarget.classList.remove(\'drag-over\');
            e.currentTarget.style.borderColor = \'var(--border-color)\';
            e.currentTarget.style.background = \'transparent\';
        }';
    
    // 既存のJavaScriptセクションに追加
    $js_end_marker = '        console.log(\'Yahoo Auction Tool (完全修正統合版) ページ初期化完了\');';
    $existing_content = str_replace(
        $js_end_marker,
        $js_end_marker . "\n" . $ebay_js,
        $existing_content
    );
    
} else {
    // 既存ファイルが見つからない場合のメッセージ
    $existing_content = "<?php\n// エラー: 既存のYahoo Auction Toolファイルが見つかりません。\n// パス: $existing_file\necho 'システムファイルが見つかりません。';\n?>";
}

echo $existing_content;
?>