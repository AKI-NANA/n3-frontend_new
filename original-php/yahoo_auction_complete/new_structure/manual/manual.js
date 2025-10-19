
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

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
 * NAGANO-3 マニュアルシステム JavaScript
 * 検索・フィルタリング・インタラクション機能
 */

class ManualSystem {
    constructor() {
        this.searchInput = null;
        this.searchClearBtn = null;
        this.searchSuggestions = null;
        this.categories = [];
        this.items = [];
        this.searchIndex = [];
        this.init();
    }

    init() {
        this.bindElements();
        this.buildSearchIndex();
        this.bindEvents();
        this.initializeComponents();
        console.log('NAGANO-3 マニュアルシステム初期化完了');
    }

    bindElements() {
        this.searchInput = document.getElementById('manualSearchInput');
        this.searchClearBtn = document.getElementById('searchClearBtn');
        this.searchSuggestions = document.getElementById('searchSuggestions');
        this.categories = document.querySelectorAll('.manual__category-card');
        this.items = document.querySelectorAll('.manual__item-link');
    }

    buildSearchIndex() {
        this.searchIndex = [];
        
        this.items.forEach((item, index) => {
            const title = item.querySelector('.manual__item-title')?.textContent || '';
            const description = item.querySelector('.manual__item-description')?.textContent || '';
            const category = item.closest('.manual__category-card')?.querySelector('.manual__category-title')?.textContent || '';
            
            this.searchIndex.push({
                element: item,
                title: title.toLowerCase(),
                description: description.toLowerCase(),
                category: category.toLowerCase(),
                keywords: this.generateKeywords(title, description, category),
                index: index
            });
        });
        
        console.log(`検索インデックス構築完了: ${this.searchIndex.length}件`);
    }

    generateKeywords(title, description, category) {
        const keywords = new Set();
        
        // タイトル・説明・カテゴリから単語を抽出
        const text = `${title} ${description} ${category}`.toLowerCase();
        const words = text.match(/[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
        
        words.forEach(word => {
            if (word.length >= 2) {
                keywords.add(word);
                // 部分マッチ用
                for (let i = 0; i < word.length - 1; i++) {
                    keywords.add(word.substring(i, i + 2));
                }
            }
        });
        
        return Array.from(keywords);
    }

    bindEvents() {
        // 検索入力イベント
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value);
                } else if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }
        
        // 検索クリアボタン
        if (this.searchClearBtn) {
            this.searchClearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // FAQ アコーディオン
        this.bindFAQEvents();
        
        // カテゴリカード展開
        this.bindCategoryEvents();
        
        // キーボードショートカット
        this.bindKeyboardShortcuts();
    }

