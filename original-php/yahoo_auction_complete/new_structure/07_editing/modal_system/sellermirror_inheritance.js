/**
 * SellerMirror データ継承システム
 * Mirror分析結果を出品情報に自動反映
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 SellerMirror結果表示（拡張版 - 詳細表示）
     */
    displaySellerMirrorResults(data) {
        const container = document.getElementById('sellermirror-results-container');
        if (!container) return;
        
        console.log('[SellerMirror Display] Data:', data);
        
        const competitorCount = data.competitor_count || 0;
        const priceDiff = data.price_difference_percent || 0;
        const similarItems = data.similar_items || [];
        const marketAnalysis = data.market_analysis || {};
        
        const competitorColor = competitorCount > 30 ? '#dc3545' : competitorCount > 15 ? '#f59e0b' : '#28a745';
        const priceDiffColor = priceDiff > 0 ? '#28a745' : '#dc3545';
        
        container.innerHTML = `
            <div class="ilm-results-card" style="background: #f8f9ff; border: 2px solid #8b5cf6;">
                <h4 style="color: #5b21b6;">
                    <i class="fas fa-search-dollar"></i> SellerMirror競合分析
                </h4>
                
                <!-- サマリー -->
                <div class="ilm-results-grid">
                    <div class="ilm-result-item">
                        <span class="label">競合商品数:</span>
                        <span class="value" style="color: ${competitorColor}; font-weight: bold;">
                            ${competitorCount}件
                        </span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">価格差:</span>
                        <span class="value" style="color: ${priceDiffColor};">
                            ${priceDiff > 0 ? '+' : ''}${priceDiff}%
                        </span>
                    </div>
                    <div class="ilm-result-item">
                        <span class="label">市場競争度:</span>
                        <span class="value">
                            ${competitorCount > 30 ? '🔴 高' : competitorCount > 15 ? '🟡 中' : '🟢 低'}
                        </span>
                    </div>
                </div>
                
                <!-- 類似商品リスト -->
                ${similarItems.length > 0 ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e0e7ff;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #5b21b6; font-size: 0.9rem;">
                        <i class="fas fa-shopping-cart"></i> 類似商品（Mirror候補）
                    </h5>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${similarItems.slice(0, 5).map((item, index) => `
                            <div class="mirror-item" data-index="${index}" 
                                 style="padding: 0.5rem; margin: 0.25rem 0; background: white; border-radius: 4px; cursor: pointer; transition: all 0.2s;"
                                 onclick="IntegratedListingModal.selectMirrorItem(${index})"
                                 onmouseover="this.style.background='#e0e7ff'" 
                                 onmouseout="this.style.background='white'">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.85rem; font-weight: 500;">
                                            ${item.title?.substring(0, 60) || 'No title'}...
                                        </div>
                                        <div style="font-size: 0.75rem; color: #6c757d; margin-top: 0.25rem;">
                                            価格: <strong>¥${item.price?.toLocaleString() || 'N/A'}</strong> | 
                                            評価: ${item.seller_rating || 'N/A'} | 
                                            販売実績: ${item.sold_count || 0}件
                                        </div>
                                    </div>
                                    <button class="btn-sm" style="background: #8b5cf6; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 4px;">
                                        <i class="fas fa-check"></i> 選択
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- 市場分析 -->
                ${Object.keys(marketAnalysis).length > 0 ? `
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e0e7ff;">
                    <h5 style="margin: 0 0 0.5rem 0; color: #5b21b6; font-size: 0.9rem;">
                        <i class="fas fa-chart-line"></i> 市場分析
                    </h5>
                    <div class="ilm-results-grid">
                        <div class="ilm-result-item">
                            <span class="label">需要レベル:</span>
                            <span class="value">${'⭐'.repeat(marketAnalysis.demand_level || 0)}</span>
                        </div>
                        <div class="ilm-result-item">
                            <span class="label">価格トレンド:</span>
                            <span class="value">${this.getPriceTrendLabel(marketAnalysis.price_trend)}</span>
                        </div>
                        <div class="ilm-result-item">
                            <span class="label">季節性:</span>
                            <span class="value">${marketAnalysis.seasonality || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- 継承ボタン -->
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e0e7ff; text-align: center;">
                    <button class="btn" onclick="IntegratedListingModal.applyMirrorDataToListing()" 
                            style="background: linear-gradient(135deg, #8b5cf6, #5b21b6); color: white; padding: 0.5rem 1rem; border: none; border-radius: 6px; font-weight: 600;">
                        <i class="fas fa-magic"></i> SellerMirrorデータを出品情報に反映
                    </button>
                </div>
            </div>
        `;
        
        console.log('[SellerMirror Display] Results displayed successfully');
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
        document.querySelectorAll('.mirror-item').forEach(item => {
            item.style.border = '1px solid transparent';
        });
        
        const selectedElement = document.querySelector(`.mirror-item[data-index="${index}"]`);
        if (selectedElement) {
            selectedElement.style.border = '2px solid #8b5cf6';
            selectedElement.style.background = '#e0e7ff';
        }
        
        this.showNotification(`Mirror商品を選択: ${selectedItem.title?.substring(0, 50)}...`, 'info');
        
        // 確認ダイアログ
        if (confirm(`この商品のデータを継承しますか？\n\nタイトル: ${selectedItem.title?.substring(0, 60)}...\n価格: ¥${selectedItem.price?.toLocaleString()}`)) {
            this.applyMirrorItemToListing(selectedItem);
        }
    },
    
    /**
     * 🔴 Mirror商品データを出品情報に適用
     */
    applyMirrorItemToListing(mirrorItem) {
        console.log('[SellerMirror] Applying mirror item to listing:', mirrorItem);
        
        // タイトルを参考に設定（そのまま使用せず、参考として表示）
        const titleField = document.getElementById('ebay-title');
        if (titleField && mirrorItem.title) {
            const currentTitle = titleField.value;
            if (!currentTitle || confirm('Mirror商品のタイトルを参考にして更新しますか？')) {
                titleField.value = mirrorItem.title.substring(0, 80);
            }
        }
        
        // 価格を参考に設定
        const priceField = document.getElementById('ebay-price');
        if (priceField && mirrorItem.price) {
            const suggestedPriceUsd = this.convertJpyToUsd(mirrorItem.price);
            if (!priceField.value || confirm(`Mirror商品を参考に価格を $${suggestedPriceUsd} に設定しますか？`)) {
                priceField.value = suggestedPriceUsd;
            }
        }
        
        this.showNotification('✅ Mirror商品データを反映しました', 'success');
    },
    
    /**
     * 🔴 SellerMirrorデータ全体を出品情報に反映
     */
    applyMirrorDataToListing() {
        const mirrorData = this.state.toolResults.sellermirror;
        
        if (!mirrorData) {
            this.showNotification('SellerMirrorデータがありません', 'error');
            return;
        }
        
        console.log('[SellerMirror] Applying mirror data to listing:', mirrorData);
        
        // 選択されたMirror商品がある場合はそれを優先
        if (this.state.selectedMirrorItem) {
            this.applyMirrorItemToListing(this.state.selectedMirrorItem);
            return;
        }
        
        // 類似商品の平均価格を計算
        const similarItems = mirrorData.similar_items || [];
        if (similarItems.length > 0) {
            const avgPrice = similarItems.reduce((sum, item) => sum + (item.price || 0), 0) / similarItems.length;
            const suggestedPriceUsd = this.convertJpyToUsd(avgPrice);
            
            const priceField = document.getElementById('ebay-price');
            if (priceField) {
                if (confirm(`競合商品の平均価格 $${suggestedPriceUsd} を参考にしますか？`)) {
                    priceField.value = suggestedPriceUsd;
                }
            }
        }
        
        // 市場分析に基づく推奨事項を表示
        const marketAnalysis = mirrorData.market_analysis || {};
        if (marketAnalysis.price_trend === 'rising') {
            this.showNotification('💡 価格上昇トレンド: 少し高めの価格設定を推奨', 'info');
        } else if (marketAnalysis.price_trend === 'falling') {
            this.showNotification('⚠️ 価格下降トレンド: 競争力のある価格設定を推奨', 'warning');
        }
        
        this.showNotification('✅ SellerMirrorデータを参考に出品情報を更新しました', 'success');
    },
    
    /**
     * 価格トレンドラベル
     */
    getPriceTrendLabel(trend) {
        const labels = {
            'rising': '📈 上昇',
            'falling': '📉 下降',
            'stable': '➡️ 安定'
        };
        return labels[trend] || 'N/A';
    }
});

console.log('✅ SellerMirror Data Inheritance System loaded');
