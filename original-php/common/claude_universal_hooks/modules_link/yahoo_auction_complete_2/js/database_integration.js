/**
 * Yahoo Auction Tool - JavaScript Functions (フィルタータブ対応版)
 * 禁止キーワード管理システム・商品承認システム・新規商品登録モーダル統合
 */

// グローバル変数
let selectedProducts = new Set();
let currentProductData = {};
let uploadedImages = [];
let modalCurrentTab = 'basic';

// =============================================================================
// 🎯 メインタブ切り替えシステム
// =============================================================================
function switchTab(targetTab) {
    // すべてのタブボタンとコンテンツを非アクティブ化
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 指定されたタブをアクティブ化
    document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
    document.getElementById(targetTab).classList.add('active');
    
    // タブ別の初期化処理
    switch(targetTab) {
        case 'approval':
            loadApprovalData();
            break;
        case 'filters':
            loadFilterData();
            break;
        case 'analysis':
            loadAnalysisData();
            break;
        case 'inventory-mgmt':
            loadInventoryData();
            break;
    }
    
    console.log('タブ切り替え:', targetTab);
}

// =============================================================================
// 🚫 フィルタータブ（禁止キーワード管理システム）
// =============================================================================

// フィルタータブデータ読み込み
function loadFilterData() {
    console.log('禁止キーワードデータ読み込み開始');
    
    Promise.all([
        fetch('?action=get_prohibited_keywords').then(res => res.json()),
        fetch('?action=get_prohibited_stats').then(res => res.json())
    ])
    .then(([keywordsResponse, statsResponse]) => {
        if (keywordsResponse.success) {
            displayProhibitedKeywords(keywordsResponse.data);
        }
        if (statsResponse.success) {
            updateProhibitedStats(statsResponse.data);
        }
    })
    .catch(error => {
        console.error('禁止キーワード読み込みエラー:', error);
        showNotification('データの読み込みに失敗しました', 'error');
    });
}

// キーワードテーブル表示
function displayProhibitedKeywords(keywords) {
    const tbody = document.getElementById('keywordTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = keywords.map(keyword => `
        <tr>
            <td><input type="checkbox" class="keyword-checkbox" data-id="${keyword.id}" onchange="toggleKeywordSelection()"></td>
            <td>${keyword.id}</td>
            <td class="keyword-text">${escapeHtml(keyword.keyword)}</td>
            <td><span class="category-badge category-${keyword.category}">${getCategoryLabel(keyword.category)}</span></td>
            <td><span class="priority-badge priority-${keyword.priority}">${getPriorityLabel(keyword.priority)}</span></td>
            <td>${keyword.detection_count}</td>
            <td>${formatDate(keyword.created_date)}</td>
            <td>${keyword.last_detected ? formatDate(keyword.last_detected) : 'なし'}</td>
            <td><span class="status-badge status-${keyword.status}">${getStatusLabel(keyword.status)}</span></td>
            <td>
                <button class="btn-sm btn-warning" onclick="editKeyword(${keyword.id})">編集</button>
                <button class="btn-sm btn-danger" onclick="deleteKeyword(${keyword.id})">削除</button>
            </td>
        </tr>
    `).join('');
    
    // 選択状態をリセット
    updateKeywordSelectionUI();
}

// 統計データ更新
function updateProhibitedStats(stats) {
    if (!stats) return;
    
    const elements = {
        'totalKeywords': stats.total_keywords || 0,
        'highRiskKeywords': stats.high_priority || 0,
        'detectedToday': stats.detected_today || 0,
        'lastUpdate': stats.last_added ? formatRelativeTime(stats.last_added) : '未更新'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// リアルタイムタイトルチェック
window.checkTitleRealtime = function() {
    const input = document.getElementById('titleCheckInput');
    const result = document.getElementById('titleCheckResult');
    
    if (!input || !result) return;
    
    const title = input.value.trim();
    
    if (!title) {
        result.innerHTML = `
            <div class="result-placeholder">
                <i class="fas fa-info-circle"></i>
                商品タイトルを入力すると、禁止キーワードをリアルタイムでチェックします
            </div>
        `;
        return;
    }
    
    fetch('?action=check_title', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title })
    })
    .then(response => response.json())
    .then(data => {
        if (data.detected && data.detected.length > 0) {
            result.innerHTML = `
                <div class="result-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>警告: 禁止キーワードが検出されました</strong>
                    <div style="margin-top: 0.5rem;">
                        ${data.detected.map(keyword => 
                            `<span class="detected-keyword">${escapeHtml(keyword.keyword)} (${keyword.priority})</span>`
                        ).join('')}
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.875rem;">
                        この商品は出品できない可能性があります。
                    </div>
                </div>
            `;
        } else {
            result.innerHTML = `
                <div class="result-safe">
                    <i class="fas fa-check-circle"></i>
                    <strong>安全: 禁止キーワードは検出されませんでした</strong>
                    <div style="margin-top: 0.5rem; font-size: 0.875rem;">
                        この商品タイトルは出品可能です。
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('タイトルチェックエラー:', error);
        result.innerHTML = `
            <div class="result-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                チェック中にエラーが発生しました
            </div>
        `;
    });
};

