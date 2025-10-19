// Advanced Tariff Calculator - 設定保存機能付きJavaScript

/**
 * 設定管理クラス
 */
class TariffSettingsManager {
    constructor() {
        this.apiBase = 'tariff_settings_api.php';
        this.settings = {};
        this.presets = {};
    }
    
    /**
     * 設定読み込み
     */
    async loadSettings(category = null) {
        try {
            const url = `${this.apiBase}?action=load_settings${category ? '&category=' + category : ''}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                this.settings = {...this.settings, ...result.settings};
                this.applySettingsToForm();
                return result.settings;
            } else {
                console.error('設定読み込みエラー:', result.error);
                return {};
            }
        } catch (error) {
            console.error('設定読み込み通信エラー:', error);
            return {};
        }
    }
    
    /**
     * 設定保存
     */
    async saveSettings(category, settings) {
        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'save_settings',
                    category: category,
                    settings: settings
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('設定保存完了！', 'success');
                return true;
            } else {
                this.showNotification('設定保存エラー: ' + result.error, 'error');
                return false;
            }
        } catch (error) {
            this.showNotification('設定保存通信エラー: ' + error.message, 'error');
            return false;
        }
    }
    
    /**
     * プリセット読み込み
     */
    async loadPresets() {
        try {
            const response = await fetch(`${this.apiBase}?action=load_presets`);
            const result = await response.json();
            
            if (result.success) {
                this.presets = result.presets;
                this.updatePresetSelector();
                return this.presets;
            } else {
                console.error('プリセット読み込みエラー:', result.error);
                return {};
            }
        } catch (error) {
            console.error('プリセット読み込み通信エラー:', error);
            return {};
        }
    }
    
    /**
     * プリセット保存
     */
    async savePreset(name, data, description = '') {
        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    action: 'save_preset',
                    name: name,
                    data: data,
                    description: description
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('プリセット保存完了！', 'success');
                await this.loadPresets(); // プリセット一覧更新
                return true;
            } else {
                this.showNotification('プリセット保存エラー: ' + result.error, 'error');
                return false;
            }
        } catch (error) {
            this.showNotification('プリセット保存通信エラー: ' + error.message, 'error');
            return false;
        }
    }
    
    /**
     * フォームに設定適用
     */
    applySettingsToForm() {
        for (const [key, value] of Object.entries(this.settings)) {
            const element = document.getElementById(`usa-${key}`) || 
                          document.getElementById(`shopee-${key}`) ||
                          document.getElementById(key);
            
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        }
    }
    
    /**
     * フォームから設定取得
     */
    getSettingsFromForm(prefix = '') {
        const settings = {};
        const formElements = document.querySelectorAll(`input[id^="${prefix}"], select[id^="${prefix}"]`);
        
        formElements.forEach(element => {
            const key = element.id.replace(prefix, '');
            let value = element.value;
            
            if (element.type === 'number') {
                value = parseFloat(value) || 0;
            } else if (element.type === 'checkbox') {
                value = element.checked;
            }
            
            settings[key] = value;
        });
        
        return settings;
    }
    
    /**
     * プリセットセレクター更新
     */
    updatePresetSelector() {
        // eBay プリセットセレクター
        const ebayPresetSelect = document.getElementById('ebay-preset-selector');
        if (ebayPresetSelect) {
            ebayPresetSelect.innerHTML = '<option value="">プリセット選択</option>';
            
            for (const [key, preset] of Object.entries(this.presets)) {
                if (key.includes('ebay') || key.includes('iphone')) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = preset.description || key;
                    ebayPresetSelect.appendChild(option);
                }
            }
        }
        
        // Shopee プリセットセレクター
        const shopeePresetSelect = document.getElementById('shopee-preset-selector');
        if (shopeePresetSelect) {
            shopeePresetSelect.innerHTML = '<option value="">プリセット選択</option>';
            
            for (const [key, preset] of Object.entries(this.presets)) {
                if (key.includes('shopee') || key.includes('earphones')) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = preset.description || key;
                    shopeePresetSelect.appendChild(option);
                }
            }
        }
    }
    
    /**
     * 通知表示
     */
    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.settings-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 新しい通知作成
        const notification = document.createElement('div');
        notification.className = `settings-notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 600;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒後に自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// グローバルインスタンス
const settingsManager = new TariffSettingsManager();

/**
 * 拡張された設定保存・読み込み関数
 */

// eBay設定保存（実装版）
async function saveEbayConfig() {
    const settings = settingsManager.getSettingsFromForm('usa-');
    const success = await settingsManager.saveSettings('ebay_usa', settings);
    
    if (success) {
        // 現在の商品データもプリセットとして保存するか確認
        const title = document.getElementById('usa-item-title').value;
        if (title && confirm('現在の商品データもプリセットとして保存しますか？')) {
            const presetData = {
                title: title,
                purchase_price: parseFloat(document.getElementById('usa-purchase-price').value) || 0,
                sell_price: parseFloat(document.getElementById('usa-sell-price').value) || 0,
                category: document.getElementById('usa-category').value,
                shipping: parseFloat(document.getElementById('usa-shipping').value) || 0
            };
            
            const presetName = `ebay_custom_${Date.now()}`;
            await settingsManager.savePreset(presetName, presetData, `カスタム: ${title.substring(0, 30)}...`);
        }
    }
}

// Shopee設定保存（実装版）
async function saveShopeeConfig() {
    const settings = settingsManager.getSettingsFromForm('shopee-');
    settings.selected_country = selectedShopeeCountry;
    
    const success = await settingsManager.saveSettings('shopee', settings);
    
    if (success) {
        // 現在の商品データもプリセットとして保存するか確認
        const title = document.getElementById('shopee-item-title').value;
        if (title && confirm('現在の商品データもプリセットとして保存しますか？')) {
            const presetData = {
                title: title,
                purchase_price: parseFloat(document.getElementById('shopee-purchase-price').value) || 0,
                sell_price: parseFloat(document.getElementById('shopee-sell-price').value) || 0,
                category: document.getElementById('shopee-category').value,
                shipping: parseFloat(document.getElementById('shopee-shipping').value) || 0,
                country: selectedShopeeCountry
            };
            
            const presetName = `shopee_custom_${Date.now()}`;
            await settingsManager.savePreset(presetName, presetData, `カスタム: ${title.substring(0, 30)}...`);
        }
    }
}

// eBayプリセット読み込み（実装版）
async function loadEbayPreset() {
    const selector = document.getElementById('ebay-preset-selector');
    if (selector && selector.value) {
        const preset = settingsManager.presets[selector.value];
        if (preset && preset.data) {
            // プリセットデータを入力フィールドに設定
            const data = preset.data;
            if (data.title) document.getElementById('usa-item-title').value = data.title;
            if (data.purchase_price) document.getElementById('usa-purchase-price').value = data.purchase_price;
            if (data.sell_price) document.getElementById('usa-sell-price').value = data.sell_price;
            if (data.category) document.getElementById('usa-category').value = data.category;
            if (data.shipping) document.getElementById('usa-shipping').value = data.shipping;
            
            settingsManager.showNotification('プリセット読み込み完了', 'success');
        }
    } else {
        // デフォルトプリセット
        await settingsManager.loadSettings('ebay_usa');
        settingsManager.showNotification('デフォルト設定読み込み完了', 'info');
    }
}

// Shopeeプリセット読み込み（実装版）
async function loadShopeePreset() {
    const selector = document.getElementById('shopee-preset-selector');
    if (selector && selector.value) {
        const preset = settingsManager.presets[selector.value];
        if (preset && preset.data) {
            // プリセットデータを入力フィールドに設定
            const data = preset.data;
            if (data.title) document.getElementById('shopee-item-title').value = data.title;
            if (data.purchase_price) document.getElementById('shopee-purchase-price').value = data.purchase_price;
            if (data.sell_price) document.getElementById('shopee-sell-price').value = data.sell_price;
            if (data.category) document.getElementById('shopee-category').value = data.category;
            if (data.shipping) document.getElementById('shopee-shipping').value = data.shipping;
            if (data.country) {
                selectShopeeCountry(data.country);
            }
            
            settingsManager.showNotification('プリセット読み込み完了', 'success');
        }
    } else {
        // デフォルトプリセット
        await settingsManager.loadSettings('shopee');
        settingsManager.showNotification('デフォルト設定読み込み完了', 'info');
    }
}

/**
 * 初期化時の自動設定読み込み
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔧 Advanced Tariff Calculator 設定保存機能付きバージョン初期化');
    
    // 設定とプリセットを読み込み
    await settingsManager.loadSettings();
    await settingsManager.loadPresets();
    
    // プリセットセレクターを既存のボタンエリアに追加
    addPresetSelectors();
    
    console.log('✅ 設定保存機能初期化完了');
});

/**
 * プリセットセレクターをUIに追加
 */
function addPresetSelectors() {
    // eBayセクションにプリセットセレクター追加
    const ebaySection = document.querySelector('#ebay-usa .section-actions');
    if (ebaySection) {
        const ebayPresetDiv = document.createElement('div');
        ebayPresetDiv.innerHTML = `
            <select id="ebay-preset-selector" style="margin-right: 10px; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                <option value="">プリセット選択</option>
            </select>
        `;
        ebaySection.insertBefore(ebayPresetDiv, ebaySection.firstChild);
        
        // セレクター変更時の処理
        document.getElementById('ebay-preset-selector').addEventListener('change', loadEbayPreset);
    }
    
    // Shopeeセクションにプリセットセレクター追加
    const shopeeSection = document.querySelector('#shopee-7countries .section-actions');
    if (shopeeSection) {
        const shopeePresetDiv = document.createElement('div');
        shopeePresetDiv.innerHTML = `
            <select id="shopee-preset-selector" style="margin-right: 10px; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                <option value="">プリセット選択</option>
            </select>
        `;
        shopeeSection.insertBefore(shopeePresetDiv, shopeeSection.firstChild);
        
        // セレクター変更時の処理
        document.getElementById('shopee-preset-selector').addEventListener('change', loadShopeePreset);
    }
}