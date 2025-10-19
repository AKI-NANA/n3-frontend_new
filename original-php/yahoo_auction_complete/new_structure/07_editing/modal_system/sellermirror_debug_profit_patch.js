/**
 * SellerMirror デバッグ＆修正パッチ
 * 1. APIモード確認
 * 2. 利益計算追加
 * 3. 表示修正
 */

console.log('🔧 SellerMirror Debug Patch Loading...');

// 元のrunSellerMirrorTool関数を拡張
if (typeof IntegratedListingModal !== 'undefined') {
    const originalRunSellerMirror = IntegratedListingModal.runSellerMirrorTool;
    
    IntegratedListingModal.runSellerMirrorTool = async function() {
        console.log('[DEBUG] runSellerMirrorTool called');
        
        const product = this.state.productData;
        if (!product) {
            this.showNotification('商品データが読み込まれていません', 'error');
            return;
        }
        
        const productId = product.db_id || product.id;
        const ebayTitle = document.getElementById('ebay-title')?.value;
        const ebayCategory = document.getElementById('ebay-category-id')?.value;
        const yahooPrice = product.current_price || product.price_jpy || 0;
        
        console.log('[DEBUG] Request params:', {
            productId,
            ebayTitle,
            ebayCategory,
            yahooPrice
        });
        
        if (!ebayTitle) {
            this.showNotification('eBayタイトルが必要です。先にカテゴリ判定を実行してください', 'warning');
            return;
        }
        
        this.showNotification('SellerMirror分析中...', 'info');
        
        try {
            const response = await fetch('../11_category/backend/api/sell_mirror_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'analyze_product',
                    product_id: productId,
                    ebay_title: ebayTitle,
                    ebay_category_id: ebayCategory,
                    yahoo_price: yahooPrice
                })
            });
            
            const text = await response.text();
            console.log('[DEBUG] Raw API response:', text);
            
            const result = JSON.parse(text);
            console.log('[DEBUG] Parsed result:', result);
            
            if (result.success) {
                const mirrorData = result.analysis_result || result;
                
                // 🔴 APIモード確認
                console.log('[DEBUG] API Mode:', mirrorData.api_mode);
                if (mirrorData.api_mode === 'demo') {
                    console.warn('[WARNING] Running in DEMO mode!');
                    if (mirrorData.api_error) {
                        console.error('[API ERROR]', mirrorData.api_error);
                    }
                    
                    // 🔴 デモモード警告を表示
                    this.showNotification(
                        '⚠️ デモモード: eBay APIが使用できません。シミュレーションデータを表示しています。' + 
                        (mirrorData.api_error ? '\nエラー: ' + mirrorData.api_error : ''), 
                        'warning',
                        5000
                    );
                }
                
                // 🔴 利益計算を追加
                mirrorData.profit_analysis = this.calculateProfitAnalysis(mirrorData, yahooPrice);
                
                this.state.toolResults.sellermirror = mirrorData;
                this.displaySellerMirrorResults(mirrorData);
                this.showNotification('✅ SellerMirror分析完了', 'success');
                this.updateStepStatus('ilm-step4-status', '完了', 'complete');
            } else {
                throw new Error(result.error || result.message || 'Analysis failed');
            }
        } catch (error) {
            console.error('[ERROR] SellerMirror:', error);
            this.showNotification('SellerMirror分析エラー: ' + error.message, 'error');
        }
    };
    
    // 🔴 利益計算関数追加
    IntegratedListingModal.calculateProfitAnalysis = function(mirrorData, yahooPriceJpy) {
        const costUsd = yahooPriceJpy / 150; // 為替レート
        const minPrice = mirrorData.min_price || 0;
        const avgPrice = mirrorData.average_price || 0;
        const maxPrice = mirrorData.max_price || 0;
        
        const calculateProfit = (sellPrice) => {
            const ebayFee = sellPrice * 0.13; // 13%
            const paypalFee = sellPrice * 0.029 + 0.30;
            const shippingCost = 8.00; // 概算
            const totalCost = costUsd + ebayFee + paypalFee + shippingCost;
            const profit = sellPrice - totalCost;
            const profitMargin = (profit / sellPrice) * 100;
            
            return {
                sell_price: sellPrice,
                cost: costUsd,
                ebay_fee: ebayFee,
                paypal_fee: paypalFee,
                shipping_cost: shippingCost,
                total_cost: totalCost,
                profit: profit,
                profit_margin: profitMargin
            };
        };
        
        return {
            yahoo_price_jpy: yahooPriceJpy,
            cost_usd: costUsd,
            min_strategy: calculateProfit(minPrice),
            avg_strategy: calculateProfit(avgPrice),
            max_strategy: calculateProfit(maxPrice)
        };
    };
    
    console.log('✅ SellerMirror Debug Patch Applied');
}

