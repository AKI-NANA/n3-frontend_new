/**
 * HTML編集タブ - JavaScript強化版
 * CSV統合・データベース連携・リアルタイムプレビュー対応
 */

// グローバル変数
let currentTemplate = null;
let savedTemplates = [];
let isPreviewMode = false;

/**
 * HTML編集タブのメイン初期化
 */
function initializeHTMLEditor() {
    console.log('🎨 HTML編集タブ初期化開始');
    
    // 保存済みテンプレート読み込み
    loadSavedTemplates();
    
    // イベントリスナー設定
    setupHTMLEditorEvents();
    
    // クイックテンプレート設定
    setupQuickTemplates();
    
    console.log('✅ HTML編集タブ初期化完了');
}

/**
 * 保存済みテンプレート読み込み
 */
async function loadSavedTemplates() {
    try {
        console.log('📁 保存済みテンプレート読み込み中...');
        
        const response = await fetch('yahoo_auction_content.php?action=get_html_templates');
        const data = await response.json();
        
        if (data.success) {
            savedTemplates = data.data;
            displaySavedTemplates();
            console.log(`✅ ${savedTemplates.length}件のテンプレートを読み込みました`);
        } else {
            console.error('❌ テンプレート読み込みエラー:', data.message);
            showNotification('テンプレート読み込みに失敗しました', 'error');
        }
        
    } catch (error) {
        console.error('❌ テンプレート読み込み例外:', error);
        showNotification('テンプレート読み込みでエラーが発生しました', 'error');
    }
}

/**
 * 保存済みテンプレート表示
 */
function displaySavedTemplates() {
    const container = document.getElementById('savedTemplatesList');
    if (!container) return;
    
    let html = '';
    
    // 保存済みテンプレートカード生成
    savedTemplates.forEach(template => {
        const placeholderCount = template.placeholder_fields ? 
            JSON.parse(template.placeholder_fields).length : 0;
        
        html += `
        <div class="template-card" data-template-id="${template.template_id}">
            <div class="template-card-header">
                <h5>${escapeHtml(template.display_name || template.template_name)}</h5>
                <div class="template-card-actions">
                    <button class="btn-sm btn-info" onclick="previewTemplate(${template.template_id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-sm btn-primary" onclick="loadTemplate(${template.template_id})">
                        読み込み
                    </button>
                    <button class="btn-sm btn-danger" onclick="deleteTemplate(${template.template_id})">
                        削除
                    </button>
                </div>
            </div>
            <div class="template-card-body">
                <div class="template-category">${escapeHtml(template.category)}</div>
                <div class="template-description">${escapeHtml(template.description || 'No description')}</div>
                <div class="template-meta">
                    <span>作成日: ${formatDate(template.created_at)}</span>
                    <span>変数: ${placeholderCount}個</span>
                    <span>利用: ${template.usage_count || 0}回</span>
                </div>
            </div>
        </div>`;
    });
    
    // 新規作成カード
    html += `
    <div class="template-card template-card-new" onclick="clearEditor()">
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="fas fa-plus-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
            <div>新しいテンプレート作成</div>
        </div>
    </div>`;
    
    container.innerHTML = html;
}

/**
 * HTMLテンプレート保存
 */
async function saveHTMLTemplate() {
    const templateName = document.getElementById('templateName')?.value.trim();
    const templateCategory = document.getElementById('templateCategory')?.value || 'general';
    const templateDescription = document.getElementById('templateDescription')?.value.trim();
    const htmlContent = document.getElementById('htmlTemplateEditor')?.value.trim();
    
    // バリデーション
    if (!templateName) {
        showNotification('テンプレート名を入力してください', 'warning');
        document.getElementById('templateName')?.focus();
        return;
    }
    
    if (!htmlContent) {
        showNotification('HTMLコンテンツを入力してください', 'warning');
        document.getElementById('htmlTemplateEditor')?.focus();
        return;
    }
    
    try {
        console.log('💾 HTMLテンプレート保存中...', templateName);
        
        // プレースホルダー抽出
        const placeholders = extractPlaceholdersFromHTML(htmlContent);
        
        const formData = new FormData();
        formData.append('action', 'save_html_template');
        formData.append('template_name', templateName);
        formData.append('category', templateCategory);
        formData.append('display_name', templateName);
        formData.append('description', templateDescription);
        formData.append('html_content', htmlContent);
        formData.append('placeholder_fields', JSON.stringify(placeholders));
        formData.append('created_by', 'user');
        
        const response = await fetch('yahoo_auction_content.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ テンプレート保存成功:', data.data);
            showNotification('テンプレートが保存されました', 'success');
            
            // 保存済みテンプレート再読み込み
            await loadSavedTemplates();
            
            // フォームクリア
            clearEditor();
        } else {
            console.error('❌ テンプレート保存失敗:', data.message);
            showNotification('テンプレート保存に失敗しました: ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ テンプレート保存例外:', error);
        showNotification('テンプレート保存でエラーが発生しました', 'error');
    }
}