// CSV アップロード処理
window.handleCSVUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showNotification('CSVファイルを選択してください。', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('ファイルサイズが5MBを超えています。', 'error');
        return;
    }
    
    uploadCSVFile(file);
};

window.handleCSVDrop = function(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
        uploadCSVFile(files[0]);
    } else {
        showNotification('CSVファイルをドロップしてください。', 'error');
    }
};

window.handleDragOver = function(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
};

window.handleDragLeave = function(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
};

// CSV ファイルアップロード
function uploadCSVFile(file) {
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvContent = e.target.result;
        
        fetch('?action=import_prohibited_csv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ csv_content: csvContent })
        })
        .then(response => response.json())
        .then(data => {
            if (progressContainer) {
                progressFill.style.width = '100%';
                progressText.textContent = '100%';
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                }, 1000);
            }
            
            if (data.success) {
                showNotification(`${data.imported}件のキーワードをインポートしました`, 'success');
                loadFilterData(); // データを再読み込み
            } else {
                showNotification('インポートに失敗しました: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('CSV アップロードエラー:', error);
            showNotification('アップロード中にエラーが発生しました', 'error');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
        });
    };
    
    reader.readAsText(file);
}

// キーワード選択管理
function toggleKeywordSelection() {
    const checkboxes = document.querySelectorAll('.keyword-checkbox:checked');
    const bulkActions = document.getElementById('bulkKeywordActions');
    const selectedCount = document.getElementById('selectedKeywordCount');
    
    if (selectedCount) {
        selectedCount.textContent = `${checkboxes.length}件選択中`;
    }
    
    if (bulkActions) {
        bulkActions.style.display = checkboxes.length > 0 ? 'flex' : 'none';
    }
}

window.toggleAllKeywords = function() {
    const selectAll = document.getElementById('selectAllKeywords');
    const checkboxes = document.querySelectorAll('.keyword-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    toggleKeywordSelection();
};

// フィルター操作
function applyKeywordFilter(filterType, filterValue) {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.classList.remove('active'));
    
    event.target.classList.add('active');
    
    // フィルターを適用してデータを再読み込み
    const params = new URLSearchParams();
    params.append('action', 'get_prohibited_keywords');
    if (filterValue && filterValue !== 'all') {
        params.append(filterType, filterValue);
    }
    
    fetch('?' + params.toString())
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayProhibitedKeywords(data.data);
            }
        })
        .catch(error => {
            console.error('フィルター適用エラー:', error);
        });
}

// 検索機能
window.searchKeywords = function() {
    const searchInput = document.getElementById('keywordSearch');
    const searchQuery = searchInput.value.trim();
    
    const params = new URLSearchParams();
    params.append('action', 'get_prohibited_keywords');
    if (searchQuery) {
        params.append('search', searchQuery);
    }
    
    fetch('?' + params.toString())
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayProhibitedKeywords(data.data);
            }
        })
        .catch(error => {
            console.error('検索エラー:', error);
        });
};

