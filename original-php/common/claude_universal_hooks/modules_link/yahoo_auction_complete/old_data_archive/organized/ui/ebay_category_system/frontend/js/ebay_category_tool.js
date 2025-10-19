/**
 * eBayカテゴリ自動判定システム - フロントエンドJavaScript
 * Yahoo Auction Tool統合版
 */

console.log('🏷️ eBayカテゴリシステム JavaScript読み込み開始');

// eBayカテゴリシステム - メインクラス
class EbayCategorySystem {
    constructor() {
        this.config = {
            API_BASE_URL: window.location.pathname,
            DEBUG_MODE: true,
            MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
            MAX_ROWS: 10000
        };
        
        this.state = {
            isProcessing: false,
            uploadedData: null,
            processedResults: null,
            selectedItems: new Set()
        };
        
        this.templates = {
            resultRow: null,
            progressModal: null
        };
        
        this.init();
    }
    
    // 初期化
    init() {
        console.log('🚀 eBayカテゴリシステム初期化開始');
        
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupTemplates();
        
        console.log('✅ eBayカテゴリシステム初期化完了');
    }
    
    // イベントリスナー設定
    setupEventListeners() {
        // CSVファイル選択
        const csvFileInput = document.getElementById('csvFileInput');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        // 単一商品テスト
        const singleTestBtn = document.querySelector('.btn[onclick="testSingleProduct()"]');
        if (singleTestBtn) {
            singleTestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.testSingleProduct();
            });
        }
        
        // 全選択チェックボックス
        const selectAllCheckbox = document.getElementById('selectAllResults');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => this.toggleAllSelection(e.target.checked));
        }
        
        // ヘルプボタン
        const helpBtn = document.querySelector('.btn[onclick="showEbayCategoryHelp()"]');
        if (helpBtn) {
            helpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showHelp();
            });
        }
        
        // サンプルCSVボタン
        const sampleBtn = document.querySelector('.btn[onclick="showSampleCSV()"]');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadSampleCSV();
            });
        }
        
        console.log('📋 eBayカテゴリシステム イベントリスナー設定完了');
    }
    
    // ドラッグ&ドロップ設定
    setupDragAndDrop() {
        const uploadContainer = document.getElementById('csvUploadContainer');
        if (!uploadContainer) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, () => {
                uploadContainer.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadContainer.addEventListener(eventName, () => {
                uploadContainer.classList.remove('drag-over');
            });
        });
        
        uploadContainer.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'text/csv') {
                this.processCSVFile(files[0]);
            } else {
                this.showMessage('CSVファイルをドロップしてください', 'warning');
            }
        });
        
        console.log('📂 ドラッグ&ドロップ機能設定完了');
    }
    
    // テンプレート設定
    setupTemplates() {
        // 結果行テンプレート
        this.templates.resultRow = (item, index) => `
            <tr data-index="${index}">
                <td><input type="checkbox" class="row-select" data-index="${index}"></td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.title}">
                    ${item.title}
                </td>
                <td>$${parseFloat(item.price || 0).toFixed(2)}</td>
                <td>
                    <span class="category-badge category-badge--${this.getConfidenceLevel(item.confidence)}-confidence">
                        ${item.category}
                    </span>
                </td>
                <td>
                    <div class="confidence-meter">
                        <div class="confidence-bar">
                            <div class="confidence-fill confidence-fill--${this.getConfidenceLevel(item.confidence)}" 
                                 style="width: ${item.confidence}%; background: ${this.getConfidenceColor(item.confidence)};"></div>
                        </div>
                        <span>${item.confidence}%</span>
                    </div>
                </td>
                <td>
                    <div class="item-specifics-container" title="${item.itemSpecifics}">
                        ${item.itemSpecifics.replace(/■/g, ' | ').substring(0, 50)}${item.itemSpecifics.length > 50 ? '...' : ''}
                    </div>
                </td>
                <td>
                    <span class="category-badge category-badge--medium-confidence">
                        承認待ち
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit btn-xs" title="編集" onclick="ebayCategorySystem.editItem(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-approve btn-xs" title="承認" onclick="ebayCategorySystem.approveItem(${index})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-reject btn-xs" title="否認" onclick="ebayCategorySystem.rejectItem(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // ファイル選択処理
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processCSVFile(file);
        }
    }
    
    // CSVファイル処理
    async processCSVFile(file) {
        console.log('📊 CSVファイル処理開始:', file.name);
        
        // ファイル検証
        if (!this.validateFile(file)) {
            return;
        }
        
        try {
            this.state.isProcessing = true;
            this.showProgress(true);
            
            // ファイル読み込み
            const csvText = await this.readFileAsText(file);
            
            // CSV解析
            const data = this.parseCSV(csvText);
            
            if (data.length === 0) {
                throw new Error('CSVファイルにデータが含まれていません');
            }
            
            console.log('📋 CSVデータ解析完了:', data.length, '件');
            
            // eBayカテゴリ判定処理（モックデータ生成）
            const results = await this.processEbayCategories(data);
            
            // 結果表示
            this.displayResults(results);
            
            this.showMessage(`${results.length}件の商品のカテゴリ判定が完了しました`, 'success');
            
        } catch (error) {
            console.error('❌ CSVファイル処理エラー:', error);
            this.showMessage(`処理エラー: ${error.message}`, 'error');
        } finally {
            this.state.isProcessing = false;
            this.showProgress(false);
        }
    }
    
    // ファイル検証
    validateFile(file) {
        // ファイルサイズチェック
        if (file.size > this.config.MAX_FILE_SIZE) {
            this.showMessage('ファイルサイズが5MBを超えています', 'error');
            return false;
        }
        
        // ファイルタイプチェック
        if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
            this.showMessage('CSVファイルを選択してください', 'error');
            return false;
        }
        
        return true;
    }
    
    // ファイル読み込み
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('ファイル読み込みエラー'));
            reader.readAsText(file, 'UTF-8');
        });
    }
    
    // CSV解析
    parseCSV(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const data = [];
            
            for (let i = 1; i < lines.length && i <= this.config.MAX_ROWS; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                if (values.length >= headers.length) {
                    const item = {};
                    headers.forEach((header, index) => {
                        item[header] = values[index] || '';
                    });
                    
                    // 必須フィールド確認
                    if (item.title && item.title.length > 0) {
                        data.push(item);
                    }
                }
            }
            
            return data;
            
        } catch (error) {
            throw new Error('CSV形式が正しくありません');
        }
    }
    
    // eBayカテゴリ判定処理（モック）
    async processEbayCategories(data) {
        const results = [];
        
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            
            // プログレス更新
            this.updateProgress(((i + 1) / data.length) * 100);
            
            // 模擬的な処理遅延
            await this.sleep(100);
            
            // モックカテゴリ判定
            const categoryResult = this.mockCategoryDetection(item);
            
            results.push({
                ...item,
                ...categoryResult,
                index: i,
                status: 'pending'
            });
        }
        
        return results;
    }
    
    // モックカテゴリ判定
    mockCategoryDetection(item) {
        const title = (item.title || '').toLowerCase();
        const price = parseFloat(item.price || 0);
        
        // カテゴリマッピング
        let category = 'その他';
        let confidence = Math.floor(Math.random() * 30) + 40; // 40-70%
        let itemSpecifics = 'Brand=Unknown■Condition=Used';
        
        if (title.includes('iphone') || title.includes('アイフォン')) {
            category = 'Cell Phones & Smartphones';
            confidence = Math.floor(Math.random() * 20) + 80; // 80-100%
            itemSpecifics = 'Brand=Apple■Model=iPhone■Storage=128GB■Color=Space Black■Condition=Used';
        } else if (title.includes('camera') || title.includes('カメラ') || title.includes('canon') || title.includes('nikon')) {
            category = 'Cameras & Photo';
            confidence = Math.floor(Math.random() * 25) + 75; // 75-100%
            itemSpecifics = 'Brand=Canon■Type=Digital SLR■Model=EOS R6■Condition=Used';
        } else if (title.includes('pokemon') || title.includes('ポケモン') || title.includes('card') || title.includes('カード')) {
            category = 'Trading Card Games';
            confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
            itemSpecifics = 'Game=Pokémon■Card Type=Promo■Character=Pikachu■Condition=Near Mint';
        } else if (title.includes('watch') || title.includes('時計') || title.includes('rolex') || title.includes('seiko')) {
            category = 'Watches, Parts & Accessories';
            confidence = Math.floor(Math.random() * 25) + 65; // 65-90%
            itemSpecifics = 'Brand=Seiko■Type=Wristwatch■Movement=Automatic■Condition=Pre-owned';
        } else if (title.includes('game') || title.includes('ゲーム') || title.includes('nintendo') || title.includes('playstation')) {
            category = 'Video Games & Consoles';
            confidence = Math.floor(Math.random() * 30) + 60; // 60-90%
            itemSpecifics = 'Platform=Nintendo Switch■Game Title=Unknown■Condition=Good';
        }
        
        // 価格による信頼度調整
        if (price > 1000) {
            confidence = Math.min(100, confidence + 10);
        } else if (price > 100) {
            confidence = Math.min(100, confidence + 5);
        }
        
        return {
            category,
            confidence,
            itemSpecifics,
            detectedAt: new Date().toISOString()
        };
    }
    
    // 結果表示
    displayResults(results) {
        // 結果セクション表示
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // 統計更新
        this.updateResultStats(results);
        
        // テーブル更新
        this.updateResultsTable(results);
        
        // 一括操作パネル有効化
        this.enableBulkOperations();
        
        // 状態保存
        this.state.processedResults = results;
    }
    
    // 統計更新
    updateResultStats(results) {
        const totalProcessed = results.length;
        const highConfidence = results.filter(r => r.confidence >= 80).length;
        const mediumConfidence = results.filter(r => r.confidence >= 50 && r.confidence < 80).length;
        const lowConfidence = results.filter(r => r.confidence < 50).length;
        
        const elements = {
            totalProcessed: document.getElementById('totalProcessed'),
            highConfidence: document.getElementById('highConfidence'),
            mediumConfidence: document.getElementById('mediumConfidence'),
            lowConfidence: document.getElementById('lowConfidence')
        };
        
        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                elements[key].textContent = eval(key);
            }
        });
    }
    
    // 結果テーブル更新
    updateResultsTable(results) {
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = results.map((item, index) => this.templates.resultRow(item, index)).join('');
        
        // 行選択イベント設定
        this.setupRowSelectionEvents();
    }
    
    // 行選択イベント設定
    setupRowSelectionEvents() {
        const checkboxes = document.querySelectorAll('.row-select');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (e.target.checked) {
                    this.state.selectedItems.add(index);
                } else {
                    this.state.selectedItems.delete(index);
                }
                this.updateSelectionCount();
            });
        });
    }
    
    // 単一商品テスト
    async testSingleProduct() {
        const titleInput = document.getElementById('singleTestTitle');
        const priceInput = document.getElementById('singleTestPrice');
        
        if (!titleInput || !priceInput) return;
        
        const title = titleInput.value.trim();
        const price = parseFloat(priceInput.value) || 0;
        
        if (!title) {
            this.showMessage('商品タイトルを入力してください', 'warning');
            return;
        }
        
        console.log('🧪 単一商品テスト:', title, price);
        
        const resultDiv = document.getElementById('singleTestResult');
        const contentDiv = document.getElementById('singleTestResultContent');
        
        if (!resultDiv || !contentDiv) return;
        
        // ローディング表示
        resultDiv.style.display = 'block';
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: var(--space-lg);">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color); margin-bottom: var(--space-sm);"></i><br>
                カテゴリーを判定中...
            </div>
        `;
        
        try {
            // 模擬的な処理遅延
            await this.sleep(2000);
            
            // モック判定実行
            const result = this.mockCategoryDetection({ title, price });
            
            // 結果表示
            contentDiv.innerHTML = this.generateSingleTestResult(title, price, result);
            
            console.log('✅ 単一商品テスト完了:', result);
            
        } catch (error) {
            console.error('❌ 単一商品テストエラー:', error);
            contentDiv.innerHTML = `
                <div class="notification error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>テスト処理でエラーが発生しました</span>
                </div>
            `;
        }
    }
    
    // 単一テスト結果生成
    generateSingleTestResult(title, price, result) {
        const confidenceColor = this.getConfidenceColor(result.confidence);
        
        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-md);">
                <div>
                    <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">判定カテゴリー</h6>
                    <div style="padding: 0.25rem 0.5rem; background: #dcfce7; color: #166534; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; display: inline-block;">
                        ${result.category}
                    </div>
                </div>
                
                <div>
                    <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">判定精度</h6>
                    <div style="display: flex; align-items: center; gap: 0.25rem;">
                        <div style="width: 80px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${result.confidence}%; height: 100%; background: ${confidenceColor}; border-radius: 3px;"></div>
                        </div>
                        <span style="font-weight: 600;">${result.confidence}%</span>
                    </div>
                </div>
            </div>
            
            <div>
                <h6 style="color: var(--text-secondary); margin-bottom: var(--space-xs);">生成された必須項目</h6>
                <div style="background: var(--bg-tertiary); border-radius: var(--radius-md); padding: var(--space-sm); font-family: monospace; font-size: 0.75rem; color: var(--text-secondary);">
                    ${result.itemSpecifics.replace(/■/g, ' | ')}
                </div>
            </div>
            
            <div class="notification success" style="margin-top: var(--space-md);">
                <i class="fas fa-check-circle"></i>
                <span><strong>判定完了:</strong> システムが正常に動作しています。</span>
            </div>
        `;
    }
    
    // プログレス表示/非表示
    showProgress(show) {
        const progressDiv = document.getElementById('processingProgress');
        if (progressDiv) {
            progressDiv.style.display = show ? 'block' : 'none';
        }
    }
    
    // プログレス更新
    updateProgress(percentage) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `処理中... ${Math.round(percentage)}%`;
        }
    }
    
    // ヘルプ表示
    showHelp() {
        const helpMessage = `
