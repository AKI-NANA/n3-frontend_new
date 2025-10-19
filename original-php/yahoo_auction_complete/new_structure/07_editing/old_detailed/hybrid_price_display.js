// ハイブリッド価格表示用JavaScript（円価格優先）
function formatHybridPrice(priceJpy, priceUsd, cacheRate) {
    // 円価格を主要表示、USD価格を補助表示
    if (priceJpy && priceJpy > 0) {
        const jpyFormatted = `¥${parseInt(priceJpy).toLocaleString()}`;
        
        if (priceUsd && priceUsd > 0) {
            const usdFormatted = `$${parseFloat(priceUsd).toFixed(2)}`;
            const rateInfo = cacheRate ? ` (1$=${cacheRate}円)` : '';
            
            return `
                <div class="hybrid-price-display">
                    <div class="price-primary">${jpyFormatted}</div>
                    <div class="price-secondary">${usdFormatted}${rateInfo}</div>
                </div>
            `;
        } else {
            return `<div class="price-primary">${jpyFormatted}</div>`;
        }
    } else if (priceUsd && priceUsd > 0) {
        // 円価格がない場合はUSD価格のみ
        return `<div class="price-secondary">$${parseFloat(priceUsd).toFixed(2)}</div>`;
    } else {
        return `<div class="price-error">価格不明</div>`;
    }
}

// テーブル描画時に円価格を優先表示
function renderProductTableHybrid(products) {
    let html = '';
    
    if (!products || products.length === 0) {
        return `
            <tr>
                <td colspan="10" style="text-align: center; padding: 20px;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; color: var(--info-accent); margin-bottom: 10px;"></i><br>
                    <strong>表示できるデータがありません</strong><br>
                    スクレイピングを実行してデータを取得してください
                </td>
            </tr>
        `;
    }
    
    products.forEach(product => {
        // プラットフォーム表示の修正
        let platformClass = 'source-yahoo';
        let platformText = product.platform || 'Unknown';
        
        if (platformText === 'ヤフオク') {
            platformClass = 'source-yahoo';
        } else if (platformText === 'Yahoo') {
            platformClass = 'source-yahoo';
        }
        
        // 価格表示（円価格優先のハイブリッド表示）
        const priceDisplay = formatHybridPrice(
            product.price,           // 円価格
            product.current_price,   // USD価格（キャッシュまたは計算値）
            product.cache_rate       // 為替レート
        );
        
        html += `
            <tr data-product-id="${product.id}">
                <td><input type="checkbox" class="product-checkbox" value="${product.id}"></td>
                <td>
                    <img src="${product.picture_url}" 
                         class="product-thumbnail" 
                         width="60" height="60" 
                         alt="商品画像" 
                         onerror="this.src='https://placehold.co/60x60/725CAD/FFFFFF/png?text=No+Image'">
                </td>
                <td style="font-size: 0.7rem; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${product.item_id || product.id}
                </td>
                <td style="font-size: 0.75rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis;">
                    ${product.title || 'タイトル不明'}
                </td>
                <td style="text-align: right;">
                    ${priceDisplay}
                </td>
                <td>
                    <span class="category-tag">${product.category_name || 'N/A'}</span>
                </td>
                <td style="font-size: 0.7rem;">
                    ${product.condition_name || 'N/A'}
                </td>
                <td>
                    <span class="source-badge ${platformClass}">${platformText}</span>
                </td>
                <td style="font-size: 0.7rem;">
                    ${formatDateTime(product.updated_at)}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="viewProductDetails('${product.item_id || product.id}')" title="詳細表示">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editProduct('${product.item_id || product.id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    return html;
}

// 価格表示CSS追加
const hybridPriceCSS = `
<style>
.hybrid-price-display {
    text-align: right;
    line-height: 1.2;
}

.price-primary {
    font-weight: bold;
    font-size: 0.85rem;
    color: #2e8b57;  /* 緑色 - 円価格 */
    margin-bottom: 2px;
}

.price-secondary {
    font-size: 0.7rem;
    color: #4682b4;  /* 青色 - USD価格 */
    font-style: italic;
}

.price-error {
    font-size: 0.7rem;
    color: #dc3545;  /* 赤色 - エラー */
    font-style: italic;
}

.source-badge.source-yahoo { 
    background: #0B1D51; 
    color: white;
}

.source-badge.source-ヤフオク { 
    background: #ff6600; 
    color: white;
}
</style>
`;

// CSS をページに追加
if (!document.getElementById('hybrid-price-css')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'hybrid-price-css';
    styleElement.innerHTML = hybridPriceCSS;
    document.head.appendChild(styleElement);
}

// 既存の updateEditingTableDisplay 関数を修正
if (typeof updateEditingTableDisplay === 'function') {
    const originalUpdateEditingTableDisplay = updateEditingTableDisplay;
    
    updateEditingTableDisplay = function(data) {
        const tableBody = document.getElementById('editingTableBody');
        if (!tableBody) return;
        
        if (data && data.length > 0) {
            tableBody.innerHTML = renderProductTableHybrid(data);
            
            // チェックボックスイベントを再設定
            const checkboxes = document.querySelectorAll('.product-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectedCount);
            });
            
            logMessage(`ハイブリッド価格表示でテーブル更新: ${data.length}件`, 'info');
        } else {
            tableBody.innerHTML = renderProductTableHybrid([]);
            logMessage('表示データがありません', 'warning');
        }
    };
}

console.log('✅ ハイブリッド価格表示JavaScript読み込み完了');
