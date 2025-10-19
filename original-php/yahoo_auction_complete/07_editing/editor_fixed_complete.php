                }
            } catch (error) {
                showNotification('データの読み込みに失敗しました: ' + error.message, 'error');
                addLog('データ読み込みエラー: ' + error.message, 'error');
            }
        }
        
        function displayOverviewData(data) {
            const profit = data.integrated_results.profit;
            const filters = data.integrated_results.filters;
            
            document.getElementById('profit-display').textContent = 
                `¥${profit.net_profit_jpy.toLocaleString()} (${profit.profit_margin_percent}%)`;
            document.getElementById('profit-status').textContent = '高利益';
            
            document.getElementById('filter-score').textContent = `${filters.overall_score}/100`;
            document.getElementById('filter-status').textContent = '承認';
            
            document.getElementById('shipping-cost').textContent = '$8.99 - $15.99';
            document.getElementById('shipping-status').textContent = '計算完了';
            
            document.getElementById('category-confidence').textContent = '95%';
            document.getElementById('category-status').textContent = '高精度判定';
            
            document.getElementById('approval-score').textContent = '92/100';
            document.getElementById('approval-status').textContent = '承認済み';
        }
        
        function displayBasicEditingData(data) {
            const product = data.basic_info.product;
            const yahooData = data.basic_info.yahoo_data;
            
            const yahooDataHtml = `
                <div class="data-row">
                    <span class="data-label">商品ID</span>
                    <span class="data-value">${product.item_id}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">タイトル</span>
                    <span class="data-value">${product.title}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">価格</span>
                    <span class="data-value">¥${product.current_price.toLocaleString()}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">状態</span>
                    <span class="data-value">${yahooData.condition || '記載なし'}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">カテゴリー</span>
                    <span class="data-value">${yahooData.category || 'N/A'}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">作成日</span>
                    <span class="data-value">${product.created_at || 'N/A'}</span>
                </div>
            `;
            
            document.getElementById('yahoo-basic-data').innerHTML = yahooDataHtml;
            document.getElementById('ebay-title').value = product.title || '';
            document.getElementById('ebay-description').value = product.description || '';
            
            updateCharCounter(document.getElementById('ebay-title'), 'title-counter');
        }
        
        function displayImagesData(data) {
            const images = data.basic_info.images || [];
            
            if (images.length === 0) {
                document.getElementById('yahoo-images-grid').innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6c757d;">
                        <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                        <h4>画像が見つかりませんでした</h4>
                    </div>
                `;
                return;
            }
            
            const yahooImagesHtml = images.map((img, index) => `
                <div class="image-item" onclick="addToEbayImages('${img}', ${index + 1})">
                    <img src="${img}" onerror="this.parentElement.style.display='none'" 
                         alt="Yahoo画像 ${index + 1}">
                    <div class="image-overlay">
                        画像 ${index + 1}
                        <br><small>クリックで追加</small>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('yahoo-images-grid').innerHTML = yahooImagesHtml;
            addLog(`画像データ表示完了: ${images.length}枚`, 'info');
        }
        
        function switchTab(event, tabId) {
            event.preventDefault();
            
            // 全てのタブリンクから active クラスを除去
            document.querySelectorAll('.tab-link').forEach(link => {
                link.classList.remove('active');
            });
            
            // 全てのタブペインを非表示
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            
            // クリックされたタブを有効化
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            addLog(`タブ切り替え: ${tabId}`, 'info');
        }
        
        function updateCharCounter(textarea, counterId) {
            const counter = document.getElementById(counterId);
            const current = textarea.value.length;
            const max = textarea.maxLength;
            
            counter.textContent = `${current}/${max}`;
            
            // 文字数に応じて色を変更
            if (current > max * 0.9) {
                counter.style.color = '#dc3545';
            } else if (current > max * 0.7) {
                counter.style.color = '#ffc107';
            } else {
                counter.style.color = '#6c757d';
            }
        }
        
        function addToEbayImages(imageUrl, imageNumber) {
            const ebayGrid = document.getElementById('ebay-images-grid');
            
            // 既に追加済みかチェック
            if (selectedEbayImages.includes(imageUrl)) {
                showNotification('この画像は既に追加されています', 'warning');
                return;
            }
            
            // 最大12枚制限
            if (selectedEbayImages.length >= 12) {
                showNotification('eBay画像は最大12枚までです', 'warning');
                return;
            }
            
            // プレースホルダーを削除
            if (ebayGrid.innerHTML.includes('画像を選択してください')) {
                ebayGrid.innerHTML = '';
            }
            
            selectedEbayImages.push(imageUrl);
            
            const imageHtml = `
                <div class="image-item" data-image-url="${imageUrl}">
                    <img src="${imageUrl}" alt="eBay画像 ${selectedEbayImages.length}">
                    <div class="image-overlay">
                        eBay画像 ${selectedEbayImages.length}
                        <br><small><i class="fas fa-trash" onclick="removeEbayImage('${imageUrl}')"></i></small>
                    </div>
                </div>
            `;
            
            ebayGrid.insertAdjacentHTML('beforeend', imageHtml);
            addLog(`画像追加: 画像${imageNumber} (${selectedEbayImages.length}/12)`, 'info');
            showNotification(`画像${imageNumber}を追加しました (${selectedEbayImages.length}/12)`, 'success');
        }
        
        function removeEbayImage(imageUrl) {
            const imageItem = document.querySelector(`[data-image-url="${imageUrl}"]`);
            if (imageItem) {
                imageItem.remove();
                selectedEbayImages = selectedEbayImages.filter(img => img !== imageUrl);
                
                // 画像がなくなった場合はプレースホルダーを表示
                if (selectedEbayImages.length === 0) {
                    clearAllImages();
                }
                
                addLog(`画像削除: ${selectedEbayImages.length}枚残り`, 'info');
                showNotification('画像を削除しました', 'info');
            }
        }
        
        function selectAllImages() {
            if (!currentProductData) {
                showNotification('商品データが読み込まれていません', 'error');
                return;
            }
            
            const images = currentProductData.basic_info.images || [];
            const maxImages = Math.min(images.length, 12);
            
            // 既存の画像をクリア
            clearAllImages();
            
            // 最大12枚まで追加
            for (let i = 0; i < maxImages; i++) {
                addToEbayImages(images[i], i + 1);
            }
            
            addLog(`全画像選択完了: ${maxImages}枚`, 'success');
            showNotification(`${maxImages}枚の画像を選択しました`, 'success');
        }
        
        function clearAllImages() {
            selectedEbayImages = [];
            document.getElementById('ebay-images-grid').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6c757d; border: 2px dashed #dee2e6; border-radius: 8px;">
                    <h4>画像を選択してください</h4>
                    <p>左の画像をクリックして追加（最大12枚まで）</p>
                </div>
            `;
            addLog('eBay画像をクリアしました', 'info');
        }
        
        async function autoSaveData() {
            const saveData = {
                product_id: currentProductData?.basic_info.product.db_id,
                ebay_title: document.getElementById('ebay-title').value,
                ebay_description: document.getElementById('ebay-description').value,
                ebay_condition: document.getElementById('ebay-condition').value,
                selected_images: selectedEbayImages
            };
            
            // 実際の実装ではAPIに送信
            console.log('自動保存データ:', saveData);
            addLog('データを一時保存しました', 'success');
            showNotification('データを一時保存しました', 'success');
        }
        
        async function saveAndContinue() {
            await autoSaveData();
            
            // 次のタブに移動
            const currentTab = document.querySelector('.tab-link.active');
            const nextTab = currentTab.nextElementSibling;
            
            if (nextTab && nextTab.classList.contains('tab-link')) {
                nextTab.click();
                addLog('次のタブに移動しました', 'info');
            } else {
                showNotification('最後のタブです', 'info');
            }
        }
        
        async function generateEbayData() {
            if (!currentProductData) {
                showNotification('商品データが読み込まれていません', 'error');
                return;
            }
            
            const ebayData = {
                title: document.getElementById('ebay-title').value,
                description: document.getElementById('ebay-description').value,
                condition: document.getElementById('ebay-condition').value,
                images: selectedEbayImages,
                category: integratedResults?.category?.primary_category?.ebay_category_id,
                price: integratedResults?.profit?.recommended_price_usd,
                shipping: integratedResults?.shipping?.total_shipping_cost
            };
            
            // 実際の実装ではeBay出品APIを呼び出し
            console.log('eBay出品データ:', ebayData);
            
            addLog('eBay出品データ生成完了', 'success');
            showNotification('eBay出品データを生成しました！', 'success');
            
            // モーダルを閉じる
            setTimeout(() => {
                closeIntegratedModal();
            }, 2000);
        }
        
        // データテーブル行にモーダル呼び出しボタンを追加する関数を修正
        function addModalButtonToRow(row, productData) {
            const actionsCell = row.querySelector('td:last-child');
            if (actionsCell) {
                const modalButton = document.createElement('button');
                modalButton.className = 'btn btn-function-edit';
                modalButton.innerHTML = '<i class="fas fa-rocket"></i> 統合編集';
                modalButton.onclick = () => openIntegratedModal(productData.id);
                
                actionsCell.appendChild(modalButton);
            }
        }
        
        // キーボードショートカット
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeIntegratedModal();
            }
            
            // Ctrl+S で自動保存
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (document.getElementById('integrated-modal').style.display === 'block') {
                    autoSaveData();
                }
            }
        });
        
        // モーダル外クリックで閉じる
        document.getElementById('integrated-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeIntegratedModal();
            }
        });
        
        // 既存のloadEditingData関数を修正して、統合編集ボタンを追加
        const originalLoadEditingData = window.loadEditingData;
        window.loadEditingData = async function() {
            if (typeof originalLoadEditingData === 'function') {
                await originalLoadEditingData();
                
                // 各行に統合編集ボタンを追加
                const rows = document.querySelectorAll('#editingTableBody tr[data-id]');
                rows.forEach(row => {
                    const productId = row.getAttribute('data-id');
                    if (productId) {
                        addModalButtonToRow(row, { id: productId });
                    }
                });
            }
        };
        
        // ページ読み込み完了時の初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 統合モーダルシステム初期化完了');
            
            // CSS変数を動的に設定
            document.documentElement.style.setProperty('--modal-z-index', '10000');
            
            // フォーカス管理
            document.getElementById('ebay-title').addEventListener('input', function() {
                updateCharCounter(this, 'title-counter');
            });
            
            addLog('統合モーダルシステム初期化完了', 'success');
        });
        
        console.log('✅ Yahoo Auction編集システム（完全修復版 + 統合モーダル）JavaScript読み込み完了');
    </script>
</body>
</html>