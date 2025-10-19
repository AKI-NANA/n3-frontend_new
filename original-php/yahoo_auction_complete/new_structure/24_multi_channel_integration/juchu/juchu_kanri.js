
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS ajax_integration Hook
// CAIDS ajax_integration Hook - 基本実装
console.log('✅ ajax_integration Hook loaded');

// CAIDS error_handling Hook

// CAIDS エラー処理Hook - 完全実装
window.CAIDS_ERROR_HANDLER = {
    isActive: true,
    errorCount: 0,
    errorHistory: [],
    
    initialize: function() {
        this.setupGlobalErrorHandler();
        this.setupUnhandledPromiseRejection();
        this.setupNetworkErrorHandler();
        console.log('⚠️ CAIDS エラーハンドリングシステム完全初期化');
    },
    
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
    },
    
    setupUnhandledPromiseRejection: function() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });
    },
    
    setupNetworkErrorHandler: function() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    window.CAIDS_ERROR_HANDLER.handleError({
                        type: 'Network Error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0]
                    });
                }
                return response;
            } catch (error) {
                window.CAIDS_ERROR_HANDLER.handleError({
                    type: 'Network Fetch Error',
                    message: error.message,
                    url: args[0]
                });
                throw error;
            }
        };
    },
    
    handleError: function(errorInfo) {
        this.errorCount++;
        this.errorHistory.push({...errorInfo, timestamp: new Date().toISOString()});
        
        console.error('🚨 CAIDS Error Handler:', errorInfo);
        this.showErrorNotification(errorInfo);
        this.reportError(errorInfo);
    },
    
    showErrorNotification: function(errorInfo) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 999999;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white; padding: 15px 20px; border-radius: 8px;
            max-width: 350px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            border: 2px solid #ff6666; animation: caids-error-shake 0.5s ease-in-out;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🚨</span>
                <div>
                    <strong>エラーが発生しました</strong><br>
                    <small style="opacity: 0.9;">${errorInfo.type}: ${errorInfo.message}</small>
                </div>
            </div>
        `;
        
        // CSS Animation
        if (!document.getElementById('caids-error-styles')) {
            const style = document.createElement('style');
            style.id = 'caids-error-styles';
            style.textContent = `
                @keyframes caids-error-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
    },
    
    reportError: function(errorInfo) {
        // エラーレポート生成・送信（将来の拡張用）
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorCount: this.errorCount,
            sessionId: this.getSessionId(),
            ...errorInfo
        };
        
        console.log('📋 CAIDS Error Report:', report);
        localStorage.setItem('caids_last_error', JSON.stringify(report));
    },
    
    getSessionId: function() {
        let sessionId = sessionStorage.getItem('caids_session_id');
        if (!sessionId) {
            sessionId = 'caids_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('caids_session_id', sessionId);
        }
        return sessionId;
    },
    
    getErrorStats: function() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.slice(-10),
            sessionId: this.getSessionId()
        };
    }
};

window.CAIDS_ERROR_HANDLER.initialize();

/**
 * NAGANO-3 eBay受注管理システム JavaScript機能
 * 
 * 命名規則: camelCase統一・日本語ローマ字ベース
 * 構造: juchuKanriManager.method() 形式
 * 連携: window.N3_CONFIG・動的JS生成システム対応
 * 機能: リアルタイム更新・フィルタリング・詳細モーダル・システム間連携
 */

class JuchuKanriManager {
    constructor() {
        this.config = window.N3_EBAY_CONFIG || {};
        this.orderData = window.juchuOrderData || [];
        this.totalCount = window.juchuTotalCount || 0;
        this.currentFilters = window.juchuCurrentFilters || {};
        this.isAutoRefreshEnabled = this.config.juchuSettings?.autoRefresh ?? true;
        this.refreshInterval = this.config.juchuSettings?.refreshInterval ?? 30000;
        this.autoRefreshTimer = null;
        this.isModalOpen = false;
        
        // イベントリスナー管理
        this.eventListeners = new Map();
        
        console.log('🔧 JuchuKanriManager インスタンス作成完了');
    }
    
    /**
     * システム初期化
     */
    init() {
        console.log('🚀 eBay受注管理システム 初期化開始');
        
        try {
            this.setupEventListeners();
            this.initializeUI();
            this.startAutoRefresh();
            this.loadUserPreferences();
            this.setupKeyboardShortcuts();
            
            console.log('✅ eBay受注管理システム 初期化完了');
        } catch (error) {
            console.error('❌ 初期化エラー:', error);
            this.showErrorMessage('システムの初期化に失敗しました。ページを再読み込みしてください。');
        }
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // フィルターフォーム送信
        const filterForm = document.querySelector('.juchu-kanri__filter-form');
        if (filterForm) {
            this.addEventListener(filterForm, 'submit', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
        }
        
        // リアルタイム検索（入力時フィルタリング）
        const filterInputs = document.querySelectorAll('.juchu-kanri__filter-select, .juchu-kanri__filter-date');
        filterInputs.forEach(input => {
            this.addEventListener(input, 'change', () => {
                this.debounce(() => this.applyFilters(), 500);
            });
        });
        
        // テーブル行クリックイベント
        const orderRows = document.querySelectorAll('.juchu-kanri__order-row');
        orderRows.forEach(row => {
            this.addEventListener(row, 'click', (e) => {
                // アクションボタンクリック時は詳細表示しない
                if (!e.target.closest('.juchu-kanri__action-buttons')) {
                    const orderId = row.dataset.orderId;
                    if (orderId) {
                        this.showOrderDetail(orderId);
                    }
                }
            });
        });
        
        // モーダルクローズ（背景クリック）
        const modalOverlay = document.getElementById('orderDetailModal');
        if (modalOverlay) {
            this.addEventListener(modalOverlay, 'click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeOrderDetail();
                }
            });
        }
        
