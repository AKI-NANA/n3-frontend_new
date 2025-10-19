/**
 * SellerMirror拡張表示システム
 * 画像・詳細情報・価格戦略を含む完全版
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 SellerMirror結果表示（完全版 - 画像・詳細情報付き）
     */
    displaySellerMirrorResults(data) {
        const container = document.getElementById('sellermirror-results-container');
        if (!container) return;
        
        console.log('[SellerMirror Display Enhanced] Data:', data);
        
        const competitorCount = data.competitor_count || 0;
        const soldCount = data.sold_count_90days || 0;
        const averagePrice = data.average_price || 0;
        const minPrice = data.min_price || 0;
        const maxPrice = data.max_price || 0;
        const similarItems = data.similar_items || [];
        const marketAnalysis = data.market_analysis || {};
        const riskLevel = data.risk_level || 'MEDIUM';
        const confidence = data.mirror_confidence || 0;
        
        // リスクレベルの色
        const riskColors = {
            'LOW': '#28a745',
            'MEDIUM': '#ffc107',
            'HIGH': '#dc3545'
        };
        const riskColor = riskColors[riskLevel] || '#6c757d';
        
        // 売れる確率計算
        const sellProbability = this.calculateSellProbability(soldCount, competitorCount);
        const estimatedDays = this.estimateSellDays(soldCount, competitorCount);
        
        container.innerHTML = `
            <div class="ilm-results-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
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
            <div class="ilm-results-card" style="margin-bottom: 1rem;">
                <h4 style="margin: 0 0 1rem 0; color: #333;">
                    <i class="fas fa-dollar-sign"></i> 価格分析（USD）
                </h4>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
                    <div style="text-align: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px;">
                        <div style="color: #dc3545; font-size: 1.5rem; font-weight: bold;">$${minPrice.toFixed(2)}</div>
                        <div style="font-size: 0.85rem; color: #6c757d;">最安値</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px;">
                        <div style="color: #0d6efd; font-size: 1.5rem; font-weight: bold;">$${averagePrice.toFixed(2)}</div>
                        <div style="font-size: 0.85rem; color: #6c757d;">平均価格</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: #f8f9fa; border-radius: 6px;">
                        <div style="color: #28a745; font-size: 1.5rem; font-weight: bold;">$${maxPrice.toFixed(2)}</div>
                        <div style="font-size: 0.85rem; color: #6c757d;">最高値</div>
                    </div>
                </div>
                
                ${this.renderProfitStrategy(minPrice, averagePrice, maxPrice)}
            </div>
            
            <!-- 類似商品リスト（画像付き） -->
            ${similarItems.length > 0 ? `
            <div class="ilm-results-card" style="margin-bottom: 1rem;">
                <h4 style="margin: 0 0 1rem 0; color: #333;">
                    <i class="fas fa-images"></i> 類似商品（Mirror候補）
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                    ${similarItems.slice(0, 6).map((item, index) => this.renderMirrorItemCard(item, index)).join('')}
                </div>
            </div>
            ` : ''}
            
            <!-- データ継承ボタン -->
            <div style="text-align: center; margin-top: 1.5rem;">
                <button class="ilm-btn ilm-btn-primary" onclick="IntegratedListingModal.applyMirrorDataToListing()" 
                        style="padding: 0.75rem 2rem; font-size: 1rem;">
                    <i class="fas fa-magic"></i> 選択したMirrorデータを出品情報に反映
                </button>
            </div>
        `;
        
        console.log('[SellerMirror Display Enhanced] Rendered successfully');
    },
    
    /**
     * 🔴 Mirror商品カード表示（画像付き）
     */
    renderMirrorItemCard(item, index) {
        const imageUrl = item.image_url || item.galleryURL || 'https://placehold.co/200x200/667eea/ffffff?text=No+Image';
        const price = parseFloat(item.price || 0);
        const title = (item.title || 'No title').substring(0, 60);
        const soldCount = item.sold_count || 0;
        const listingType = item.listing_type || 'FixedPrice';
        
        return `
            <div class="mirror-item-card" data-index="${index}" 
                 onclick="IntegratedListingModal.selectMirrorItem(${index})"
                 style="border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.3s ease; background: white;">
                
                <!-- 商品画像 -->
                <div style="width: 100%; height: 150px; overflow: hidden; background: #f8f9fa;">
                    <img src="${imageUrl}" 
                         style="width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://placehold.co/200x200/667eea/ffffff?text=No+Image'"
                         alt="${title}">
                </div>
                
                <!-- 商品情報 -->
                <div style="padding: 0.75rem;">
                    <div style="font-size: 0.85rem; font-weight: 500; margin-bottom: 0.5rem; height: 40px; overflow: hidden; line-height: 1.3;">
                        ${title}...
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div style="font-size: 1.1rem; font-weight: bold; color: #0d6efd;">
                            $${price.toFixed(2)}
                        </div>
                        <div style="font-size: 0.75rem; background: #e3f2fd; color: #1976d2; padding: 0.25rem 0.5rem; border-radius: 12px;">
                            ${listingType}
                        </div>
                    </div>
                    
                    ${soldCount > 0 ? `
                    <div style="font-size: 0.75rem; color: #28a745;">
                        <i class="fas fa-check-circle"></i> 販売実績: ${soldCount}件
                    </div>
                    ` : ''}
                    
                    <button class="mirror-select-btn" 
                            style="width: 100%; margin-top: 0.5rem; padding: 0.5rem; background: #667eea; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;"
                            onclick="event.stopPropagation(); IntegratedListingModal.selectMirrorItem(${index})">
                        <i class="fas fa-check"></i> この商品を参考にする
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * 🔴 利益戦略表示
     */
    renderProfitStrategy(minPrice, averagePrice, maxPrice) {
        const product = this.state.productData;
        const yahooPriceJpy = product.current_price || product.price_jpy || 0;
        const costUsd = yahooPriceJpy / 150; // 為替レート
        
        // eBay手数料計算（13%）
        const calculateProfit = (sellPrice) => {
            const ebayFee = sellPrice * 0.13;
            const paypalFee = sellPrice * 0.029 + 0.30;
            const shippingCost = 8.00; // 概算
            const totalCost = costUsd + ebayFee + paypalFee + shippingCost;
            const profit = sellPrice - totalCost;
            const profitMargin = (profit / sellPrice) * 100;
            return { profit, profitMargin, totalCost };
        };
        
        const minStrategy = calculateProfit(minPrice);
        const avgStrategy = calculateProfit(averagePrice);
        const maxStrategy = calculateProfit(maxPrice);
        
        return `
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                <h5 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; color: #495057;">
                    <i class="fas fa-calculator"></i> 価格戦略シミュレーション
                    <span style="font-size: 0.8rem; color: #6c757d; font-weight: normal; margin-left: 0.5rem;">
                        （仕入れ: $${costUsd.toFixed(2)}）
                    </span>
                </h5>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
                    <!-- 最安値戦略 -->
                    <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 4px solid #dc3545;">
                        <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.25rem;">最安値で出品</div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: ${minStrategy.profit > 0 ? '#28a745' : '#dc3545'};">
                            $${minStrategy.profit.toFixed(2)}
                        </div>
                        <div style="font-size: 0.75rem; color: #6c757d;">
                            利益率: ${minStrategy.profitMargin.toFixed(1)}%
                        </div>
                        <div style="font-size: 0.7rem; color: #28a745; margin-top: 0.25rem;">
                            <i class="fas fa-bolt"></i> 最速で売れる可能性
                        </div>
                    </div>
                    
                    <!-- 平均価格戦略 -->
                    <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 4px solid #0d6efd;">
                        <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.25rem;">平均価格で出品</div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: ${avgStrategy.profit > 0 ? '#28a745' : '#dc3545'};">
                            $${avgStrategy.profit.toFixed(2)}
                        </div>
                        <div style="font-size: 0.75rem; color: #6c757d;">
                            利益率: ${avgStrategy.profitMargin.toFixed(1)}%
                        </div>
                        <div style="font-size: 0.7rem; color: #0d6efd; margin-top: 0.25rem;">
                            <i class="fas fa-balance-scale"></i> バランス型（推奨）
                        </div>
                    </div>
                    
                    <!-- 最高値戦略 -->
                    <div style="background: white; padding: 0.75rem; border-radius: 6px; border-left: 4px solid #28a745;">
                        <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 0.25rem;">最高値で出品</div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: ${maxStrategy.profit > 0 ? '#28a745' : '#dc3545'};">
                            $${maxStrategy.profit.toFixed(2)}
                        </div>
                        <div style="font-size: 0.75rem; color: #6c757d;">
                            利益率: ${maxStrategy.profitMargin.toFixed(1)}%
                        </div>
                        <div style="font-size: 0.7rem; color: #ffc107; margin-top: 0.25rem;">
                            <i class="fas fa-hourglass-half"></i> 売れるまで時間がかかる
                        </div>
                    </div>
                </div>
                
                <!-- 価格調整スライダー -->
                <div style="margin-top: 1rem; padding: 0.75rem; background: white; border-radius: 6px;">
                    <label style="font-size: 0.85rem; font-weight: 600; color: #495057; display: block; margin-bottom: 0.5rem;">
                        <i class="fas fa-sliders-h"></i> 希望販売価格を設定: $<span id="custom-price-display">${averagePrice.toFixed(2)}</span>
                    </label>
                    <input type="range" id="price-slider" 
                           min="${minPrice}" 
                           max="${maxPrice}" 
                           step="0.50" 
                           value="${averagePrice}"
                           style="width: 100%; margin-bottom: 0.5rem;"
                           oninput="IntegratedListingModal.updateCustomPriceStrategy(this.value)">
                    <div id="custom-profit-display" style="font-size: 0.85rem; color: #28a745; text-align: center;">
                        予想利益: $${avgStrategy.profit.toFixed(2)} (${avgStrategy.profitMargin.toFixed(1)}%)
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * 🔴 カスタム価格戦略更新
     */
    updateCustomPriceStrategy(price) {
        const sellPrice = parseFloat(price);
        const product = this.state.productData;
        const yahooPriceJpy = product.current_price || product.price_jpy || 0;
        const costUsd = yahooPriceJpy / 150;
        
        const ebayFee = sellPrice * 0.13;
        const paypalFee = sellPrice * 0.029 + 0.30;
        const shippingCost = 8.00;
        const totalCost = costUsd + ebayFee + paypalFee + shippingCost;
        const profit = sellPrice - totalCost;
        const profitMargin = (profit / sellPrice) * 100;
        
        document.getElementById('custom-price-display').textContent = sellPrice.toFixed(2);
        document.getElementById('custom-profit-display').innerHTML = `
            予想利益: <strong style="color: ${profit > 0 ? '#28a745' : '#dc3545'};">$${profit.toFixed(2)}</strong> 
            (${profitMargin.toFixed(1)}%)
        `;
        
        // 価格フィールドに反映
        const priceField = document.getElementById('ebay-price');
        if (priceField) {
            priceField.value = sellPrice.toFixed(2);
        }
    },
    
    /**
     * 🔴 売れる確率計算
     */
    calculateSellProbability(soldCount, competitorCount) {
        if (soldCount === 0) return 0;
        if (competitorCount === 0) return 95;
        
        // 販売実績 ÷ (販売実績 + 現在の出品数) × 100
        const baseProb = (soldCount / (soldCount + competitorCount)) * 100;
        
        // 調整係数
        let adjustedProb = baseProb;
        if (soldCount > 20) adjustedProb += 10; // 販売実績が多い
        if (competitorCount > 30) adjustedProb -= 15; // 競合が多すぎる
        
        return Math.max(5, Math.min(95, Math.round(adjustedProb)));
    },
    
    /**
     * 🔴 予測販売日数計算
     */
    estimateSellDays(soldCount, competitorCount) {
        if (soldCount === 0) return 90;
        
        // 90日間 ÷ 販売数 = 1個売れるのにかかる日数
        const daysPerSale = 90 / soldCount;
        
        // 競合数による調整
        const competitionFactor = 1 + (competitorCount / 100);
        const estimatedDays = Math.round(daysPerSale * competitionFactor);
        
        return Math.min(90, Math.max(1, estimatedDays));
    },
    
    /**
     * 🔴 Mirror商品選択
     */
    selectMirrorItem(index) {
        const mirrorData = this.state.toolResults.sellermirror;
        if (!mirrorData || !mirrorData.similar_items) return;
        
        const selectedItem = mirrorData.similar_items[index];
        console.log('[SellerMirror] Selected item:', selectedItem);
        
        // 選択された商品を状態に保存
        this.state.selectedMirrorItem = selectedItem;
        
        // 視覚的フィードバック
        document.querySelectorAll('.mirror-item-card').forEach(card => {
            card.style.border = '2px solid #e9ecef';
        });
        
        const selectedCard = document.querySelector(`.mirror-item-card[data-index="${index}"]`);
        if (selectedCard) {
            selectedCard.style.border = '3px solid #667eea';
            selectedCard.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        }
        
        this.showNotification(`✅ Mirror商品を選択しました`, 'success');
    }
});

// CSSスタイル追加
const style = document.createElement('style');
style.textContent = `
    .mirror-item-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0,0,0,0.15) !important;
        border-color: #667eea !important;
    }
    
    .mirror-select-btn:hover {
        background: #5568d3 !important;
        transform: scale(1.05);
    }
    
    #price-slider::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        background: #667eea;
        cursor: pointer;
        border-radius: 50%;
    }
    
    #price-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #667eea;
        cursor: pointer;
        border-radius: 50%;
        border: none;
    }
`;
document.head.appendChild(style);

console.log('✅ SellerMirror Enhanced Display System loaded');