// 新規キーワード追加
window.addKeywordToList = function() {
    const keyword = document.getElementById('newKeyword').value.trim();
    const category = document.getElementById('newKeywordCategory').value;
    const priority = document.getElementById('newKeywordPriority').value;
    
    if (!keyword || !category || !priority) {
        showNotification('すべての項目を入力してください', 'error');
        return;
    }
    
    fetch('?action=add_prohibited_keyword', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            keyword: keyword,
            category: category,
            priority: priority
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('キーワードを追加しました', 'success');
            // フォームをリセット
            document.getElementById('newKeyword').value = '';
            document.getElementById('newKeywordCategory').value = '';
            document.getElementById('newKeywordPriority').value = '';
            // データを再読み込み
            loadFilterData();
        } else {
            showNotification('キーワードの追加に失敗しました', 'error');
        }
    })
    .catch(error => {
        console.error('キーワード追加エラー:', error);
        showNotification('追加中にエラーが発生しました', 'error');
    });
};

// =============================================================================
// 🔄 商品承認システム
// =============================================================================

// 商品承認データ読み込み
function loadApprovalData() {
    console.log('商品承認データ読み込み開始');
    
    fetch('?action=get_approval_queue')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayApprovalProducts(data.data);
                updateApprovalStats(data.data);
            } else {
                console.error('承認データ取得失敗:', data.message);
            }
        })
        .catch(error => {
            console.error('承認データ読み込みエラー:', error);
        });
}

// 商品表示
function displayApprovalProducts(products) {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) return;
    
    // 既存のサンプルデータを保持しつつ、実データがあれば追加
    const existingCards = productGrid.querySelectorAll('.product-card');
    
    if (products && products.length > 0) {
        const newCards = products.map(product => createProductCard(product)).join('');
        productGrid.innerHTML = productGrid.innerHTML + newCards;
    }
    
    console.log('商品表示完了:', products ? products.length : 0, '件');
}

// 商品カード作成
function createProductCard(product) {
    const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop&crop=center';
    const priceFormatted = formatPrice(product.price_usd);
    
    return `
        <div class="product-card" data-id="${product.item_id}" data-type="${product.risk_level}" data-ai="${product.ai_status}" onclick="toggleProductSelection(this)">
            <div class="product-image-container" style="background-image: url('${imageUrl}');">
                <div class="product-badges">
                    <span class="badge badge-risk-${product.risk_level.replace('-', '')}">${getRiskLabel(product.risk_level)}</span>
                    <span class="badge badge-ai-${product.ai_status.replace('-', '')}">${getAiStatusLabel(product.ai_status)}</span>
                </div>
                <div class="product-overlay">
                    <div class="product-title">${escapeHtml(product.title.substring(0, 30))}...</div>
                    <div class="product-price">${priceFormatted}</div>
                </div>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category.toUpperCase()}</div>
                <div class="product-footer">
                    <span class="product-condition condition-${product.condition.toLowerCase().replace(' ', '')}">${product.condition}</span>
                    <span class="product-sku">${product.item_id}</span>
                </div>
            </div>
        </div>
    `;
}

// 商品選択切り替え
window.toggleProductSelection = function(element) {
    const productId = element.dataset.id;
    
    if (element.classList.contains('selected')) {
        element.classList.remove('selected');
        selectedProducts.delete(productId);
    } else {
        element.classList.add('selected');
        selectedProducts.add(productId);
    }
    
    updateBulkActionsUI();
};

// 一括操作UI更新
function updateBulkActionsUI() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedCount) {
        selectedCount.textContent = selectedProducts.size;
    }
    
    if (bulkActions) {
        if (selectedProducts.size > 0) {
            bulkActions.classList.add('show');
        } else {
            bulkActions.classList.remove('show');
        }
    }
}

// 全選択/全解除
window.selectAllVisible = function() {
    const visibleCards = document.querySelectorAll('.product-card:not([style*="display: none"])');
    visibleCards.forEach(card => {
        if (!card.classList.contains('selected')) {
            card.classList.add('selected');
            selectedProducts.add(card.dataset.id);
        }
    });
    updateBulkActionsUI();
};

