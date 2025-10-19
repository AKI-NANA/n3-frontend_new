/**
 * N3統一モーダルシステム - 完全版
 * 多モール在庫管理システム統合対応
 * NAGANO-3準拠・統一デザインシステム
 */

class N3ModalSystem {
    constructor() {
        this.activeModals = new Map();
        this.modalCount = 0;
        this.zIndexBase = 1000;
        this.init();
    }

    init() {
        // CSS変数とスタイルを動的に追加
        this.injectStyles();
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });

        console.log('✅ N3統一モーダルシステム初期化完了');
    }

    injectStyles() {
        if (document.getElementById('n3-modal-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'n3-modal-styles';
        styleSheet.textContent = `
            /* N3統一モーダルシステム専用CSS */
            :root {
                --n3-modal-bg-overlay: rgba(0, 0, 0, 0.6);
                --n3-modal-bg-primary: #ffffff;
                --n3-modal-bg-secondary: #f8fafc;
                --n3-modal-bg-tertiary: #f1f5f9;
                --n3-modal-text-primary: #1e293b;
                --n3-modal-text-secondary: #475569;
                --n3-modal-text-muted: #94a3b8;
                --n3-modal-border-color: #e2e8f0;
                --n3-modal-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                --n3-modal-radius-lg: 0.75rem;
                --n3-modal-space-md: 1rem;
                --n3-modal-space-lg: 1.5rem;
                --n3-modal-color-primary: #3b82f6;
                --n3-modal-color-success: #10b981;
                --n3-modal-color-warning: #f59e0b;
                --n3-modal-color-danger: #ef4444;
            }

            .n3-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--n3-modal-bg-overlay);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease-in-out;
                padding: var(--n3-modal-space-md);
            }

            .n3-modal-overlay.n3-modal-active {
                opacity: 1;
                visibility: visible;
            }

            .n3-modal-container {
                background: var(--n3-modal-bg-primary);
                border-radius: var(--n3-modal-radius-lg);
                box-shadow: var(--n3-modal-shadow-xl);
                width: 100%;
                max-height: 90vh;
                overflow: hidden;
                transform: scale(0.9);
                transition: all 0.2s ease-in-out;
                display: flex;
                flex-direction: column;
            }

            .n3-modal-active .n3-modal-container {
                transform: scale(1);
            }

            .n3-modal-size-small { max-width: 400px; }
            .n3-modal-size-medium { max-width: 600px; }
            .n3-modal-size-large { max-width: 900px; }
            .n3-modal-size-xl { max-width: 1200px; }
            .n3-modal-size-full { max-width: 95vw; }

            .n3-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--n3-modal-space-lg);
                border-bottom: 2px solid var(--n3-modal-border-color);
                background: var(--n3-modal-bg-tertiary);
                flex-shrink: 0;
            }

            .n3-modal-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--n3-modal-text-primary);
                margin: 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .n3-modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                color: var(--n3-modal-text-muted);
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 0.375rem;
                transition: all 0.15s ease;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .n3-modal-close:hover {
                background: var(--n3-modal-bg-secondary);
                color: var(--n3-modal-text-primary);
            }

            .n3-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: var(--n3-modal-space-lg);
            }

            .n3-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 0.5rem;
                padding: var(--n3-modal-space-lg);
                border-top: 1px solid var(--n3-modal-border-color);
                background: var(--n3-modal-bg-tertiary);
                flex-shrink: 0;
            }

            .n3-modal-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                border: 1px solid var(--n3-modal-border-color);
                border-radius: 0.375rem;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.15s ease;
                text-decoration: none;
                font-family: inherit;
            }

            .n3-modal-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .n3-modal-btn-primary {
                background: var(--n3-modal-color-primary);
                border-color: var(--n3-modal-color-primary);
                color: white;
            }

            .n3-modal-btn-success {
                background: var(--n3-modal-color-success);
                border-color: var(--n3-modal-color-success);
                color: white;
            }

            .n3-modal-btn-warning {
                background: var(--n3-modal-color-warning);
                border-color: var(--n3-modal-color-warning);
                color: white;
            }

            .n3-modal-btn-danger {
                background: var(--n3-modal-color-danger);
                border-color: var(--n3-modal-color-danger);
                color: white;
            }

            .n3-modal-btn-secondary {
                background: var(--n3-modal-bg-primary);
                border-color: var(--n3-modal-border-color);
                color: var(--n3-modal-text-primary);
            }

            @media (max-width: 768px) {
                .n3-modal-container {
                    max-width: 100vw !important;
                    max-height: 100vh !important;
                    border-radius: 0 !important;
                }

                .n3-modal-overlay {
                    padding: 0;
                }

                .n3-modal-footer {
                    flex-direction: column;
                }

                .n3-modal-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }

    createModal(options) {
        const {
            id,
            title = 'モーダル',
            content = '',
            size = 'medium',
            buttons = [],
            closable = true,
            backdrop = true
        } = options;

        if (this.activeModals.has(id)) {
            console.warn(`モーダル "${id}" は既に存在します`);
            return;
        }

        const modalElement = this.buildModalElement(id, title, content, size, buttons, closable, backdrop);
        document.body.appendChild(modalElement);

        this.activeModals.set(id, {
            element: modalElement,
            options
        });

        console.log(`✅ モーダル "${id}" を作成しました`);
        return modalElement;
    }

    buildModalElement(id, title, content, size, buttons, closable, backdrop) {
        const overlay = document.createElement('div');
        overlay.className = 'n3-modal-overlay';
        overlay.id = `n3-modal-${id}`;
        overlay.style.zIndex = this.zIndexBase + this.modalCount++;

        if (backdrop) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(id);
                }
            });
        }

        const container = document.createElement('div');
        container.className = `n3-modal-container n3-modal-size-${size}`;

        const header = document.createElement('div');
        header.className = 'n3-modal-header';
        header.innerHTML = `
            <h3 class="n3-modal-title">${title}</h3>
            ${closable ? '<button class="n3-modal-close" onclick="N3Modal.closeModal(\'' + id + '\')"><i class="fas fa-times"></i></button>' : ''}
        `;

        const body = document.createElement('div');
        body.className = 'n3-modal-body';
        body.innerHTML = content;

        const footer = document.createElement('div');
        footer.className = 'n3-modal-footer';

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = `n3-modal-btn n3-modal-btn-${button.type || 'secondary'}`;
            btn.innerHTML = `${button.icon ? `<i class="${button.icon}"></i>` : ''}${button.text}`;
            btn.onclick = () => {
                if (typeof button.action === 'function') {
                    button.action();
                } else if (typeof button.action === 'string') {
                    eval(button.action);
                }
            };
            footer.appendChild(btn);
        });

        container.appendChild(header);
        container.appendChild(body);
        if (buttons.length > 0) {
            container.appendChild(footer);
        }

        overlay.appendChild(container);
        return overlay;
    }

    openModal(id) {
        const modal = this.activeModals.get(id);
        if (!modal) {
            console.error(`モーダル "${id}" が見つかりません`);
            return;
        }

        // 他のモーダルを一時的に隠す
        this.activeModals.forEach((modal, modalId) => {
            if (modalId !== id) {
                modal.element.style.display = 'none';
            }
        });

        modal.element.style.display = 'flex';
        
        // アニメーション用の遅延
        requestAnimationFrame(() => {
            modal.element.classList.add('n3-modal-active');
        });

        console.log(`✅ モーダル "${id}" を表示しました`);
    }

    closeModal(id) {
        const modal = this.activeModals.get(id);
        if (!modal) {
            console.error(`モーダル "${id}" が見つかりません`);
            return;
        }

        modal.element.classList.remove('n3-modal-active');

        setTimeout(() => {
            document.body.removeChild(modal.element);
            this.activeModals.delete(id);
            
            // 他のモーダルがあれば表示
            const remainingModals = Array.from(this.activeModals.values());
            if (remainingModals.length > 0) {
                const lastModal = remainingModals[remainingModals.length - 1];
                lastModal.element.style.display = 'flex';
            }
        }, 200);

        console.log(`✅ モーダル "${id}" を閉じました`);
    }

    closeTopModal() {
        const activeModalIds = Array.from(this.activeModals.keys());
        if (activeModalIds.length > 0) {
            const topModalId = activeModalIds[activeModalIds.length - 1];
            this.closeModal(topModalId);
        }
    }

    closeAllModals() {
        const modalIds = Array.from(this.activeModals.keys());
        modalIds.forEach(id => this.closeModal(id));
    }

    // アラートモーダル
    alert(message, title = '通知', type = 'info') {
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const colorMap = {
            success: 'var(--n3-modal-color-success)',
            error: 'var(--n3-modal-color-danger)',
            warning: 'var(--n3-modal-color-warning)',
            info: 'var(--n3-modal-color-primary)'
        };

        const modalId = `alert-${Date.now()}`;
        const content = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: ${colorMap[type]}10; border-radius: 0.5rem; border-left: 4px solid ${colorMap[type]};">
                <i class="${iconMap[type]}" style="font-size: 2rem; color: ${colorMap[type]};"></i>
                <div style="flex: 1;">
                    <p style="margin: 0; color: var(--n3-modal-text-primary); font-size: 1rem;">${message}</p>
                </div>
            </div>
        `;

        this.createModal({
            id: modalId,
            title: title,
            content: content,
            size: 'small',
            buttons: [
                { text: 'OK', type: 'primary', action: () => this.closeModal(modalId) }
            ]
        });

        this.openModal(modalId);

        return new Promise((resolve) => {
            const checkClosed = () => {
                if (!this.activeModals.has(modalId)) {
                    resolve();
                } else {
                    setTimeout(checkClosed, 100);
                }
            };
            checkClosed();
        });
    }

    // 確認モーダル
    confirm(message, title = '確認', options = {}) {
        const modalId = `confirm-${Date.now()}`;
        const content = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem;">
                <i class="fas fa-question-circle" style="font-size: 2rem; color: var(--n3-modal-color-warning);"></i>
                <div style="flex: 1;">
                    <p style="margin: 0; color: var(--n3-modal-text-primary); font-size: 1rem;">${message}</p>
                </div>
            </div>
        `;

        return new Promise((resolve) => {
            this.createModal({
                id: modalId,
                title: title,
                content: content,
                size: 'small',
                buttons: [
                    { 
                        text: options.cancelText || 'キャンセル', 
                        type: 'secondary', 
                        action: () => {
                            this.closeModal(modalId);
                            resolve(false);
                        }
                    },
                    { 
                        text: options.confirmText || 'OK', 
                        type: 'primary', 
                        action: () => {
                            this.closeModal(modalId);
                            resolve(true);
                        }
                    }
                ]
            });

            this.openModal(modalId);
        });
    }

    updateModalContent(id, content) {
        const modal = this.activeModals.get(id);
        if (modal) {
            const body = modal.element.querySelector('.n3-modal-body');
            if (body) {
                body.innerHTML = content;
                console.log(`✅ モーダル "${id}" のコンテンツを更新しました`);
            }
        }
    }

    isModalOpen(id) {
        return this.activeModals.has(id);
    }

    getActiveModalCount() {
        return this.activeModals.size;
    }
}

// グローバルインスタンスを作成
const N3Modal = new N3ModalSystem();

// N3Modal統合用のeBayモーダル表示関数
function showCompleteProductModal(productData) {
    console.log('📦 eBay商品詳細モーダル表示開始:', productData);
    
    if (!productData) {
        N3Modal.alert('商品データが見つかりません。', 'エラー', 'error');
        return;
    }

    const modalContent = generateEbayProductModalContent(productData);
    
    N3Modal.createModal({
        id: 'ebay-product-detail',
        title: `eBay商品詳細 - ${productData.title || '商品名なし'}`,
        content: modalContent,
        size: 'xl',
        buttons: [
            { 
                text: 'eBayで見る', 
                type: 'primary', 
                icon: 'fab fa-ebay',
                action: () => {
                    if (productData.view_item_url) {
                        window.open(productData.view_item_url, '_blank');
                    } else {
                        N3Modal.alert('商品URLが見つかりません。', 'エラー', 'error');
                    }
                }
            },
            { 
                text: 'データ更新', 
                type: 'warning', 
                icon: 'fas fa-sync',
                action: () => {
                    N3Modal.alert('データ更新機能は開発中です。', '情報', 'info');
                }
            },
            { 
                text: '閉じる', 
                type: 'secondary', 
                action: () => N3Modal.closeModal('ebay-product-detail')
            }
        ]
    });

    N3Modal.openModal('ebay-product-detail');
    console.log('✅ eBay商品詳細モーダル表示完了');
}

function generateEbayProductModalContent(data) {
    const imageDisplay = data.picture_urls && Array.isArray(data.picture_urls) && data.picture_urls.length > 0 
        ? `<img src="${data.picture_urls[0]}" alt="${escapeHtml(data.title)}" style="width: 100%; max-width: 400px; height: 300px; object-fit: cover; border-radius: 0.5rem; border: 1px solid var(--n3-modal-border-color);">` 
        : `<div style="width: 100%; max-width: 400px; height: 300px; background: var(--n3-modal-bg-tertiary); display: flex; align-items: center; justify-content: center; border-radius: 0.5rem; border: 1px solid var(--n3-modal-border-color); color: var(--n3-modal-text-muted);">
                <div style="text-align: center;">
                    <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <div>画像なし</div>
                </div>
           </div>`;
    
    const formatPrice = (value, currency = 'USD') => {
        const price = parseFloat(value) || 0;
        return `${currency} ${price.toFixed(2)}`;
    };

    // タブシステム付きコンテンツ
    return `
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- 商品概要セクション -->
            <div style="display: grid; grid-template-columns: 400px 1fr; gap: 2rem; margin-bottom: 1rem;">
                <div>
                    ${imageDisplay}
                    ${data.picture_urls && Array.isArray(data.picture_urls) && data.picture_urls.length > 1 ? `
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem; overflow-x: auto;">
                            ${data.picture_urls.slice(1, 5).map(url => 
                                `<img src="${url}" alt="サムネイル" style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.25rem; border: 1px solid var(--n3-modal-border-color); cursor: pointer;" 
                                      onclick="this.parentElement.previousElementSibling.querySelector('img').src = this.src">`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
                <div>
                    <h3 style="margin: 0 0 1rem 0; color: var(--n3-modal-text-primary); line-height: 1.3;">${escapeHtml(data.title || '商品名なし')}</h3>
                    
                    <!-- バッジ -->
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        ${data.listing_status ? `<span style="padding: 0.25rem 0.75rem; background: #dcfce7; color: #166534; border-radius: 1rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">${data.listing_status}</span>` : ''}
                        ${data.condition_display_name ? `<span style="padding: 0.25rem 0.75rem; background: #dbeafe; color: #1e40af; border-radius: 1rem; font-size: 0.75rem; font-weight: 600;">${data.condition_display_name}</span>` : ''}
                        ${data.listing_type ? `<span style="padding: 0.25rem 0.75rem; background: #fef3c7; color: #92400e; border-radius: 1rem; font-size: 0.75rem; font-weight: 600;">${data.listing_type}</span>` : ''}
                    </div>
                    
                    <!-- 価格情報 -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; padding: 1.5rem; background: var(--n3-modal-bg-tertiary); border-radius: 0.5rem; margin-bottom: 1rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary); margin-bottom: 0.25rem; font-weight: 600;">現在価格</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: var(--n3-modal-color-success);">${formatPrice(data.current_price_value, data.current_price_currency)}</div>
                        </div>
                        ${data.start_price_value ? `
                            <div style="text-align: center;">
                                <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary); margin-bottom: 0.25rem; font-weight: 600;">開始価格</div>
                                <div style="font-size: 1.25rem; font-weight: 700; color: var(--n3-modal-text-primary);">${formatPrice(data.start_price_value, data.current_price_currency)}</div>
                            </div>
                        ` : ''}
                        ${data.buy_it_now_price_value ? `
                            <div style="text-align: center;">
                                <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary); margin-bottom: 0.25rem; font-weight: 600;">即決価格</div>
                                <div style="font-size: 1.25rem; font-weight: 700; color: var(--n3-modal-color-primary);">${formatPrice(data.buy_it_now_price_value, data.current_price_currency)}</div>
                            </div>
                        ` : ''}
                        <div style="text-align: center;">
                            <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary); margin-bottom: 0.25rem; font-weight: 600;">在庫数</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: ${(data.quantity || 0) > 0 ? 'var(--n3-modal-color-success)' : 'var(--n3-modal-color-danger)'};">${data.quantity || 0}</div>
                        </div>
                    </div>
                    
                    <!-- 販売者情報 -->
                    <div style="background: var(--n3-modal-bg-tertiary); padding: 1rem; border-radius: 0.5rem;">
                        <h4 style="margin: 0 0 0.75rem 0; color: var(--n3-modal-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-user"></i> 販売者情報
                        </h4>
                        <div style="font-weight: 600; margin-bottom: 0.5rem;">${data.seller_user_id || 'N/A'}</div>
                        <div style="font-size: 0.875rem; color: var(--n3-modal-text-secondary);">
                            <i class="fas fa-star" style="color: #fbbf24;"></i> 
                            評価: ${data.seller_feedback_score || 0} (${data.seller_positive_feedback_percent || 0}%)
                        </div>
                        <div style="font-size: 0.875rem; color: var(--n3-modal-text-secondary); margin-top: 0.25rem;">
                            <i class="fas fa-map-marker-alt"></i> 
                            ${data.location || 'N/A'}, ${data.country || ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- パフォーマンス指標 -->
            ${data.watch_count || data.hit_count || data.bid_count || data.quantity_sold ? `
                <div style="background: var(--n3-modal-bg-secondary); border: 1px solid var(--n3-modal-border-color); border-radius: 0.5rem; padding: 1.5rem;">
                    <h4 style="margin: 0 0 1rem 0; color: var(--n3-modal-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-chart-line"></i> パフォーマンス
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
                        ${data.watch_count ? `
                            <div style="text-align: center; padding: 1rem; background: var(--n3-modal-bg-tertiary); border-radius: 0.375rem;">
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--n3-modal-color-primary); margin-bottom: 0.25rem;">${data.watch_count}</div>
                                <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary);">ウォッチ数</div>
                            </div>
                        ` : ''}
                        ${data.hit_count ? `
                            <div style="text-align: center; padding: 1rem; background: var(--n3-modal-bg-tertiary); border-radius: 0.375rem;">
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--n3-modal-color-info); margin-bottom: 0.25rem;">${data.hit_count}</div>
                                <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary);">閲覧数</div>
                            </div>
                        ` : ''}
                        ${data.bid_count ? `
                            <div style="text-align: center; padding: 1rem; background: var(--n3-modal-bg-tertiary); border-radius: 0.375rem;">
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--n3-modal-color-warning); margin-bottom: 0.25rem;">${data.bid_count}</div>
                                <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary);">入札数</div>
                            </div>
                        ` : ''}
                        ${data.quantity_sold ? `
                            <div style="text-align: center; padding: 1rem; background: var(--n3-modal-bg-tertiary); border-radius: 0.375rem;">
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--n3-modal-color-success); margin-bottom: 0.25rem;">${data.quantity_sold}</div>
                                <div style="font-size: 0.75rem; color: var(--n3-modal-text-secondary);">売上数</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- 商品詳細 -->
            <div style="background: var(--n3-modal-bg-secondary); border: 1px solid var(--n3-modal-border-color); border-radius: 0.5rem; padding: 1.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: var(--n3-modal-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-info-circle"></i> 詳細情報
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    ${data.sku ? `
                        <div>
                            <strong style="color: var(--n3-modal-text-secondary); font-size: 0.875rem;">SKU:</strong><br>
                            <span style="font-family: monospace; background: var(--n3-modal-bg-tertiary); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem;">${escapeHtml(data.sku)}</span>
                        </div>
                    ` : ''}
                    ${data.category_name ? `
                        <div>
                            <strong style="color: var(--n3-modal-text-secondary); font-size: 0.875rem;">カテゴリ:</strong><br>
                            <span style="font-size: 0.875rem;">${escapeHtml(data.category_name)}</span>
                        </div>
                    ` : ''}
                    ${data.ebay_item_id ? `
                        <div>
                            <strong style="color: var(--n3-modal-text-secondary); font-size: 0.875rem;">eBay ID:</strong><br>
                            <span style="font-family: monospace; font-size: 0.875rem;">${data.ebay_item_id}</span>
                        </div>
                    ` : ''}
                    ${data.data_completeness_score ? `
                        <div>
                            <strong style="color: var(--n3-modal-text-secondary); font-size: 0.875rem;">データ完全性:</strong><br>
                            <span style="font-size: 0.875rem; font-weight: 600; color: ${data.data_completeness_score >= 80 ? 'var(--n3-modal-color-success)' : data.data_completeness_score >= 60 ? 'var(--n3-modal-color-warning)' : 'var(--n3-modal-color-danger)'};">${data.data_completeness_score}%</span>
                        </div>
                    ` : ''}
                </div>
                
                ${data.description || data.item_details_html ? `
                    <div>
                        <strong style="color: var(--n3-modal-text-secondary); font-size: 0.875rem;">商品説明:</strong>
                        <div style="background: var(--n3-modal-bg-tertiary); padding: 1rem; border-radius: 0.375rem; margin-top: 0.5rem; max-height: 200px; overflow-y: auto; font-size: 0.875rem; line-height: 1.5;">
                            ${escapeHtml(data.description || data.item_details_html || '説明なし')}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- 技術情報 -->
            ${data.api_fetch_timestamp || data.created_at || data.updated_at ? `
                <div style="background: var(--n3-modal-bg-tertiary); padding: 1rem; border-radius: 0.375rem; font-size: 0.75rem; color: var(--n3-modal-text-secondary);">
                    <strong>技術情報:</strong>
                    ${data.api_fetch_timestamp ? `API取得: ${new Date(data.api_fetch_timestamp).toLocaleString('ja-JP')}` : ''}
                    ${data.created_at ? ` | 作成: ${new Date(data.created_at).toLocaleString('ja-JP')}` : ''}
                    ${data.updated_at ? ` | 更新: ${new Date(data.updated_at).toLocaleString('ja-JP')}` : ''}
                </div>
            ` : ''}
        </div>

        <style>
            @media (max-width: 768px) {
                .n3-modal-body > div > div:first-child {
                    grid-template-columns: 1fr !important;
                    gap: 1rem !important;
                }
                .n3-modal-body > div > div:first-child > div:first-child {
                    max-width: 100% !important;
                }
            }
        </style>
    `;
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { N3Modal, showCompleteProductModal };
}

console.log('✅ N3統一モーダルシステム読み込み完了');
