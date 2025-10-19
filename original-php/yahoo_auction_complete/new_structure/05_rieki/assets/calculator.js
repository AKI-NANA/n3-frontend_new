/**
 * 利益計算システム フロントエンド統合JavaScript
 * API連携対応版
 * 
 * @version 3.0.0
 * @date 2025-09-23
 * @author Claude AI
 */

// グローバル変数と設定
let calculatorConfig = {
    apiEndpoint: 'profit_calculator_complete_api.php',
    currentMode: 'ddp',
    selectedCountry: 'SG',
    exchangeRates: {
        USD: 148.50,
        SGD: 110.45,
        MYR: 33.78,
        THB: 4.23,
        VND: 0.0061,
        PHP: 2.68,
        IDR: 0.0098,
        TWD: 4.75
    },
    tieredFees: {
        '293': { tier1: 10.0, tier2: 12.35, threshold: 7500, insertion: 0.35 },
        '11450': { tier1: 12.9, tier2: 14.70, threshold: 10000, insertion: 0.30 },
        '58058': { tier1: 9.15, tier2: 11.70, threshold: 5000, insertion: 0.35 },
        '267': { tier1: 15.0, tier2: 15.0, threshold: 999999, insertion: 0.30 },
        '550': { tier1: 12.9, tier2: 15.0, threshold: 10000, insertion: 0.35 }
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 利益計算システム フロントエンド初期化開始');
    
    initializeCalculator();
    attachEventListeners();
    loadInitialData();
    
    console.log('✅ 初期化完了 - API連携対応版');
});

/**
 * 計算システム初期化
 */
function initializeCalculator() {
    // タブ切り替え機能初期化
    initializeTabSystem();
    
    // フォーム要素初期化
    initializeFormElements();
    
    // APIヘルスチェック
    performHealthCheck();
}

/**
 * タブシステム初期化
 */
function initializeTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // アクティブクラス切り替え
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            console.log(`📋 タブ切り替え: ${targetTab}`);
        });
    });
}

/**
 * フォーム要素初期化
 */
function initializeFormElements() {
    // カテゴリー選択時の手数料更新
    const categorySelect = document.getElementById('ebayCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', updateFeeDisplay);
    }
    
    // 価格入力時の手数料更新
    const priceInput = document.getElementById('assumedPrice');
    if (priceInput) {
        priceInput.addEventListener('input', updateFeeDisplay);
    }
    
    // 為替レート表示更新
    updateExchangeRateDisplay();
}

/**
 * イベントリスナー追加
 */
function attachEventListeners() {
    // 計算ボタン
    const calculateBtn = document.querySelector('button[onclick="calculateProfit()"]');
    if (calculateBtn) {
        calculateBtn.removeAttribute('onclick');
        calculateBtn.addEventListener('click', calculateAdvanced);
    }
    
    // その他のボタンイベント
    attachUtilityEventListeners();
}

/**
 * ユーティリティイベントリスナー
 */
function attachUtilityEventListeners() {
    // クリアボタン
    const clearBtn = document.querySelector('button[onclick="clearSimulation()"]');
    if (clearBtn) {
        clearBtn.removeAttribute('onclick');
        clearBtn.addEventListener('click', clearAll);
    }
    
    // サンプルデータボタン
    const sampleBtn = document.querySelector('button[onclick="loadSampleData()"]');
    if (sampleBtn) {
        sampleBtn.removeAttribute('onclick');
        sampleBtn.addEventListener('click', loadSample);
    }
    
    // 基本設定保存ボタン
    const saveBtn = document.querySelector('button[onclick="saveBaseSettings()"]');
    if (saveBtn) {
        saveBtn.removeAttribute('onclick');
        saveBtn.addEventListener('click', saveSettings);
    }
}

/**
 * 高精度利益計算（API連携版）
 */
async function calculateAdvanced() {
    try {
        showLoading('高精度計算実行中...');
        
        const data = {
            yahooPrice: parseFloat(document.getElementById('yahooPrice').value) || 0,
            domesticShipping: parseFloat(document.getElementById('domesticShipping').value) || 0,
            outsourceFee: parseFloat(document.getElementById('outsourceFee').value) || 0,
            packagingFee: parseFloat(document.getElementById('packagingFee').value) || 0,
            assumedPrice: parseFloat(document.getElementById('assumedPrice').value) || 0,
            assumedShipping: parseFloat(document.getElementById('assumedShipping').value) || 0,
            daysSince: parseInt(document.getElementById('daysSince').value) || 0,
            ebayCategory: document.getElementById('ebayCategory').value,
            itemCondition: document.getElementById('itemCondition').value,
            strategy: document.getElementById('strategy').value
        };

        if (!validateData(data)) {
            hideLoading();
            return;
        }

        const response = await fetch(calculatorConfig.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'advanced_calculate',
                ...data
            })
        });

        const result = await response.json();
        hideLoading();

        if (result.success) {
            displayAdvancedResults(result);
            showAdvancedRecommendation(result);
        } else {
            throw new Error(result.error || 'API エラーが発生しました');
        }
        
    } catch (error) {
        hideLoading();
        console.error('高精度計算エラー:', error);
        showNotification('計算中にエラーが発生しました: ' + error.message, 'error');
    }
}