/**
 * HTMLからプレースホルダー抽出
 */
function extractPlaceholdersFromHTML(htmlContent) {
    const placeholderPattern = /\{\{([^}]+)\}\}/g;
    const placeholders = [];
    let match;
    
    while ((match = placeholderPattern.exec(htmlContent)) !== null) {
        const placeholder = '{{' + match[1] + '}}';
        if (!placeholders.includes(placeholder)) {
            placeholders.push(placeholder);
        }
    }
    
    return placeholders;
}

/**
 * テンプレート読み込み
 */
async function loadTemplate(templateId) {
    try {
        console.log('📖 テンプレート読み込み中...', templateId);
        
        const template = savedTemplates.find(t => t.template_id == templateId);
        if (!template) {
            showNotification('テンプレートが見つかりません', 'error');
            return;
        }
        
        // フォームにデータ設定
        document.getElementById('templateName').value = template.template_name || '';
        document.getElementById('templateCategory').value = template.category || 'general';
        document.getElementById('templateDescription').value = template.description || '';
        document.getElementById('htmlTemplateEditor').value = template.html_content || '';
        
        currentTemplate = template;
        
        // プレビュー生成
        generatePreview();
        
        console.log('✅ テンプレート読み込み完了');
        showNotification('テンプレートを読み込みました', 'info');
        
    } catch (error) {
        console.error('❌ テンプレート読み込み例外:', error);
        showNotification('テンプレート読み込みでエラーが発生しました', 'error');
    }
}

/**
 * テンプレート削除
 */