window.deselectAll = function() {
    document.querySelectorAll('.product-card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    selectedProducts.clear();
    updateBulkActionsUI();
};

// 一括承認/否認
window.bulkApprove = function() {
    if (selectedProducts.size === 0) {
        showNotification('商品を選択してください', 'warning');
        return;
    }
    
    showNotification(`${selectedProducts.size}件の商品を承認しました`, 'success');
    selectedProducts.clear();
    updateBulkActionsUI();
};

window.bulkReject = function() {
    if (selectedProducts.size === 0) {
        showNotification('商品を選択してください', 'warning');
        return;
    }
    
    showNotification(`${selectedProducts.size}件の商品を否認しました`, 'warning');
    selectedProducts.clear();
    updateBulkActionsUI();
};

// =============================================================================
// 🆕 新規商品登録モーダル
// =============================================================================

// モーダル表示
window.openNewProductModal = function() {
    const modal = document.getElementById('newProductModal');
    if (modal) {
        modal.style.display = 'flex';
        setupModalEventListeners();
    }
};

// モーダル閉じる
window.closeNewProductModal = function() {
    const modal = document.getElementById('newProductModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// モーダルタブ切り替え
window.switchModalTab = function(targetTab) {
    // モーダル内のタブボタン更新
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.modal-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 指定されたタブをアクティブ化
    document.querySelector(`[data-tab="${targetTab}"]`).classList.add('active');
    document.getElementById(`modal-${targetTab}`).classList.add('active');
    
    modalCurrentTab = targetTab;
    
    // プレビュータブの場合、プレビューを更新
    if (targetTab === 'preview') {
        updateProductPreview();
    }
    
    console.log('モーダルタブ切り替え:', targetTab);
};

// モーダルイベントリスナー設定
function setupModalEventListeners() {
    // 商品タイプ選択
    const typeOptions = document.querySelectorAll('.product-type-option');
    typeOptions.forEach(option => {
        option.addEventListener('click', () => {
            typeOptions.forEach(opt => opt.classList.remove('product-type-option--active'));
            option.classList.add('product-type-option--active');
            option.querySelector('input').checked = true;
            
            const selectedType = option.dataset.type;
            console.log('商品タイプ選択:', selectedType);
        });
    });
    
    // 価格計算
    const salePrice = document.getElementById('salePrice');
    const costPrice = document.getElementById('costPrice');
    if (salePrice && costPrice) {
        [salePrice, costPrice].forEach(input => {
            input.addEventListener('input', calculateProfitMargin);
        });
    }
    
    // プレビュー更新
    const formInputs = document.querySelectorAll('.form-input, .form-select, .form-textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', debounce(updateProductPreview, 500));
    });
}

// 利益計算
function calculateProfitMargin() {
    const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
    const costPrice = parseFloat(document.getElementById('costPrice').value) || 0;
    
    if (salePrice > 0 && costPrice > 0) {
        const profit = salePrice - costPrice;
        const margin = ((profit / salePrice) * 100).toFixed(1);
        
        document.getElementById('profitMargin').value = `${margin}%`;
        document.getElementById('expectedProfit').value = `$${profit.toFixed(2)}`;
    }
}

// プレビュー更新
function updateProductPreview() {
    const productName = document.getElementById('productName').value || '商品名が表示されます';
    const salePrice = document.getElementById('salePrice').value || '0.00';
    const description = document.getElementById('productDescription').value || '商品説明が表示されます';
    
    document.getElementById('previewTitle').textContent = productName;
    document.getElementById('previewPrice').textContent = `$${salePrice}`;
    document.getElementById('previewDescription').textContent = description;
    
    // メイン画像があれば表示
    const mainImagePreview = document.getElementById('mainImagePreview');
    const previewImage = document.getElementById('previewImage');
    if (mainImagePreview && mainImagePreview.src && previewImage) {
        previewImage.src = mainImagePreview.src;
    }
}

// 画像アップロード処理
window.handleMainImageUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showNotification('画像ファイルを選択してください', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        displayMainImage(e.target.result);
    };
    reader.readAsDataURL(file);
};