/**
 * 高精度結果表示
 */
function displayAdvancedResults(result) {
    document.getElementById('resultGrid').style.display = 'grid';
    document.getElementById('resultGrid').classList.add('bounce-in');
    
    const data = result.data;
    
    document.getElementById('totalRevenue').textContent = `$${data.totalRevenue}`;
    document.getElementById('totalCost').textContent = `$${data.totalCost}`;
    document.getElementById('ebayFees').textContent = `$${data.totalFees}`;
    document.getElementById('netProfit').textContent = `$${data.netProfit}`;
    document.getElementById('profitMargin').textContent = `${data.profitMargin}%`;
    document.getElementById('roi').textContent = `${data.roi}%`;
    
    // 色分け適用
    applyResultColors(data);
    
    console.log('📊 高精度計算結果表示完了', data);
}

/**
 * 結果の色分け
 */
function applyResultColors(data) {
    const profitElement = document.getElementById('netProfit');
    const marginElement = document.getElementById('profitMargin');
    const roiElement = document.getElementById('roi');
    
    const netProfit = parseFloat(data.netProfit);
    const profitMargin = parseFloat(data.profitMargin);
    const roi = parseFloat(data.roi);
    
    // 利益額の色分け
    if (netProfit > 10) {
        profitElement.className = 'result-value positive';
    } else if (netProfit > 3) {
        profitElement.className = 'result-value neutral';
    } else {
        profitElement.className = 'result-value negative';
    }
    
    // 利益率の色分け
    if (profitMargin > 20) {
        marginElement.className = 'result-value positive';
    } else if (profitMargin > 10) {
        marginElement.className = 'result-value neutral';
    } else {
        marginElement.className = 'result-value negative';
    }
    
    // ROIの色分け
    if (roi > 25) {
        roiElement.className = 'result-value positive';
    } else if (roi > 15) {
        roiElement.className = 'result-value neutral';
    } else {
        roiElement.className = 'result-value negative';
    }
}

/**
 * 高精度推奨事項表示
 */
function showAdvancedRecommendation(result) {
    const recommendationDiv = document.getElementById('recommendation');
    const recommendationText = document.getElementById('recommendationText');
    const data = result.data;
    
    let recommendations = [];
    
    const netProfit = parseFloat(data.netProfit);
    const profitMargin = parseFloat(data.profitMargin);
    
    if (netProfit <= 0) {
        recommendations.push('🔴 <strong>損失発生</strong>: この設定では損失が発生します。');
        recommendations.push(`📈 損益分岐点: $${data.breakEvenPrice} 以上での販売が必要です。`);
    } else if (profitMargin < 5) {
        recommendations.push('⚠️ <strong>低利益率警告</strong>: 利益率が5%を下回っています。');
    } else if (profitMargin < 15) {
        recommendations.push('🟡 <strong>利益率改善提案</strong>: 利益率が低めです。価格調整を検討してください。');
    } else if (profitMargin < 25) {
        recommendations.push('✅ <strong>標準的利益率</strong>: 許容範囲内ですが、最適化の余地があります。');
    } else {
        recommendations.push('🎉 <strong>優秀な利益率</strong>: 非常に良好な利益率です！');
    }
    
    if (data.feeDetails && data.feeDetails.tier === 2) {
        recommendations.push(`💡 <strong>段階手数料適用</strong>: Tier${data.feeDetails.tier} (${data.feeDetails.rate}%) が適用されています。`);
        recommendations.push('💰 <strong>手数料最適化</strong>: 高額商品のため手数料率が上がっています。');
    }
    
    const settings = data.appliedSettings;
    if (settings) {
        recommendations.push(`⚙️ <strong>適用設定</strong>: ${settings.type}設定による目標利益率 ${settings.targetMargin}% が適用されています。`);
        
        if (settings.strategyAdjustment !== 0) {
            const adjText = settings.strategyAdjustment > 0 ? '上方修正' : '下方修正';
            recommendations.push(`📊 <strong>戦略調整</strong>: ${settings.appliedStrategy}戦略により${Math.abs(settings.strategyAdjustment)}% ${adjText}されています。`);
        }
    }
    
    if (netProfit < 5.0) {
        recommendations.push(`🎯 <strong>価格提案</strong>: 最低利益額確保のため $${data.recommendedPrice} での販売を推奨します。`);
    }
    
    recommendationText.innerHTML = recommendations.join('<br><br>');
    recommendationDiv.style.display = 'block';
}

