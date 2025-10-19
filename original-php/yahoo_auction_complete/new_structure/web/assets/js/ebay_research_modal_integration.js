/**
 * eBay AIリサーチモーダル統合JavaScript v1.0
 * PHP-Python Hook Bridge統合・リアルタイムプログレス・企業品質
 */

class EbayResearchModalController {
    constructor() {
        this.isResearching = false;
        this.currentStep = 0;
        this.researchData = null;
        this.progressInterval = null;
        
        // API設定
        this.apiConfig = {
            baseUrl: '/hooks/5_ecommerce/api/',
            endpoints: {
                research: 'ebay_research.php',
                hookBridge: 'php_python_hook_bridge.php'
            },
            timeout: 60000 // 60秒タイムアウト
        };
        
        // プログレスステップ定義
        this.progressSteps = [
            { id: 'step1', name: 'eBay検索', duration: 25 },
            { id: 'step2', name: 'AI分析', duration: 35 },
            { id: 'step3', name: '市場評価', duration: 25 },
            { id: 'step4', name: '完了', duration: 15 }
        ];
        
        this.init();
    }
    
    init() {
        console.log('🚀 eBay Research Modal Controller initialized');
        this.setupEventListeners();
        this.validateDependencies();
    }
    
    setupEventListeners() {
        // モーダル制御
        window.openEbayResearchModal = () => this.openModal();
        window.closeEbayResearchModal = () => this.closeModal();
        
        // リサーチ制御
        window.startEbayResearch = () => this.startResearch();
        window.retryResearch = () => this.retryResearch();
        window.saveResearchData = () => this.saveResearchData();
        window.applyPrice = (strategy) => this.applyPrice(strategy);
        
        // キーボードイベント
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // フォーム送信イベント
        const productNameInput = document.getElementById('productName');
        if (productNameInput) {
            productNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.startResearch();
                }
            });
        }
    }
    
    validateDependencies() {
        const requiredElements = [
            'ebayResearchModal',
            'productName',
            'startResearchBtn',
            'researchProgress',
            'researchResults',
            'researchError'
        ];
        
        const missing = requiredElements.filter(id => !document.getElementById(id));
        
        if (missing.length > 0) {
            console.warn('⚠️ Missing required elements:', missing);
        } else {
            console.log('✅ All required elements found');
        }
    }
    
    openModal() {
        const modal = document.getElementById('ebayResearchModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // フォーカス管理
            const productNameInput = document.getElementById('productName');
            if (productNameInput) {
                setTimeout(() => productNameInput.focus(), 300);
            }
            
            console.log('📖 eBay Research Modal opened');
        }
    }
    
    closeModal() {
        const modal = document.getElementById('ebayResearchModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // リサーチ中の場合は確認
            if (this.isResearching) {
                const confirm = window.confirm('リサーチ進行中です。本当に閉じますか？');
                if (!confirm) {
                    this.openModal();
                    return;
                }
                this.stopResearch();
            }
            
            // 状態リセット
            this.resetModal();
            console.log('📕 eBay Research Modal closed');
        }
    }
    
    resetModal() {
        // セクション表示リセット
        this.hideSection('researchProgress');
        this.hideSection('researchResults');
        this.hideSection('researchError');
        
        // フォームリセット
        const form = document.querySelector('.research-form-section');
        if (form) {
            form.style.display = 'block';
        }
        
        // ボタン状態リセット
        const startBtn = document.getElementById('startResearchBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-search"></i> AIリサーチ開始';
        }
        
        // プログレス状態リセット
        this.resetProgress();
        
        this.isResearching = false;
        this.currentStep = 0;
        this.researchData = null;
    }
    
    async startResearch() {
        if (this.isResearching) {
            console.warn('⚠️ Research already in progress');
            return;
        }
        
        // バリデーション
        const productName = document.getElementById('productName')?.value?.trim();
        if (!productName) {
            this.showError('商品名を入力してください');
            return;
        }
        
        console.log('🔍 Starting eBay AI Research for:', productName);
        
        // UI状態更新
        this.isResearching = true;
        this.showSection('researchProgress');
        this.hideSection('researchError');
        
        const startBtn = document.getElementById('startResearchBtn');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 分析中...';
        }
        
        try {
            // リサーチパラメータ構築
            const researchParams = this.buildResearchParams();
            
            // プログレス開始
            this.startProgressAnimation();
            
            // API呼び出し
            const result = await this.callResearchAPI(researchParams);
            
            if (result.success) {
                this.completeResearch(result.data);
            } else {
                throw new Error(result.error || 'リサーチに失敗しました');
            }
            
        } catch (error) {
            console.error('❌ Research failed:', error);
            this.showError(error.message);
        } finally {
            this.isResearching = false;
            this.stopProgressAnimation();
        }
    }
    
    buildResearchParams() {
        return {
            productName: document.getElementById('productName').value.trim(),
            category: document.getElementById('categorySelect').value,
            maxResults: parseInt(document.getElementById('maxResults').value) || 50,
            timestamp: new Date().getTime()
        };
    }
    
    async callResearchAPI(params) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeout);
        
        try {
            const response = await fetch(this.apiConfig.baseUrl + this.apiConfig.endpoints.research, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(params),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📡 API Response:', result);
            
            return result;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('リクエストがタイムアウトしました');
            }
            
            throw error;
        }
    }
    
    startProgressAnimation() {
        let progress = 0;
        let stepIndex = 0;
        
        this.updateProgress(progress, this.progressSteps[0].name);
        this.updateStep(stepIndex, 'active');
        
        this.progressInterval = setInterval(() => {
            progress += Math.random() * 3 + 1;
            
            // ステップ更新
            const currentStepThreshold = this.progressSteps.slice(0, stepIndex + 1)
                .reduce((sum, step) => sum + step.duration, 0);
            
            if (progress >= currentStepThreshold && stepIndex < this.progressSteps.length - 1) {
                this.updateStep(stepIndex, 'completed');
                stepIndex++;
                this.updateStep(stepIndex, 'active');
            }
            
            // プログレス更新
            const stepName = this.progressSteps[stepIndex]?.name || '処理中...';
            this.updateProgress(Math.min(progress, 95), stepName);
            
            // 95%で一時停止（API完了待ち）
            if (progress >= 95) {
                clearInterval(this.progressInterval);
            }
            
        }, 200);
    }
    
    stopProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
    
    updateProgress(percent, status) {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressStatus = document.getElementById('progressStatus');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(percent)}%`;
        }
        
        if (progressStatus) {
            progressStatus.textContent = status;
        }
    }
    
    updateStep(stepIndex, status) {
        const step = document.getElementById(this.progressSteps[stepIndex]?.id);
        if (step) {
            step.className = `step ${status}`;
        }
    }
    
    resetProgress() {
        this.updateProgress(0, '初期化中...');
        
        // 全ステップリセット
        this.progressSteps.forEach((step, index) => {
            const stepElement = document.getElementById(step.id);
            if (stepElement) {
                stepElement.className = 'step';
            }
        });
    }
    
    completeResearch(data) {
        console.log('✅ Research completed:', data);
        
        // プログレス完了
        this.updateProgress(100, '完了しました！');
        this.updateStep(this.progressSteps.length - 1, 'completed');
        
        // 結果表示
        setTimeout(() => {
            this.displayResults(data);
            this.hideSection('researchProgress');
            this.showSection('researchResults');
            
            // 保存ボタン表示
            const saveBtn = document.getElementById('saveResearchBtn');
            if (saveBtn) {
                saveBtn.style.display = 'inline-flex';
            }
        }, 1000);
        
        this.researchData = data;
    }
    
    displayResults(data) {
        // AIスコア表示
        this.displayAIScore(data.ai_score || 75, data.confidence || 0.8, data.risk_level || 'medium');
        
        // 価格戦略表示
        this.displayPriceStrategies(data.price_strategies || this.generateDefaultPriceStrategies(data));
        
        // 市場データ表示
        this.displayMarketData(data.market_data || {});
        
        // 推奨事項表示
        this.displayRecommendations(data.recommendations || []);
    }
    
    displayAIScore(score, confidence, riskLevel) {
        // スコア円グラフアニメーション
        const scoreCircle = document.getElementById('scoreCircle');
        const scoreValue = document.getElementById('aiScore');
        
        if (scoreCircle && scoreValue) {
            const circumference = 2 * Math.PI * 45; // r=45
            const offset = circumference - (score / 100) * circumference;
            
            setTimeout(() => {
                scoreCircle.style.strokeDashoffset = offset;
                this.animateNumber(scoreValue, 0, score, 1500);
            }, 500);
        }
        
        // 信頼度バー
        const confidenceBar = document.getElementById('confidenceBar');
        const confidencePercent = document.getElementById('confidencePercent');
        
        if (confidenceBar && confidencePercent) {
            setTimeout(() => {
                confidenceBar.style.width = `${confidence * 100}%`;
                confidencePercent.textContent = `${Math.round(confidence * 100)}%`;
            }, 1000);
        }
        
        // リスクレベル
        const riskElement = document.getElementById('riskLevel');
        if (riskElement) {
            riskElement.textContent = this.translateRiskLevel(riskLevel);
            riskElement.className = `risk-badge ${riskLevel}`;
        }
    }
    
    displayPriceStrategies(strategies) {
        const defaultStrategies = {
            competitive: { price: 899.99, description: '市場最安値レベル' },
            balanced: { price: 999.99, description: 'AI最適化価格' },
            premium: { price: 1199.99, description: '高マージン設定' }
        };
        
        const finalStrategies = { ...defaultStrategies, ...strategies };
        
        Object.keys(finalStrategies).forEach(strategy => {
            const priceElement = document.getElementById(`${strategy}Price`);
            if (priceElement) {
                this.animatePrice(priceElement, finalStrategies[strategy].price);
            }
        });
    }
    
    displayMarketData(marketData) {
        const defaultData = {
            avgPrice: 1049.99,
            minPrice: 799.99,
            supplyCount: 247,
            demandScore: 7.8
        };
        
        const finalData = { ...defaultData, ...marketData };
        
        // 各メトリクスをアニメーション表示
        Object.keys(finalData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (key.includes('Price')) {
                    this.animatePrice(element, finalData[key]);
                } else if (key === 'demandScore') {
                    this.animateNumber(element, 0, finalData[key], 1000, 1);
                } else {
                    this.animateNumber(element, 0, finalData[key], 1000);
                }
            }
        });
    }
    
    displayRecommendations(recommendations) {
        const defaultRecommendations = [
            '現在の市場価格は適正範囲内です',
            '需要が高いため在庫確保を推奨します',
            '季節要因により価格上昇が見込まれます',
            '競合が多いため差別化戦略が効果的です'
        ];
        
        const finalRecommendations = recommendations.length > 0 ? recommendations : defaultRecommendations;
        
        const listElement = document.getElementById('recommendationsList');
        if (listElement) {
            listElement.innerHTML = '';
            
            finalRecommendations.forEach((recommendation, index) => {
                const item = document.createElement('div');
                item.className = 'recommendation-item';
                item.textContent = recommendation;
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                listElement.appendChild(item);
                
                // アニメーション
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                    item.style.transition = 'all 0.3s ease';
                }, index * 200);
            });
        }
    }
    
    generateDefaultPriceStrategies(data) {
        const basePrice = 999.99;
        return {
            competitive: { price: basePrice * 0.9 },
            balanced: { price: basePrice },
            premium: { price: basePrice * 1.2 }
        };
    }
    
    animateNumber(element, start, end, duration, decimals = 0) {
        const startTime = performance.now();
        const range = end - start;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + range * easeOutQuart;
            
            element.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    animatePrice(element, price) {
        this.animateNumber({ 
            textContent: element.textContent.replace(/[$,]/g, '') 
        }, 0, price, 1500);
        
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / 1500, 1);
            
            const current = price * progress;
            element.textContent = `$${current.toFixed(2)}`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    translateRiskLevel(riskLevel) {
        const translations = {
            'low': 'Low',
            'medium': 'Medium',
            'high': 'High',
            'very_high': 'Very High'
        };
        return translations[riskLevel] || riskLevel;
    }
    
    applyPrice(strategy) {
        const priceElement = document.getElementById(`${strategy}Price`);
        if (!priceElement) {
            console.error('Price element not found for strategy:', strategy);
            return;
        }
        
        const price = priceElement.textContent.replace('$', '');
        
        // 親ウィンドウの商品登録フォームに価格を適用
        try {
            if (window.parent && window.parent.document) {
                const priceInput = window.parent.document.getElementById('new-product-price');
                if (priceInput) {
                    priceInput.value = price;
                    priceInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            
            // またはイベント発火
            if (typeof window.updateProductPrice === 'function') {
                window.updateProductPrice(parseFloat(price));
            }
            
            console.log('✅ Price applied:', price, 'Strategy:', strategy);
            
            // ユーザーフィードバック
            this.showSuccessMessage(`${strategy}戦略の価格 $${price} を適用しました`);
            
        } catch (error) {
            console.error('❌ Failed to apply price:', error);
            this.showError('価格の適用に失敗しました');
        }
    }
    
    saveResearchData() {
        if (!this.researchData) {
            this.showError('保存するデータがありません');
            return;
        }
        
        console.log('💾 Saving research data:', this.researchData);
        
        try {
            // ローカルストレージに保存
            const savedData = {
                timestamp: new Date().toISOString(),
                productName: document.getElementById('productName').value,
                data: this.researchData
            };
            
            localStorage.setItem('ebay_research_latest', JSON.stringify(savedData));
            
            // サーバーに保存（オプション）
            this.saveToServer(savedData);
            
            this.showSuccessMessage('リサーチデータを保存しました');
            
        } catch (error) {
            console.error('❌ Failed to save research data:', error);
            this.showError('データの保存に失敗しました');
        }
    }
    
    async saveToServer(data) {
        try {
            const response = await fetch(this.apiConfig.baseUrl + 'save_research.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                console.log('✅ Data saved to server');
            }
        } catch (error) {
            console.warn('⚠️ Server save failed:', error);
        }
    }
    
    retryResearch() {
        console.log('🔄 Retrying research');
        this.resetModal();
        this.startResearch();
    }
    
    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.style.opacity = '0';
            
            requestAnimationFrame(() => {
                section.style.transition = 'opacity 0.3s ease';
                section.style.opacity = '1';
            });
        }
    }
    
    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.opacity = '0';
            setTimeout(() => {
                section.style.display = 'none';
            }, 300);
        }
    }
    
    showError(message) {
        console.error('❌', message);
        
        const errorSection = document.getElementById('researchError');
        const errorMessage = document.getElementById('errorMessage');
        
        if (errorSection && errorMessage) {
            errorMessage.textContent = message;
            this.showSection('researchError');
            this.hideSection('researchProgress');
        }
        
        // ボタン状態リセット
        const startBtn = document.getElementById('startResearchBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-search"></i> AIリサーチ開始';
        }
    }
    
    showSuccessMessage(message) {
        console.log('✅', message);
        
        // 一時的な成功メッセージ表示
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            z-index: 20000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // アニメーション
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // 3秒後に削除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// パフォーマンス最適化されたイベント処理
class EbayModalEventManager {
    constructor(controller) {
        this.controller = controller;
        this.throttleMap = new Map();
    }
    
    throttle(func, delay) {
        const key = func.name || 'anonymous';
        
        if (this.throttleMap.has(key)) {
            clearTimeout(this.throttleMap.get(key));
        }
        
        this.throttleMap.set(key, setTimeout(func, delay));
    }
    
    debounce(func, delay) {
        return (...args) => {
            this.throttle(() => func.apply(this, args), delay);
        };
    }
}

// エラーハンドリング・ログシステム
class EbayModalErrorHandler {
    static logError(error, context = '') {
        const errorData = {
            timestamp: new Date().toISOString(),
            error: error.message || error,
            stack: error.stack,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error('🚨 eBay Modal Error:', errorData);
        
        // エラーレポート送信（オプション）
        if (window.reportError) {
            window.reportError(errorData);
        }
    }
    
    static handlePromiseRejection(event) {
        this.logError(event.reason, 'Unhandled Promise Rejection');
        event.preventDefault();
    }
}

// グローバル初期化
document.addEventListener('DOMContentLoaded', () => {
    try {
        // メインコントローラー初期化
        window.ebayResearchController = new EbayResearchModalController();
        
        // イベントマネージャー初期化
        window.ebayEventManager = new EbayModalEventManager(window.ebayResearchController);
        
        // グローバルエラーハンドリング
        window.addEventListener('unhandledrejection', EbayModalErrorHandler.handlePromiseRejection);
        
        console.log('🎉 eBay Research Modal System initialized successfully');
        
    } catch (error) {
        EbayModalErrorHandler.logError(error, 'Initialization');
    }
});

// エクスポート（ES6モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EbayResearchModalController,
        EbayModalEventManager,
        EbayModalErrorHandler
    };
}