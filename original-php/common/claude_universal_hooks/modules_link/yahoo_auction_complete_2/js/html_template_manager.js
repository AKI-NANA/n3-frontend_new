// 🎨 HTMLテンプレート管理システム - 完全版
// 既存JavaScript非破壊・新機能追加のみ

class HTMLTemplateManager {
    constructor() {
        this.templates = new Map();
        this.currentTemplate = null;
        this.previewMode = 'desktop';
        this.variables = [
            '{{TITLE}}', '{{BRAND}}', '{{PRICE}}', '{{CONDITION}}',
            '{{DESCRIPTION}}', '{{IMAGES}}', '{{SPECIFICATIONS}}',
            '{{SHIPPING_INFO}}', '{{RETURN_POLICY}}', '{{SELLER_INFO}}'
        ];
        this.init();
    }

    init() {
        this.loadDefaultTemplates();
        this.setupEventListeners();
        console.log('✅ HTMLテンプレート管理システム初期化完了');
    }

    // デフォルトテンプレート読み込み
    loadDefaultTemplates() {
        const defaultTemplates = {
            premium: {
                name: 'プレミアムテンプレート',
                description: '高級商品向け・画像大・詳細情報',
                html: `
<div class="ebay-product-premium">
    <div class="product-header">
        <h1 class="product-title">{{TITLE}}</h1>
        <div class="brand-badge">{{BRAND}}</div>
    </div>
    
    <div class="product-gallery">
        {{IMAGES}}
    </div>
    
    <div class="product-info">
        <div class="price-section">
            <span class="price">{{PRICE}}</span>
            <span class="condition">{{CONDITION}}</span>
        </div>
        
        <div class="description">
            {{DESCRIPTION}}
        </div>
        
        <div class="specifications">
            <h3>商品仕様</h3>
            {{SPECIFICATIONS}}
        </div>
    </div>
    
    <div class="shipping-returns">
        <div class="shipping">
            <h3>配送情報</h3>
            {{SHIPPING_INFO}}
        </div>
        
        <div class="returns">
            <h3>返品ポリシー</h3>
            {{RETURN_POLICY}}
        </div>
    </div>
    
    <div class="seller-info">
        {{SELLER_INFO}}
    </div>
</div>

<style>
.ebay-product-premium {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

.product-header {
    text-align: center;
    margin-bottom: 30px;
}

.product-title {
    font-size: 28px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
}

.brand-badge {
    display: inline-block;
    background: #0066cc;
    color: white;
    padding: 5px 15px;
    border-radius: 20px;
    font-size: 14px;
}

.product-gallery {
    text-align: center;
    margin-bottom: 30px;
}

.price-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
}

.price {
    font-size: 32px;
    font-weight: bold;
    color: #0066cc;
    margin-right: 20px;
}

.condition {
    font-size: 16px;
    color: #666;
    background: #e9ecef;
    padding: 5px 10px;
    border-radius: 4px;
}

.description, .specifications {
    margin-bottom: 25px;
    line-height: 1.6;
}

.shipping-returns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 25px;
}

.shipping, .returns {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
}

.seller-info {
    background: #e9ecef;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    font-size: 14px;
    color: #666;
}

h3 {
    color: #333;
    margin-bottom: 10px;
    font-size: 18px;
}
</style>`
            },
            
            standard: {
                name: 'スタンダードテンプレート',
                description: '一般商品向け・バランス重視',
                html: `
<div class="ebay-product-standard">
    <h1>{{TITLE}}</h1>
    
    <div class="product-main">
        <div class="images">
            {{IMAGES}}
        </div>
        
        <div class="details">
            <div class="price-condition">
                <span class="price">{{PRICE}}</span>
                <span class="condition">{{CONDITION}}</span>
            </div>
            
            <div class="description">
                {{DESCRIPTION}}
            </div>
            
            <div class="specs">
                {{SPECIFICATIONS}}
            </div>
        </div>
    </div>
    
    <div class="shipping-info">
        {{SHIPPING_INFO}}
    </div>
</div>

<style>
.ebay-product-standard {
    max-width: 600px;
    margin: 0 auto;
    padding: 15px;
    font-family: Arial, sans-serif;
}

.product-main {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
}

.price-condition {
    margin-bottom: 15px;
}

.price {
    font-size: 24px;
    font-weight: bold;
    color: #0066cc;
    margin-right: 15px;
}

.condition {
    background: #f0f0f0;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 14px;
}

.description, .specs {
    margin-bottom: 15px;
    line-height: 1.5;
}

.shipping-info {
    background: #f8f9fa;
    padding: 10px;
    border-radius: 5px;
    font-size: 14px;
}

h1 {
    color: #333;
    margin-bottom: 20px;
    font-size: 22px;
}
</style>`
            },
            
            minimal: {
                name: 'ミニマルテンプレート',
                description: 'シンプル・高速読み込み',
                html: `
<div class="ebay-product-minimal">
    <h1>{{TITLE}}</h1>
    
    <div class="price">{{PRICE}}</div>
    <div class="condition">{{CONDITION}}</div>
    
    <div class="images">
        {{IMAGES}}
    </div>
    
    <div class="description">
        {{DESCRIPTION}}
    </div>
    
    <div class="shipping">
        {{SHIPPING_INFO}}
    </div>
</div>

<style>
.ebay-product-minimal {
    max-width: 500px;
    margin: 0 auto;
    padding: 10px;
    font-family: Arial, sans-serif;
}

.price {
    font-size: 20px;
    font-weight: bold;
    color: #0066cc;
    margin: 10px 0;
}

.condition {
    margin-bottom: 15px;
    color: #666;
}

.images, .description, .shipping {
    margin-bottom: 15px;
}

h1 {
    font-size: 18px;
    margin-bottom: 10px;
}
</style>`
            }
        };
        
        Object.entries(defaultTemplates).forEach(([id, template]) => {
            this.templates.set(id, template);
        });
    }