eBayカテゴリー自動判定システム

【機能概要】
商品タイトルから最適なeBayカテゴリーを自動判定し、必須項目（Item Specifics）を生成します。

【使用方法】
1. CSVファイルをアップロードするか、ドラッグ&ドロップ
2. システムが自動的にカテゴリーを判定
3. 結果を確認し、必要に応じて編集
4. 承認または否認を決定

【CSVフォーマット】
title,price,description,yahoo_category,image_url

【対応カテゴリー】
- Cell Phones & Smartphones
- Cameras & Photo
- Trading Card Games
- Watches, Parts & Accessories
- Video Games & Consoles
- その他多数

システムは現在デモモードで動作しています。
        `.trim();
        
        alert(helpMessage);
    }
    
    // サンプルCSVダウンロード
    downloadSampleCSV() {
        const sampleContent = `title,price,description,yahoo_category,image_url
"iPhone 14 Pro 128GB Space Black",999.99,"美品のiPhone 14 Pro","携帯電話","https://example.com/iphone.jpg"
"Canon EOS R6 ミラーレスカメラ",2499.99,"ほぼ新品のミラーレスカメラ","カメラ","https://example.com/camera.jpg"
"ポケモンカード ピカチュウ プロモカード",50.00,"限定プロモカード","トレーディングカード","https://example.com/pokemon.jpg"
"Rolex Submariner 腕時計",8500.00,"正規品の高級腕時計","腕時計","https://example.com/rolex.jpg"
"Nintendo Switch 本体",299.99,"任天堂Switch本体セット","ゲーム","https://example.com/switch.jpg"`;
        
        const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ebay_category_sample.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('サンプルCSVファイルをダウンロードしました', 'success');
    }
    
    // 全選択切り替え
    toggleAllSelection(checked) {
        const checkboxes = document.querySelectorAll('.row-select');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const index = parseInt(checkbox.dataset.index);
            if (checked) {
                this.state.selectedItems.add(index);
            } else {
                this.state.selectedItems.delete(index);
            }
        });
        this.updateSelectionCount();
    }
    
    // 選択数更新
    updateSelectionCount() {
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.textContent = this.state.selectedItems.size;
        }
        
        // 一括操作ボタン状態更新
        const bulkOperations = document.getElementById('bulkOperations');
        if (bulkOperations) {
            if (this.state.selectedItems.size > 0) {
                bulkOperations.classList.add('active');
            } else {
                bulkOperations.classList.remove('active');
            }
        }
    }
    
    // 一括操作有効化
    enableBulkOperations() {
        const bulkApproveBtn = document.getElementById('bulkApproveBtn');
        const bulkRejectBtn = document.getElementById('bulkRejectBtn');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        
        if (bulkApproveBtn) {
            bulkApproveBtn.addEventListener('click', () => this.bulkApprove());
        }
        
        if (bulkRejectBtn) {
            bulkRejectBtn.addEventListener('click', () => this.bulkReject());
        }
        
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }
    }
    
    // アイテム編集
    editItem(index) {
        console.log('✏️ アイテム編集:', index);
        this.showMessage('編集機能は開発中です', 'info');
    }
    
    // アイテム承認
    approveItem(index) {
        console.log('✅ アイテム承認:', index);
        this.showMessage('商品を承認しました', 'success');
    }
    
    // アイテム否認
    rejectItem(index) {
        console.log('❌ アイテム否認:', index);
        this.showMessage('商品を否認しました', 'warning');
    }
    
    // 一括承認
    bulkApprove() {
        const count = this.state.selectedItems.size;
        if (count === 0) return;
        
        console.log('✅ 一括承認:', count, '件');
        this.showMessage(`${count}件の商品を承認しました`, 'success');
        this.clearSelection();
    }
    
    // 一括否認
    bulkReject() {
        const count = this.state.selectedItems.size;
        if (count === 0) return;
        
        console.log('❌ 一括否認:', count, '件');
        this.showMessage(`${count}件の商品を否認しました`, 'warning');
        this.clearSelection();
    }
    
    // CSV出力
    exportCSV() {
        if (!this.state.processedResults || this.state.processedResults.length === 0) {
            this.showMessage('出力するデータがありません', 'warning');
            return;
        }
        
        const selectedData = this.state.selectedItems.size > 0 
            ? this.state.processedResults.filter((_, index) => this.state.selectedItems.has(index))
            : this.state.processedResults;
        
        const csvContent = this.generateCSVContent(selectedData);
        this.downloadCSV(csvContent, 'ebay_category_results.csv');
        
        this.showMessage(`${selectedData.length}件のデータを出力しました`, 'success');
    }
    
    // CSV内容生成
    generateCSVContent(data) {
        const headers = ['title', 'price', 'category', 'confidence', 'itemSpecifics', 'status'];
        const csvRows = [headers.join(',')];
        
        data.forEach(item => {
            const row = headers.map(header => {
                let value = item[header] || '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
    }
    
    // CSVダウンロード
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // 選択クリア
    clearSelection() {
        this.state.selectedItems.clear();
        const checkboxes = document.querySelectorAll('.row-select');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectionCount();
        
        const selectAllCheckbox = document.getElementById('selectAllResults');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
        }
    }
    
    // 信頼度レベル取得
    getConfidenceLevel(confidence) {
        if (confidence >= 80) return 'high';
        if (confidence >= 50) return 'medium';
        return 'low';
    }
    
    // 信頼度色取得
    getConfidenceColor(confidence) {
        if (confidence >= 80) return '#10b981';
        if (confidence >= 50) return '#f59e0b';
        return '#ef4444';
    }
    
    // メッセージ表示
    showMessage(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // 簡易アラート表示（実際のシステムではトースト通知など）
        const alertClass = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        
        alert(`${alertClass[type]} ${message}`);
    }
    
    // ユーティリティ: スリープ
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// グローバルインスタンス作成
let ebayCategorySystem;

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // Yahoo Auction Toolのタブシステムとの統合チェック
    if (typeof YahooAuctionTool !== 'undefined') {
        console.log('🔗 Yahoo Auction Tool統合モード');
    }
    
    // eBayカテゴリシステム初期化
    ebayCategorySystem = new EbayCategorySystem();
    
    console.log('🚀 eBayカテゴリシステム統合完了');
});

// グローバル関数（下位互換性のため）
function showEbayCategoryHelp() {
    if (ebayCategorySystem) {
        ebayCategorySystem.showHelp();
    }
}

function showSampleCSV() {
    if (ebayCategorySystem) {
        ebayCategorySystem.downloadSampleCSV();
    }
}

function testSingleProduct() {
    if (ebayCategorySystem) {
        ebayCategorySystem.testSingleProduct();
    }
}

function processEbayCsvFile(file) {
    if (ebayCategorySystem) {
        ebayCategorySystem.processCSVFile(file);
    }
}

// エクスポート（モジュール使用時）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EbayCategorySystem;
}

console.log('✅ eBayカテゴリシステム JavaScript読み込み完了');