function displayMainImage(imageSrc) {
    const preview = document.getElementById('mainImagePreview');
    const uploadIcon = document.getElementById('mainUploadIcon');
    const uploadText = document.getElementById('mainUploadText');
    const removeBtn = document.getElementById('mainImageRemove');
    
    if (preview && uploadIcon && uploadText && removeBtn) {
        preview.src = imageSrc;
        preview.style.display = 'block';
        uploadIcon.style.display = 'none';
        uploadText.style.display = 'none';
        removeBtn.style.display = 'flex';
        
        uploadedImages[0] = imageSrc;
        updateProductPreview();
    }
}

window.removeMainImage = function() {
    const preview = document.getElementById('mainImagePreview');
    const uploadIcon = document.getElementById('mainUploadIcon');
    const uploadText = document.getElementById('mainUploadText');
    const removeBtn = document.getElementById('mainImageRemove');
    const fileInput = document.getElementById('mainImageInput');
    
    if (preview && uploadIcon && uploadText && removeBtn && fileInput) {
        preview.style.display = 'none';
        uploadIcon.style.display = 'block';
        uploadText.style.display = 'block';
        removeBtn.style.display = 'none';
        fileInput.value = '';
        
        delete uploadedImages[0];
        updateProductPreview();
    }
};

// ドラッグ&ドロップ処理
window.handleImageDrop = function(event, index) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        if (index === 0) {
            // メイン画像
            const reader = new FileReader();
            reader.onload = (e) => displayMainImage(e.target.result);
            reader.readAsDataURL(files[0]);
        }
    }
};

// 商品登録処理
window.registerProduct = function() {
    const formData = collectFormData();
    
    if (!validateFormData(formData)) {
        showNotification('必須項目を入力してください', 'error');
        return;
    }
    
    const registerBtn = document.getElementById('registerButton');
    const originalText = registerBtn.innerHTML;
    
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登録中...';
    registerBtn.disabled = true;
    
    fetch('?action=add_new_product', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('商品が正常に登録されました！', 'success');
            closeNewProductModal();
            resetProductForm();
            loadApprovalData(); // 承認データを再読み込み
        } else {
            showNotification('商品登録に失敗しました: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('商品登録エラー:', error);
        showNotification('登録中にエラーが発生しました', 'error');
    })
    .finally(() => {
        registerBtn.innerHTML = originalText;
        registerBtn.disabled = false;
    });
};

// フォームデータ収集
function collectFormData() {
    return {
        name: document.getElementById('productName').value,
        sku: document.getElementById('productSku').value,
        category: document.getElementById('productCategory').value,
        condition: document.getElementById('productCondition').value,
        brand: document.getElementById('productBrand').value,
        model: document.getElementById('productModel').value,
        salePrice: document.getElementById('salePrice').value,
        costPrice: document.getElementById('costPrice').value,
        stockQuantity: document.getElementById('stockQuantity').value,
        weight: document.getElementById('productWeight').value,
        shipFrom: document.getElementById('shipFrom').value,
        handlingTime: document.getElementById('handlingTime').value,
        description: document.getElementById('productDescription').value,
        productType: document.querySelector('.product-type-option--active input').value,
        images: uploadedImages
    };
}

// フォームバリデーション
function validateFormData(formData) {
    const required = ['name', 'sku', 'category', 'salePrice', 'description'];
    return required.every(field => formData[field] && formData[field].trim());
}

// フォームリセット
function resetProductForm() {
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
        if (input.type === 'number') {
            input.value = '';
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });
    
    // 画像をリセット
    removeMainImage();
    uploadedImages = [];
    
    // 最初のタブに戻る
    switchModalTab('basic');
}

// =============================================================================
// 📊 その他の機能
// =============================================================================

