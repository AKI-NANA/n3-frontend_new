// 強化された画像データ抽出関数（デバッグ付き）
function extractImagesFromData(product) {
    let images = [];
    let debugLog = [];
    
    console.log('🔍 画像抽出開始:', product.title || product.active_title);
    
    // 1. active_image_url から取得
    if (product.active_image_url && !product.active_image_url.includes("placehold")) {
        images.push(product.active_image_url);
        debugLog.push(`✅ active_image_url: ${product.active_image_url.substring(0, 50)}...`);
    } else {
        debugLog.push(`❌ active_image_url: ${product.active_image_url || 'なし'}`);
    }
    
    // 2. picture_url から取得
    if (product.picture_url && !product.picture_url.includes("placehold")) {
        images.push(product.picture_url);
        debugLog.push(`✅ picture_url: ${product.picture_url.substring(0, 50)}...`);
    } else {
        debugLog.push(`❌ picture_url: ${product.picture_url || 'なし'}`);
    }
    
    // 3. scraped_yahoo_data から画像を抽出
    if (product.scraped_yahoo_data) {
        try {
            const scrapedData = typeof product.scraped_yahoo_data === "string" 
                ? JSON.parse(product.scraped_yahoo_data) 
                : product.scraped_yahoo_data;
            
            debugLog.push(`📊 scraped_yahoo_data 解析開始`);
            console.log('Scraped data structure:', scrapedData);
            
            // all_images 配列から取得
            if (scrapedData.all_images && Array.isArray(scrapedData.all_images)) {
                images = images.concat(scrapedData.all_images);
                debugLog.push(`✅ all_images: ${scrapedData.all_images.length}件追加`);
            } else {
                debugLog.push(`❌ all_images: なし`);
            }
            
            // images 配列から取得  
            if (scrapedData.images && Array.isArray(scrapedData.images)) {
                images = images.concat(scrapedData.images);
                debugLog.push(`✅ images: ${scrapedData.images.length}件追加`);
            } else {
                debugLog.push(`❌ images: なし`);
            }
            
            // extraction_results.images から取得
            if (scrapedData.extraction_results && scrapedData.extraction_results.images) {
                if (Array.isArray(scrapedData.extraction_results.images)) {
                    images = images.concat(scrapedData.extraction_results.images);
                    debugLog.push(`✅ extraction_results.images: ${scrapedData.extraction_results.images.length}件追加`);
                }
            } else {
                debugLog.push(`❌ extraction_results.images: なし`);
            }
            
            // validation_info内の画像データ
            if (scrapedData.validation_info && scrapedData.validation_info.image && scrapedData.validation_info.image.all_images) {
                if (Array.isArray(scrapedData.validation_info.image.all_images)) {
                    images = images.concat(scrapedData.validation_info.image.all_images);
                    debugLog.push(`✅ validation_info.image.all_images: ${scrapedData.validation_info.image.all_images.length}件追加`);
                }
            } else {
                debugLog.push(`❌ validation_info.image.all_images: なし`);
            }
            
            // データ構造を詳細ログ出力
            console.log('Available keys in scraped_yahoo_data:', Object.keys(scrapedData));
            
        } catch (e) {
            debugLog.push(`❌ scraped_yahoo_data 解析エラー: ${e.message}`);
            console.error("画像データ解析エラー:", e);
        }
    } else {
        debugLog.push(`❌ scraped_yahoo_data: なし`);
    }
    
    // 重複除去とフィルタリング
    const originalCount = images.length;
    images = [...new Set(images)].filter(img => 
        img && 
        typeof img === 'string' && 
        img.length > 10 && 
        !img.includes('placehold') &&
        (img.startsWith('http') || img.startsWith('//'))
    );
    
    debugLog.push(`🔄 フィルタリング: ${originalCount}件 → ${images.length}件`);
    
    // デバッグログをコンソールに出力
    console.log('🖼️ 画像抽出結果:', {
        product_id: product.item_id || product.id,
        title: product.title || product.active_title,
        total_images: images.length,
        images: images,
        debug_log: debugLog
    });
    
    return images.length > 0 ? images : ["https://placehold.co/300x200/725CAD/FFFFFF/png?text=No+Image"];
}

