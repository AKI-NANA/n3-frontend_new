/**
 * Yahoo Auction 統合JavaScript - Phase 5 Frontend Implementation
 * ファイル: yahoo_integration.js
 * Yahoo Auctionデータとの連携機能強化
 */

// =============================================================================
// グローバル変数・設定
// =============================================================================

const YAHOO_INTEGRATION = {
    API_BASE: 'backend/api/yahoo_integration.php',
    BATCH_SIZE: 50,
    REFRESH_INTERVAL: 30000, // 30秒
    AUTO_REFRESH: false,
    currentPage: 0,
    totalProducts: 0,
    processingActive: false
};

// チャートライブラリの初期化
let profitChart = null;
let categoryChart = null;
let confidenceChart = null;

// =============================================================================
// Yahoo Auction データ処理機能
// =============================================================================

/**
 * Yahoo Auctionデータの一括処理開始
 */
async function processYahooData(limit = 100, offset = 0) {
    if (YAHOO_INTEGRATION.processingActive) {
        showNotification('処理が既に実行中です', 'warning');
        return;
    }

    YAHOO_INTEGRATION.processingActive = true;
    updateProcessingUI(true);
    
    const startTime = Date.now();

    try {
        showNotification('Yahoo Auction商品データの処理を開始しています...', 'info');

        const response = await fetch(YAHOO_INTEGRATION.API_BASE, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'process_yahoo_products',
                limit: limit,
                offset: offset
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            const processingTime = Date.now() - startTime;
            
            displayYahooProcessingResults(data, processingTime);
            updateProcessingStats(data);
            
            // 成功メッセージ
            showNotification(
                `処理完了: ${data.success_count}/${data.processed_count}件成功 (${Math.round(processingTime/1000)}秒)`,
                'success'
            );

            // 統計情報更新
            await loadProcessingStatus();
            
        } else {
            throw new Error(data.error || '不明なエラーが発生しました');
        }

    } catch (error) {
        console.error('Yahoo処理エラー:', error);
        showNotification(`処理エラー: ${error.message}`, 'error');
        
    } finally {
        YAHOO_INTEGRATION.processingActive = false;
        updateProcessingUI(false);
    }
}

/**
 * Yahoo商品データ取得・表示
 */
async function loadYahooProducts(filters = {}, page = 0) {
    try {
        const limit = 50;
        const offset = page * limit;

        showLoadingState('yahooProductsList');

        const response = await fetch(YAHOO_INTEGRATION.API_BASE, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'get_yahoo_products',
                filters: filters,
                limit: limit,
                offset: offset
            })
        });

        const data = await response.json();

        if (data.success) {
            displayYahooProductsList(data.products, data.pagination);
            YAHOO_INTEGRATION.currentPage = page;
            YAHOO_INTEGRATION.totalProducts = data.pagination.total_count;
            
        } else {
            showNotification(`データ取得エラー: ${data.error}`, 'error');
        }

    } catch (error) {
        console.error('商品データ取得エラー:', error);
        showNotification('商品データの取得に失敗しました', 'error');
    }
}

/**
 * 利益分析の実行
 */
async function runProfitAnalysis(targetMargin = 20.0) {
    try {
        showNotification('利益分析を実行中...', 'info');

        const response = await fetch(YAHOO_INTEGRATION.API_BASE, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'bulk_profit_analysis',
                target_profit_margin: targetMargin,
                product_ids: [] // 空の場合は自動で選択
            })
        });

        const data = await response.json();

        if (data.success) {
            displayProfitAnalysisResults(data);
            showNotification(`分析完了: ${data.summary.profitable_count}/${data.summary.total_analyzed}件が利益率${targetMargin}%以上`, 'success');
            
        } else {
            throw new Error(data.error);
        }

    } catch (error) {
        console.error('利益分析エラー:', error);
        showNotification(`利益分析エラー: ${error.message}`, 'error');
    }
}

/**
 * カテゴリーを手動で更新
 */
