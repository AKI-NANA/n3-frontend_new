/**
 * 画像選択保存修正パッチ
 * 右側から消える問題を解決
 */

(function() {
    console.log('🔧 Image Selection Save Fix Loading...');
    
    // IntegratedListingModalが読み込まれるまで待機
    const waitForModal = setInterval(() => {
        if (typeof IntegratedListingModal !== 'undefined') {
            clearInterval(waitForModal);
            patchImageSelection();
        }
    }, 100);
    
    function patchImageSelection() {
        console.log('✅ Patching image selection system...');
        
        // 元のsaveTabData関数を拡張
        const originalSaveTabData = IntegratedListingModal.saveTabData;
        
        IntegratedListingModal.saveTabData = async function(tabName) {
            console.log('[Image Fix] Saving tab:', tabName);
            
            // 画像タブの場合、選択状態を明示的に保存
            if (tabName === 'images') {
                const selectedImages = Array.from(this.state.selectedImages);
                console.log('[Image Fix] Selected images:', selectedImages);
                
                // データに追加
                if (!this.saveData) this.saveData = {};
                if (!this.saveData.images) this.saveData.images = {};
                this.saveData.images.selected_images = selectedImages;
                
                console.log('[Image Fix] Save data:', this.saveData.images);
            }
            
            // 元の保存処理を実行
            return await originalSaveTabData.call(this, tabName);
        };
        
        // 画像選択の永続化
        const originalToggleImageSelection = IntegratedListingModal.toggleImageSelection;
        
        IntegratedListingModal.toggleImageSelection = function(index) {
            console.log('[Image Fix] Toggle image:', index);
            
            // 元の処理を実行
            originalToggleImageSelection.call(this, index);
            
            // 選択状態をlocalStorageにも保存（フォールバック）
            try {
                const productId = this.state.productData.db_id || this.state.productData.id;
                const selectedImages = Array.from(this.state.selectedImages);
                const storageKey = `image_selection_${productId}`;
                
                localStorage.setItem(storageKey, JSON.stringify(selectedImages));
                console.log('[Image Fix] Saved to localStorage:', storageKey, selectedImages);
            } catch (e) {
                console.warn('[Image Fix] localStorage not available:', e);
            }
            
            // UI即時更新
            this.updateSelectedImagesDisplay();
        };
        
        // 画像読み込み時に選択状態を復元
        const originalLoadImages = IntegratedListingModal.loadImages;
        
        IntegratedListingModal.loadImages = function() {
            console.log('[Image Fix] Loading images...');
            
            // 元の処理を実行
            originalLoadImages.call(this);
            
            // localStorageから選択状態を復元（フォールバック）
            try {
                const productId = this.state.productData.db_id || this.state.productData.id;
                const storageKey = `image_selection_${productId}`;
                const savedSelection = localStorage.getItem(storageKey);
                
                if (savedSelection) {
                    const selectedImages = JSON.parse(savedSelection);
                    console.log('[Image Fix] Restored from localStorage:', selectedImages);
                    
                    // 状態に復元
                    this.state.selectedImages = new Set(selectedImages);
                    
                    // UI更新
                    setTimeout(() => {
                        this.updateSelectedImagesDisplay();
                        
                        // 左側の画像にもチェックマークを表示
                        selectedImages.forEach(index => {
                            const imageEl = document.querySelector(`[data-image-index="${index}"]`);
                            if (imageEl) {
                                imageEl.classList.add('selected');
                            }
                        });
                    }, 100);
                }
            } catch (e) {
                console.warn('[Image Fix] Could not restore from localStorage:', e);
            }
        };
        
        // 選択画像表示の強化
        IntegratedListingModal.updateSelectedImagesDisplay = function() {
            const container = document.getElementById('ilm-selected-images');
            if (!container) return;
            
            const product = this.state.productData;
            const images = product.images || [];
            const selectedImages = Array.from(this.state.selectedImages);
            
            console.log('[Image Fix] Updating display, selected:', selectedImages);
            
            if (selectedImages.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #6c757d; border: 2px dashed #dee2e6; border-radius: 8px;">
                        <i class="fas fa-images" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                        左側から画像を選択してください
                    </div>
                `;
                return;
            }
            
            container.innerHTML = selectedImages.map((index, position) => {
                const imageUrl = images[index];
                if (!imageUrl) return '';
                
                return `
                    <div class="ilm-image-item selected" data-selected-index="${position}" style="position: relative;">
                        <img src="${imageUrl}" alt="Selected ${position + 1}" 
                             onerror="this.src='https://placehold.co/150x150/dc3545/ffffff?text=Error'">
                        <div class="ilm-image-overlay">
                            <span class="ilm-image-number">${position + 1}</span>
                        </div>
                        <button class="ilm-image-remove" 
                                onclick="IntegratedListingModal.removeSelectedImage(${index})"
                                title="削除">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }).join('');
            
            // カウント更新
            const countEl = document.getElementById('ilm-selected-image-count');
            if (countEl) {
                countEl.textContent = selectedImages.length;
            }
            
            console.log('[Image Fix] Display updated successfully');
        };
        
        // 選択画像削除機能追加
        IntegratedListingModal.removeSelectedImage = function(index) {
            console.log('[Image Fix] Removing image:', index);
            
            this.state.selectedImages.delete(index);
            this.updateSelectedImagesDisplay();
            
            // 左側の選択状態も更新
            const imageEl = document.querySelector(`[data-image-index="${index}"]`);
            if (imageEl) {
                imageEl.classList.remove('selected');
            }
            
            // localStorageも更新
            try {
                const productId = this.state.productData.db_id || this.state.productData.id;
                const storageKey = `image_selection_${productId}`;
                const selectedImages = Array.from(this.state.selectedImages);
                localStorage.setItem(storageKey, JSON.stringify(selectedImages));
            } catch (e) {
                console.warn('[Image Fix] localStorage update failed:', e);
            }
            
            this.showNotification('画像を削除しました', 'success');
        };
        
        console.log('✅ Image selection system patched successfully');
    }
})();

// CSS追加
const style = document.createElement('style');
style.textContent = `
    .ilm-image-remove {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(220, 53, 69, 0.9);
        color: white;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10;
    }
    
    .ilm-image-item:hover .ilm-image-remove {
        opacity: 1;
    }
    
    .ilm-image-remove:hover {
        background: rgba(176, 42, 55, 1);
        transform: scale(1.1);
    }
`;
document.head.appendChild(style);

console.log('✅ Image Selection Save Fix loaded');