        // ウィンドウリサイズ時のレスポンシブ調整
        this.addEventListener(window, 'resize', () => {
            this.debounce(() => this.adjustResponsiveLayout(), 250);
        });
        
        // ページ離脱時の自動更新停止
        this.addEventListener(window, 'beforeunload', () => {
            this.stopAutoRefresh();
        });
        
        console.log('📡 イベントリスナー設定完了');
    }
    
    /**
     * UI初期化
     */
    initializeUI() {
        // レスポンシブテーブル調整
        this.adjustResponsiveLayout();
        
        // ソート機能初期化
        this.initializeTableSorting();
        
        // ツールチップ初期化
        this.initializeTooltips();
        
        // アニメーション設定
        this.initializeAnimations();
        
        console.log('🎨 UI初期化完了');
    }
    
    /**
     * データ更新（メイン機能）
     */
    async refreshData() {
        try {
            this.showLoadingState(true);
            
            console.log('🔄 データ更新開始');
            
            const response = await fetch('/modules/juchu_kanri/php/juchu_kanri_controller.php?action=api&api_action=refresh', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success' || data.status === 'fallback') {
                this.updateOrderTable(data.data);
                this.orderData = data.data;
                this.totalCount = data.total_count;
                
                // フォールバック状態の表示
                if (data.status === 'fallback') {
                    this.showFallbackNotice(data.error_message);
                } else {
                    this.hideFallbackNotice();
                }
                
                this.updateStatistics();
                this.showSuccessMessage('データを更新しました');
                
                console.log('✅ データ更新完了:', data.data.length + '件');
            } else {
                throw new Error(data.error || 'データ取得に失敗しました');
            }
            
        } catch (error) {
            console.error('❌ データ更新エラー:', error);
            this.showErrorMessage('データの更新に失敗しました: ' + error.message);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    /**
     * フィルター適用
     */
    async applyFilters() {
        try {
            const filterData = this.collectFilterData();
            
            console.log('🔍 フィルター適用:', filterData);
            
            this.showLoadingState(true);
            
            const response = await fetch('/modules/juchu_kanri/php/juchu_kanri_controller.php?action=api&api_action=filter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(filterData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.updateOrderTable(result.data);
                this.currentFilters = filterData;
                this.updateFilteredCount(result.total_count);
                
                console.log('✅ フィルター適用完了:', result.data.length + '件表示');
            } else {
                throw new Error(result.error || 'フィルタリングに失敗しました');
            }
            
        } catch (error) {
            console.error('❌ フィルター適用エラー:', error);
            this.showErrorMessage('フィルターの適用に失敗しました: ' + error.message);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    /**
     * フィルターデータ収集
     */
    collectFilterData() {
        const form = document.querySelector('.juchu-kanri__filter-form');
        const formData = new FormData(form);
        
        return {
            account_filter: formData.get('account') || '',
            status_filter: formData.get('status') || '',
            date_from: formData.get('date_from') || '',
            date_to: formData.get('date_to') || '',
            payment_status: formData.get('payment_status') || '',
            shipping_status: formData.get('shipping_status') || ''
        };
    }
    
    /**
     * フィルタークリア
     */
    clearFilters() {
        console.log('🗑️ フィルタークリア実行');
        
        // フォーム要素リセット
        const form = document.querySelector('.juchu-kanri__filter-form');
        if (form) {
            form.reset();
        }
        
        // URLパラメータクリア
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, '', url);
        
        // 全データ再表示
        this.refreshData();
    }
    
    /**
     * 受注詳細モーダル表示
     */
    async showOrderDetail(orderId) {
        try {
            console.log('📄 受注詳細表示:', orderId);
            
            this.showLoadingState(true);
            
            const response = await fetch(`/modules/juchu_kanri/php/juchu_kanri_controller.php?action=detail&order_id=${encodeURIComponent(orderId)}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const detailData = await response.json();
            
            if (detailData.error) {
                throw new Error(detailData.error);
            }
            
            this.renderOrderDetailModal(detailData);
            this.openModal();
            
            console.log('✅ 受注詳細表示完了');
            
        } catch (error) {
            console.error('❌ 詳細表示エラー:', error);
            this.showErrorMessage('詳細情報の取得に失敗しました: ' + error.message);
        } finally {
            this.showLoadingState(false);
        }
    }
    
    /**
     * 受注詳細モーダル内容生成
     */
    renderOrderDetailModal(detailData) {
        const order = detailData.order_detail;
        const modalContent = document.getElementById('orderDetailContent');
        
        if (!modalContent) return;
        
        const html = `
            <div class="juchu-kanri__detail-sections">
                <!-- 基本情報セクション -->
                <section class="juchu-kanri__detail-section">
                    <h4 class="juchu-kanri__detail-section-title">
                        <i class="fas fa-info-circle"></i> 基本情報
                    </h4>
                    <div class="juchu-kanri__detail-grid">
                        <div class="juchu-kanri__detail-item">
                            <label>連番</label>
                            <span>${this.escapeHtml(order.renban)}</span>
                        </div>
                        <div class="juchu-kanri__detail-item">
                            <label>受注番号</label>
                            <span>${this.escapeHtml(order.juchu_bangou)}</span>
                        </div>
                        <div class="juchu-kanri__detail-item">
                            <label>受注日時</label>
                            <span>${this.formatDateTime(order.juchu_nichiji)}</span>
                        </div>
                        <div class="juchu-kanri__detail-item">
                            <label>発送期限</label>
                            <span>${this.formatDate(order.hakko_kigen)}</span>
                        </div>
                        <div class="juchu-kanri__detail-item">
                            <label>アカウント</label>
                            <span class="juchu-kanri__account-badge">${this.escapeHtml(order.mall_account)}</span>
                        </div>
                        <div class="juchu-kanri__detail-item">
                            <label>AIスコア</label>
                            <span class="juchu-kanri__score-display">${order.ai_score || '-'}</span>
                        </div>
                    </div>
                </section>
                
                <!-- 商品情報セクション -->
                <section class="juchu-kanri__detail-section">
                    <h4 class="juchu-kanri__detail-section-title">
                        <i class="fas fa-box"></i> 商品情報
                    </h4>
                    <div class="juchu-kanri__product-detail">
                        <div class="juchu-kanri__product-image-large">
                            <img src="${this.escapeHtml(order.shohin_gazo)}" alt="商品画像">
                        </div>
                        <div class="juchu-kanri__product-detail-info">
                            <h5>${this.escapeHtml(order.shohin_title)}</h5>
                            <p><strong>SKU:</strong> ${this.escapeHtml(order.custom_label)}</p>
                            ${order.ebay_detail_url ? `
                                <a href="${this.escapeHtml(order.ebay_detail_url)}" target="_blank" class="juchu-kanri__ebay-link">
                                    <i class="fab fa-ebay"></i> eBayページを開く
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </section>
                
                <!-- 価格・利益分析セクション -->
                <section class="juchu-kanri__detail-section">
                    <h4 class="juchu-kanri__detail-section-title">
                        <i class="fas fa-chart-line"></i> 価格・利益分析
                    </h4>
                    <div class="juchu-kanri__profit-breakdown">
                        ${this.renderProfitBreakdown(detailData.profit_breakdown)}
                    </div>
                </section>
                
                <!-- 仕入れ情報セクション -->
                <section class="juchu-kanri__detail-section">
                    <h4 class="juchu-kanri__detail-section-title">
                        <i class="fas fa-shopping-basket"></i> 仕入れ情報
                    </h4>
                    <div class="juchu-kanri__shiire-info">
                        ${this.renderShiireInfo(order.shiire_info, detailData.shiire_candidates)}
                    </div>
                </section>
                
                <!-- 出荷・配送情報セクション -->
                <section class="juchu-kanri__detail-section">
                    <h4 class="juchu-kanri__detail-section-title">
                        <i class="fas fa-truck"></i> 出荷・配送情報
                    </h4>
                    <div class="juchu-kanri__shukka-info">
                        ${this.renderShukkaInfo(order.shukka_info, detailData.tracking_detail)}
                    </div>
                </section>
                
                <!-- 問い合わせ履歴セクション -->
                ${detailData.inquiry_history && detailData.inquiry_history.length > 0 ? `
                <section class="juchu-kanri__detail-section">
                    <h4 class="juchu-kanri__detail-section-title">
                        <i class="fas fa-comments"></i> 問い合わせ履歴
                    </h4>
                    <div class="juchu-kanri__inquiry-history">
                        ${this.renderInquiryHistory(detailData.inquiry_history)}
                    </div>
                </section>
                ` : ''}
            </div>
            
            <div class="juchu-kanri__detail-actions">
                <button class="juchu-kanri__detail-btn juchu-kanri__detail-btn--shiire" 
                        onclick="juchuKanriManager.openShiireView('${this.escapeHtml(order.custom_label)}')">
                    <i class="fas fa-shopping-basket"></i> 仕入れ管理へ
                </button>
                
                <button class="juchu-kanri__detail-btn juchu-kanri__detail-btn--shukka" 
                        onclick="juchuKanriManager.openShukkaView('${this.escapeHtml(order.juchu_bangou)}')">
                    <i class="fas fa-truck"></i> 出荷管理へ
                </button>
                
                <button class="juchu-kanri__detail-btn juchu-kanri__detail-btn--rieki" 
                        onclick="juchuKanriManager.openRiekiView('${this.escapeHtml(order.juchu_bangou)}')">
                    <i class="fas fa-chart-line"></i> 利益分析へ
                </button>
            </div>
        `;
        
        modalContent.innerHTML = html;
    }
    
    /**
     * 利益内訳表示
     */
    renderProfitBreakdown(profitData) {
        if (!profitData) {
            return '<p class="juchu-kanri__no-data">利益データがありません</p>';
        }
        
        return `
            <div class="juchu-kanri__profit-table">
                <div class="juchu-kanri__profit-row">
                    <span class="juchu-kanri__profit-label">売上価格</span>
                    <span class="juchu-kanri__profit-value">¥${this.formatNumber(profitData.uriage_kakaku || 0)}</span>
                </div>
                <div class="juchu-kanri__profit-row">
                    <span class="juchu-kanri__profit-label">eBay手数料</span>
                    <span class="juchu-kanri__profit-value juchu-kanri__profit-value--minus">-¥${this.formatNumber(profitData.ebay_tesuryo || 0)}</span>
                </div>
                <div class="juchu-kanri__profit-row">
                    <span class="juchu-kanri__profit-label">仕入れ原価</span>
                    <span class="juchu-kanri__profit-value juchu-kanri__profit-value--minus">-¥${this.formatNumber(profitData.shiire_genka || 0)}</span>
                </div>
                <div class="juchu-kanri__profit-row">
                    <span class="juchu-kanri__profit-label">送料</span>
                    <span class="juchu-kanri__profit-value juchu-kanri__profit-value--minus">-¥${this.formatNumber(profitData.soryo || 0)}</span>
                </div>
                <div class="juchu-kanri__profit-row juchu-kanri__profit-row--total">
                    <span class="juchu-kanri__profit-label">最終利益</span>
                    <span class="juchu-kanri__profit-value juchu-kanri__profit-value--total">¥${this.formatNumber(profitData.saishu_rieki || 0)}</span>
                </div>
                <div class="juchu-kanri__profit-row">
                    <span class="juchu-kanri__profit-label">利益率</span>
                    <span class="juchu-kanri__profit-value">${this.formatNumber(profitData.rieki_ritsu || 0, 1)}%</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 仕入れ情報表示
     */
    renderShiireInfo(shiireInfo, shiireCandidates) {
        let html = '';
        
        if (shiireInfo && Object.keys(shiireInfo).length > 0) {
            html += '<div class="juchu-kanri__current-shiire">現在の仕入れ状況を表示</div>';
        }
        
        if (shiireCandidates && shiireCandidates.length > 0) {
            html += '<div class="juchu-kanri__shiire-candidates">仕入れ候補を表示</div>';
        }
        
        if (!html) {
            html = '<p class="juchu-kanri__no-data">仕入れ情報がありません</p>';
        }
        
        return html;
    }
    
    /**
     * 出荷情報表示
     */
    renderShukkaInfo(shukkaInfo, trackingDetail) {
        let html = '';
        
        if (shukkaInfo && Object.keys(shukkaInfo).length > 0) {
            html += '<div class="juchu-kanri__current-shukka">現在の出荷状況を表示</div>';
        }
        
        if (trackingDetail && Object.keys(trackingDetail).length > 0) {
            html += '<div class="juchu-kanri__tracking-detail">追跡詳細を表示</div>';
        }
        
        if (!html) {
            html = '<p class="juchu-kanri__no-data">出荷情報がありません</p>';
        }
        
        return html;
    }
    
    /**
     * 問い合わせ履歴表示
     */
    renderInquiryHistory(inquiryHistory) {
        return inquiryHistory.map(inquiry => `
            <div class="juchu-kanri__inquiry-item">
                <div class="juchu-kanri__inquiry-date">${this.formatDateTime(inquiry.created_at)}</div>
                <div class="juchu-kanri__inquiry-content">${this.escapeHtml(inquiry.content)}</div>
            </div>
        `).join('');
    }
    
    /**
     * モーダル開く
     */
    openModal() {
        const modal = document.getElementById('orderDetailModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.isModalOpen = true;
            
            // フォーカストラップ設定
            this.setupModalFocusTrap(modal);
        }
    }
    
    /**
     * モーダル閉じる
     */
    closeOrderDetail() {
        const modal = document.getElementById('orderDetailModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this.isModalOpen = false;
        }
    }
    
    /**
     * 他システムへの遷移
     */
    openShiireView(sku) {
        const url = `/modules/shiire_kanri/php/shiire_kanri_controller.php?sku=${encodeURIComponent(sku)}`;
        window.open(url, '_blank');
    }
    
    openShukkaView(orderId) {
        const url = `/modules/shukka_kanri/php/shukka_kanri_controller.php?order_id=${encodeURIComponent(orderId)}`;
        window.open(url, '_blank');
    }
    
    openRiekiView(orderId) {
        const url = `/modules/rieki_bunseki/php/rieki_bunseki_controller.php?order_id=${encodeURIComponent(orderId)}`;
        window.open(url, '_blank');
    }
    
    /**
     * データエクスポート
     */
    async exportData() {
        try {
            console.log('📤 データエクスポート開始');
            
            const filterData = this.collectFilterData();
            const exportData = {
                filters: filterData,
                orders: this.orderData,
                export_type: 'csv',
                timestamp: new Date().toISOString()
            };
            
            // CSVダウンロード実行
            const csv = this.convertToCSV(this.orderData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `ebay_orders_${this.formatDateForFilename(new Date())}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccessMessage('データをエクスポートしました');
            
            console.log('✅ エクスポート完了');
            
        } catch (error) {
            console.error('❌ エクスポートエラー:', error);
            this.showErrorMessage('エクスポートに失敗しました: ' + error.message);
        }
    }
    
    /**
     * CSV変換
     */
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = [
            '連番', '受注番号', '受注日', '商品タイトル', 'SKU', 
            '売上価格', '利益', '利益率', '支払い状況', 'ステータス', 
            'アカウント', 'AIスコア'
        ];
        
        const csvContent = [
            headers.join(','),
            ...data.map(order => [
                this.escapeCsvField(order.renban),
                this.escapeCsvField(order.juchu_bangou),
                this.escapeCsvField(this.formatDate(order.juchu_nichiji)),
                this.escapeCsvField(order.shohin_title),
                this.escapeCsvField(order.custom_label),
                order.uriage_kakaku,
                order.tesuryo_sashihiki_rieki,
                order.rieki_ritsu,
                this.escapeCsvField(order.shiharai_jotai),
                this.escapeCsvField(order.order_status),
                this.escapeCsvField(order.mall_account),
                order.ai_score || ''
            ].join(','))
        ].join('\n');
        
        return '\uFEFF' + csvContent; // BOM追加でExcel対応
    }
    
    /**
     * 自動更新開始
     */
    startAutoRefresh() {
        if (!this.isAutoRefreshEnabled) return;
        
        this.stopAutoRefresh(); // 既存タイマークリア
        
        this.autoRefreshTimer = setInterval(() => {
            if (!this.isModalOpen) { // モーダル開いてる時は更新しない
                this.refreshData();
            }
        }, this.refreshInterval);
        
        console.log(`🔄 自動更新開始 (${this.refreshInterval}ms間隔)`);
    }
    
    /**
     * 自動更新停止
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
            console.log('⏹️ 自動更新停止');
        }
    }
    
    /**
     * ユーザー設定読み込み
     */
    loadUserPreferences() {
        const savedTheme = localStorage.getItem('juchu_theme_color');
        if (savedTheme) {
            document.documentElement.style.setProperty('--juchu-primary', savedTheme);
        }
        
        const savedRefreshInterval = localStorage.getItem('juchu_refresh_interval');
        if (savedRefreshInterval) {
            this.refreshInterval = parseInt(savedRefreshInterval);
        }
    }
    
    /**
     * キーボードショートカット設定
     */
    setupKeyboardShortcuts() {
        this.addEventListener(document, 'keydown', (e) => {
            // Ctrl+R: データ更新
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
            }
            
            // Escape: モーダル閉じる
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeOrderDetail();
            }
            
            // Ctrl+E: エクスポート
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportData();
            }
        });
    }
    
    /**
     * テーブル更新
     */
    updateOrderTable(newData) {
        // 既存のテーブル行を削除
        const tbody = document.querySelector('.juchu-kanri__table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (newData.length === 0) {
            tbody.innerHTML = `
                <tr class="juchu-kanri__empty-row">
                    <td colspan="9" class="juchu-kanri__empty-cell">
                        <div class="juchu-kanri__empty-message">
                            <i class="fas fa-inbox"></i>
                            <p>条件に一致する受注データがありません。</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // 新しいデータでテーブル行生成
        newData.forEach(order => {
            const row = this.createOrderRow(order);
            tbody.appendChild(row);
        });
        
        // イベントリスナー再設定
        this.setupTableRowEvents();
    }
    
    /**
     * 受注行要素生成
     */
    createOrderRow(order) {
        const row = document.createElement('tr');
        row.className = 'juchu-kanri__order-row';
        row.dataset.orderId = order.juchu_bangou;
        
        row.innerHTML = `
            <td class="juchu-kanri__table-cell juchu-kanri__cell-renban">
                ${this.escapeHtml(order.renban)}
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-order-id">
                <div class="juchu-kanri__order-info">
                    <span class="juchu-kanri__order-number">${this.escapeHtml(order.juchu_bangou)}</span>
                    <span class="juchu-kanri__account-badge">${this.escapeHtml(order.mall_account)}</span>
                </div>
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-date">
                <div class="juchu-kanri__date-info">
                    <div class="juchu-kanri__order-date">${this.formatDate(order.juchu_nichiji)}</div>
                    <div class="juchu-kanri__shipping-deadline">
                        期限: ${this.formatDate(order.hakko_kigen)}
                        ${this.getUrgencyBadge(order.hakko_kigen)}
                    </div>
                </div>
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-product">
                <div class="juchu-kanri__product-info">
                    <div class="juchu-kanri__product-image">
                        <img src="${this.escapeHtml(order.shohin_gazo)}" alt="商品画像" class="juchu-kanri__product-img">
                    </div>
                    <div class="juchu-kanri__product-details">
                        <div class="juchu-kanri__product-title">${this.escapeHtml(order.shohin_title)}</div>
                        <div class="juchu-kanri__product-sku">SKU: ${this.escapeHtml(order.custom_label)}</div>
                    </div>
                </div>
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-price">
                <div class="juchu-kanri__price-info">
                    <div class="juchu-kanri__sale-price">¥${this.formatNumber(order.uriage_kakaku)}</div>
                    <div class="juchu-kanri__profit-info">
                        <span class="juchu-kanri__profit-amount">¥${this.formatNumber(order.tesuryo_sashihiki_rieki)}</span>
                        <span class="juchu-kanri__profit-rate ${this.getProfitRateClass(order.rieki_ritsu)}">
                            (${this.formatNumber(order.rieki_ritsu, 1)}%)
                        </span>
                    </div>
                </div>
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-payment">
                <div class="juchu-kanri__payment-info">
                    <span class="juchu-kanri__payment-status juchu-kanri__payment-status--${order.shiharai_jotai}">
                        ${this.getPaymentStatusLabel(order.shiharai_jotai)}
                    </span>
                    ${order.shiharai_bi ? `<div class="juchu-kanri__payment-date">${this.formatDateTime(order.shiharai_bi)}</div>` : ''}
                </div>
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-status">
                <div class="juchu-kanri__status-badges">
                    <span class="juchu-kanri__order-status juchu-kanri__order-status--${order.order_status}">
                        ${this.getOrderStatusLabel(order.order_status)}
                    </span>
                    <span class="juchu-kanri__risk-level juchu-kanri__risk-level--${order.risk_level}">
                        リスク${this.getRiskLevelLabel(order.risk_level)}
                    </span>
                </div>
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-score">
                ${this.renderAIScore(order.ai_score)}
            </td>
            <td class="juchu-kanri__table-cell juchu-kanri__cell-actions">
                <div class="juchu-kanri__action-buttons">
                    <button class="juchu-kanri__action-btn juchu-kanri__action-btn--detail" 
                            onclick="juchuKanriManager.showOrderDetail('${this.escapeHtml(order.juchu_bangou)}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.ebay_detail_url ? `
                        <a href="${this.escapeHtml(order.ebay_detail_url)}" target="_blank" 
                           class="juchu-kanri__action-btn juchu-kanri__action-btn--ebay">
                            <i class="fab fa-ebay"></i>
                        </a>
                    ` : ''}
                    <button class="juchu-kanri__action-btn juchu-kanri__action-btn--shiire" 
                            onclick="juchuKanriManager.openShiireView('${this.escapeHtml(order.custom_label)}')">
                        <i class="fas fa-shopping-basket"></i>
                    </button>
                    <button class="juchu-kanri__action-btn juchu-kanri__action-btn--shukka" 
                            onclick="juchuKanriManager.openShukkaView('${this.escapeHtml(order.juchu_bangou)}')">
                        <i class="fas fa-truck"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    /**
     * ユーティリティメソッド群
     */
    
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    escapeCsvField(field) {
        if (typeof field !== 'string') return field;
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return '"' + field.replace(/"/g, '""') + '"';
        }
        return field;
    }
    
    formatNumber(num, decimals = 0) {
        if (typeof num !== 'number') return '0';
        return num.toLocaleString('ja-JP', { 
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals 
        });
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatDateForFilename(date) {
        return date.toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    getUrgencyBadge(deadline) {
        const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 2 ? '<span class="juchu-kanri__urgent-badge">急</span>' : '';
    }
    
    getProfitRateClass(rate) {
        if (rate >= 20) return 'juchu-kanri__profit-rate--good';
        if (rate >= 10) return 'juchu-kanri__profit-rate--normal';
        return 'juchu-kanri__profit-rate--low';
    }
    
    getPaymentStatusLabel(status) {
        const labels = {
            'pending': '支払い待ち',
            'completed': '支払い済み',
            'failed': '支払い失敗'
        };
        return labels[status] || status;
    }
    
    getOrderStatusLabel(status) {
        const labels = {
            'awaiting_payment': '支払い待ち',
            'payment_received': '支払い済み',
            'shipped': '出荷済み',
            'delivered': '配達完了'
        };
        return labels[status] || status;
    }
    
    getRiskLevelLabel(level) {
        const labels = { 'low': '低', 'medium': '中', 'high': '高' };
        return labels[level] || level;
    }
    
    renderAIScore(score) {
        if (!score) {
            return '<span class="juchu-kanri__score-na">-</span>';
        }
        
        const scoreClass = score >= 70 ? 'high' : (score >= 40 ? 'medium' : 'low');
        
        return `
            <div class="juchu-kanri__ai-score">
                <div class="juchu-kanri__score-value juchu-kanri__score-value--${scoreClass}">${score}</div>
                <div class="juchu-kanri__score-bar">
                    <div class="juchu-kanri__score-fill" style="width: ${score}%"></div>
                </div>
            </div>
        `;
    }
    
    showLoadingState(isLoading) {
        const refreshBtn = document.querySelector('.juchu-kanri__refresh-btn');
        if (refreshBtn) {
            if (isLoading) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中...';
            } else {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 更新';
            }
        }
    }
    
    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }
    
    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        // 通知表示実装（トーストなど）
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // 簡単なアラート表示（本格実装時はカスタム通知UIに差し替え）
        if (type === 'error') {
            alert('エラー: ' + message);
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        
        // リスナー管理（メモリリーク防止）
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, []);
        }
        this.eventListeners.get(element).push({ event, handler });
    }
    
    destroy() {
        // クリーンアップ
        this.stopAutoRefresh();
        
        // イベントリスナー削除
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        
        this.eventListeners.clear();
        
        console.log('🗑️ JuchuKanriManager クリーンアップ完了');
    }
    
    /**
     * テーブルソート機能初期化
     */
    initializeTableSorting() {
        const headers = document.querySelectorAll('.juchu-kanri__header-cell');
        
        headers.forEach((header, index) => {
            if (header.classList.contains('juchu-kanri__header-cell--actions')) {
                return; // アクション列はソート対象外
            }
            
            header.style.cursor = 'pointer';
            header.innerHTML += ' <i class="fas fa-sort juchu-kanri__sort-icon"></i>';
            
            this.addEventListener(header, 'click', () => {
                this.sortTable(index, header);
            });
        });
    }
    
    /**
     * テーブルソート実行
     */
    sortTable(columnIndex, headerElement) {
        const table = document.querySelector('.juchu-kanri__order-table');
        const tbody = table.querySelector('.juchu-kanri__table-body');
        const rows = Array.from(tbody.querySelectorAll('.juchu-kanri__order-row'));
        
        if (rows.length === 0) return;
        
        // 現在のソート方向を取得
        const currentDirection = headerElement.dataset.sortDirection || 'asc';
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        
        // 全ヘッダーのソートアイコンをリセット
        document.querySelectorAll('.juchu-kanri__header-cell').forEach(h => {
            h.dataset.sortDirection = '';
            const icon = h.querySelector('.juchu-kanri__sort-icon');
            if (icon) {
                icon.className = 'fas fa-sort juchu-kanri__sort-icon';
            }
        });
        
        // 現在のヘッダーにソート方向設定
        headerElement.dataset.sortDirection = newDirection;
        const icon = headerElement.querySelector('.juchu-kanri__sort-icon');
        if (icon) {
            icon.className = `fas fa-sort-${newDirection === 'asc' ? 'up' : 'down'} juchu-kanri__sort-icon`;
        }
        
        // ソート実行
        rows.sort((a, b) => {
            const aValue = this.getCellValue(a, columnIndex);
            const bValue = this.getCellValue(b, columnIndex);
            
            let comparison = 0;
            
            if (this.isNumeric(aValue) && this.isNumeric(bValue)) {
                comparison = parseFloat(aValue) - parseFloat(bValue);
            } else if (this.isDate(aValue) && this.isDate(bValue)) {
                comparison = new Date(aValue) - new Date(bValue);
            } else {
                comparison = aValue.localeCompare(bValue, 'ja');
            }
            
            return newDirection === 'asc' ? comparison : -comparison;
        });
        
        // ソート済み行を再挿入
        rows.forEach(row => tbody.appendChild(row));
        
        console.log(`📊 列${columnIndex}を${newDirection}でソート完了`);
    }
    
    /**
     * セル値取得
     */
    getCellValue(row, columnIndex) {
        const cell = row.cells[columnIndex];
        if (!cell) return '';
        
        // 数値データの抽出
        const numMatch = cell.textContent.match(/[\d,]+/);
        if (numMatch) {
            return numMatch[0].replace(/,/g, '');
        }
        
        // 日付データの抽出
        const dateMatch = cell.textContent.match(/\d{2}\/\d{2}/);
        if (dateMatch) {
            return dateMatch[0];
        }
        
        return cell.textContent.trim();
    }
    
    /**
     * 数値判定
     */
    isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }
    
    /**
     * 日付判定
     */
    isDate(value) {
        return /\d{2}\/\d{2}/.test(value) || !isNaN(Date.parse(value));
    }
    
    /**
     * ツールチップ初期化
     */
    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            this.addEventListener(element, 'mouseenter', (e) => {
                this.showTooltip(e.target, e.target.dataset.tooltip);
            });
            
            this.addEventListener(element, 'mouseleave', () => {
                this.hideTooltip();
            });
        });
    }
    
    /**
     * ツールチップ表示
     */
    showTooltip(element, text) {
        let tooltip = document.getElementById('juchuTooltip');
        
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'juchuTooltip';
            tooltip.className = 'juchu-kanri__tooltip';
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    }
    
    /**
     * ツールチップ非表示
     */
    hideTooltip() {
        const tooltip = document.getElementById('juchuTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
    
    /**
     * アニメーション初期化
     */
    initializeAnimations() {
        // ローディングアニメーション設定
        this.setupLoadingAnimations();
        
        // テーブル行のフェードインアニメーション
        this.setupRowAnimations();
    }
    
    /**
     * ローディングアニメーション設定
     */
    setupLoadingAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes juchuSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes juchuFadeIn {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            .juchu-kanri__loading {
                animation: juchuSpin 1s linear infinite;
            }
            
            .juchu-kanri__fade-in {
                animation: juchuFadeIn 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * テーブル行アニメーション設定
     */
    setupRowAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('juchu-kanri__fade-in');
                }
            });
        });
        
        document.querySelectorAll('.juchu-kanri__order-row').forEach(row => {
            observer.observe(row);
        });
    }
    
    /**
     * レスポンシブレイアウト調整
     */
    adjustResponsiveLayout() {
        const container = document.querySelector('.juchu-kanri__container');
        const table = document.querySelector('.juchu-kanri__order-table');
        
        if (!container || !table) return;
        
        const screenWidth = window.innerWidth;
        
        // モバイル表示調整
        if (screenWidth <= 768) {
            this.enableMobileTableMode();
        } else {
            this.disableMobileTableMode();
        }
        
        // タブレット表示調整
        if (screenWidth <= 1024 && screenWidth > 768) {
            this.enableTabletTableMode();
        }
    }
    
    /**
     * モバイルテーブルモード
     */
    enableMobileTableMode() {
        const table = document.querySelector('.juchu-kanri__order-table');
        if (table) {
            table.classList.add('juchu-kanri__order-table--mobile');
        }
        
        // 列の非表示制御
        const hideColumns = [5, 6, 7]; // 支払い、ステータス、AIスコア列を非表示
        hideColumns.forEach(index => {
            const cells = document.querySelectorAll(`.juchu-kanri__order-table tr td:nth-child(${index + 1}), .juchu-kanri__order-table tr th:nth-child(${index + 1})`);
            cells.forEach(cell => {
                cell.style.display = 'none';
            });
        });
    }
    
    /**
     * モバイルテーブルモード解除
     */
    disableMobileTableMode() {
        const table = document.querySelector('.juchu-kanri__order-table');
        if (table) {
            table.classList.remove('juchu-kanri__order-table--mobile');
        }
        
        // 全列表示
        const allCells = document.querySelectorAll('.juchu-kanri__order-table tr td, .juchu-kanri__order-table tr th');
        allCells.forEach(cell => {
            cell.style.display = '';
        });
    }
    
    /**
     * タブレットテーブルモード
     */
    enableTabletTableMode() {
        // タブレット固有の調整があれば実装
    }
    
    /**
     * テーブル行イベント再設定
     */
    setupTableRowEvents() {
        const orderRows = document.querySelectorAll('.juchu-kanri__order-row');
        
        orderRows.forEach(row => {
            // 既存のイベントリスナーがあれば削除
            row.removeEventListener('click', this.rowClickHandler);
            
            // 新しいイベントリスナー追加
            this.addEventListener(row, 'click', (e) => {
                if (!e.target.closest('.juchu-kanri__action-buttons')) {
                    const orderId = row.dataset.orderId;
                    if (orderId) {
                        this.showOrderDetail(orderId);
                    }
                }
            });
        });
    }
    
    /**
     * モーダルフォーカストラップ設定
     */
    setupModalFocusTrap(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        // 最初の要素にフォーカス
        if (firstElement) {
            firstElement.focus();
        }
        
        // タブキー制御
        const tabKeyHandler = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        
        modal.addEventListener('keydown', tabKeyHandler);
        
        // モーダルクローズ時にイベントリスナー削除
        modal.addEventListener('hidden', () => {
            modal.removeEventListener('keydown', tabKeyHandler);
        });
    }
    
    /**
     * 統計情報更新
     */
    updateStatistics() {
        const statValue = document.querySelector('.juchu-kanri__stat-value');
        if (statValue) {
            statValue.textContent = this.formatNumber(this.totalCount);
        }
    }
    
    /**
     * フィルター適用件数更新
     */
    updateFilteredCount(count) {
        const paginationInfo = document.querySelector('.juchu-kanri__pagination-info');
        if (paginationInfo) {
            paginationInfo.textContent = `表示中: 1-${count} / 全${this.totalCount}件`;
        }
    }
    
    /**
     * フォールバック通知表示
     */
    showFallbackNotice(message) {
        let notice = document.querySelector('.juchu-kanri__fallback-notice');
        
        if (!notice) {
            notice = document.createElement('div');
            notice.className = 'juchu-kanri__fallback-notice';
            
            const headerStats = document.querySelector('.juchu-kanri__header-stats');
            if (headerStats) {
                headerStats.appendChild(notice);
            }
        }
        
        notice.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${this.escapeHtml(message)}
        `;
        notice.style.display = 'flex';
    }
    
    /**
     * フォールバック通知非表示
     */
    hideFallbackNotice() {
        const notice = document.querySelector('.juchu-kanri__fallback-notice');
        if (notice) {
            notice.style.display = 'none';
        }
    }
}

// グローバルインスタンス作成
window.juchuKanriManager = new JuchuKanriManager();

// ページ読み込み完了時に自動初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.juchuKanriManager.init();
    });
} else {
    window.juchuKanriManager.init();
}

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (window.juchuKanriManager) {
        window.juchuKanriManager.destroy();
    }
});

// デバッグ用
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.juchuDebug = {
        manager: window.juchuKanriManager,
        refreshData: () => window.juchuKanriManager.refreshData(),
        showDetail: (orderId) => window.juchuKanriManager.showOrderDetail(orderId),
        exportData: () => window.juchuKanriManager.exportData(),
        toggleAutoRefresh: () => {
            if (window.juchuKanriManager.isAutoRefreshEnabled) {
                window.juchuKanriManager.stopAutoRefresh();
                window.juchuKanriManager.isAutoRefreshEnabled = false;
                console.log('🔄 自動更新を無効化');
            } else {
                window.juchuKanriManager.isAutoRefreshEnabled = true;
                window.juchuKanriManager.startAutoRefresh();
                console.log('🔄 自動更新を有効化');
            }
        }
    };
    
    console.log('🔧 デバッグモード有効 - window.juchuDebug でアクセス可能');
}