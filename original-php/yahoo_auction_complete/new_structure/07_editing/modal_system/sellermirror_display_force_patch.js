/**
 * SellerMirror表示強制パッチ
 * 既存の表示関数を完全に上書き
 */

console.log('🔧 SellerMirror Display Force Patch Loading...');

// DOM読み込み完了後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchSellerMirrorDisplay);
} else {
    patchSellerMirrorDisplay();
}

function patchSellerMirrorDisplay() {
    console.log('🔧 Patching SellerMirror display functions...');
    
    // IntegratedListingModalが存在するまで待機
    const checkModal = setInterval(() => {
        if (typeof IntegratedListingModal !== 'undefined') {
            clearInterval(checkModal);
            applyPatch();
        }
    }, 100);
    
    function applyPatch() {
        console.log('✅ Applying SellerMirror display patch...');
        
        // 🔴 displaySellerMirrorResults を強制上書き
        IntegratedListingModal.displaySellerMirrorResults = function(data) {
            console.log('[PATCHED] displaySellerMirrorResults called with:', data);
            
            const container = document.getElementById('sellermirror-results-container');
            if (!container) {
                console.error('[PATCHED] Container not found: sellermirror-results-container');
                return;
            }
            
            const competitorCount = data.competitor_count || 0;
            const soldCount = data.sold_count_90days || 0;
            const averagePrice = data.average_price || 0;
            const minPrice = data.min_price || 0;
            const maxPrice = data.max_price || 0;
            const similarItems = data.similar_items || [];
            const riskLevel = data.risk_level || 'MEDIUM';
            const confidence = data.mirror_confidence || 0;
            
            console.log('[PATCHED] Rendering with:', { competitorCount, soldCount, averagePrice, similarItems: similarItems.length });
            
            const riskColors = {
                'LOW': '#28a745',
                'MEDIUM': '#ffc107',
                'HIGH': '#dc3545'
            };
            const riskColor = riskColors[riskLevel] || '#6c757d';
            
            const sellProbability = calculateSellProb(soldCount, competitorCount);
            const estimatedDays = estimateDays(soldCount, competitorCount);
            
            const html = `
                <!-- 市場分析サマリー -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; font-size: 1.2rem;">
                        <i class="fas fa-chart-bar"></i> 市場分析サマリー
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold;">${soldCount}</div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">90日間販売数</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold;">${competitorCount}</div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">現在の出品数</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold;">${sellProbability}%</div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">売れる確率</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; font-weight: bold;">${estimatedDays}日</div>
                            <div style="font-size: 0.9rem; opacity: 0.9;">予測販売期間</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 0.9rem; opacity: 0.9;">信頼度:</span>
                            <span style="font-size: 1.2rem; font-weight: bold; margin-left: 0.5rem;">${confidence}%</span>
                        </div>
                        <div style="background: ${riskColor}; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600;">
                            リスク: ${riskLevel}
                        </div>
                    </div>
                </div>
                
                <!-- 価格分析 -->
                <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #333;">
                        <i class="fas fa-dollar-sign"></i> 価格分析（USD）
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 6px;">
                            <div style="color: #dc3545; font-size: 1.8rem; font-weight: bold;">$${minPrice.toFixed(2)}</div>
                            <div style="font-size: 0.9rem; color: #6c757d; margin-top: 0.25rem;">最安値</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 6px;">
                            <div style="color: #0d6efd; font-size: 1.8rem; font-weight: bold;">$${averagePrice.toFixed(2)}</div>
                            <div style="font-size: 0.9rem; color: #6c757d; margin-top: 0.25rem;">平均価格</div>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 6px;">
                            <div style="color: #28a745; font-size: 1.8rem; font-weight: bold;">$${maxPrice.toFixed(2)}</div>
                            <div style="font-size: 0.9rem; color: #6c757d; margin-top: 0.25rem;">最高値</div>
                        </div>
                    </div>
                </div>
                
                <!-- 類似商品（画像付き） -->
                ${similarItems.length > 0 ? `
                <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 1.5rem;">
                    <h4 style="margin: 0 0 1rem 0; color: #333;">
                        <i class="fas fa-images"></i> 類似商品（Mirror候補）- ${similarItems.length}件
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                        ${similarItems.slice(0, 6).map((item, idx) => renderItemCard(item, idx)).join('')}
                    </div>
                </div>
                ` : '<div style="padding: 2rem; text-align: center; color: #6c757d;">類似商品が見つかりませんでした</div>'}
            `;
            
            container.innerHTML = html;
            console.log('[PATCHED] Display updated successfully');
        };
        
        // ヘルパー関数
        function calculateSellProb(sold, competitors) {
            if (sold === 0) return 0;
            if (competitors === 0) return 95;
            
            let prob = (sold / (sold + competitors)) * 100;
            if (sold > 20) prob += 10;
            if (competitors > 30) prob -= 15;
            
            return Math.max(5, Math.min(95, Math.round(prob)));
        }
        
        function estimateDays(sold, competitors) {
            if (sold === 0) return 90;
            
            const base = 90 / sold;
            const factor = 1 + (competitors / 100);
            
            return Math.min(90, Math.max(1, Math.round(base * factor)));
        }
        
        function renderItemCard(item, index) {
            const imageUrl = item.image_url || 'https://placehold.co/200x200/667eea/ffffff?text=Item+' + (index + 1);
            const price = parseFloat(item.price || 0);
            const shippingCost = parseFloat(item.shipping_cost || 0);
            const totalPrice = parseFloat(item.total_price || (price + shippingCost));
            const title = (item.title || 'No title').substring(0, 60);
            const soldCount = item.sold_count || 0;
            const listingType = item.listing_type || 'FixedPrice';
            const condition = item.condition || 'Used';
            const itemUrl = item.url || '#';
            
            return `
                <div class="mirror-card" 
                     style="border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.3s ease; background: white;"
                     onclick="window.open('${itemUrl}', '_blank')">
                    <div style="width: 100%; height: 150px; overflow: hidden; background: #f8f9fa; position: relative;">
                        <img src="${imageUrl}" 
                             style="width: 100%; height: 100%; object-fit: contain; background: #f8f9fa;"
                             onerror="this.style.display='block'; this.alt='Image Not Available';"
                             alt="${title}">
                    </div>
                    
                    <div style="padding: 0.75rem;">
                        <div style="font-size: 0.85rem; font-weight: 500; margin-bottom: 0.5rem; height: 42px; overflow: hidden; line-height: 1.4;">
                            ${title}...
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: #0d6efd;">
                                    ${totalPrice.toFixed(2)}
                                </div>
                                ${shippingCost > 0 ? `<div style="font-size: 0.7rem; color: #6c757d;">+${shippingCost.toFixed(2)} shipping</div>` : ''}
                                ${price > 0 && shippingCost > 0 ? `<div style="font-size: 0.7rem; color: #6c757d;">(Item: ${price.toFixed(2)})</div>` : ''}
                            </div>
                            <div style="font-size: 0.75rem; background: #e3f2fd; color: #1976d2; padding: 0.25rem 0.5rem; border-radius: 12px;">
                                ${listingType}
                            </div>
                        </div>
                        
                        <div style="font-size: 0.75rem; color: #6c757d; margin-bottom: 0.5rem;">
                            Condition: ${condition}
                        </div>
                        
                        ${soldCount > 0 ? `
                        <div style="font-size: 0.75rem; color: #28a745;">
                            <i class="fas fa-check-circle"></i> 販売実績: ${soldCount}件
                        </div>
                        ` : ''}
                        
                        <div style="font-size: 0.7rem; color: #0d6efd; margin-top: 0.5rem; text-align: center;">
                            <i class="fas fa-external-link-alt"></i> Click to view on eBay
                        </div>
                    </div>
                </div>
            `;
        }
        
        // CSSスタイル追加
        if (!document.getElementById('mirror-card-styles')) {
            const style = document.createElement('style');
            style.id = 'mirror-card-styles';
            style.textContent = `
                .mirror-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 16px rgba(0,0,0,0.15) !important;
                    border-color: #667eea !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('✅ SellerMirror display patch applied successfully');
    }
}

console.log('✅ SellerMirror Display Force Patch loaded');