// データベース検索
window.searchDatabase = function() {
    const query = document.getElementById('searchQuery').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query) {
        resultsContainer.innerHTML = `
            <div class="notification info">
                <i class="fas fa-info-circle"></i>
                <span>検索条件を入力してください</span>
            </div>
        `;
        return;
    }
    
    resultsContainer.innerHTML = `
        <div class="notification info">
            <i class="fas fa-spinner fa-spin"></i>
            <span>検索中...</span>
        </div>
    `;
    
    fetch(`?action=search_products&query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                displaySearchResults(data.data, resultsContainer);
            } else {
                resultsContainer.innerHTML = `
                    <div class="notification warning">
                        <i class="fas fa-search"></i>
                        <span>「${escapeHtml(query)}」に一致する商品が見つかりませんでした</span>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('検索エラー:', error);
            resultsContainer.innerHTML = `
                <div class="notification error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>検索中にエラーが発生しました</span>
                </div>
            `;
        });
};

// 検索結果表示
function displaySearchResults(results, container) {
    const table = `
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>商品ID</th>
                        <th>タイトル</th>
                        <th>価格</th>
                        <th>状態</th>
                        <th>カテゴリ</th>
                        <th>ステータス</th>
                        <th>更新日</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(item => `
                        <tr>
                            <td>${escapeHtml(item.item_id)}</td>
                            <td style="max-width: 200px;">${escapeHtml(item.title)}</td>
                            <td>$${parseFloat(item.price_usd || 0).toFixed(2)}</td>
                            <td>${escapeHtml(item.condition)}</td>
                            <td>${escapeHtml(item.category)}</td>
                            <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
                            <td>${formatDate(item.updated_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="notification success">
            <i class="fas fa-check"></i>
            <span>${results.length}件の商品が見つかりました</span>
        </div>
    `;
    
    container.innerHTML = table;
}

// =============================================================================
// 🛠️ ユーティリティ関数
// =============================================================================

// HTML エスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 日付フォーマット
function formatDate(dateString) {
    if (!dateString) return 'なし';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
}

// 相対時間フォーマット
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return '今';
    if (diffMinutes < 60) return `${diffMinutes}分前`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}時間前`;
    return `${Math.floor(diffMinutes / 1440)}日前`;
}

// 価格フォーマット
function formatPrice(price) {
    return `¥${parseInt(price || 0).toLocaleString('ja-JP')}`;
}

// カテゴリラベル
function getCategoryLabel(category) {
    const labels = {
        'brand': 'ブランド',
        'medical': '薬事法',
        'fashion': 'ファッション',
        'general': '一般',
        'prohibited': '禁止品'
    };
    return labels[category] || category;
}

// 優先度ラベル
function getPriorityLabel(priority) {
    const labels = {
        'high': '高',
        'medium': '中',
        'low': '低'
    };
    return labels[priority] || priority;
}

// ステータスラベル
function getStatusLabel(status) {
    const labels = {
        'active': '有効',
        'inactive': '無効'
    };
    return labels[status] || status;
}

// リスクレベルラベル
function getRiskLabel(risk) {
    const labels = {
        'high-risk': '高リスク',
        'medium-risk': '中リスク',
        'low-risk': '低リスク'
    };
    return labels[risk] || risk;
}

// AI状態ラベル
function getAiStatusLabel(status) {
    const labels = {
        'ai-approved': 'AI承認',
        'ai-rejected': 'AI否認',
        'ai-pending': 'AI判定中'
    };
    return labels[status] || status;
}

// デバウンス関数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 通知表示
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// =============================================================================
// 🔄 その他のスタブ関数（今後実装予定）
// =============================================================================

function loadAnalysisData() {
    console.log('分析データ読み込み（実装予定）');
}

function loadInventoryData() {
    console.log('在庫データ読み込み（実装予定）');
}

function refreshApprovalAnalytics() {
    console.log('承認分析データ更新（実装予定）');
}

window.saveDraft = function() {
    showNotification('下書きを保存しました', 'success');
};

window.exportToCSV = function() {
    showNotification('CSV出力機能は開発中です', 'info');
};

// ページ読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Yahoo Auction Tool JavaScript初期化完了');
    
    // デフォルトで承認タブのデータを読み込み
    if (document.getElementById('approval')) {
        loadApprovalData();
    }
});