    // イベントリスナー設定
    setupEventListeners() {
        // テンプレート選択
        document.addEventListener('click', (e) => {
            if (e.target.closest('.template-card')) {
                const templateId = e.target.closest('.template-card').dataset.template;
                this.selectTemplate(templateId);
            }
        });

        // 変数挿入ボタン
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="insertVariable"]')) {
                e.preventDefault();
                const variable = e.target.textContent.match(/{{.*?}}/)?.[0] || 
                                e.target.getAttribute('onclick').match(/'({{.*?}})'/)?.[1];
                if (variable) {
                    this.insertVariable(variable);
                }
            }
        });

        // プレビュー更新
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="updatePreview"]')) {
                e.preventDefault();
                this.updatePreview();
            }
        });

        // HTMLエディタ変更監視
        const htmlEditor = document.getElementById('htmlEditor');
        if (htmlEditor) {
            htmlEditor.addEventListener('input', () => {
                this.debounce(() => this.updatePreview(), 1000);
            });
        }
    }

    // テンプレート選択
    selectTemplate(templateId) {
        console.log('テンプレート選択:', templateId);
        
        // アクティブ状態更新
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('active');
        });
        
        const selectedCard = document.querySelector(`[data-template="${templateId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
        }
        
        // テンプレート読み込み
        const template = this.templates.get(templateId);
        if (template) {
            this.currentTemplate = templateId;
            const htmlEditor = document.getElementById('htmlEditor');
            if (htmlEditor) {
                htmlEditor.value = template.html;
                this.updatePreview();
            }
        }
    }

    // 変数挿入
    insertVariable(variable) {
        const htmlEditor = document.getElementById('htmlEditor');
        if (!htmlEditor) return;
        
        const cursorPos = htmlEditor.selectionStart;
        const textBefore = htmlEditor.value.substring(0, cursorPos);
        const textAfter = htmlEditor.value.substring(htmlEditor.selectionEnd);
        
        htmlEditor.value = textBefore + variable + textAfter;
        htmlEditor.selectionStart = htmlEditor.selectionEnd = cursorPos + variable.length;
        htmlEditor.focus();
        
        this.updatePreview();
        console.log('変数挿入:', variable);
    }

    // プレビュー更新
    updatePreview() {
        const htmlEditor = document.getElementById('htmlEditor');
        const previewFrame = document.getElementById('previewFrame');
        
        if (!htmlEditor || !previewFrame) return;
        
        let htmlContent = htmlEditor.value;
        
        // サンプルデータで変数置換
        const sampleData = {
            '{{TITLE}}': 'iPhone 15 Pro 128GB Natural Titanium - Unlocked',
            '{{BRAND}}': 'Apple',
            '{{PRICE}}': '$899.99',
            '{{CONDITION}}': 'New - Never Used',
            '{{DESCRIPTION}}': 'Brand new iPhone 15 Pro with 128GB storage. Features the new A17 Pro chip, titanium design, and advanced camera system. Comes with original packaging and accessories.',
            '{{IMAGES}}': '<img src="https://via.placeholder.com/400x300?text=iPhone+15+Pro" style="width: 100%; max-width: 400px;">',
            '{{SPECIFICATIONS}}': `
                <ul>
                    <li>Storage: 128GB</li>
                    <li>Color: Natural Titanium</li>
                    <li>Network: Unlocked</li>
                    <li>Screen: 6.1-inch Super Retina XDR</li>
                    <li>Chip: A17 Pro</li>
                </ul>
            `,
            '{{SHIPPING_INFO}}': 'Free shipping worldwide. Expedited shipping available.',
            '{{RETURN_POLICY}}': '30-day money back guarantee. Item must be returned in original condition.',
            '{{SELLER_INFO}}': 'Trusted seller with 99.8% positive feedback. Fast shipping guaranteed.'
        };
        
        // 変数置換
        Object.entries(sampleData).forEach(([variable, value]) => {
            htmlContent = htmlContent.replace(new RegExp(variable, 'g'), value);
        });
        
        // プレビューフレームに表示
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        previewDoc.open();
        previewDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>プレビュー</title>
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif;">
                ${htmlContent}
            </body>
            </html>
        `);
        previewDoc.close();
        
        console.log('プレビュー更新完了');
    }

    // テンプレート保存
    saveTemplate(templateId, name, description, htmlContent) {
        this.templates.set(templateId, {
            name: name,
            description: description,
            html: htmlContent,
            created: new Date().toISOString()
        });
        
        // バックエンドに保存
        this.saveToDatabase(templateId, name, description, htmlContent)
            .then(() => {
                console.log('テンプレート保存完了:', templateId);
                this.showNotification('テンプレートが保存されました', 'success');
            })
            .catch(error => {
                console.error('テンプレート保存エラー:', error);
                this.showNotification('テンプレート保存に失敗しました', 'error');
            });
    }

    // データベース保存
    async saveToDatabase(templateId, name, description, htmlContent) {
        const formData = new FormData();
        formData.append('action', 'save_html_template');
        formData.append('template_id', templateId);
        formData.append('name', name);
        formData.append('description', description);
        formData.append('html_content', htmlContent);
        
        const response = await fetch('database_csv_handler_ebay_complete.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    // HTMLを商品データに適用
    generateProductHTML(templateId, productData) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`テンプレート ${templateId} が見つかりません`);
        }
        
        let html = template.html;
        
        // 商品データで変数置換
        const variableMap = {
            '{{TITLE}}': productData.title || '',
            '{{BRAND}}': productData.brand || '',
            '{{PRICE}}': productData.price || '',
            '{{CONDITION}}': productData.condition || '',
            '{{DESCRIPTION}}': productData.description || '',
            '{{IMAGES}}': this.generateImageHTML(productData.images),
            '{{SPECIFICATIONS}}': this.generateSpecHTML(productData.specifications),
            '{{SHIPPING_INFO}}': productData.shipping_info || '',
            '{{RETURN_POLICY}}': productData.return_policy || '',
            '{{SELLER_INFO}}': productData.seller_info || ''
        };
        
        Object.entries(variableMap).forEach(([variable, value]) => {
            html = html.replace(new RegExp(variable, 'g'), value);
        });
        
        return html;
    }

    // 画像HTML生成
    generateImageHTML(images) {
        if (!images || !Array.isArray(images)) return '';
        
        return images.map(img => `
            <img src="${img}" style="max-width: 100%; height: auto; margin: 5px;" alt="商品画像">
        `).join('');
    }

    // スペックHTML生成
    generateSpecHTML(specifications) {
        if (!specifications) return '';
        
        if (typeof specifications === 'object') {
            return '<ul>' + Object.entries(specifications).map(([key, value]) => 
                `<li><strong>${key}:</strong> ${value}</li>`
            ).join('') + '</ul>';
        }
        
        return specifications;
    }

    // 通知表示
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // デバウンス
    debounce(func, wait) {
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

    // プレビューデバイス変更
    changePreviewDevice(device) {
        this.previewMode = device;
        const previewFrame = document.getElementById('previewFrame');
        
        if (previewFrame) {
            switch (device) {
                case 'mobile':
                    previewFrame.style.width = '375px';
                    previewFrame.style.height = '667px';
                    break;
                case 'tablet':
                    previewFrame.style.width = '768px';
                    previewFrame.style.height = '1024px';
                    break;
                default: // desktop
                    previewFrame.style.width = '100%';
                    previewFrame.style.height = '500px';
            }
        }
        
        console.log('プレビューデバイス変更:', device);
    }

    // テンプレート削除
    deleteTemplate(templateId) {
        if (confirm('このテンプレートを削除しますか？')) {
            this.templates.delete(templateId);
            
            // バックエンドから削除
            this.deleteFromDatabase(templateId)
                .then(() => {
                    console.log('テンプレート削除完了:', templateId);
                    this.showNotification('テンプレートが削除されました', 'success');
                    this.refreshTemplateList();
                })
                .catch(error => {
                    console.error('テンプレート削除エラー:', error);
                    this.showNotification('テンプレート削除に失敗しました', 'error');
                });
        }
    }

    // データベースから削除
    async deleteFromDatabase(templateId) {
        const formData = new FormData();
        formData.append('action', 'delete_html_template');
        formData.append('template_id', templateId);
        
        const response = await fetch('database_csv_handler_ebay_complete.php', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    // テンプレートリスト更新
    refreshTemplateList() {
        // テンプレートカードを再生成
        const container = document.querySelector('.template-cards');
        if (container) {
            container.innerHTML = '';
            
            this.templates.forEach((template, id) => {
                const card = document.createElement('div');
                card.className = 'template-card';
                card.dataset.template = id;
                card.innerHTML = `
                    <div class="template-preview">プレビュー</div>
                    <h4>${template.name}</h4>
                    <p>${template.description}</p>
                `;
                container.appendChild(card);
            });
        }
    }

    // 利用可能なテンプレート取得
    getAvailableTemplates() {
        return Array.from(this.templates.entries()).map(([id, template]) => ({
            id,
            name: template.name,
            description: template.description
        }));
    }

    // システム状態確認
    getSystemStatus() {
        return {
            templatesLoaded: this.templates.size,
            currentTemplate: this.currentTemplate,
            previewMode: this.previewMode,
            isReady: this.templates.size > 0
        };
    }
}

// 🔧 動的マニュアル生成システム
class DynamicManualGenerator {
    constructor() {
        this.fieldDocumentation = new Map();
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.loadFieldDocumentation();
        this.setupSearchFunctionality();
        console.log('✅ 動的マニュアル生成システム初期化完了');
    }

    // CSV項目ドキュメント読み込み
    async loadFieldDocumentation() {
        try {
            const response = await fetch('database_csv_handler_ebay_complete.php?action=get_csv_fields_documentation');
            const data = await response.json();
            
            if (data.success) {
                data.fields.forEach(field => {
                    this.fieldDocumentation.set(field.field_name, field);
                });
                this.generateManualHTML();
            }
        } catch (error) {
            console.error('フィールドドキュメント読み込みエラー:', error);
        }
    }

    // 検索機能設定
    setupSearchFunctionality() {
        const searchInput = document.querySelector('.manual-search input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.generateManualHTML();
            });
        }
    }

    // マニュアルHTML生成
    generateManualHTML() {
        const container = document.getElementById('dynamicManual');
        if (!container) return;
        
        const filteredFields = Array.from(this.fieldDocumentation.values())
            .filter(field => {
                if (!this.searchQuery) return true;
                return field.field_name.toLowerCase().includes(this.searchQuery) ||
                       field.display_name.toLowerCase().includes(this.searchQuery) ||
                       field.description.toLowerCase().includes(this.searchQuery);
            });
        
        const manualHTML = filteredFields.map(field => `
            <div class="field-documentation">
                <h4>
                    ${field.display_name} 
                    ${field.is_required ? '<span class="required">*</span>' : ''}
                </h4>
                <p>${field.description}</p>
                ${field.example_value ? `<div class="field-example">例: ${field.example_value}</div>` : ''}
                ${field.validation_rules ? `<div class="validation">制約: ${field.validation_rules}</div>` : ''}
            </div>
        `).join('');
        
        container.innerHTML = manualHTML || '<p>該当する項目が見つかりませんでした。</p>';
    }

    // フィールドドキュメント更新
    async updateFieldDocumentation(fieldName, data) {
        const formData = new FormData();
        formData.append('action', 'update_field_documentation');
        formData.append('field_name', fieldName);
        formData.append('data', JSON.stringify(data));
        
        try {
            const response = await fetch('database_csv_handler_ebay_complete.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (result.success) {
                this.fieldDocumentation.set(fieldName, { ...this.fieldDocumentation.get(fieldName), ...data });
                this.generateManualHTML();
                console.log('フィールドドキュメント更新完了:', fieldName);
            }
        } catch (error) {
            console.error('フィールドドキュメント更新エラー:', error);
        }
    }
}