// テーブルデータから商品詳細モーダル作成（デバッグ強化版）
function createProductDetailsModalFromTable(product) {
    addLog(`テーブルデータでモーダル作成: ${product.title}`, 'info');
    
    const qualityScore = 85; // デフォルト品質スコア
    const accuracyColor = '#28a745'; // 緑色
    
    // 画像データ抽出（デバッグ付き）
    const images = extractImagesFromData(product);
    const primaryImage = images[0];
    
    // 価格表示（円価格優先）
    const priceJpy = product.price || product.price_jpy || 0;
    const priceUsd = product.current_price || product.cached_price_usd || 0;
    const exchangeRate = product.cache_rate || 150;
    
    // プラットフォーム判定
    let platform = 'Unknown';
    if (product.platform === 'ヤフオク' || product.platform === 'Yahoo') {
        platform = 'ヤフオク';
    } else if (product.source_url && product.source_url.includes('auctions.yahoo.co.jp')) {
        platform = 'ヤフオク';
    } else if (product.source_url && product.source_url.includes('yahoo.co.jp')) {
        platform = 'ヤフオク';
    } else if (product.platform) {
        platform = product.platform;
    }
    
    // 画像ギャラリー生成（15枚対応・デバッグ情報付き）
    const imageGalleryHtml = `
        <div style="margin-top: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937;">🖼️ 商品画像 (${images.length}枚)</h4>
            <div style="background: #f0f8ff; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 0.9em;">
                <strong>デバッグ情報:</strong><br>
                active_image_url: ${product.active_image_url ? '✅' : '❌'}<br>
                picture_url: ${product.picture_url ? '✅' : '❌'}<br>
                scraped_yahoo_data: ${product.scraped_yahoo_data ? '✅' : '❌'}<br>
                抽出された画像数: ${images.length}枚
            </div>
            
            ${images.length > 1 ? `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: white;">
                    ${images.map((img, index) => {
                        if (img.includes('placehold')) return '';
                        return `
                            <div style="border: 1px solid #ddd; padding: 3px; border-radius: 4px; text-align: center; cursor: pointer; background: white; transition: transform 0.2s;" onclick="openImagePreview('${img}')" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                                <img src="${img}" style="max-width: 100%; height: 100px; object-fit: cover; border-radius: 3px;" alt="商品画像${index + 1}" loading="lazy" onerror="this.parentElement.style.display='none'">
                                <div style="font-size: 10px; color: #666; margin-top: 2px;">画像${index + 1}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div style="text-align: center;">
                    <img src="${primaryImage}" alt="商品画像" style="max-width: 400px; max-height: 300px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; cursor: pointer;" onclick="openImagePreview('${primaryImage}')">
                </div>
            `}
            
            <button onclick="showImageDebugInfo('${product.item_id || product.id}')" style="margin-top: 10px; background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">
                🔍 画像デバッグ情報表示
            </button>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.8); z-index: 10000; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 900px; margin: 0 auto; position: relative;">
            <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1f2937;">📋 商品詳細情報 - ${product.item_id || product.id}</h3>
                <button onclick="this.closest('div').parentElement.parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            </div>
            
            <!-- テーブルデータ表示メッセージ -->
            <div class="notification success" style="margin-bottom: 20px; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px; background: #d4edda; border: 1px solid #c3e6cb; color: #155724;">
                <i class="fas fa-table"></i>
                <span>📊 テーブルデータから詳細表示（画像${images.length}枚処理完了）</span>
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
                        <p style="margin: 5px 0;"><strong>タイトル:</strong> ${product.title || product.active_title || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>価格:</strong> <span style="color: #2e8b57; font-weight: bold; font-size: 1.1em;">¥${parseInt(priceJpy).toLocaleString()}</span></p>
                        <p style="margin: 5px 0;"><strong>USD価格:</strong> <span style="color: #4682b4;">$${parseFloat(priceUsd).toFixed(2)} (1$ = ${exchangeRate}円)</span></p>
                        <p style="margin: 5px 0;"><strong>状態:</strong> ${product.condition_name || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>カテゴリ:</strong> ${product.category_name || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>プラットフォーム:</strong> <span style="background: #ff6600; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${platform}</span></p>
                    </div>
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">🔑 データベース情報</h4>
                        <p style="margin: 5px 0;"><strong>Item ID:</strong> ${product.item_id || product.id || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>SKU:</strong> ${product.master_sku || 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>ステータス:</strong> ${product.listing_status || 'not_listed'}</p>
                        <p style="margin: 5px 0;"><strong>在庫:</strong> ${product.current_stock || '1'}</p>
                        <p style="margin: 5px 0;"><strong>更新日:</strong> ${formatDateTime(product.updated_at)}</p>
                        <p style="margin: 5px 0;"><strong>画像数:</strong> <span style="color: #007bff; font-weight: bold;">${images.length}枚</span></p>
                    </div>
                </div>
                
                ${imageGalleryHtml}
                
                <div style="margin-top: 15px; text-align: center;">
                    <button class="btn btn-primary" onclick="editProductModalEditing('${product.item_id || product.id}')">
                        <i class="fas fa-edit"></i> 詳細編集
                    </button>
                    ${product.source_url ? `
                    <button class="btn btn-info" onclick="window.open('${product.source_url}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> 元ページ
                    </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="deleteProduct('${product.id || product.item_id}', '${(product.title || product.active_title || '').replace(/'/g, "\\'")}');">  
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
            
            <!-- 詳細データ -->
            <details style="margin-top: 20px;">
                <summary style="cursor: pointer; padding: 10px; background: #f8f9fa; border-radius: 4px;"><strong>🔍 全データ表示</strong></summary>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 11px; max-height: 300px; overflow-y: auto; margin-top: 10px;">${JSON.stringify(product, null, 2)}</pre>
            </details>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 現在の商品データをグローバルに保存（編集用）
    window.currentProductData = {
        item_id: product.item_id || product.id,
        title: product.title || product.active_title || '',
        current_price: priceJpy, // 円価格を使用
        condition: product.condition_name || '',
        category: product.category_name || '',
        description: '',
        data_quality: qualityScore,
        scraping_method: 'Table Data',
        images: images,
        raw_product_data: product
    };
    
    addLog(`テーブルデータモーダル表示完了: ${product.title || product.active_title} (画像${images.length}枚)`, 'success');
}

// 画像デバッグ情報表示関数
function showImageDebugInfo(productId) {
    const product = allData.find(item => (item.item_id || item.id) === productId);
    
    if (!product) {
        alert('商品データが見つかりません');
        return;
    }
    
    const debugModal = document.createElement('div');
    debugModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.9); z-index: 10001; overflow-y: auto;
        padding: 20px; box-sizing: border-box;
    `;
    
    let debugInfo = `
        <h3>🔍 画像デバッグ情報 - ${productId}</h3>
        <h4>📊 データ項目チェック:</h4>
        <ul>
            <li>active_image_url: ${product.active_image_url ? '✅ ' + product.active_image_url : '❌ なし'}</li>
            <li>picture_url: ${product.picture_url ? '✅ ' + product.picture_url : '❌ なし'}</li>
            <li>scraped_yahoo_data: ${product.scraped_yahoo_data ? '✅ あり' : '❌ なし'}</li>
        </ul>
    `;
    
    if (product.scraped_yahoo_data) {
        try {
            const scrapedData = typeof product.scraped_yahoo_data === "string" 
                ? JSON.parse(product.scraped_yahoo_data) 
                : product.scraped_yahoo_data;
            
            debugInfo += '<h4>📋 scraped_yahoo_data 構造:</h4>';
            debugInfo += '<ul>';
            debugInfo += `<li>all_images: ${scrapedData.all_images ? (Array.isArray(scrapedData.all_images) ? scrapedData.all_images.length + '件' : 'not array') : 'なし'}</li>`;
            debugInfo += `<li>images: ${scrapedData.images ? (Array.isArray(scrapedData.images) ? scrapedData.images.length + '件' : 'not array') : 'なし'}</li>`;
            debugInfo += `<li>extraction_results.images: ${scrapedData.extraction_results?.images ? (Array.isArray(scrapedData.extraction_results.images) ? scrapedData.extraction_results.images.length + '件' : 'not array') : 'なし'}</li>`;
            debugInfo += '</ul>';
            
            debugInfo += '<h4>🗂️ 利用可能なキー:</h4>';
            debugInfo += '<p>' + Object.keys(scrapedData).join(', ') + '</p>';
            
        } catch (e) {
            debugInfo += '<p style="color: red;">JSON解析エラー: ' + e.message + '</p>';
        }
    }
    
    // 画像抽出テスト実行
    const testImages = extractImagesFromData(product);
    debugInfo += `<h4>🖼️ 抽出テスト結果: ${testImages.length}枚</h4>`;
    
    debugModal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 800px; margin: 0 auto; position: relative;">
            <button onclick="this.closest('div').parentElement.remove()" style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
            ${debugInfo}
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="this.closest('div').parentElement.remove()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">閉じる</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(debugModal);
}
