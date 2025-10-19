/**
 * 🚨 Emergency Parser 詳細表示機能 JavaScript
 * emergency_fix_test.php の機能を scraping.php に統合
 */

// Emergency Parser の詳細結果表示関数
function displayEmergencyParserResults(product, data) {
    const container = document.getElementById('resultsContainer');
    
    // 精度計算
    const qualityScore = product.data_quality || 0;
    const accuracyClass = qualityScore >= 90 ? 'success' : (qualityScore >= 75 ? 'warning' : 'error');
    const accuracyColor = qualityScore >= 90 ? '#28a745' : (qualityScore >= 75 ? '#ffc107' : '#dc3545');
    
    // 画像表示グリッド
    let imagesHtml = '';
    if (product.images && product.images.length > 0) {
        imagesHtml = `
            <div class="emergency-images-section" style="margin: 20px 0;">
                <h4 style="color: #28a745; margin-bottom: 10px;">
                    🖼️ 抽出された画像: ${product.images.length}枚
                    <button class="btn btn-info btn-sm" onclick="showAllImages('${product.item_id}')" style="margin-left: 10px;">
                        <i class="fas fa-images"></i> 全画像表示
                    </button>
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">
                    ${product.images.slice(0, 8).map((img, index) => `
                        <div style="border: 1px solid #ddd; padding: 3px; border-radius: 4px; text-align: center; cursor: pointer;" onclick="previewImage('${img}', ${index + 1})">
                            <img src="${img}" style="max-width: 100%; height: 80px; object-fit: cover; border-radius: 3px;" alt="商品画像${index + 1}" loading="lazy">
                            <div style="font-size: 10px; color: #666; margin-top: 2px;">画像${index + 1}</div>
                        </div>
                    `).join('')}
                    ${product.images.length > 8 ? `
                        <div style="border: 1px dashed #ccc; padding: 3px; border-radius: 4px; text-align: center; display: flex; align-items: center; justify-content: center; color: #666; cursor: pointer;" onclick="showAllImages('${product.item_id}')">
                            <div style="font-size: 10px;">+${product.images.length - 8}枚を表示</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // メイン表示
    container.innerHTML = `
        <div class="emergency-results" style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div class="notification ${accuracyClass}" style="margin-bottom: 20px;">
                <i class="fas fa-check-circle"></i>
                <span>🎉 Emergency Parser (Class-Resistant v5) 成功！</span>
            </div>
            
            <!-- 精度バー -->
            <div class="accuracy-bar" style="width: 100%; height: 30px; background: #e9ecef; border-radius: 15px; overflow: hidden; margin: 15px 0; position: relative;">
                <div class="accuracy-fill" style="height: 100%; width: ${qualityScore}%; background: ${accuracyColor}; transition: width 0.5s ease; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 14px;">
                    ${qualityScore}%
                </div>
            </div>
            
            <!-- 基本情報 -->
            <div class="product-basic-info" style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">📋 基本情報</h4>
                        <p style="margin: 5px 0;"><strong>タイトル:</strong> ${product.title || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>価格:</strong> ¥${(product.current_price || 0).toLocaleString()}</p>
                        <p style="margin: 5px 0;"><strong>状態:</strong> ${product.condition || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>カテゴリ:</strong> ${product.category || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">🔑 データベース情報</h4>
                        <p style="margin: 5px 0;"><strong>Item ID:</strong> ${product.item_id || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>ソース:</strong> ヤフオク</p>
                        <p style="margin: 5px 0;"><strong>品質スコア:</strong> ${qualityScore}%</p>
                        <p style="margin: 5px 0;"><strong>抽出方法:</strong> ${product.scraping_method || 'Emergency Parser'}</p>
                    </div>
                </div>
                <div style="margin-top: 15px; text-align: center;">
                    <button class="btn btn-primary" onclick="editProductModal('${product.item_id}')">
                        <i class="fas fa-edit"></i> 詳細編集
                    </button>
                    <button class="btn btn-info" onclick="viewDatabaseRecord('${product.item_id}')">
                        <i class="fas fa-database"></i> DBレコード表示
                    </button>
                </div>
            </div>
            
            ${imagesHtml}
            
            <!-- 詳細データ -->
            <details style="margin-top: 20px;">
                <summary style="cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 4px;"><strong>🔍 全データ表示</strong></summary>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; max-height: 300px; overflow-y: auto; margin-top: 10px;">${JSON.stringify(product, null, 2)}</pre>
            </details>
        </div>
    `;
    
    // 現在の商品データをグローバルに保存
    window.currentProductData = product;
}

// 画像プレビュー機能
function previewImage(imageUrl, imageNumber) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
        align-items: center; justify-content: center; cursor: pointer;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; border-radius: 8px;" alt="商品画像${imageNumber}">
            <div style="position: absolute; top: -40px; left: 0; color: white; font-size: 18px; font-weight: bold;">
                商品画像${imageNumber}
            </div>
            <div style="position: absolute; top: -40px; right: 0; color: white; font-size: 24px; cursor: pointer;" onclick="this.closest('div').parentElement.remove()">
                ×
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// 全画像表示モーダル
function showAllImages(itemId) {
    const product = window.currentProductData;
    if (!product || !product.images || product.images.length === 0) {
        alert('画像データが見つかりません');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.9); z-index: 10000; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    const imagesGrid = product.images.map((img, index) => `
        <div style="border: 1px solid #ddd; padding: 8px; border-radius: 6px; text-align: center; background: white; cursor: pointer;" onclick="previewImage('${img}', ${index + 1})">
            <img src="${img}" style="max-width: 100%; height: 150px; object-fit: cover; border-radius: 4px;" alt="商品画像${index + 1}" loading="lazy">
            <div style="font-size: 12px; color: #666; margin-top: 5px; font-weight: bold;">画像${index + 1}</div>
            <div style="font-size: 10px; color: #999; word-break: break-all;">${img.substring(0, 50)}...</div>
        </div>
    `).join('');
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 1200px; margin: 0 auto; position: relative;">
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1f2937;">🖼️ 全画像表示 (${product.images.length}枚) - ${itemId}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                ${imagesGrid}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 商品編集モーダル
function editProductModal(itemId) {
    const product = window.currentProductData;
    if (!product) {
        alert('商品データが見つかりません');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; margin: 0 auto; position: relative;">
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1f2937;">✏️ 商品データ編集 - ${itemId}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            </div>
            
            <form onsubmit="return saveProductEdit(event, '${itemId}')">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">タイトル:</label>
                        <input type="text" name="title" value="${(product.title || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">価格 (¥):</label>
                        <input type="number" name="price" value="${product.current_price || 0}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">状態:</label>
                        <select name="condition" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="新品" ${product.condition === '新品' ? 'selected' : ''}>新品</option>
                            <option value="未使用に近い" ${product.condition === '未使用に近い' ? 'selected' : ''}>未使用に近い</option>
                            <option value="目立った傷や汚れなし" ${product.condition === '目立った傷や汚れなし' ? 'selected' : ''}>目立った傷や汚れなし</option>
                            <option value="やや傷や汚れあり" ${product.condition === 'やや傷や汚れあり' ? 'selected' : ''}>やや傷や汚れあり</option>
                            <option value="傷や汚れあり" ${product.condition === '傷や汚れあり' ? 'selected' : ''}>傷や汚れあり</option>
                            <option value="全体的に状態が悪い" ${product.condition === '全体的に状態が悪い' ? 'selected' : ''}>全体的に状態が悪い</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">カテゴリ:</label>
                        <input type="text" name="category" value="${(product.category || '').replace(/"/g, '&quot;')}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">説明:</label>
                    <textarea name="description" rows="4" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${(product.description || '').replace(/"/g, '&quot;')}</textarea>
                </div>
                
                <div style="text-align: center;">
                    <button type="submit" class="btn btn-primary" style="margin-right: 10px;">
                        <i class="fas fa-save"></i> 保存
                    </button>
                    <button type="button" onclick="this.closest('div').parentElement.parentElement.parentElement.remove()" class="btn btn-secondary">
                        <i class="fas fa-times"></i> キャンセル
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 商品編集保存
function saveProductEdit(event, itemId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const updateData = {
        item_id: itemId,
        title: formData.get('title'),
        price: formData.get('price'),
        condition: formData.get('condition'),
        category: formData.get('category'),
        description: formData.get('description')
    };
    
    // 更新処理のAPI呼び出し（実装予定）
    fetch('scraping.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=update_product&${new URLSearchParams(updateData).toString()}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('商品データを更新しました');
            // モーダルを閉じる
            event.target.closest('div').parentElement.parentElement.remove();
            // 現在のデータを更新
            window.currentProductData = {...window.currentProductData, ...updateData};
        } else {
            alert('更新に失敗しました: ' + data.message);
        }
    })
    .catch(error => {
        alert('エラーが発生しました: ' + error.message);
    });
    
    return false;
}

// データベースレコード表示
function viewDatabaseRecord(itemId) {
    const product = window.currentProductData;
    if (!product) {
        alert('商品データが見つかりません');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    // データベース情報の構築
    const dbInfo = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #495057;">🔑 データベース情報</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-family: monospace; font-size: 12px;">
                <div><strong>Item ID:</strong> ${product.item_id || 'N/A'}</div>
                <div><strong>SKU:</strong> SKU-${product.item_id ? product.item_id.substring(0, 10).toUpperCase() : 'UNKNOWN'}</div>
                <div><strong>ソース:</strong> ヤフーオークション</div>
                <div><strong>品質スコア:</strong> ${product.data_quality || 'N/A'}%</div>
                <div><strong>抽出方法:</strong> ${product.scraping_method || 'Emergency Parser'}</div>
                <div><strong>抽出時刻:</strong> ${product.scraped_at || new Date().toLocaleString()}</div>
                <div><strong>ステータス:</strong> scraped</div>
                <div><strong>在庫:</strong> 1</div>
            </div>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #155724;">📊 商品データ</h4>
            <div style="font-family: monospace; font-size: 12px;">
                <div style="margin: 5px 0;"><strong>タイトル:</strong> ${product.title || 'N/A'}</div>
                <div style="margin: 5px 0;"><strong>価格 JPY:</strong> ¥${(product.current_price || 0).toLocaleString()}</div>
                <div style="margin: 5px 0;"><strong>価格 USD:</strong> $${product.current_price ? (product.current_price / 150).toFixed(2) : '0.00'}</div>
                <div style="margin: 5px 0;"><strong>状態:</strong> ${product.condition || 'N/A'}</div>
                <div style="margin: 5px 0;"><strong>カテゴリ:</strong> ${product.category || 'N/A'}</div>
                <div style="margin: 5px 0;"><strong>画像数:</strong> ${product.images ? product.images.length : 0}枚</div>
            </div>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px;">
            <h4 style="margin: 0 0 10px 0; color: #856404;">🔍 検索用キー</h4>
            <div style="font-family: monospace; font-size: 11px; color: #6c757d;">
                <div>データベース検索: <code>SELECT * FROM yahoo_scraped_products WHERE source_item_id = '${product.item_id}';</code></div>
                <div>商品URL: <code>${product.source_url || 'N/A'}</code></div>
            </div>
        </div>
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 700px; margin: 0 auto; position: relative;">
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1f2937;">💾 データベースレコード - ${itemId}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            </div>
            
            ${dbInfo}
            
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="copyDatabaseQuery('${product.item_id}')" class="btn btn-info" style="margin-right: 10px;">
                    <i class="fas fa-copy"></i> SQLコピー
                </button>
                <button onclick="openDatabaseManager('${product.item_id}')" class="btn btn-primary">
                    <i class="fas fa-database"></i> DB管理画面
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// SQLクエリコピー
function copyDatabaseQuery(itemId) {
    const query = `SELECT * FROM yahoo_scraped_products WHERE source_item_id = '${itemId}';`;
    navigator.clipboard.writeText(query).then(() => {
        alert('SQLクエリをコピーしました');
    });
}

// データベース管理画面へ移動
function openDatabaseManager(itemId) {
    const url = `../05_editing/editing.php?search=${encodeURIComponent(itemId)}`;
    window.open(url, '_blank');
}