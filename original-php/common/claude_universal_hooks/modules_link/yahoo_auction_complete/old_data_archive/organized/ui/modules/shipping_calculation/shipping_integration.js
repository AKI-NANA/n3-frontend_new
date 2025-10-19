/**
 * 送料計算システム フロントエンド統合
 * Claude作成部分 - データベース・基本計算ロジック連携
 */

class ShippingCalculationIntegration {
    constructor() {
        this.apiBaseUrl = '/modules/yahoo_auction_tool/shipping_calculation';
        this.policies = [];
        this.zones = [];
        this.initialized = false;
    }
    
    /**
     * システム初期化
     */
    async init() {
        try {
            console.log('🚀 送料計算システム初期化中...');
            
            // データベース初期化確認
            await this.checkDatabaseStatus();
            
            // 基本データ読込
            await this.loadPolicies();
            await this.loadZones();
            
            // UI初期化
            this.initializeUI();
            
            this.initialized = true;
            console.log('✅ 送料計算システム初期化完了');
            
        } catch (error) {
            console.error('❌ 初期化エラー:', error);
            this.showError('システムの初期化に失敗しました: ' + error.message);
        }
    }
    
    /**
     * データベース状態確認
     */
    async checkDatabaseStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api.php?action=get_policies`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error('データベースが初期化されていません');
            }
            
            console.log('✅ データベース状態確認完了');
            
        } catch (error) {
            console.warn('⚠️ データベース初期化が必要です');
            await this.initializeDatabase();
        }
    }
    
    /**
     * データベース初期化実行
     */
    async initializeDatabase() {
        try {
            console.log('🔧 データベース初期化実行中...');
            
            const response = await fetch(`${this.apiBaseUrl}/setup_database.php`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            console.log('✅ データベース初期化完了:', result.tables_created);
            
        } catch (error) {
            throw new Error('データベース初期化失敗: ' + error.message);
        }
    }
    
    /**
     * 配送ポリシー読込
     */
    async loadPolicies() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api.php?action=get_policies`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            this.policies = result.data;
            console.log('📋 配送ポリシー読込完了:', this.policies.length + '件');
            
        } catch (error) {
            throw new Error('ポリシー読込エラー: ' + error.message);
        }
    }
    
    /**
     * ゾーン情報読込
     */
    async loadZones() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api.php?action=get_zones`);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            this.zones = result.data;
            console.log('🌍 ゾーン情報読込完了:', this.zones.length + '件');
            
        } catch (error) {
            throw new Error('ゾーン読込エラー: ' + error.message);
        }
    }
    
    /**
     * 送料計算実行
     */
    async calculateShipping(productData) {
        if (!this.initialized) {
            throw new Error('システムが初期化されていません');
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api.php?action=calculate_shipping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return result.data;
            
        } catch (error) {
            throw new Error('送料計算エラー: ' + error.message);
        }
    }
    
    /**
     * テスト計算（フロントエンド用）
     */
    async testCalculation(testData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api.php?action=test_calculation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testData)
            });
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return result;
            
        } catch (error) {
            throw new Error('テスト計算エラー: ' + error.message);
        }
    }
    
    /**
     * UI初期化
     */
    initializeUI() {
        // ポリシー情報表示
        this.updatePolicyDisplay();
        
        // ゾーン情報表示
        this.updateZoneDisplay();
        
        // テスト計算フォーム設定
        this.setupTestForm();
        
        console.log('🎨 UI初期化完了');
    }
    
    /**
     * ポリシー表示更新
     */
    updatePolicyDisplay() {
        const container = document.getElementById('policyDisplayContainer');
        if (!container) return;
        
        const html = this.policies.map(policy => `
            <div class="policy-card" data-type="${policy.policy_type}">
                <h4>${policy.policy_name}</h4>
                <div class="policy-details">
                    <p><strong>基準送料:</strong> $${policy.usa_base_cost}</p>
                    <p><strong>燃油サーチャージ:</strong> ${policy.fuel_surcharge_percent}%</p>
                    <p><strong>最大重量:</strong> ${policy.max_weight_kg}kg</p>
                    <p><strong>料金設定:</strong> ${policy.rate_count}件</p>
                    ${policy.min_cost && policy.max_cost ? 
                        `<p><strong>送料範囲:</strong> $${policy.min_cost} - $${policy.max_cost}</p>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    /**
     * ゾーン表示更新
     */
    updateZoneDisplay() {
        const container = document.getElementById('zoneDisplayContainer');
        if (!container) return;
        
        const html = this.zones.map(zone => `
            <div class="zone-card" data-zone-id="${zone.zone_id}">
                <h4>${zone.zone_name}</h4>
                <div class="zone-details">
                    <p><strong>タイプ:</strong> ${zone.zone_type}</p>
                    <p><strong>優先度:</strong> ${zone.zone_priority}</p>
                    <p><strong>対象国:</strong> ${zone.countries ? zone.countries.slice(0, 5).join(', ') : 'なし'}</p>
                    ${zone.countries && zone.countries.length > 5 ? 
                        `<p><em>他${zone.countries.length - 5}か国</em></p>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    /**
     * テストフォーム設定
     */
    setupTestForm() {
        const testForm = document.getElementById('shippingTestForm');
        if (!testForm) return;
        
        testForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(testForm);
            const testData = {
                weight: parseFloat(formData.get('weight')),
                length: parseFloat(formData.get('length')),
                width: parseFloat(formData.get('width')),
                height: parseFloat(formData.get('height')),
                destination: formData.get('destination') || 'US'
            };
            
            try {
                this.showLoading(true);
                const result = await this.testCalculation(testData);
                this.displayTestResult(result);
                
            } catch (error) {
                this.showError(error.message);
            } finally {
                this.showLoading(false);
            }
        });
    }
    
    /**
     * テスト結果表示
     */
    displayTestResult(result) {
        const container = document.getElementById('testResultContainer');
        if (!container) return;
        
        const data = result.data;
        const testData = result.test_data;
        
        const html = `
            <div class="test-result-success">
                <h4>💰 計算結果</h4>
                <div class="result-grid">
                    <div class="result-item">
                        <label>送料 (USD)</label>
                        <span class="value">$${data.shipping_cost_usd}</span>
                    </div>
                    <div class="result-item">
                        <label>選択ポリシー</label>
                        <span class="value">${data.policy_type}</span>
                    </div>
                    <div class="result-item">
                        <label>課金重量</label>
                        <span class="value">${data.final_weight_kg}kg</span>
                    </div>
                    <div class="result-item">
                        <label>送付先ゾーン</label>
                        <span class="value">${data.zone_info.zone_name}</span>
                    </div>
                </div>
                
                <h4>📊 計算詳細</h4>
                <div class="calculation-details">
                    <p><strong>実重量:</strong> ${data.calculation_details.actual_weight}kg</p>
                    <p><strong>容積重量:</strong> ${data.calculation_details.volume_weight.toFixed(3)}kg</p>
                    <p><strong>サイズ:</strong> ${data.calculation_details.dimensions.join(' × ')}cm</p>
                    <p><strong>送付先:</strong> ${data.calculation_details.destination}</p>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.style.display = 'block';
    }
    
    /**
     * エラー表示
     */
    showError(message) {
        const container = document.getElementById('testResultContainer');
        if (!container) {
            console.error(message);
            return;
        }
        
        container.innerHTML = `
            <div class="test-result-error">
                <h4>❌ エラー</h4>
                <p>${message}</p>
            </div>
        `;
        container.style.display = 'block';
    }
    
    /**
     * ローディング表示
     */
    showLoading(show) {
        const button = document.querySelector('#shippingTestForm button[type="submit"]');
        if (!button) return;
        
        if (show) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 計算中...';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-calculator"></i> 送料計算実行';
        }
    }
}

// グローバル初期化
window.shippingCalculation = new ShippingCalculationIntegration();

// DOM読込後に初期化
document.addEventListener('DOMContentLoaded', () => {
    window.shippingCalculation.init();
});

console.log('📦 送料計算システム統合JavaScript読込完了');