async function deleteTemplate(templateId) {
    if (!confirm('このテンプレートを削除しますか？この操作は取り消せません。')) {
        return;
    }
    
    try {
        console.log('🗑️ テンプレート削除中...', templateId);
        
        const formData = new FormData();
        formData.append('action', 'delete_html_template');
        formData.append('template_id', templateId);
        
        const response = await fetch('yahoo_auction_content.php', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ テンプレート削除成功');
            showNotification('テンプレートが削除されました', 'success');
            
            // 保存済みテンプレート再読み込み
            await loadSavedTemplates();
        } else {
            console.error('❌ テンプレート削除失敗:', data.message);
            showNotification('テンプレート削除に失敗しました: ' + data.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ テンプレート削除例外:', error);
        showNotification('テンプレート削除でエラーが発生しました', 'error');
    }
}

/**
 * エディタクリア
 */
function clearEditor() {
    document.getElementById('templateName').value = '';
    document.getElementById('templateCategory').value = 'general';
    document.getElementById('templateDescription').value = '';
    document.getElementById('htmlTemplateEditor').value = '';
    currentTemplate = null;
    
    // プレビューもクリア
    const container = document.getElementById('htmlPreviewContainer');
    if (container) {
        container.innerHTML = `
        <div style="padding: var(--space-lg); text-align: center; color: var(--text-muted);">
            <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: var(--space-sm);"></i>
            <div>HTMLテンプレートを入力して「プレビュー生成」ボタンを押してください</div>
        </div>`;
    }
    
    console.log('🧹 エディタをクリアしました');
}

/**
 * プレビュー生成
 */
function generatePreview() {
    const htmlContent = document.getElementById('htmlTemplateEditor')?.value || '';
    const sampleDataType = document.getElementById('previewSampleData')?.value || 'iphone';
    
    if (!htmlContent.trim()) {
        showNotification('HTMLコンテンツを入力してください', 'warning');
        return;
    }
    
    // サンプルデータ選択
    const sampleData = getSampleDataByType(sampleDataType);
    
    // プレースホルダー置換
    let processedHTML = htmlContent;
    Object.entries(sampleData).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedHTML = processedHTML.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    
    // プレビュー表示
    const container = document.getElementById('htmlPreviewContainer');
    if (container) {
        container.innerHTML = `
        <div style="padding: var(--space-md); border-bottom: 1px solid var(--border-color); background: var(--bg-tertiary);">
            <strong>プレビュー:</strong> ${sampleDataType}サンプルデータ
            <button onclick="togglePreviewMode()" style="float: right; font-size: 0.8rem;">
                <i class="fas fa-expand"></i> 拡大表示
            </button>
        </div>
        <div style="padding: var(--space-md); background: white; overflow: auto;">
            ${processedHTML}
        </div>`;
    }
    
    console.log('👁️ プレビュー生成完了');
}

/**
 * サンプルデータ取得
 */
function getSampleDataByType(type) {
    const sampleDataSets = {
        iphone: {
            'TITLE': 'iPhone 15 Pro 128GB Natural Titanium - Unlocked',
            'BRAND': 'Apple',
            'PRICE': '$899.99',
            'CONDITION': 'New - Never Used',
            'DESCRIPTION': 'Brand new iPhone 15 Pro with 128GB storage. Features the new A17 Pro chip, titanium design, and advanced camera system.',
            'MAIN_IMAGE': '<img src="https://via.placeholder.com/400x300/007bff/ffffff?text=iPhone+15+Pro" style="width: 100%; max-width: 400px; border-radius: 8px;">',
            'ADDITIONAL_IMAGES': '<div style="display: flex; gap: 10px;"><img src="https://via.placeholder.com/100x100/28a745/ffffff?text=View+2" style="width: 80px; height: 80px; border-radius: 4px;"><img src="https://via.placeholder.com/100x100/dc3545/ffffff?text=View+3" style="width: 80px; height: 80px; border-radius: 4px;"></div>',
            'SPECIFICATIONS_TABLE': '<table style="width: 100%; border-collapse: collapse;"><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Storage</td><td style="padding: 8px; border-bottom: 1px solid #eee;">128GB</td></tr><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Color</td><td style="padding: 8px; border-bottom: 1px solid #eee;">Natural Titanium</td></tr><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Network</td><td style="padding: 8px; border-bottom: 1px solid #eee;">Unlocked</td></tr></table>',
            'SHIPPING_INFO': 'Free worldwide shipping from Japan with tracking. Delivery in 7-14 business days.',
            'WARRANTY_INFO': '1-year limited warranty included',
            'SELLER_INFO': 'Mystical Japan Treasures - 99.8% positive feedback'
        },
        camera: {
            'TITLE': 'Canon EOS R5 Mirrorless Camera Body',
            'BRAND': 'Canon',
            'PRICE': '$3,299.00',
            'CONDITION': 'Used - Excellent',
            'DESCRIPTION': 'Professional-grade mirrorless camera with 45MP full-frame sensor. Excellent condition with minimal signs of use.',
            'MAIN_IMAGE': '<img src="https://via.placeholder.com/400x300/6f42c1/ffffff?text=Canon+EOS+R5" style="width: 100%; max-width: 400px; border-radius: 8px;">',
            'ADDITIONAL_IMAGES': '<div style="display: flex; gap: 10px;"><img src="https://via.placeholder.com/100x100/20c997/ffffff?text=Lens+Mount" style="width: 80px; height: 80px; border-radius: 4px;"><img src="https://via.placeholder.com/100x100/fd7e14/ffffff?text=Display" style="width: 80px; height: 80px; border-radius: 4px;"></div>',
            'SPECIFICATIONS_TABLE': '<table style="width: 100%; border-collapse: collapse;"><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Sensor</td><td style="padding: 8px; border-bottom: 1px solid #eee;">45MP Full-Frame CMOS</td></tr><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Video</td><td style="padding: 8px; border-bottom: 1px solid #eee;">8K RAW Recording</td></tr><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Mount</td><td style="padding: 8px; border-bottom: 1px solid #eee;">Canon RF</td></tr></table>',
            'SHIPPING_INFO': 'Professional packaging with full insurance. Express shipping available.',
            'WARRANTY_INFO': 'Remaining manufacturer warranty transferrable',
            'SELLER_INFO': 'Professional camera equipment dealer'
        },
        watch: {
            'TITLE': 'Rolex Submariner Date 116610LN Black Dial',
            'BRAND': 'Rolex',
            'PRICE': '$12,999.00',
            'CONDITION': 'Pre-owned - Very Good',
            'DESCRIPTION': 'Authentic Rolex Submariner with black dial and ceramic bezel. Excellent condition with box and papers.',
            'MAIN_IMAGE': '<img src="https://via.placeholder.com/400x300/343a40/ffffff?text=Rolex+Submariner" style="width: 100%; max-width: 400px; border-radius: 8px;">',
            'ADDITIONAL_IMAGES': '<div style="display: flex; gap: 10px;"><img src="https://via.placeholder.com/100x100/495057/ffffff?text=Caseback" style="width: 80px; height: 80px; border-radius: 4px;"><img src="https://via.placeholder.com/100x100/6c757d/ffffff?text=Papers" style="width: 80px; height: 80px; border-radius: 4px;"></div>',
            'SPECIFICATIONS_TABLE': '<table style="width: 100%; border-collapse: collapse;"><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Reference</td><td style="padding: 8px; border-bottom: 1px solid #eee;">116610LN</td></tr><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Movement</td><td style="padding: 8px; border-bottom: 1px solid #eee;">Automatic Cal. 3135</td></tr><tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">Water Resistance</td><td style="padding: 8px; border-bottom: 1px solid #eee;">300m / 1000ft</td></tr></table>',
            'SHIPPING_INFO': 'Fully insured shipping worldwide. Authentication certificate included.',
            'WARRANTY_INFO': '2-year seller warranty on movement',
            'SELLER_INFO': 'Certified pre-owned luxury watch dealer'
        }
    };
    
    return sampleDataSets[type] || sampleDataSets.iphone;
}

/**
 * 変数挿入
 */
function insertVariable(variable) {
    const editor = document.getElementById('htmlTemplateEditor');
    if (!editor) return;
    
    const cursorPos = editor.selectionStart;
    const textBefore = editor.value.substring(0, cursorPos);
    const textAfter = editor.value.substring(editor.selectionEnd);
    
    editor.value = textBefore + variable + textAfter;
    editor.selectionStart = editor.selectionEnd = cursorPos + variable.length;
    editor.focus();
    
    console.log('📝 変数挿入:', variable);
}

/**
 * クイックテンプレート挿入
 */
function insertQuickTemplate(type) {
    const editor = document.getElementById('htmlTemplateEditor');
    if (!editor) return;
    
    const templates = {
        basic: `<div class="product-listing">
    <h1>{{TITLE}}</h1>
    <div class="price">{{PRICE}}</div>
    <div class="condition">{{CONDITION}}</div>
    
    <div class="images">{{MAIN_IMAGE}}</div>
    
    <div class="description">
        <h3>商品説明</h3>
        <p>{{DESCRIPTION}}</p>
    </div>
    
    <div class="specifications">
        <h3>仕様</h3>
        {{SPECIFICATIONS_TABLE}}
    </div>
    
    <div class="shipping">
        <h3>配送情報</h3>
        <p>{{SHIPPING_INFO}}</p>
    </div>
</div>`,
        
        premium: `<div class="premium-listing">
    <div class="header">
        <h1>{{TITLE}}</h1>
        <div class="brand-badge">{{BRAND}}</div>
    </div>
    
    <div class="gallery">
        <div class="main-image">{{MAIN_IMAGE}}</div>
        <div class="additional-images">{{ADDITIONAL_IMAGES}}</div>
    </div>
    
    <div class="price-section">
        <div class="price">{{PRICE}}</div>
        <div class="condition">{{CONDITION}}</div>
    </div>
    
    <div class="content-grid">
        <div class="description-panel">
            <h3>📋 商品説明</h3>
            <div>{{DESCRIPTION}}</div>
        </div>
        
        <div class="specs-panel">
            <h3>⚙️ 仕様</h3>
            {{SPECIFICATIONS_TABLE}}
        </div>
    </div>
    
    <div class="footer-info">
        <div class="shipping-panel">
            <h3>🚚 配送</h3>
            <p>{{SHIPPING_INFO}}</p>
        </div>
        
        <div class="warranty-panel">
            <h3>🛡️ 保証</h3>
            <p>{{WARRANTY_INFO}}</p>
        </div>
    </div>
</div>

<style>
.premium-listing { max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
.header { text-align: center; margin-bottom: 20px; }
.brand-badge { background: #007bff; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin-top: 10px; }
.gallery { margin-bottom: 20px; }
.price-section { text-align: center; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
.price { font-size: 28px; font-weight: bold; color: #28a745; }
.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
.footer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.description-panel, .specs-panel, .shipping-panel, .warranty-panel { background: #f8f9fa; padding: 15px; border-radius: 8px; }
h3 { color: #495057; margin-bottom: 10px; }
</style>`,
        
        minimal: `<div class="minimal-listing">
    <h1>{{TITLE}}</h1>
    <div class="price">{{PRICE}}</div>
    <div class="condition">{{CONDITION}}</div>
    
    {{MAIN_IMAGE}}
    
    <p>{{DESCRIPTION}}</p>
    
    {{SPECIFICATIONS_TABLE}}
    
    <div class="shipping">{{SHIPPING_INFO}}</div>
</div>

<style>
.minimal-listing { max-width: 600px; margin: 0 auto; padding: 15px; font-family: Arial, sans-serif; }
.price { font-size: 24px; font-weight: bold; color: #007bff; margin: 10px 0; }
.condition { color: #6c757d; margin-bottom: 15px; }
.shipping { background: #f8f9fa; padding: 10px; margin-top: 15px; border-radius: 5px; }
h1 { color: #343a40; margin-bottom: 10px; }
</style>`
    };
    
    if (templates[type]) {
        editor.value = templates[type];
        generatePreview();
        console.log('⚡ クイックテンプレート挿入:', type);
        showNotification(`${type}テンプレートを挿入しました`, 'info');
    }
}

/**
 * CSV統合出力
 */
async function exportToCSV() {
    if (!currentTemplate && !document.getElementById('htmlTemplateEditor').value.trim()) {
        showNotification('HTMLテンプレートを入力してください', 'warning');
        return;
    }
    
    try {
        console.log('📊 CSV統合出力開始...');
        
        // まずテンプレートを保存（未保存の場合）
        if (!currentTemplate) {
            const templateName = document.getElementById('templateName')?.value.trim();
            if (!templateName) {
                showNotification('テンプレートを保存してからCSV出力してください', 'warning');
                return;
            }
            await saveHTMLTemplate();
            // 保存後に現在のテンプレートを検索
            await loadSavedTemplates();
            currentTemplate = savedTemplates.find(t => t.template_name === templateName);
        }
        
        if (!currentTemplate) {
            showNotification('テンプレートの保存を完了してからもう一度お試しください', 'error');
            return;
        }
        
        // CSV統合出力
        const templateId = currentTemplate.template_id;
        const csvType = 'scraped'; // スクレイピングデータ使用
        
        const url = `yahoo_auction_content.php?action=download_html_integrated_csv&template_id=${templateId}&csv_type=${csvType}`;
        
        // ダウンロード実行
        const link = document.createElement('a');
        link.href = url;
        link.download = `ebay_html_integrated_${templateId}_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ CSV統合出力完了');
        showNotification('HTML統合CSVをダウンロードしました', 'success');
        
    } catch (error) {
        console.error('❌ CSV統合出力例外:', error);
        showNotification('CSV統合出力でエラーが発生しました', 'error');
    }
}

/**
 * イベントリスナー設定
 */
function setupHTMLEditorEvents() {
    // リアルタイムプレビュー（デバウンス付き）
    const editor = document.getElementById('htmlTemplateEditor');
    if (editor) {
        let debounceTimer;
        editor.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (isPreviewMode) {
                    generatePreview();
                }
            }, 1000);
        });
    }
    
    // テンプレート名自動生成
    const nameInput = document.getElementById('templateName');
    if (nameInput) {
        nameInput.addEventListener('blur', () => {
            if (nameInput.value) {
                // スペースをアンダースコアに変換、特殊文字を除去
                nameInput.value = nameInput.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            }
        });
    }
}

/**
 * クイックテンプレート設定
 */
function setupQuickTemplates() {
    // 既にHTML内でonclick設定されているため、追加設定不要
    console.log('⚡ クイックテンプレート設定完了');
}

/**
 * 通知表示
 */
function showNotification(message, type = 'info') {
    // 既存のshowNotificationがあればそれを使用、なければ簡易実装
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // 簡易通知実装
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

/**
 * ユーティリティ関数
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP');
}

function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;
    console.log('👁️ プレビューモード:', isPreviewMode ? 'ON' : 'OFF');
}

function previewTemplate(templateId) {
    loadTemplate(templateId).then(() => {
        generatePreview();
    });
}

// HTML編集タブがアクティブになった時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // タブ切り替え時にHTML編集タブがアクティブになったら初期化
    const originalSwitchTab = window.switchTab;
    window.switchTab = function(tab) {
        if (typeof originalSwitchTab === 'function') {
            originalSwitchTab(tab);
        }
        
        if (tab === 'html-editor') {
            setTimeout(() => {
                initializeHTMLEditor();
            }, 100);
        }
    };
});

console.log('🎨 HTML編集タブJavaScript読み込み完了');