    bindFAQEvents() {
        const faqToggles = document.querySelectorAll('.manual__faq-toggle');
        faqToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleFAQItem(toggle);
            });
        });
        
        // FAQ質問部分をクリックしても開閉
        const faqQuestions = document.querySelectorAll('.manual__faq-question');
        faqQuestions.forEach(question => {
            question.addEventListener('click', (e) => {
                if (!e.target.classList.contains('manual__faq-toggle')) {
                    const toggle = question.querySelector('.manual__faq-toggle');
                    if (toggle) {
                        this.toggleFAQItem(toggle);
                    }
                }
            });
        });
    }

    bindCategoryEvents() {
        this.categories.forEach(category => {
            const header = category.querySelector('.manual__category-header');
            if (header) {
                header.addEventListener('click', () => {
                    this.toggleCategory(category);
                });
            }
        });
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K または Cmd+K で検索フォーカス
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (this.searchInput) {
                    this.searchInput.focus();
                }
            }
            
            // Ctrl+/ で FAQ へスクロール
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.scrollToFAQ();
            }
        });
    }

    handleSearch(query) {
        const trimmedQuery = query.trim();
        
        if (trimmedQuery.length > 0) {
            this.searchClearBtn.style.display = 'block';
            this.showSearchSuggestions(trimmedQuery);
            this.filterContent(trimmedQuery);
        } else {
            this.searchClearBtn.style.display = 'none';
            this.hideSearchSuggestions();
            this.showAllContent();
        }
    }

    performSearch(query) {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) return;
        
        this.hideSearchSuggestions();
        this.filterContent(trimmedQuery);
        
        // 検索統計を記録（将来の改善用）
        this.logSearchEvent(trimmedQuery);
    }

    filterContent(query) {
        const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
        let hasResults = false;
        
        this.categories.forEach(category => {
            const items = category.querySelectorAll('.manual__item-link');
            let categoryHasResults = false;
            
            items.forEach(item => {
                const searchData = this.searchIndex.find(data => data.element === item);
                if (!searchData) return;
                
                const isMatch = searchTerms.every(term => 
                    searchData.title.includes(term) || 
                    searchData.description.includes(term) || 
                    searchData.category.includes(term) ||
                    searchData.keywords.some(keyword => keyword.includes(term))
                );
                
                if (isMatch) {
                    item.style.display = 'block';
                    categoryHasResults = true;
                    hasResults = true;
                    this.highlightSearchTerms(item, searchTerms);
                } else {
                    item.style.display = 'none';
                    this.removeHighlights(item);
                }
            });
            
            category.style.display = categoryHasResults ? 'block' : 'none';
        });
        
        if (!hasResults) {
            this.showNoResults(query);
        } else {
            this.hideNoResults();
        }
    }

    highlightSearchTerms(item, terms) {
        const title = item.querySelector('.manual__item-title');
        const description = item.querySelector('.manual__item-description');
        
        if (title) {
            title.innerHTML = this.addHighlights(title.textContent, terms);
        }
        if (description) {
            description.innerHTML = this.addHighlights(description.textContent, terms);
        }
    }

    addHighlights(text, terms) {
        let highlightedText = text;
        terms.forEach(term => {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark class="manual__search-highlight">$1</mark>');
        });
        return highlightedText;
    }

    removeHighlights(item) {
        const highlights = item.querySelectorAll('.manual__search-highlight');
        highlights.forEach(highlight => {
            highlight.outerHTML = highlight.textContent;
        });
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\    handleSearch(query) {
        const trim');
    }

    showSearchSuggestions(query) {
        if (!this.searchSuggestions) return;
        
        const suggestions = this.generateSuggestions(query);
        if (suggestions.length > 0) {
            this.searchSuggestions.innerHTML = suggestions.map(suggestion => 
                `<div class="manual__suggestion-item" onclick="manualSystem.selectSuggestion('${suggestion.query}')">${suggestion.html}</div>`
            ).join('');
            this.searchSuggestions.style.display = 'block';
        } else {
            this.hideSearchSuggestions();
        }
    }

    generateSuggestions(query) {
        const suggestions = [];
        const searchTerms = query.toLowerCase().split(/\s+/);
        const lastTerm = searchTerms[searchTerms.length - 1];
        
        // カテゴリ名からの候補
        const categories = ['商品管理', '在庫管理', '売上分析', 'AI機能', '会計記帳'];
        categories.forEach(category => {
            if (category.toLowerCase().includes(lastTerm)) {
                suggestions.push({
                    query: category,
                    html: `<i class="fas fa-folder"></i> ${category}`,
                    type: 'category'
                });
            }
        });
        
        // よく検索される用語
        const popularTerms = ['登録', '設定', '使い方', '手順', '方法', 'エラー', 'トラブル'];
        popularTerms.forEach(term => {
            if (term.includes(lastTerm) && lastTerm.length >= 1) {
                suggestions.push({
                    query: term,
                    html: `<i class="fas fa-search"></i> ${term}`,
                    type: 'term'
                });
            }
        });
        
        return suggestions.slice(0, 5); // 最大5件
    }

    selectSuggestion(suggestion) {
        if (this.searchInput) {
            this.searchInput.value = suggestion;
            this.performSearch(suggestion);
        }
    }

    hideSearchSuggestions() {
        if (this.searchSuggestions) {
            this.searchSuggestions.style.display = 'none';
        }
    }

    showNoResults(query) {
        if (!this.searchSuggestions) return;
        
        this.searchSuggestions.innerHTML = `
            <div class="manual__no-results">
                <i class="fas fa-search"></i>
                <p>「${query}」に該当するマニュアルが見つかりませんでした</p>
                <div class="manual__search-help">
                    <p>検索のヒント:</p>
                    <ul>
                        <li>キーワードを変えてみてください</li>
                        <li>より一般的な用語を使ってみてください</li>
                        <li>カテゴリ名で検索してみてください</li>
                    </ul>
                </div>
            </div>
        `;
        this.searchSuggestions.style.display = 'block';
    }

    hideNoResults() {
        this.hideSearchSuggestions();
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        if (this.searchClearBtn) {
            this.searchClearBtn.style.display = 'none';
        }
        this.hideSearchSuggestions();
        this.showAllContent();
    }

    showAllContent() {
        this.categories.forEach(category => {
            category.style.display = 'block';
        });
        this.items.forEach(item => {
            item.style.display = 'block';
            this.removeHighlights(item);
        });
    }

    toggleFAQItem(toggle) {
        const faqItem = toggle.closest('.manual__faq-item');
        const answer = faqItem.querySelector('.manual__faq-answer');
        const icon = toggle.querySelector('i');
        
        if (faqItem.classList.contains('manual__faq-item--open')) {
            faqItem.classList.remove('manual__faq-item--open');
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        } else {
            // 他のFAQを閉じる（アコーディオン動作）
            document.querySelectorAll('.manual__faq-item--open').forEach(openItem => {
                if (openItem !== faqItem) {
                    openItem.classList.remove('manual__faq-item--open');
                    const openIcon = openItem.querySelector('.manual__faq-toggle i');
                    if (openIcon) {
                        openIcon.classList.remove('fa-chevron-up');
                        openIcon.classList.add('fa-chevron-down');
                    }
                }
            });
            
            faqItem.classList.add('manual__faq-item--open');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
    }

    toggleCategory(category) {
        const items = category.querySelector('.manual__category-items');
        const isExpanded = category.classList.contains('manual__category--expanded');
        
        if (isExpanded) {
            category.classList.remove('manual__category--expanded');
        } else {
            category.classList.add('manual__category--expanded');
        }
    }

    scrollToFAQ() {
        const faqSection = document.getElementById('faq');
        if (faqSection) {
            faqSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    logSearchEvent(query) {
        // 検索統計の記録（将来の機能改善用）
        if (typeof analytics !== 'undefined') {
            analytics.track('manual_search', {
                query: query,
                timestamp: new Date().toISOString(),
                page: 'manual_main'
            });
        }
        
        console.log(`検索実行: "${query}"`);
    }

    initializeComponents() {
        // カテゴリカードのアニメーション
        this.animateCategoryCards();
        
        // 統計情報の更新
        this.updateStatistics();
        
        // キーボードショートカットの表示
        this.setupKeyboardHints();
    }

    animateCategoryCards() {
        const cards = document.querySelectorAll('.manual__category-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    updateStatistics() {
        // マニュアル閲覧統計の更新
        const totalManuals = this.searchIndex.length;
        const totalViews = this.calculateTotalViews();
        
        console.log(`マニュアル統計: ${totalManuals}件, 総閲覧数: ${totalViews}回`);
    }

    calculateTotalViews() {
        let totalViews = 0;
        document.querySelectorAll('.manual__item-views').forEach(viewElement => {
            const viewText = viewElement.textContent.replace(/[^\d]/g, '');
            const views = parseInt(viewText) || 0;
            totalViews += views;
        });
        return totalViews;
    }

    setupKeyboardHints() {
        // 検索ボックスにキーボードショートカットのヒントを追加
        if (this.searchInput) {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const shortcut = isMac ? '⌘K' : 'Ctrl+K';
            
            this.searchInput.setAttribute('placeholder', 
                `マニュアルを検索... (${shortcut} でフォーカス)`
            );
        }
    }

    // 外部API（他のスクリプトからの呼び出し用）
    search(query) {
        if (this.searchInput) {
            this.searchInput.value = query;
            this.performSearch(query);
        }
    }

    expandCategory(categoryId) {
        const category = document.querySelector(`[data-category="${categoryId}"]`);
        if (category) {
            this.toggleCategory(category);
        }
    }

    highlightManual(manualId) {
        const manual = document.querySelector(`[href*="${manualId}"]`);
        if (manual) {
            manual.scrollIntoView({ behavior: 'smooth' });
            manual.style.background = 'rgba(139, 92, 246, 0.1)';
            manual.style.border = '2px solid var(--manual-primary)';
            
            setTimeout(() => {
                manual.style.background = '';
                manual.style.border = '';
                manual.style.transition = 'background 0.5s ease, border 0.5s ease';
            }, 2000);
        }
    }
}

// グローバル関数（HTML内での呼び出し用）
function scrollToFAQ() {
    if (window.manualSystem) {
        window.manualSystem.scrollToFAQ();
    }
}

// CSS追加（検索ハイライト用）
const searchHighlightCSS = `
    .manual__search-highlight {
        background: linear-gradient(135deg, var(--accent-yellow), #fbbf24);
        color: #92400e;
        padding: 1px 3px;
        border-radius: 3px;
        font-weight: 600;
    }
    
    .manual__suggestion-item {
        padding: var(--space-3) var(--space-4);
        cursor: pointer;
        transition: var(--transition);
        border-bottom: 1px solid var(--shadow-dark);
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }
    
    .manual__suggestion-item:last-child {
        border-bottom: none;
    }
    
    .manual__suggestion-item:hover {
        background: var(--bg-hover);
    }
    
    .manual__suggestion-item i {
        color: var(--manual-primary);
        width: 16px;
        text-align: center;
    }
    
    .manual__no-results {
        padding: var(--space-6);
        text-align: center;
        color: var(--text-secondary);
    }
    
    .manual__no-results i {
        font-size: 2rem;
        color: var(--text-tertiary);
        margin-bottom: var(--space-3);
    }
    
    .manual__no-results p {
        margin: 0 0 var(--space-4) 0;
        font-size: var(--text-base);
    }
    
    .manual__search-help {
        background: var(--bg-primary);
        border-radius: var(--radius-md);
        padding: var(--space-4);
        margin-top: var(--space-4);
        text-align: left;
    }
    
    .manual__search-help p {
        font-weight: 600;
        margin-bottom: var(--space-2);
        color: var(--text-primary);
    }
    
    .manual__search-help ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    
    .manual__search-help li {
        margin-bottom: var(--space-1);
        padding-left: var(--space-4);
        position: relative;
        font-size: var(--text-sm);
    }
    
    .manual__search-help li::before {
        content: "•";
        position: absolute;
        left: 0;
        color: var(--manual-primary);
        font-weight: bold;
    }
    
    .manual__category--expanded .manual__category-items {
        max-height: none !important;
    }
`;

// CSS を動的に追加
const styleSheet = document.createElement('style');
styleSheet.textContent = searchHighlightCSS;
document.head.appendChild(styleSheet);

// DOMが読み込まれたらマニュアルシステムを初期化
document.addEventListener('DOMContentLoaded', () => {
    window.manualSystem = new ManualSystem();
});

// エクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ManualSystem;
}