/**
 * 統合結果表示（eBay・Shopee共通）
 */
function displayUnifiedResults(result, platform) {
    const data = result.data;
    
    showNotification(`🎯 ${platform}計算結果 (${result.shippingMode || result.country || ''})\n\n💰 純利益: ¥${parseInt(data.profitJPY).toLocaleString()}\n📊 利益率: ${data.marginPercent}%\n📈 ROI: ${data.roiPercent}%\n🏛️ 関税・税: ¥${parseInt(data.tariffJPY).toLocaleString()}\n💱 為替レート: ¥${data.exchangeRate}\n\n計算詳細:\n${data.details.map(d => `• ${d.label}: ${d.amount}`).join('\n')}\n\nプラットフォーム: ${result.platform}\n計算時刻: ${result.timestamp}`, 'success');
}

/**
 * データ検証
 */
function validateData(data) {
    if (!data.yahooPrice || data.yahooPrice <= 0) {
        showNotification('Yahoo価格を正しく入力してください。', 'warning');
        return false;
    }
    
    if (!data.assumedPrice || data.assumedPrice <= 0) {
        showNotification('想定販売価格を正しく入力してください。', 'warning');
        return false;
    }
    
    return true;
}

/**
 * ローディング表示
 */
function showLoading(message = '計算中...') {
    const existingLoader = document.getElementById('loadingOverlay');
    if (existingLoader) {
        existingLoader.remove();
    }
    
    const loader = document.createElement('div');
    loader.id = 'loadingOverlay';
    loader.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center;
        align-items: center; z-index: 9999; color: white;
        font-size: 1.2rem; font-weight: 600;
    `;
    
    loader.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(loader);
}

/**
 * ローディング非表示
 */
function hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.remove();
    }
}

/**
 * 通知表示
 */
function showNotification(message, type = 'info') {
    const emoji = { 'success': '✅', 'error': '❌', 'warning': '⚠️', 'info': 'ℹ️' };
    console.log(`${emoji[type]} ${message}`);
    createNotificationModal(message, type, emoji[type]);
}

/**
 * 通知モーダル作成
 */
function createNotificationModal(message, type, emoji) {
    const existing = document.getElementById('notificationModal');
    if (existing) existing.remove();
    
    const typeColors = {
        'success': '#10b981', 'error': '#ef4444', 'warning': '#f59e0b', 'info': '#06b6d4'
    };
    
    const modal = document.createElement('div');
    modal.id = 'notificationModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center;
        align-items: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 1rem; padding: 2rem; max-width: 500px;
                    width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    border-left: 6px solid ${typeColors[type]};">
            <div style="display: flex; align-items: flex-start; gap: 1rem;">
                <div style="font-size: 1.5rem;">${emoji}</div>
                <div style="flex: 1;">
                    <div style="white-space: pre-line; line-height: 1.6; color: #1e293b;">${message}</div>
                    <div style="margin-top: 1.5rem; text-align: right;">
                        <button onclick="document.getElementById('notificationModal').remove()" 
                                style="background: ${typeColors[type]}; color: white; border: none;
                                       padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    if (type !== 'error') {
        setTimeout(() => {
            if (document.getElementById('notificationModal')) modal.remove();
        }, 3000);
    }
}

/**
 * サンプルデータ読み込み
 */
function loadSample() {
    document.getElementById('yahooPrice').value = '15000';
    document.getElementById('domesticShipping').value = '800';
    document.getElementById('outsourceFee').value = '500';
    document.getElementById('packagingFee').value = '200';
    document.getElementById('assumedPrice').value = '120.00';
    document.getElementById('assumedShipping').value = '15.00';
    
    if (document.getElementById('itemWeight')) document.getElementById('itemWeight').value = '500';
    if (document.getElementById('sizeLength')) {
        document.getElementById('sizeLength').value = '20';
        document.getElementById('sizeWidth').value = '15';
        document.getElementById('sizeHeight').value = '10';
    }
    if (document.getElementById('daysSince')) document.getElementById('daysSince').value = '0';
    if (document.getElementById('strategy')) document.getElementById('strategy').value = 'standard';
    
    updateFeeDisplay();
    showNotification('サンプルデータを読み込みました。', 'success');
}

/**
 * フォームクリア
 */
function clearAll() {
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"], select');
    inputs.forEach(input => {
        if (input.id !== 'ebayCategory' && input.id !== 'itemCondition') {
            input.value = '';
        }
    });
    
    const resultGrid = document.getElementById('resultGrid');
    if (resultGrid) resultGrid.style.display = 'none';
    
    const recommendation = document.getElementById('recommendation');
    if (recommendation) recommendation.style.display = 'none';
    
    showNotification('フォームをクリアしました。', 'info');
}

/**
 * 設定保存
 */
async function saveSettings() {
    const settings = {
        globalProfitMargin: parseFloat(document.getElementById('globalProfitMargin')?.value) || 20.0,
        globalMinProfitUSD: parseFloat(document.getElementById('globalMinProfitUSD')?.value) || 5.00,
        exchangeMargin: parseFloat(document.getElementById('exchangeMargin')?.value) || 5.0
    };
    
    localStorage.setItem('calculatorSettings', JSON.stringify(settings));
    
    calculatorConfig.globalProfitMargin = settings.globalProfitMargin;
    calculatorConfig.globalMinProfitUSD = settings.globalMinProfitUSD;
    calculatorConfig.exchangeMargin = settings.exchangeMargin;
    
    showNotification('設定を保存しました。', 'success');
}

/**
 * 手数料表示更新
 */
function updateFeeDisplay() {
    const categoryId = document.getElementById('ebayCategory').value;
    const assumedPrice = parseFloat(document.getElementById('assumedPrice').value) || 120;
    
    const fees = calculatorConfig.tieredFees[categoryId] || calculatorConfig.tieredFees['293'];
    const applicableFee = assumedPrice >= fees.threshold ? fees.tier2 : fees.tier1;
    
    if (document.getElementById('finalValueFee')) {
        document.getElementById('finalValueFee').textContent = `${applicableFee}%`;
    }
    
    if (document.getElementById('insertionFee')) {
        document.getElementById('insertionFee').textContent = `$${fees.insertion}`;
    }
}

/**
 * 為替レート表示更新
 */
function updateExchangeRateDisplay() {
    const baseRate = calculatorConfig.exchangeRates.USD;
    const safeRate = baseRate * 1.05;
    
    if (document.getElementById('baseRate')) {
        document.getElementById('baseRate').textContent = `1 USD = ¥${baseRate}`;
    }
    
    if (document.getElementById('calculationRate')) {
        document.getElementById('calculationRate').textContent = `1 USD = ¥${safeRate.toFixed(2)}`;
    }
    
    if (document.getElementById('currentRate')) {
        document.getElementById('currentRate').textContent = `1 USD = ¥${baseRate}`;
    }
}

/**
 * APIヘルスチェック
 */
async function performHealthCheck() {
    try {
        const response = await fetch(calculatorConfig.apiEndpoint + '?action=health_check');
        const health = await response.json();
        
        if (health.database) {
            console.log(`✅ API接続確認完了 - DB: ${health.database_type}`);
            updateStatusIndicator('online', `DB: ${health.database_type.toUpperCase()}`);
        } else {
            console.log('⚠️ データベース接続エラー:', health.database_error);
            updateStatusIndicator('warning', 'DB接続エラー');
        }
    } catch (error) {
        console.log('❌ APIヘルスチェック失敗:', error);
        updateStatusIndicator('offline', 'API接続エラー');
    }
}

/**
 * ステータスインジケーター更新
 */
function updateStatusIndicator(status, message) {
    const statusElement = document.querySelector('.nav-status .status-indicator span');
    const dotElement = document.querySelector('.status-dot');
    
    if (statusElement) statusElement.textContent = message || 'システム稼働中';
    
    if (dotElement) {
        dotElement.className = 'status-dot';
        const colors = { 'online': 'var(--color-success)', 'warning': 'var(--color-warning)', 'offline': 'var(--color-danger)' };
        dotElement.style.backgroundColor = colors[status] || colors.online;
    }
}

/**
 * 初期データ読み込み
 */
async function loadInitialData() {
    try {
        updateFeeDisplay();
        updateExchangeRateDisplay();
        console.log('📦 初期データ読み込み完了');
    } catch (error) {
        console.error('初期データ読み込みエラー:', error);
    }
}

// デバッグ用関数
function debugCalculator() {
    console.log('🔍 利益計算システム デバッグ情報:', calculatorConfig);
    return calculatorConfig;
}

// グローバルスコープに公開
window.debugCalculator = debugCalculator;
window.calculatorConfig = calculatorConfig;

console.log('✅ 利益計算システム JavaScript 読み込み完了');