async function updateProductCategory(productId, categoryId) {
    try {
        const response = await fetch(YAHOO_INTEGRATION.API_BASE, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'update_category',
                product_id: productId,
                category_id: categoryId
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`カテゴリーを更新しました: ${data.new_category.name}`, 'success');
            
            // 商品リストを更新
            await loadYahooProducts({}, YAHOO_INTEGRATION.currentPage);
            
        } else {
            throw new Error(data.error);
        }

    } catch (error) {
        console.error('カテゴリー更新エラー:', error);
        showNotification(`更新エラー: ${error.message}`, 'error');
    }
}

// =============================================================================
// UI表示関数
// =============================================================================

/**
 * Yahoo処理結果の表示
 */
function displayYahooProcessingResults(data, processingTime) {
    const container = document.getElementById('yahooProcessingResults');
    
    if (!container) return;

    const successRate = (data.success_count / data.processed_count * 100).toFixed(1);
    const avgConfidence = data.summary.average_confidence || 0;

    container.innerHTML = `
        <div class="processing-results">
            <div class="results-header">
                <h4><i class="fas fa-chart-line"></i> 処理結果サマリー</h4>
                <div class="results-stats">
                    <div class="stat-item">
                        <span class="stat-label">処理件数</span>
                        <span class="stat-value">${data.processed_count}件</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">成功率</span>
                        <span class="stat-value success">${successRate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">平均信頼度</span>
                        <span class="stat-value">${avgConfidence.toFixed(1)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">処理時間</span>
                        <span class="stat-value">${Math.round(processingTime/1000)}秒</span>
                    </div>
                </div>
            </div>

            <div class="results-list">
                <h5>処理結果詳細</h5>
                <div class="results-scroll">
                    ${data.results.map((result, index) => `
                        <div class="result-item ${result.status}">
                            <div class="result-header">
                                <span class="result-title">${result.title}</span>
                                <span class="result-status ${result.status}">
                                    ${result.status === 'success' ? '✓' : '✗'}
                                </span>
                            </div>
                            
                            ${result.status === 'success' ? `
                                <div class="result-details">
                                    <div class="detail-row">
                                        <span>カテゴリー:</span>
                                        <span>${result.category.category_name} (${result.category.confidence}%)</span>
                                    </div>
                                    <div class="detail-row">
                                        <span>予想手数料:</span>
                                        <span>$${result.fees.total_fees}</span>
                                    </div>
                                    <div class="detail-row">
                                        <span>予想利益:</span>
                                        <span class="${result.profit.net_profit_usd > 0 ? 'profit-positive' : 'profit-negative'}">
                                            $${result.profit.net_profit_usd} (${result.profit.profit_margin_net}%)
                                        </span>
                                    </div>
                                    <div class="detail-row item-specifics">
                                        <span>Item Specifics:</span>
                                        <code>${result.item_specifics}</code>
                                    </div>
                                </div>
                            ` : `
                                <div class="result-error">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    ${result.error}
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="results-actions">
                <button class="btn btn-primary" onclick="loadYahooProducts()">
                    <i class="fas fa-list"></i> 処理済み商品を表示
                </button>
                <button class="btn btn-success" onclick="runProfitAnalysis()">
                    <i class="fas fa-chart-bar"></i> 利益分析実行
                </button>
                <button class="btn btn-info" onclick="exportProcessedData()">
                    <i class="fas fa-download"></i> データエクスポート
                </button>
            </div>
        </div>
    `;

    container.style.display = 'block';
    
    // スクロールして結果を表示
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Yahoo商品リストの表示
 */
function displayYahooProductsList(products, pagination) {
    const container = document.getElementById('yahooProductsList');
    
    if (!container) return;

    container.innerHTML = `
        <div class="products-header">
            <h4><i class="fas fa-list"></i> Yahoo Auction商品一覧</h4>
            <div class="pagination-info">
                ${pagination.offset + 1} - ${Math.min(pagination.offset + products.length, pagination.total_count)} / ${pagination.total_count}件
            </div>
        </div>

        <div class="products-filters">
            <div class="filter-group">
                <select id="processingStatusFilter" onchange="applyProductFilters()">
                    <option value="">すべての状態</option>
                    <option value="pending">未処理</option>
                    <option value="processed">処理済み</option>
                </select>
                
                <input type="number" id="minPriceFilter" placeholder="最低価格" onchange="applyProductFilters()">
                <input type="number" id="maxPriceFilter" placeholder="最高価格" onchange="applyProductFilters()">
                
                <input type="text" id="searchTextFilter" placeholder="商品検索..." onchange="applyProductFilters()">
                
                <button class="btn btn-secondary" onclick="applyProductFilters()">
                    <i class="fas fa-filter"></i> フィルター適用
                </button>
            </div>
        </div>

        <div class="products-table">
            <table>
                <thead>
                    <tr>
                        <th>商品名</th>
                        <th>価格(円)</th>
                        <th>eBayカテゴリー</th>
                        <th>信頼度</th>
                        <th>予想利益</th>
                        <th>状態</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr class="product-row ${product.processing_status}">
                            <td class="product-title">
                                <div class="title-text">${product.title}</div>
                                ${product.item_specifics ? `
                                    <div class="item-specifics">
                                        <code>${product.item_specifics}</code>
                                    </div>
                                ` : ''}
                            </td>
                            <td class="product-price">¥${Number(product.price_jpy || 0).toLocaleString()}</td>
                            <td class="product-category">
                                ${product.ebay_category_name || '未判定'}
                                ${product.ebay_category_id ? `<br><small>(${product.ebay_category_id})</small>` : ''}
                            </td>
                            <td class="product-confidence">
                                ${product.category_confidence ? `
                                    <div class="confidence-bar">
                                        <div class="confidence-fill" style="width: ${product.category_confidence}%; background-color: ${getConfidenceColor(product.category_confidence)};">
                                            ${product.category_confidence}%
                                        </div>
                                    </div>
                                ` : '—'}
                            </td>
                            <td class="product-profit">
                                ${product.estimated_profit_usd ? `
                                    <span class="profit-amount ${product.estimated_profit_usd > 0 ? 'positive' : 'negative'}">
                                        $${product.estimated_profit_usd}
                                    </span>
                                    ${product.profit_margin_percent ? `<br><small>${product.profit_margin_percent}%</small>` : ''}
                                ` : '—'}
                            </td>
                            <td class="product-status">
                                <span class="status-badge status-${product.processing_status}">
                                    ${getStatusText(product.processing_status)}
                                </span>
                                ${product.risk_level ? `<br><small class="risk-${product.risk_level.toLowerCase()}">${product.risk_level}</small>` : ''}
                            </td>
                            <td class="product-actions">
                                <div class="action-buttons">
                                    ${product.ebay_category_id ? `
                                        <button class="btn btn-sm btn-info" onclick="showCategoryDetails('${product.id}')">
                                            <i class="fas fa-info"></i>
                                        </button>
                                        <button class="btn btn-sm btn-warning" onclick="showCategorySelector('${product.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    ` : `
                                        <button class="btn btn-sm btn-primary" onclick="processSingleProduct('${product.id}')">
                                            <i class="fas fa-play"></i> 判定
                                        </button>
                                    `}
                                    <button class="btn btn-sm btn-secondary" onclick="showProductDetails('${product.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="products-pagination">
            <div class="pagination-controls">
                <button class="btn ${YAHOO_INTEGRATION.currentPage === 0 ? 'disabled' : ''}" 
                        onclick="loadYahooProducts({}, ${YAHOO_INTEGRATION.currentPage - 1})" 
                        ${YAHOO_INTEGRATION.currentPage === 0 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> 前のページ
                </button>
                
                <span class="page-info">
                    ページ ${YAHOO_INTEGRATION.currentPage + 1} / ${Math.ceil(pagination.total_count / 50)}
                </span>
                
                <button class="btn ${!pagination.has_more ? 'disabled' : ''}" 
                        onclick="loadYahooProducts({}, ${YAHOO_INTEGRATION.currentPage + 1})" 
                        ${!pagination.has_more ? 'disabled' : ''}>
                    次のページ <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    container.style.display = 'block';
}

/**
 * 利益分析結果の表示
 */
function displayProfitAnalysisResults(data) {
    const container = document.getElementById('profitAnalysisResults');
    
    if (!container) {
        // 新しいコンテナを作成
        const newContainer = document.createElement('div');
        newContainer.id = 'profitAnalysisResults';
        newContainer.className = 'section';
        document.querySelector('.container').appendChild(newContainer);
    }

    const profitableRate = (data.summary.profitable_rate || 0).toFixed(1);

    document.getElementById('profitAnalysisResults').innerHTML = `
        <div class="profit-analysis">
            <div class="analysis-header">
                <h4><i class="fas fa-chart-pie"></i> 利益分析結果</h4>
                <div class="analysis-summary">
                    <div class="summary-item">
                        <span class="summary-label">分析対象</span>
                        <span class="summary-value">${data.summary.total_analyzed}件</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">利益商品</span>
                        <span class="summary-value success">${data.summary.profitable_count}件</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">利益率</span>
                        <span class="summary-value">${profitableRate}%</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">目標利益率</span>
                        <span class="summary-value">${data.target_profit_margin}%</span>
                    </div>
                </div>
            </div>

            <div class="analysis-chart">
                <canvas id="profitAnalysisChart"></canvas>
            </div>

            <div class="recommended-products">
                <h5>推奨商品（高利益率順）</h5>
                <div class="products-grid">
                    ${data.analysis
                        .filter(item => item.meets_target)
                        .sort((a, b) => b.profit_analysis.net_profit_usd - a.profit_analysis.net_profit_usd)
                        .slice(0, 10)
                        .map(item => `
                            <div class="profit-product-card ${item.recommendation.toLowerCase()}">
                                <div class="card-header">
                                    <span class="recommendation-badge ${item.recommendation.toLowerCase()}">
                                        ${item.recommendation === 'RECOMMENDED' ? '推奨' : '非推奨'}
                                    </span>
                                </div>
                                <div class="card-body">
                                    <h6 class="product-title">${item.title}</h6>
                                    <div class="profit-details">
                                        <div class="price-row">
                                            <span>Yahoo価格:</span>
                                            <span>¥${Number(item.yahoo_price_yen).toLocaleString()}</span>
                                        </div>
                                        <div class="price-row">
                                            <span>eBay価格:</span>
                                            <span>$${item.estimated_ebay_price_usd}</span>
                                        </div>
                                        <div class="price-row profit">
                                            <span>予想利益:</span>
                                            <span class="profit-amount">
                                                $${item.profit_analysis.net_profit_usd} 
                                                (${item.profit_analysis.profit_margin_net}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-actions">
                                    <button class="btn btn-sm btn-success" onclick="approveProduct('${item.product_id}')">
                                        承認
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="showProductDetails('${item.product_id}')">
                                        詳細
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;

    // チャート描画
    drawProfitAnalysisChart(data);
    
    document.getElementById('profitAnalysisResults').style.display = 'block';
}

/**
 * 処理ステータスの読み込み・表示
 */
async function loadProcessingStatus() {
    try {
        const response = await fetch(YAHOO_INTEGRATION.API_BASE, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'get_processing_status'
            })
        });

        const data = await response.json();

        if (data.success) {
            displayProcessingStatus(data.statistics);
        }

    } catch (error) {
        console.error('ステータス取得エラー:', error);
    }
}

/**
 * 処理ステータス表示
 */
function displayProcessingStatus(stats) {
    const container = document.getElementById('processingStatus');
    
    if (!container) return;

    const totalProducts = stats.yahoo_products.total_products || 0;
    const processedProducts = stats.yahoo_products.processed_products || 0;
    const processRate = totalProducts > 0 ? (processedProducts / totalProducts * 100).toFixed(1) : 0;

    container.innerHTML = `
        <div class="status-overview">
            <h4><i class="fas fa-tachometer-alt"></i> システム状況</h4>
            
            <div class="status-metrics">
                <div class="metric-card">
                    <div class="metric-value">${totalProducts.toLocaleString()}</div>
                    <div class="metric-label">総商品数</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${processedProducts.toLocaleString()}</div>
                    <div class="metric-label">処理済み商品</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${processRate}%</div>
                    <div class="metric-label">処理率</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">$${(stats.yahoo_products.avg_estimated_profit || 0).toFixed(2)}</div>
                    <div class="metric-label">平均予想利益</div>
                </div>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" style="width: ${processRate}%;">
                    ${processRate}% 完了
                </div>
            </div>
        </div>

        <div class="top-categories">
            <h5>人気カテゴリー</h5>
            <div class="categories-list">
                ${(stats.top_categories || []).map(category => `
                    <div class="category-item">
                        <span class="category-name">${category.ebay_category_name}</span>
                        <span class="category-count">${category.product_count}件</span>
                        <span class="category-confidence">${(category.avg_confidence || 0).toFixed(1)}%</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * 信頼度に基づく色の取得
 */
function getConfidenceColor(confidence) {
    if (confidence >= 80) return '#10b981';
    if (confidence >= 60) return '#f59e0b';
    if (confidence >= 40) return '#ef4444';
    return '#6b7280';
}

/**
 * ステータステキストの取得
 */
function getStatusText(status) {
    const statusMap = {
        'pending': '未処理',
        'processing': '処理中',
        'completed': '完了',
        'failed': '失敗',
        'manual_review': '要確認',
        'approved': '承認済み',
        'rejected': '却下'
    };
    return statusMap[status] || status;
}

/**
 * ローディング状態の表示
 */
function showLoadingState(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>データを読み込み中...</p>
            </div>
        `;
    }
}

/**
 * 通知メッセージの表示
 */
function showNotification(message, type = 'info') {
    // 既存の通知システムを利用
    if (typeof showNotificationMessage === 'function') {
        showNotificationMessage(message, type);
        return;
    }

    // フォールバック通知
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/**
 * 処理UI状態の更新
 */
function updateProcessingUI(isProcessing) {
    const buttons = document.querySelectorAll('.processing-trigger');
    buttons.forEach(button => {
        if (isProcessing) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML.replace('<i class="fas fa-spinner fa-spin"></i> 処理中...', '');
        }
    });
}

/**
 * 処理統計の更新
 */
function updateProcessingStats(data) {
    // 統計情報をローカルストレージに保存
    const stats = {
        lastProcessing: {
            timestamp: new Date().toISOString(),
            processed: data.processed_count,
            success: data.success_count,
            successRate: (data.success_count / data.processed_count * 100).toFixed(1)
        }
    };
    
    localStorage.setItem('yahooIntegrationStats', JSON.stringify(stats));
}

// =============================================================================
// イベントリスナー・初期化
// =============================================================================

/**
 * ページ読み込み時の初期化
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Yahoo Integration JavaScript initialized');
    
    // 自動更新の設定
    if (YAHOO_INTEGRATION.AUTO_REFRESH) {
        setInterval(loadProcessingStatus, YAHOO_INTEGRATION.REFRESH_INTERVAL);
    }
    
    // 初期ステータス読み込み
    loadProcessingStatus();
});

/**
 * エクスポート用グローバル関数
 */
window.YAHOO_INTEGRATION = YAHOO_INTEGRATION;
window.processYahooData = processYahooData;
window.loadYahooProducts = loadYahooProducts;
window.runProfitAnalysis = runProfitAnalysis;
window.updateProductCategory = updateProductCategory;
window.loadProcessingStatus = loadProcessingStatus;
