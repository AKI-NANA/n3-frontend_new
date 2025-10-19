/**
 * N3 基本ページテンプレート JavaScript
 * 基本的なページ機能の標準実装
 */

(function(window) {
    'use strict';
    
    /**
     * N3 基本ページテンプレート
     */
    const N3BasicPage = {
        /**
         * 基本ページ初期化
         */
        init: function(options = {}) {
            const defaultOptions = {
                enableSearch: true,
                enableFilters: false,
                enableExport: false,
                onInit: null,
                onReady: null
            };
            
            const config = { ...defaultOptions, ...options };
            
            console.log('🎯 N3基本ページテンプレート初期化', config);
            
            // N3ライブラリ確認
            if (!window.N3API || !window.N3UI || !window.N3Utils) {
                console.error('❌ N3コアライブラリが不足しています');
                return false;
            }
            
            // 基本機能初期化
            this.setupBasicFeatures(config);
            
            // カスタム初期化コールバック
            if (config.onInit && typeof config.onInit === 'function') {
                config.onInit();
            }
            
            // ページ準備完了
            document.addEventListener('DOMContentLoaded', () => {
                this.onPageReady(config);
                
                if (config.onReady && typeof config.onReady === 'function') {
                    config.onReady();
                }
            });
            
            return true;
        },
        
        /**
         * 基本機能設定
         */
        setupBasicFeatures: function(config) {
            // 検索機能
            if (config.enableSearch) {
                this.setupSearch();
            }
            
            // フィルター機能
            if (config.enableFilters) {
                this.setupFilters();
            }
            
            // エクスポート機能
            if (config.enableExport) {
                this.setupExport();
            }
            
            // 共通UIイベント
            this.setupCommonEvents();
        },
        
        /**
         * 検索機能設定
         */
        setupSearch: function() {
            const searchInputs = document.querySelectorAll('[data-n3-search]');
            
            searchInputs.forEach(input => {
                const target = input.dataset.n3Search;
                const debounce = parseInt(input.dataset.debounce) || 300;
                
                const searchFunction = N3Utils.debounce((query) => {
                    this.performSearch(query, target);
                }, debounce);
                
                input.addEventListener('input', (e) => {
                    searchFunction(e.target.value);
                });
            });
            
            console.log('✅ 検索機能設定完了');
        },
        
        /**
         * 検索実行
         */
        performSearch: function(query, target) {
            const targetElement = document.getElementById(target);
            if (!targetElement) {
                console.warn('検索対象が見つかりません:', target);
                return;
            }
            
            const searchableElements = targetElement.querySelectorAll('[data-searchable]');
            
            searchableElements.forEach(element => {
                const searchText = element.textContent.toLowerCase();
                const queryLower = query.toLowerCase();
                
                if (query === '' || searchText.includes(queryLower)) {
                    element.style.display = '';
                } else {
                    element.style.display = 'none';
                }
            });
            
            // 検索結果イベント発火
            document.dispatchEvent(new CustomEvent('n3SearchPerformed', {
                detail: { query, target, resultCount: targetElement.querySelectorAll('[data-searchable]:not([style*="display: none"])').length }
            }));
        },
        
        /**
         * フィルター機能設定
         */
        setupFilters: function() {
            const filterControls = document.querySelectorAll('[data-n3-filter]');
            
            filterControls.forEach(control => {
                const target = control.dataset.n3Filter;
                
                control.addEventListener('change', (e) => {
                    this.applyFilters(target);
                });
            });
            
            // フィルターリセットボタン
            const resetButtons = document.querySelectorAll('[data-n3-filter-reset]');
            resetButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const target = button.dataset.n3FilterReset;
                    this.resetFilters(target);
                });
            });
            
            console.log('✅ フィルター機能設定完了');
        },
        
        /**
         * フィルター適用
         */
        applyFilters: function(target) {
            const targetElement = document.getElementById(target);
            if (!targetElement) {
                console.warn('フィルター対象が見つかりません:', target);
                return;
            }
            
            const filterControls = document.querySelectorAll(`[data-n3-filter="${target}"]`);
            const filterableElements = targetElement.querySelectorAll('[data-filterable]');
            
            // フィルター条件収集
            const filters = {};
            filterControls.forEach(control => {
                const filterKey = control.dataset.filterKey || control.name;
                const filterValue = control.value;
                
                if (filterValue && filterValue !== '') {
                    filters[filterKey] = filterValue;
                }
            });
            
            // フィルター適用
            filterableElements.forEach(element => {
                let show = true;
                
                Object.entries(filters).forEach(([key, value]) => {
                    const elementValue = element.dataset[key] || element.textContent;
                    
                    if (!elementValue.toLowerCase().includes(value.toLowerCase())) {
                        show = false;
                    }
                });
                
                element.style.display = show ? '' : 'none';
            });
            
            // フィルター適用イベント発火
            document.dispatchEvent(new CustomEvent('n3FiltersApplied', {
                detail: { target, filters, resultCount: targetElement.querySelectorAll('[data-filterable]:not([style*="display: none"])').length }
            }));
        },
        
        /**
         * フィルターリセット
         */
        resetFilters: function(target) {
            const filterControls = document.querySelectorAll(`[data-n3-filter="${target}"]`);
            
            filterControls.forEach(control => {
                if (control.type === 'select-one') {
                    control.selectedIndex = 0;
                } else {
                    control.value = '';
                }
            });
            
            // 全要素表示
            const targetElement = document.getElementById(target);
            if (targetElement) {
                const filterableElements = targetElement.querySelectorAll('[data-filterable]');
                filterableElements.forEach(element => {
                    element.style.display = '';
                });
            }
            
            // フィルターリセットイベント発火
            document.dispatchEvent(new CustomEvent('n3FiltersReset', {
                detail: { target }
            }));
        },
        
        /**
         * エクスポート機能設定
         */
        setupExport: function() {
            const exportButtons = document.querySelectorAll('[data-n3-export]');
            
            exportButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const format = button.dataset.n3Export;
                    const source = button.dataset.exportSource;
                    const filename = button.dataset.filename || 'export';
                    
                    this.performExport(format, source, filename);
                });
            });
            
            console.log('✅ エクスポート機能設定完了');
        },
        
        /**
         * エクスポート実行
         */
        performExport: function(format, source, filename) {
            const sourceElement = document.getElementById(source);
            if (!sourceElement) {
                N3Utils.showError('エクスポート対象が見つかりません');
                return;
            }
            
            switch (format) {
                case 'csv':
                    this.exportToCSV(sourceElement, filename);
                    break;
                case 'json':
                    this.exportToJSON(sourceElement, filename);
                    break;
                case 'txt':
                    this.exportToText(sourceElement, filename);
                    break;
                default:
                    N3Utils.showError('サポートされていないエクスポート形式です');
            }
        },
        
        /**
         * CSV エクスポート
         */
        exportToCSV: function(element, filename) {
            const table = element.querySelector('table');
            if (!table) {
                N3Utils.showError('テーブルが見つかりません');
                return;
            }
            
            const rows = Array.from(table.querySelectorAll('tr'));
            const csvContent = rows.map(row => {
                const cells = Array.from(row.querySelectorAll('th, td'));
                return cells.map(cell => {
                    const text = cell.textContent.trim();
                    return `"${text.replace(/"/g, '""')}"`;
                }).join(',');
            }).join('\n');
            
            this.downloadFile(csvContent, filename + '.csv', 'text/csv');
        },
        
        /**
         * JSON エクスポート
         */
        exportToJSON: function(element, filename) {
            // データ収集ロジック（要素に応じて実装）
            const data = { message: 'JSON export not implemented for this element type' };
            const jsonContent = JSON.stringify(data, null, 2);
            
            this.downloadFile(jsonContent, filename + '.json', 'application/json');
        },
        
        /**
         * テキスト エクスポート
         */
        exportToText: function(element, filename) {
            const textContent = element.textContent;
            this.downloadFile(textContent, filename + '.txt', 'text/plain');
        },
        
        /**
         * ファイルダウンロード
         */
        downloadFile: function(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            N3Utils.showSuccess(`${filename} をダウンロードしました`);
        },
        
        /**
         * 共通イベント設定
         */
        setupCommonEvents: function() {
            // 確認ダイアログボタン
            document.addEventListener('click', async (e) => {
                if (e.target.hasAttribute('data-confirm')) {
                    e.preventDefault();
                    
                    const message = e.target.dataset.confirm;
                    const confirmed = await N3UI.confirm(message);
                    
                    if (confirmed) {
                        // 元のアクション実行
                        if (e.target.href) {
                            window.location.href = e.target.href;
                        } else if (e.target.onclick) {
                            e.target.onclick();
                        }
                    }
                }
            });
            
            // ツールチップ
            document.querySelectorAll('[data-tooltip]').forEach(element => {
                const text = element.dataset.tooltip;
                const position = element.dataset.tooltipPosition || 'top';
                
                N3UI.tooltip(element, text, { position });
            });
            
            // Ajax フォーム
            document.addEventListener('submit', async (e) => {
                if (e.target.hasAttribute('data-ajax-form')) {
                    e.preventDefault();
                    
                    const form = e.target;
                    const action = form.dataset.ajaxAction || 'submit_form';
                    const successMessage = form.dataset.successMessage || 'フォームが送信されました';
                    
                    try {
                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData);
                        
                        const result = await N3API.executeAjax(action, data);
                        
                        N3Utils.showSuccess(successMessage);
                        
                        // フォームリセット
                        if (form.dataset.resetOnSuccess !== 'false') {
                            form.reset();
                        }
                        
                        // カスタムコールバック
                        if (form.dataset.onSuccess) {
                            const callback = window[form.dataset.onSuccess];
                            if (typeof callback === 'function') {
                                callback(result);
                            }
                        }
                        
                    } catch (error) {
                        N3Utils.showError('フォーム送信エラー: ' + error.message);
                    }
                }
            });
            
            console.log('✅ 共通イベント設定完了');
        },
        
        /**
         * ページ準備完了時の処理
         */
        onPageReady: function(config) {
            // ローディング画面非表示
            const loadingScreens = document.querySelectorAll('.loading-screen, #loadingScreen');
            loadingScreens.forEach(screen => {
                screen.style.display = 'none';
            });
            
            // N3ステータス更新
            const statusIndicators = document.querySelectorAll('.n3-status-indicator');
            statusIndicators.forEach(indicator => {
                indicator.textContent = '✅ N3準拠 - ページ準備完了';
            });
            
            console.log('✅ N3基本ページテンプレート準備完了');
        }
    };
    
    // グローバル露出
    window.N3BasicPage = N3BasicPage;
    
    console.log('✅ N3BasicPage Template loaded');
    
})(window);