// 強制パッチ：displaySellerMirrorResultsを利益表示付きで上書き
setTimeout(() => {
    if (typeof IntegratedListingModal !== 'undefined' && IntegratedListingModal.displaySellerMirrorResults) {
        const originalDisplay = IntegratedListingModal.displaySellerMirrorResults;
        
        IntegratedListingModal.displaySellerMirrorResults = function(data) {
            console.log('[PROFIT PATCH] Displaying with profit analysis:', data.profit_analysis);
            
            // 元の表示を実行
            originalDisplay.call(this, data);
            
            // 利益分析セクションを追加
            if (data.profit_analysis) {
                const container = document.getElementById('sellermirror-results-container');
                if (container) {
                    const profitSection = this.renderProfitAnalysisSection(data.profit_analysis);
                    container.insertAdjacentHTML('beforeend', profitSection);
                }
            }
        };
        
        // 利益分析セクション描画
        IntegratedListingModal.renderProfitAnalysisSection = function(profitAnalysis) {
            const min = profitAnalysis.min_strategy;
            const avg = profitAnalysis.avg_strategy;
            const max = profitAnalysis.max_strategy;
            
            return `
                <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 1.5rem; margin-top: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #333;">
                        <i class="fas fa-calculator"></i> 利益分析（仕入れ: ¥${profitAnalysis.yahoo_price_jpy.toLocaleString()} = $${profitAnalysis.cost_usd.toFixed(2)}）
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        <!-- 最安値戦略 -->
                        <div style="background: ${min.profit > 0 ? '#e7f5ed' : '#fee'}; padding: 1rem; border-radius: 6px; border-left: 4px solid ${min.profit > 0 ? '#28a745' : '#dc3545'};">
                            <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.5rem;">最安値で出品</div>
                            <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.25rem;">$${min.sell_price.toFixed(2)}</div>
                            <div style="font-size: 1.3rem; font-weight: bold; color: ${min.profit > 0 ? '#28a745' : '#dc3545'}; margin-bottom: 0.25rem;">
                                ${min.profit > 0 ? '+' : ''}$${min.profit.toFixed(2)}
                            </div>
                            <div style="font-size: 0.8rem; color: ${min.profit > 0 ? '#28a745' : '#dc3545'};">
                                利益率: ${min.profit_margin.toFixed(1)}%
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d; margin-top: 0.5rem;">
                                <i class="fas fa-bolt"></i> 最速で売れる可能性
                            </div>
                        </div>
                        
                        <!-- 平均価格戦略 -->
                        <div style="background: ${avg.profit > 0 ? '#e3f2fd' : '#fee'}; padding: 1rem; border-radius: 6px; border-left: 4px solid ${avg.profit > 0 ? '#0d6efd' : '#dc3545'};">
                            <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.5rem;">平均価格で出品（推奨）</div>
                            <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.25rem;">$${avg.sell_price.toFixed(2)}</div>
                            <div style="font-size: 1.3rem; font-weight: bold; color: ${avg.profit > 0 ? '#0d6efd' : '#dc3545'}; margin-bottom: 0.25rem;">
                                ${avg.profit > 0 ? '+' : ''}$${avg.profit.toFixed(2)}
                            </div>
                            <div style="font-size: 0.8rem; color: ${avg.profit > 0 ? '#0d6efd' : '#dc3545'};">
                                利益率: ${avg.profit_margin.toFixed(1)}%
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d; margin-top: 0.5rem;">
                                <i class="fas fa-balance-scale"></i> バランス型
                            </div>
                        </div>
                        
                        <!-- 最高値戦略 -->
                        <div style="background: ${max.profit > 0 ? '#e8f5e9' : '#fee'}; padding: 1rem; border-radius: 6px; border-left: 4px solid ${max.profit > 0 ? '#28a745' : '#dc3545'};">
                            <div style="font-size: 0.85rem; color: #6c757d; margin-bottom: 0.5rem;">最高値で出品</div>
                            <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.25rem;">$${max.sell_price.toFixed(2)}</div>
                            <div style="font-size: 1.3rem; font-weight: bold; color: ${max.profit > 0 ? '#28a745' : '#dc3545'}; margin-bottom: 0.25rem;">
                                ${max.profit > 0 ? '+' : ''}$${max.profit.toFixed(2)}
                            </div>
                            <div style="font-size: 0.8rem; color: ${max.profit > 0 ? '#28a745' : '#dc3545'};">
                                利益率: ${max.profit_margin.toFixed(1)}%
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d; margin-top: 0.5rem;">
                                <i class="fas fa-hourglass-half"></i> 高利益
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 6px; font-size: 0.85rem; color: #6c757d;">
                        <strong>手数料内訳:</strong> 
                        eBay 13% | PayPal 2.9% + $0.30 | 送料概算 $8.00
                    </div>
                </div>
            `;
        };
        
        console.log('✅ Profit Analysis Display Patch Applied');
    }
}, 1000);

console.log('✅ SellerMirror Debug & Profit Patch loaded');