// 🚀 システム初期化
document.addEventListener('DOMContentLoaded', function() {
    // HTMLテンプレート管理システム初期化
    window.htmlTemplateManager = new HTMLTemplateManager();
    
    // 動的マニュアル生成システム初期化
    window.dynamicManualGenerator = new DynamicManualGenerator();
    
    console.log('🎉 Yahoo Auction Tool 拡張システム初期化完了');
});

// 🔧 グローバル関数（既存システムとの互換性）
function insertVariable(variable) {
    if (window.htmlTemplateManager) {
        window.htmlTemplateManager.insertVariable(variable);
    }
}

function updatePreview() {
    if (window.htmlTemplateManager) {
        window.htmlTemplateManager.updatePreview();
    }
}

function changePreviewDevice(device) {
    if (window.htmlTemplateManager) {
        window.htmlTemplateManager.changePreviewDevice(device);
    }
}

// CSV管理機能
function uploadCSV() {
    const fileInput = document.getElementById('csvUploadInput');
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('action', 'upload_csv');
        formData.append('csv_file', file);
        
        fetch('database_csv_handler_ebay_complete.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('CSV アップロード成功');
                location.reload(); // データ更新のためリロード
            } else {
                console.error('CSV アップロードエラー:', data.error);
            }
        })
        .catch(error => {
            console.error('CSV アップロード処理エラー:', error);
        });
    }
}

function downloadCSV() {
    window.open('database_csv_handler_ebay_complete.php?action=export_ebay_csv', '_blank');
}