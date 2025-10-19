/**
 * 統合フィルターシステム フロントエンドJavaScript
 * 5段階フィルタリング管理・リアルタイム更新・CSV操作
 */

class IntegratedFilterManager {
    constructor() {
        this.currentTab = 'export';
        this.csrfToken = this.getCSRFToken();
        this.apiEndpoint = 'api/integrated_filter.php';
        this.refreshInterval = null;
        this.init();
    }

    init() {
        console.log('統合フィルターシステム初期化開始');
        
        this.bindEvents();
        this.loadInitialData();
        this.startPeriodicUpdates();
        
        console.log('統合フィルターシステム初期化完了');
    }

    getCSRFToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : 
               document.querySelector('input[name="csrf_token"]')?.value || '';
    }

    bindEvents() {
        // タブ切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // チェックボックス全選択
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.id?.includes('selectAll')) {
                this.toggleSelectAll(e.target);
            }
        });

        // 個別チェックボックス
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-checkbox')) {
                this.updateSelectionCount();
            }
        });

        // ボタンイベント
        this.bindButtonEvents();

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshCurrentTab();
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportCurrentTab();
                        break;
                }
            }
        });
    }

    bindButtonEvents() {
        // CSV アップロード
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('uploadCSV')) {
                const filterType = e.target.onclick.toString().match(/uploadCSV\('([^']+)'\)/)?.[1];
                if (filterType) {
                    e.preventDefault();
                    this.handleCSVUpload(filterType);
                }
            }
        });

        // スクレイピング開始
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('startScraping')) {
                const sourceType = e.target.onclick.toString().match(/startScraping\('([^']+)'\)/)?.[1];
                if (sourceType) {
                    e.preventDefault();
                    this.startScraping(sourceType);
                }
            }
        });

        // データエクスポート
        document.addEventListener('click', (e) => {
            if (e.target.onclick?.toString().includes('exportData')) {
                const filterType = e.target.onclick.toString().match(/exportData\('([^']+)'\)/)?.[1];
                if (filterType) {
                    e.preventDefault();
                    this.exportData(filterType);
                }
            }
        });

        // 各種追加ボタン
        const addButtons = {
            'addKeyword': this.showAddKeywordDialog.bind(this),
            'addPatentCase': this.showAddPatentCaseDialog.bind(this),
            'addCountryRestriction': this.showAddCountryRestrictionDialog.bind(this),
            'addMallRestriction': this.showAddMallRestrictionDialog.bind(this),
            'addVeroBrand': this.showAddVeroBrandDialog.bind(this)
        };

        Object.keys(addButtons).forEach(buttonType => {
            document.addEventListener('click', (e) => {
                if (e.target.onclick?.toString().includes(buttonType)) {
                    e.preventDefault();
                    addButtons[buttonType]();
                }
            });
        });
    }

    switchTab(tabId) {
        // 既存タブの非アクティブ化
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.filter-content').forEach(c => c.classList.remove('active'));
        
        // 新タブのアクティブ化
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
        document.getElementById(`${tabId}-content`)?.classList.add('active');
        
        this.currentTab = tabId;
        this.loadTabData(tabId);
    }

    async loadInitialData() {
        try {
            // 統計データ読み込み
            await this.loadStatistics();
            
            // 現在のタブデータ読み込み
            await this.loadTabData(this.currentTab);
            
        } catch (error) {
            console.error('初期データ読み込みエラー:', error);
            this.showNotification('データの読み込みに失敗しました', 'error');
        }
    }

    async loadStatistics() {
        const response = await this.apiCall('get_statistics');
        if (response.success) {
            this.updateStatisticsDisplay(response.data);
        }
    }

    async loadTabData(tabId) {
        if (!tabId) return;

        this.showLoading(`${tabId}-table-body`);
        
        try {
            const response = await this.apiCall('get_filter_data', { filter_type: tabId });
            
            if (response.success) {
                this.populateTabData(tabId, response.data);
                this.updateTabStatistics(tabId, response.data);
            } else {
                throw new Error(response.message || 'データ取得失敗');
            }
        } catch (error) {
            console.error(`タブデータ読み込みエラー (${tabId}):`, error);
            this.showNotification(`${tabId}データの読み込みに失敗しました`, 'error');
        } finally {
            this.hideLoading(`${tabId}-table-body`);
        }
    }

    populateTabData(tabId, data) {
        const tableBody = document.getElementById(`${tabId}-table-body`);
        if (!tableBody) return;

        let html = '';

        switch (tabId) {
            case 'export':
                html = this.generateExportTableRows(data.keywords || []);
                break;
            case 'patent-troll':
                html = this.generatePatentTableRows(data.cases || []);
                break;
            case 'country':
                html = this.generateCountryTableRows(data.restrictions || []);
                break;
            case 'mall':
                html = this.generateMallTableRows(data.restrictions || []);
                break;
            case 'vero':
                html = this.generateVeroTableRows(data.participants || []);
                break;
        }

        tableBody.innerHTML = html;
        this.updateSelectionCount();
    }

    generateExportTableRows(keywords) {
        return keywords.map(keyword => `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${keyword.id}"></td>
                <td><strong>${this.escapeHtml(keyword.keyword)}</strong></td>
                <td><span class="category-badge category-${keyword.priority?.toLowerCase()}">${keyword.priority}</span></td>
                <td>${keyword.detection_count}</td>
                <td>${this.formatDate(keyword.updated_at)}</td>
                <td><span class="status-badge ${keyword.is_active ? 'status-active' : 'status-inactive'}">${keyword.is_active ? '有効' : '無効'}</span></td>
                <td>
                    <button class="btn btn-warning" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editKeyword(${keyword.id})">編集</button>
                    <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteKeyword(${keyword.id})">削除</button>
                </td>
            </tr>
        `).join('');
    }

    generatePatentTableRows(cases) {
        return cases.map(patentCase => `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${patentCase.id}"></td>
                <td><strong>${this.escapeHtml(patentCase.case_title)}</strong></td>
                <td>${this.escapeHtml(patentCase.patent_number)}</td>
                <td>${this.escapeHtml(patentCase.plaintiff)}</td>
                <td><span class="status-badge risk-${patentCase.risk_level?.toLowerCase()}">${this.translateRiskLevel(patentCase.risk_level)}</span></td>
                <td>${this.formatDate(patentCase.case_date)}</td>
                <td>
                    <button class="btn btn-info" style="padding: 4px 8px; font-size: 0.75rem;" onclick="viewPatentDetails(${patentCase.id})">詳細</button>
                    <button class="btn btn-warning" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editPatentCase(${patentCase.id})">編集</button>
                </td>
            </tr>
        `).join('');
    }

    generateCountryTableRows(restrictions) {
        return restrictions.map(restriction => `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${restriction.id}"></td>
                <td><img src="https://flagicons.lipis.dev/flags/4x3/${restriction.country_code?.toLowerCase()}.svg" style="width: 20px; margin-right: 8px;">${restriction.country_name}</td>
                <td>${this.translateRestrictionType(restriction.restriction_type)}</td>
                <td><strong>${this.escapeHtml(restriction.restricted_keywords?.split(',')[0] || '未設定')}</strong></td>
                <td>${this.formatDate(restriction.effective_date)}</td>
                <td><span class="status-badge ${restriction.is_active ? 'status-active' : 'status-inactive'}">${restriction.is_active ? '有効' : '無効'}</span></td>
                <td>
                    <button class="btn btn-info" style="padding: 4px 8px; font-size: 0.75rem;" onclick="viewCountryDetails(${restriction.id})">詳細</button>
                    <button class="btn btn-warning" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editCountryRestriction(${restriction.id})">編集</button>
                </td>
            </tr>
        `).join('');
    }

    generateMallTableRows(restrictions) {
        return restrictions.map(restriction => `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${restriction.id}"></td>
                <td><strong>${restriction.mall_name}</strong></td>
                <td>${this.getRestrictionCategory(restriction.keyword)}</td>
                <td>${this.escapeHtml(restriction.keyword)}</td>
                <td>${this.formatDate(restriction.updated_at)}</td>
                <td><span class="status-badge ${restriction.is_active ? 'status-active' : 'status-inactive'}">${restriction.is_active ? '有効' : '無効'}</span></td>
                <td>
                    <button class="btn btn-info" style="padding: 4px 8px; font-size: 0.75rem;" onclick="viewMallDetails(${restriction.id})">詳細</button>
                    <button class="btn btn-warning" style="padding: 4px 8px; font-size: 0.75rem;" onclick="editMallRestriction(${restriction.id})">編集</button>
                </td>
            </tr>
        `).join('');
    }

    generateVeroTableRows(participants) {
        return participants.map(participant => `
            <tr>
                <td><input type="checkbox" class="item-checkbox" data-id="${participant.id}"></td>
                <td><strong>${this.escapeHtml(participant.brand_name)}</strong></td>
                <td>${this.escapeHtml(participant.company_name)}</td>
                <td>${this.escapeHtml(participant.vero_id || '')}</td>
                <td>${this.getProtectedKeywordsCount(participant.protected_keywords)}</td>
                <td><span class="status-badge ${participant.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}">${participant.status === 'ACTIVE' ? '有効' : '無効'}</span></td>
                <td>
                    <button class="btn btn-info" style="padding: 4px 8px; font-size: 0.75rem;" onclick="viewVeroDetails(${participant.id})">詳細</button>
                    <button class="btn btn-warning" style="padding: 4px 8px; font-size: 0.75rem;" onclick="updateVeroData(${participant.id})">更新</button>
                </td>
            </tr>
        `).join('');
    }

    // CSV処理
    async handleCSVUpload(filterType) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) { // 5MB制限
                this.showNotification('ファイルサイズが大きすぎます（最大5MB）', 'error');
                return;
            }

            try {
                const csvContent = await this.readFileAsText(file);
                const response = await this.apiCall('upload_csv', {
                    csv_content: csvContent,
                    filter_type: filterType
                });

                if (response.success) {
                    this.showNotification(
                        `CSV処理完了: ${response.data.processed}件処理, ${response.data.errors.length}件エラー`,
                        'success'
                    );
                    
                    if (response.data.errors.length > 0) {
                        this.showCSVErrors(response.data.errors);
                    }
                    
                    // タブデータ再読み込み
                    await this.loadTabData(filterType);
                } else {
                    this.showNotification(`CSVアップロードエラー: ${response.message}`, 'error');
                }
            } catch (error) {
                console.error('CSVアップロードエラー:', error);
                this.showNotification('CSVファイルの処理中にエラーが発生しました', 'error');
            }
        };

        input.click();
    }

    async exportData(filterType) {
        try {
            this.showNotification('CSV出力中...', 'info');
            
            const response = await this.apiCall('export_csv', {
                filter_type: filterType
            });

            if (response.success) {
                const blob = new Blob([response.data.content], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = response.data.filename;
                a.click();
                
                URL.revokeObjectURL(url);
                this.showNotification('CSV出力が完了しました', 'success');
            } else {
                this.showNotification(`CSV出力エラー: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('CSV出力エラー:', error);
            this.showNotification('CSV出力中にエラーが発生しました', 'error');
        }
    }

    // スクレイピング機能
    async startScraping(sourceType) {
        if (!confirm(`${this.translateSourceType(sourceType)}の自動スクレイピングを開始しますか？`)) {
            return;
        }

        try {
            const response = await this.apiCall('start_scraping', {
                source_type: sourceType
            });

            if (response.success) {
                this.showNotification(response.data.message, 'success');
                this.startScrapingStatusCheck(sourceType);
            } else {
                this.showNotification(`スクレイピング開始エラー: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('スクレイピング開始エラー:', error);
            this.showNotification('スクレイピングの開始に失敗しました', 'error');
        }
    }

    startScrapingStatusCheck(sourceType) {
        const statusInterval = setInterval(async () => {
            try {
                const response = await this.apiCall('get_scraping_status');
                if (response.success) {
                    const status = response.data.find(s => s.source_type === sourceType);
                    if (status && status.status === 'completed') {
                        this.showNotification(`${this.translateSourceType(sourceType)}スクレイピング完了`, 'success');
                        clearInterval(statusInterval);
                        
                        // データ再読み込み
                        await this.loadTabData(this.currentTab);
                    }
                }
            } catch (error) {
                console.error('スクレイピングステータスチェックエラー:', error);
                clearInterval(statusInterval);
            }
        }, 10000); // 10秒毎にチェック

        // 5分後にタイムアウト
        setTimeout(() => {
            clearInterval(statusInterval);
        }, 300000);
    }

    // ダイアログ表示系
    showAddKeywordDialog() {
        const dialog = this.createDialog('キーワード追加', `
            <form id="add-keyword-form">
                <div class="form-group">
                    <label>キーワード:</label>
                    <input type="text" name="keyword" required>
                </div>
                <div class="form-group">
                    <label>タイプ:</label>
                    <select name="type" required>
                        <option value="EXPORT">輸出禁止</option>
                        <option value="PATENT_TROLL">パテントトロール</option>
                        <option value="COUNTRY_SPECIFIC">国別禁止</option>
                        <option value="MALL_SPECIFIC">モール別禁止</option>
                        <option value="VERO">VERO</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>重要度:</label>
                    <select name="priority">
                        <option value="HIGH">高</option>
                        <option value="MEDIUM" selected>中</option>
                        <option value="LOW">低</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>モール名 (モール別の場合):</label>
                    <input type="text" name="mall_name">
                </div>
                <div class="form-group">
                    <label>国コード (国別の場合):</label>
                    <input type="text" name="country_code" placeholder="例: USA, JPN">
                </div>
            </form>
        `);

        dialog.querySelector('#add-keyword-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.submitAddKeyword(new FormData(e.target));
            dialog.remove();
        };
    }

    showAddPatentCaseDialog() {
        const dialog = this.createDialog('パテント事例追加', `
            <form id="add-patent-form">
                <div class="form-group">
                    <label>事例タイトル:</label>
                    <input type="text" name="case_title" required>
                </div>
                <div class="form-group">
                    <label>特許番号:</label>
                    <input type="text" name="patent_number">
                </div>
                <div class="form-group">
                    <label>原告:</label>
                    <input type="text" name="plaintiff">
                </div>
                <div class="form-group">
                    <label>被告:</label>
                    <input type="text" name="defendant">
                </div>
                <div class="form-group">
                    <label>事例概要:</label>
                    <textarea name="case_summary" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>リスクレベル:</label>
                    <select name="risk_level">
                        <option value="HIGH">高リスク</option>
                        <option value="MEDIUM" selected>中リスク</option>
                        <option value="LOW">低リスク</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>発生日:</label>
                    <input type="date" name="case_date">
                </div>
                <div class="form-group">
                    <label>ソースURL:</label>
                    <input type="url" name="source_url">
                </div>
            </form>
        `);

        dialog.querySelector('#add-patent-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.submitAddPatentCase(new FormData(e.target));
            dialog.remove();
        };
    }

    showAddVeroBrandDialog() {
        const dialog = this.createDialog('VEROブランド追加', `
            <form id="add-vero-form">
                <div class="form-group">
                    <label>ブランド名:</label>
                    <input type="text" name="brand_name" required>
                </div>
                <div class="form-group">
                    <label>会社名:</label>
                    <input type="text" name="company_name" required>
                </div>
                <div class="form-group">
                    <label>VERO ID:</label>
                    <input type="text" name="vero_id">
                </div>
                <div class="form-group">
                    <label>保護キーワード (カンマ区切り):</label>
                    <textarea name="protected_keywords" rows="3" placeholder="ブランド名, fake ブランド名, replica ブランド名"></textarea>
                </div>
            </form>
        `);

        dialog.querySelector('#add-vero-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.submitAddVeroBrand(new FormData(e.target));
            dialog.remove();
        };
    }

    // フォーム送信処理
    async submitAddKeyword(formData) {
        try {
            const data = Object.fromEntries(formData.entries());
            const response = await this.apiCall('add_keyword', data);

            if (response.success) {
                this.showNotification('キーワードを追加しました', 'success');
                await this.loadTabData(this.currentTab);
            } else {
                this.showNotification(`追加エラー: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('キーワード追加エラー:', error);
            this.showNotification('キーワードの追加に失敗しました', 'error');
        }
    }

    async submitAddPatentCase(formData) {
        try {
            const data = Object.fromEntries(formData.entries());
            const response = await this.apiCall('add_patent_case', data);

            if (response.success) {
                this.showNotification('パテント事例を追加しました', 'success');
                await this.loadTabData('patent-troll');
            } else {
                this.showNotification(`追加エラー: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('パテント事例追加エラー:', error);
            this.showNotification('パテント事例の追加に失敗しました', 'error');
        }
    }

    async submitAddVeroBrand(formData) {
        try {
            const data = Object.fromEntries(formData.entries());
            if (data.protected_keywords) {
                data.protected_keywords = data.protected_keywords.split(',').map(k => k.trim());
            }

            const response = await this.apiCall('add_vero_brand', data);

            if (response.success) {
                this.showNotification('VEROブランドを追加しました', 'success');
                await this.loadTabData('vero');
            } else {
                this.showNotification(`追加エラー: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('VEROブランド追加エラー:', error);
            this.showNotification('VEROブランドの追加に失敗しました', 'error');
        }
    }

    // 統合フィルタリング実行
    async executeIntegratedFilter(productTitle, productDescription, targetMall, targetCountry) {
        try {
            const response = await this.apiCall('execute_integrated_filter', {
                product_title: productTitle,
                product_description: productDescription || '',
                target_mall: targetMall || '',
                target_country: targetCountry || ''
            });

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('統合フィルタリングエラー:', error);
            throw error;
        }
    }

    // ユーティリティ関数
    async apiCall(action, data = {}) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file, 'UTF-8');
        });
    }

    createDialog(title, content) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.cssText = `
            background: white; padding: 2rem; border-radius: 8px;
            max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
        `;

        dialog.innerHTML = `
            <div class="dialog-header">
                <h3>${title}</h3>
                <button class="dialog-close" style="float: right; border: none; background: none; font-size: 1.5rem;">&times;</button>
            </div>
            <div class="dialog-body">${content}</div>
            <div class="dialog-footer">
                <button class="btn btn-primary" type="submit" form="${content.match(/id="([^"]+)"/)?.[1]}">追加</button>
                <button class="btn btn-secondary dialog-cancel">キャンセル</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // イベントリスナー
        dialog.querySelector('.dialog-close').onclick = () => overlay.remove();
        dialog.querySelector('.dialog-cancel').onclick = () => overlay.remove();
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        return dialog;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    showCSVErrors(errors) {
        const errorDialog = this.createDialog('CSV処理エラー', `
            <div class="csv-errors">
                <p>以下の行で問題が発生しました:</p>
                <ul>
                    ${errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('')}
                </ul>
            </div>
        `);
        
        // フッターを修正（追加ボタンを削除）
        const footer = errorDialog.querySelector('.dialog-footer');
        footer.innerHTML = '<button class="btn btn-secondary dialog-cancel">閉じる</button>';
    }

    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <tr>
                    <td colspan="100%" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-spinner fa-spin"></i> 読み込み中...
                    </td>
                </tr>
            `;
        }
    }

    hideLoading(elementId) {
        // データ読み込み後に自動的に隠される
    }

    updateStatisticsDisplay(stats) {
        // 各フィルタータイプの統計を更新
        Object.keys(stats).forEach(filterType => {
            if (typeof stats[filterType] === 'object') {
                this.updateFilterTypeStats(filterType, stats[filterType]);
            }
        });
    }

    updateFilterTypeStats(filterType, data) {
        const statCards = document.querySelectorAll(`#${filterType}-content .stat-value`);
        if (statCards.length >= 4) {
            if (data.total_keywords !== undefined) {
                statCards[0].textContent = this.formatNumber(data.total_keywords);
            }
            if (data.total_detections !== undefined) {
                statCards[1].textContent = this.formatNumber(data.total_detections);
            }
            if (data.active_keywords !== undefined) {
                statCards[2].textContent = this.formatNumber(data.active_keywords);
            }
        }
    }

    updateTabStatistics(tabId, data) {
        const totalElement = document.querySelector(`#${tabId}-content .stat-value`);
        if (totalElement && data.total_count !== undefined) {
            totalElement.textContent = this.formatNumber(data.total_count);
        }
    }

    toggleSelectAll(selectAllCheckbox) {
        const targetTable = selectAllCheckbox.closest('.filter-content');
        const checkboxes = targetTable.querySelectorAll('.item-checkbox');
        
        checkboxes.forEach(cb => {
            cb.checked = selectAllCheckbox.checked;
        });
        
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const selectedCount = document.querySelectorAll('.item-checkbox:checked').length;
        const countElements = document.querySelectorAll('.selection-count');
        
        countElements.forEach(element => {
            element.textContent = `${selectedCount}件選択中`;
        });
    }

    startPeriodicUpdates() {
        // 5分毎に統計データを更新
        this.refreshInterval = setInterval(() => {
            this.loadStatistics();
        }, 300000);
    }

    async refreshCurrentTab() {
        await this.loadTabData(this.currentTab);
        this.showNotification('データを更新しました', 'success');
    }

    async exportCurrentTab() {
        await this.exportData(this.currentTab);
    }

    // フォーマット関数
    formatNumber(num) {
        return new Intl.NumberFormat('ja-JP').format(num);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ja-JP');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    translateRiskLevel(level) {
        const translations = {
            'HIGH': '高リスク',
            'MEDIUM': '中リスク', 
            'LOW': '低リスク'
        };
        return translations[level] || level;
    }

    translateRestrictionType(type) {
        const translations = {
            'IMPORT_BAN': '輸入禁止',
            'EXPORT_BAN': '輸出禁止',
            'TRADEMARK': '商標',
            'PATENT': '特許',
            'OTHER': 'その他'
        };
        return translations[type] || type;
    }

    translateSourceType(type) {
        const translations = {
            'patent': 'パテントトロール',
            'vero': 'VERO',
            'country': '国別規制',
            'export': '輸出規制'
        };
        return translations[type] || type;
    }

    getRestrictionCategory(keyword) {
        // キーワードからカテゴリを推測（簡易版）
        const categories = {
            'replica': 'レプリカ商品',
            'fake': '偽造品',
            'counterfeit': '模倣品',
            'copy': 'コピー品'
        };
        
        const lowerKeyword = keyword.toLowerCase();
        for (const [key, category] of Object.entries(categories)) {
            if (lowerKeyword.includes(key)) {
                return category;
            }
        }
        return 'その他';
    }

    getProtectedKeywordsCount(protectedKeywords) {
        try {
            if (typeof protectedKeywords === 'string') {
                const parsed = JSON.parse(protectedKeywords);
                return Array.isArray(parsed) ? parsed.length : 0;
            }
            return Array.isArray(protectedKeywords) ? protectedKeywords.length : 0;
        } catch {
            return 0;
        }
    }

    // クリーンアップ
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// グローバル関数（HTMLから呼び出し用）
let filterManager;

function editKeyword(id) { filterManager?.editKeyword?.(id); }
function deleteKeyword(id) { filterManager?.deleteKeyword?.(id); }
function viewPatentDetails(id) { filterManager?.viewPatentDetails?.(id); }
function editPatentCase(id) { filterManager?.editPatentCase?.(id); }
function viewCountryDetails(id) { filterManager?.viewCountryDetails?.(id); }
function editCountryRestriction(id) { filterManager?.editCountryRestriction?.(id); }
function viewMallDetails(id) { filterManager?.viewMallDetails?.(id); }
function editMallRestriction(id) { filterManager?.editMallRestriction?.(id); }
function viewVeroDetails(id) { filterManager?.viewVeroDetails?.(id); }
function updateVeroData(id) { filterManager?.updateVeroData?.(id); }

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    filterManager = new IntegratedFilterManager();
    
    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', () => {
        filterManager.destroy();
    });
});

// エクスポート（モジュールとして使用する場合）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntegratedFilterManager;
}