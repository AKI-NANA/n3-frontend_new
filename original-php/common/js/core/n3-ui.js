/**
 * N3 UI Library v2.0
 * 統一UI制御ライブラリ
 * モーダル・テーブル・フォーム・通知システムの標準化
 */

(function(window) {
    'use strict';
    
    /**
     * N3 UI クラス
     */
    const N3UI = {
        // 初期化済みフラグ
        initialized: false,
        
        // 設定
        config: {
            debug: false,
            theme: 'default',
            animations: true
        },
        
        /**
         * 初期化
         */
        init: function(config = {}) {
            if (this.initialized) {
                console.log('N3UI already initialized');
                return;
            }
            
            this.config = { ...this.config, ...config };
            this.initialized = true;
            
            this.setupGlobalUI();
            this.injectBaseCSS();
            
            console.log('✅ N3UI initialized', this.config);
        },
        
        /**
         * グローバルUI設定
         */
        setupGlobalUI: function() {
            // ESCキーでモーダル閉じる
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeTopModal();
                }
            });
            
            // モーダル背景クリックで閉じる
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('n3-modal')) {
                    this.closeModal(e.target.id);
                }
            });
        },
        
        /**
         * ベースCSS注入
         */
        injectBaseCSS: function() {
            if (document.getElementById('n3-ui-base-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'n3-ui-base-styles';
            style.textContent = `
                /* N3 UI Base Styles */
                .n3-modal {
                    display: none;
                    position: fixed;
                    z-index: 10000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    animation: n3FadeIn 0.3s ease;
                }
                
                .n3-modal--active {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .n3-modal__content {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: auto;
                    animation: n3SlideIn 0.3s ease;
                }
                
                .n3-modal__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #eee;
                }
                
                .n3-modal__title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .n3-modal__close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0.25rem;
                    color: #666;
                    transition: color 0.2s ease;
                }
                
                .n3-modal__close:hover {
                    color: #333;
                }
                
                .n3-modal__body {
                    padding: 1.5rem;
                }
                
                .n3-modal__footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    padding: 1rem 1.5rem;
                    border-top: 1px solid #eee;
                    background: #f8f9fa;
                }
                
                .n3-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1rem 0;
                }
                
                .n3-table th,
                .n3-table td {
                    padding: 0.75rem;
                    text-align: left;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .n3-table th {
                    background-color: #f8f9fa;
                    font-weight: 600;
                    color: #495057;
                }
                
                .n3-table tbody tr:hover {
                    background-color: #f8f9fa;
                }
                
                .n3-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border: 1px solid transparent;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .n3-btn--primary {
                    background-color: #007bff;
                    border-color: #007bff;
                    color: white;
                }
                
                .n3-btn--primary:hover {
                    background-color: #0056b3;
                    border-color: #0056b3;
                }
                
                .n3-btn--secondary {
                    background-color: #6c757d;
                    border-color: #6c757d;
                    color: white;
                }
                
                .n3-btn--success {
                    background-color: #28a745;
                    border-color: #28a745;
                    color: white;
                }
                
                .n3-btn--danger {
                    background-color: #dc3545;
                    border-color: #dc3545;
                    color: white;
                }
                
                .n3-btn--warning {
                    background-color: #ffc107;
                    border-color: #ffc107;
                    color: #212529;
                }
                
                .n3-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }
                
                .n3-form-group {
                    margin-bottom: 1rem;
                }
                
                .n3-form-label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #495057;
                }
                
                .n3-form-control {
                    display: block;
                    width: 100%;
                    padding: 0.375rem 0.75rem;
                    font-size: 1rem;
                    line-height: 1.5;
                    color: #495057;
                    background-color: #fff;
                    border: 1px solid #ced4da;
                    border-radius: 0.375rem;
                    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
                }
                
                .n3-form-control:focus {
                    outline: none;
                    border-color: #80bdff;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                }
                
                @keyframes n3FadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes n3SlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                body.n3-modal-open {
                    overflow: hidden;
                }
            `;
            document.head.appendChild(style);
        },
        
        /**
         * モーダル表示
         */
        showModal: function(modalId, options = {}) {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error('Modal not found:', modalId);
                return false;
            }
            
            // 既存のモーダルを閉じる
            if (options.closeOthers !== false) {
                this.closeAllModals();
            }
            
            modal.classList.add('n3-modal--active');
            modal.style.display = 'flex';
            document.body.classList.add('n3-modal-open');
            
            // フォーカス管理
            const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }
            
            this.debug('Modal shown:', modalId);
            return true;
        },
        
        /**
         * モーダル非表示
         */
        closeModal: function(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) {
                console.error('Modal not found:', modalId);
                return false;
            }
            
            modal.classList.remove('n3-modal--active');
            modal.style.display = 'none';
            
            // body class管理（他にモーダルが開いていない場合のみ削除）
            const openModals = document.querySelectorAll('.n3-modal--active');
            if (openModals.length === 0) {
                document.body.classList.remove('n3-modal-open');
            }
            
            this.debug('Modal closed:', modalId);
            return true;
        },
        
        /**
         * 全モーダル非表示
         */
        closeAllModals: function() {
            const openModals = document.querySelectorAll('.n3-modal--active');
            openModals.forEach(modal => {
                this.closeModal(modal.id);
            });
        },
        
        /**
         * 最上位モーダル非表示
         */
        closeTopModal: function() {
            const openModals = document.querySelectorAll('.n3-modal--active');
            if (openModals.length > 0) {
                const topModal = openModals[openModals.length - 1];
                this.closeModal(topModal.id);
            }
        },
        
        /**
         * テーブル生成
         */
        renderTable: function(data, options = {}) {
            const {
                containerId,
                columns,
                className = 'n3-table',
                sortable = false,
                selectable = false,
                pagination = false,
                pageSize = 10
            } = options;
            
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Container not found:', containerId);
                return false;
            }
            
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<p>データがありません</p>';
                return false;
            }
            
            if (!columns || columns.length === 0) {
                console.error('Columns configuration required');
                return false;
            }
            
            const tableHTML = this.generateTableHTML(data, columns, {
                className,
                sortable,
                selectable
            });
            
            container.innerHTML = tableHTML;
            
            // ソート機能
            if (sortable) {
                this.setupTableSorting(containerId, data, columns, options);
            }
            
            // 選択機能
            if (selectable) {
                this.setupTableSelection(containerId);
            }
            
            // ページネーション
            if (pagination) {
                this.setupTablePagination(containerId, data, columns, options);
            }
            
            this.debug('Table rendered:', { containerId, dataCount: data.length });
            return true;
        },
        
        /**
         * テーブルHTML生成
         */
        generateTableHTML: function(data, columns, options = {}) {
            const { className = 'n3-table', sortable = false, selectable = false } = options;
            
            let html = `<table class="${className}">`;
            
            // ヘッダー
            html += '<thead><tr>';
            
            if (selectable) {
                html += '<th><input type="checkbox" class="n3-select-all"></th>';
            }
            
            columns.forEach(column => {
                const sortIcon = sortable ? ' <i class="fas fa-sort n3-sort-icon"></i>' : '';
                const sortClass = sortable ? ' class="n3-sortable"' : '';
                html += `<th${sortClass} data-key="${column.key}">${column.label}${sortIcon}</th>`;
            });
            
            html += '</tr></thead>';
            
            // ボディ
            html += '<tbody>';
            
            data.forEach((row, index) => {
                html += '<tr>';
                
                if (selectable) {
                    html += `<td><input type="checkbox" class="n3-row-select" data-index="${index}"></td>`;
                }
                
                columns.forEach(column => {
                    let value = this.getNestedValue(row, column.key);
                    
                    // フォーマッター適用
                    if (column.formatter && typeof column.formatter === 'function') {
                        value = column.formatter(value, row, index);
                    }
                    
                    html += `<td>${value}</td>`;
                });
                
                html += '</tr>';
            });
            
            html += '</tbody></table>';
            
            return html;
        },
        
        /**
         * ネストしたオブジェクトの値取得
         */
        getNestedValue: function(obj, path) {
            return path.split('.').reduce((o, p) => o && o[p], obj) || '';
        },
        
        /**
         * テーブルソート機能設定
         */
        setupTableSorting: function(containerId, data, columns, options) {
            const container = document.getElementById(containerId);
            const sortableHeaders = container.querySelectorAll('.n3-sortable');
            
            let currentSort = { key: null, direction: 'asc' };
            
            sortableHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const key = header.dataset.key;
                    
                    if (currentSort.key === key) {
                        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSort.key = key;
                        currentSort.direction = 'asc';
                    }
                    
                    // ソートアイコン更新
                    sortableHeaders.forEach(h => {
                        const icon = h.querySelector('.n3-sort-icon');
                        if (h === header) {
                            icon.className = `fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'} n3-sort-icon`;
                        } else {
                            icon.className = 'fas fa-sort n3-sort-icon';
                        }
                    });
                    
                    // データソート
                    const sortedData = [...data].sort((a, b) => {
                        const aVal = this.getNestedValue(a, key);
                        const bVal = this.getNestedValue(b, key);
                        
                        if (typeof aVal === 'number' && typeof bVal === 'number') {
                            return currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
                        } else {
                            const aStr = String(aVal).toLowerCase();
                            const bStr = String(bVal).toLowerCase();
                            if (currentSort.direction === 'asc') {
                                return aStr.localeCompare(bStr);
                            } else {
                                return bStr.localeCompare(aStr);
                            }
                        }
                    });
                    
                    // テーブル再描画
                    this.renderTable(sortedData, { ...options, containerId });
                });
            });
        },
        
        /**
         * テーブル選択機能設定
         */
        setupTableSelection: function(containerId) {
            const container = document.getElementById(containerId);
            const selectAll = container.querySelector('.n3-select-all');
            const rowSelects = container.querySelectorAll('.n3-row-select');
            
            // 全選択
            if (selectAll) {
                selectAll.addEventListener('change', () => {
                    rowSelects.forEach(checkbox => {
                        checkbox.checked = selectAll.checked;
                    });
                    
                    this.triggerSelectionChange(containerId);
                });
            }
            
            // 行選択
            rowSelects.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    if (selectAll) {
                        selectAll.checked = Array.from(rowSelects).every(cb => cb.checked);
                    }
                    
                    this.triggerSelectionChange(containerId);
                });
            });
        },
        
        /**
         * 選択変更イベント発火
         */
        triggerSelectionChange: function(containerId) {
            const container = document.getElementById(containerId);
            const selectedIndexes = Array.from(container.querySelectorAll('.n3-row-select:checked'))
                .map(cb => parseInt(cb.dataset.index));
            
            const event = new CustomEvent('n3TableSelectionChange', {
                detail: { containerId, selectedIndexes }
            });
            
            document.dispatchEvent(event);
        },
        
        /**
         * フォーム検証
         */
        validateForm: function(formId, rules = {}) {
            const form = document.getElementById(formId);
            if (!form) {
                console.error('Form not found:', formId);
                return false;
            }
            
            let isValid = true;
            const errors = {};
            
            Object.entries(rules).forEach(([fieldName, fieldRules]) => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (!field) return;
                
                const value = field.value.trim();
                const fieldErrors = [];
                
                // 必須チェック
                if (fieldRules.required && !value) {
                    fieldErrors.push('この項目は必須です');
                }
                
                // 最小長チェック
                if (fieldRules.minLength && value.length < fieldRules.minLength) {
                    fieldErrors.push(`${fieldRules.minLength}文字以上で入力してください`);
                }
                
                // 最大長チェック
                if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                    fieldErrors.push(`${fieldRules.maxLength}文字以内で入力してください`);
                }
                
                // パターンチェック
                if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
                    fieldErrors.push(fieldRules.message || '形式が正しくありません');
                }
                
                // カスタム検証
                if (fieldRules.validator && typeof fieldRules.validator === 'function') {
                    const customResult = fieldRules.validator(value, form);
                    if (customResult !== true) {
                        fieldErrors.push(customResult);
                    }
                }
                
                if (fieldErrors.length > 0) {
                    isValid = false;
                    errors[fieldName] = fieldErrors;
                }
            });
            
            // エラー表示
            this.displayFormErrors(formId, errors);
            
            return isValid;
        },
        
        /**
         * フォームエラー表示
         */
        displayFormErrors: function(formId, errors) {
            const form = document.getElementById(formId);
            
            // 既存のエラー表示をクリア
            form.querySelectorAll('.n3-field-error').forEach(el => el.remove());
            form.querySelectorAll('.n3-form-control--error').forEach(el => {
                el.classList.remove('n3-form-control--error');
            });
            
            // エラー表示
            Object.entries(errors).forEach(([fieldName, fieldErrors]) => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (!field) return;
                
                field.classList.add('n3-form-control--error');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'n3-field-error';
                errorDiv.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem;';
                errorDiv.innerHTML = fieldErrors.map(error => `• ${error}`).join('<br>');
                
                field.parentNode.appendChild(errorDiv);
            });
        },
        
        /**
         * 確認ダイアログ
         */
        confirm: function(message, title = '確認') {
            return new Promise((resolve) => {
                const modalId = 'n3-confirm-modal-' + Date.now();
                const modalHTML = `
                    <div id="${modalId}" class="n3-modal">
                        <div class="n3-modal__content" style="min-width: 400px;">
                            <div class="n3-modal__header">
                                <h3 class="n3-modal__title">${title}</h3>
                            </div>
                            <div class="n3-modal__body">
                                <p style="margin: 0;">${message}</p>
                            </div>
                            <div class="n3-modal__footer">
                                <button class="n3-btn n3-btn--secondary" data-action="cancel">キャンセル</button>
                                <button class="n3-btn n3-btn--primary" data-action="confirm">確認</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                const modal = document.getElementById(modalId);
                const cancelBtn = modal.querySelector('[data-action="cancel"]');
                const confirmBtn = modal.querySelector('[data-action="confirm"]');
                
                const cleanup = () => {
                    this.closeModal(modalId);
                    setTimeout(() => modal.remove(), 300);
                };
                
                cancelBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(false);
                });
                
                confirmBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(true);
                });
                
                this.showModal(modalId);
                confirmBtn.focus();
            });
        },
        
        /**
         * アラートダイアログ
         */
        alert: function(message, title = 'お知らせ', type = 'info') {
            return new Promise((resolve) => {
                const modalId = 'n3-alert-modal-' + Date.now();
                const iconClass = {
                    success: 'fas fa-check-circle',
                    error: 'fas fa-exclamation-triangle',
                    warning: 'fas fa-exclamation-circle',
                    info: 'fas fa-info-circle'
                }[type] || 'fas fa-info-circle';
                
                const modalHTML = `
                    <div id="${modalId}" class="n3-modal">
                        <div class="n3-modal__content" style="min-width: 400px;">
                            <div class="n3-modal__header">
                                <h3 class="n3-modal__title">
                                    <i class="${iconClass}" style="margin-right: 0.5rem;"></i>
                                    ${title}
                                </h3>
                            </div>
                            <div class="n3-modal__body">
                                <p style="margin: 0;">${message}</p>
                            </div>
                            <div class="n3-modal__footer">
                                <button class="n3-btn n3-btn--primary" data-action="ok">OK</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                const modal = document.getElementById(modalId);
                const okBtn = modal.querySelector('[data-action="ok"]');
                
                const cleanup = () => {
                    this.closeModal(modalId);
                    setTimeout(() => modal.remove(), 300);
                };
                
                okBtn.addEventListener('click', () => {
                    cleanup();
                    resolve();
                });
                
                this.showModal(modalId);
                okBtn.focus();
            });
        },
        
        /**
         * プロンプトダイアログ
         */
        prompt: function(message, defaultValue = '', title = '入力') {
            return new Promise((resolve) => {
                const modalId = 'n3-prompt-modal-' + Date.now();
                const modalHTML = `
                    <div id="${modalId}" class="n3-modal">
                        <div class="n3-modal__content" style="min-width: 400px;">
                            <div class="n3-modal__header">
                                <h3 class="n3-modal__title">${title}</h3>
                            </div>
                            <div class="n3-modal__body">
                                <p style="margin-bottom: 1rem;">${message}</p>
                                <input type="text" class="n3-form-control" id="${modalId}-input" value="${defaultValue}">
                            </div>
                            <div class="n3-modal__footer">
                                <button class="n3-btn n3-btn--secondary" data-action="cancel">キャンセル</button>
                                <button class="n3-btn n3-btn--primary" data-action="ok">OK</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                const modal = document.getElementById(modalId);
                const input = document.getElementById(modalId + '-input');
                const cancelBtn = modal.querySelector('[data-action="cancel"]');
                const okBtn = modal.querySelector('[data-action="ok"]');
                
                const cleanup = () => {
                    this.closeModal(modalId);
                    setTimeout(() => modal.remove(), 300);
                };
                
                cancelBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(null);
                });
                
                okBtn.addEventListener('click', () => {
                    const value = input.value;
                    cleanup();
                    resolve(value);
                });
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        okBtn.click();
                    }
                });
                
                this.showModal(modalId);
                input.focus();
                input.select();
            });
        },
        
        /**
         * ツールチップ
         */
        tooltip: function(element, text, options = {}) {
            const { position = 'top', delay = 500 } = options;
            
            if (typeof element === 'string') {
                element = document.getElementById(element) || document.querySelector(element);
            }
            
            if (!element) return;
            
            let tooltipId = null;
            let showTimeout = null;
            let hideTimeout = null;
            
            const showTooltip = () => {
                hideTooltip();
                
                tooltipId = 'n3-tooltip-' + Date.now();
                const tooltip = document.createElement('div');
                tooltip.id = tooltipId;
                tooltip.className = 'n3-tooltip';
                tooltip.textContent = text;
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    z-index: 10001;
                    pointer-events: none;
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                `;
                
                document.body.appendChild(tooltip);
                
                // 位置計算
                const rect = element.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                let top, left;
                
                switch (position) {
                    case 'bottom':
                        top = rect.bottom + 5;
                        left = rect.left + (rect.width - tooltipRect.width) / 2;
                        break;
                    case 'left':
                        top = rect.top + (rect.height - tooltipRect.height) / 2;
                        left = rect.left - tooltipRect.width - 5;
                        break;
                    case 'right':
                        top = rect.top + (rect.height - tooltipRect.height) / 2;
                        left = rect.right + 5;
                        break;
                    default: // top
                        top = rect.top - tooltipRect.height - 5;
                        left = rect.left + (rect.width - tooltipRect.width) / 2;
                }
                
                tooltip.style.top = top + window.scrollY + 'px';
                tooltip.style.left = left + window.scrollX + 'px';
                
                // フェードイン
                setTimeout(() => {
                    tooltip.style.opacity = '1';
                }, 10);
            };
            
            const hideTooltip = () => {
                if (tooltipId) {
                    const tooltip = document.getElementById(tooltipId);
                    if (tooltip) {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                            if (tooltip.parentNode) {
                                tooltip.parentNode.removeChild(tooltip);
                            }
                        }, 200);
                    }
                    tooltipId = null;
                }
            };
            
            element.addEventListener('mouseenter', () => {
                clearTimeout(hideTimeout);
                showTimeout = setTimeout(showTooltip, delay);
            });
            
            element.addEventListener('mouseleave', () => {
                clearTimeout(showTimeout);
                hideTimeout = setTimeout(hideTooltip, 100);
            });
        },
        
        /**
         * デバッグ出力
         */
        debug: function(message, data = null) {
            if (this.config.debug) {
                console.log(`[N3UI] ${message}`, data || '');
            }
        }
    };
    
    // グローバル露出
    window.N3UI = N3UI;
    
    console.log('✅ N3UI Library v2.0 loaded');
    
})(window);
