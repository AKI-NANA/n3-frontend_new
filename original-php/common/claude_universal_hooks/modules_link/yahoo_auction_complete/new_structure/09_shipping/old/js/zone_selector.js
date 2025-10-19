/**
 * ゾーン選択UI強化 - CPass基準
 * 目視確認しやすい配送先選択システム
 */

class ZoneSelector {
    constructor() {
        this.zones = [];
        this.countries = [];
        this.currentZone = null;
        this.initializeZoneData();
    }

    /**
     * ゾーンデータ初期化
     */
    async initializeZoneData() {
        try {
            const response = await fetch('../api/zone_data_api.php?action=get_zones');
            const data = await response.json();
            
            if (data.success) {
                this.zones = data.zones;
                this.countries = data.countries;
                this.renderZoneSelector();
            }
        } catch (error) {
            console.error('ゾーンデータ取得エラー:', error);
            this.loadSampleZoneData();
        }
    }

    /**
     * サンプルゾーンデータ（フォールバック）
     */
    loadSampleZoneData() {
        this.zones = [
            {
                zone_code: 'zone1',
                zone_name: 'ゾーン1 - 北米',
                zone_color: '#10b981',
                countries_ja: 'アメリカ合衆国, カナダ',
                country_count: 2
            },
            {
                zone_code: 'zone2', 
                zone_name: 'ゾーン2 - ヨーロッパ',
                zone_color: '#3b82f6',
                countries_ja: 'イギリス, ドイツ, フランス, イタリア, スペイン, オランダ',
                country_count: 6
            },
            {
                zone_code: 'zone3',
                zone_name: 'ゾーン3 - オセアニア', 
                zone_color: '#f59e0b',
                countries_ja: 'オーストラリア, ニュージーランド',
                country_count: 2
            },
            {
                zone_code: 'zone4',
                zone_name: 'ゾーン4 - アジア',
                zone_color: '#ef4444', 
                countries_ja: 'シンガポール, 香港, 台湾, 韓国, タイ',
                country_count: 5
            },
            {
                zone_code: 'zone5',
                zone_name: 'ゾーン5 - その他',
                zone_color: '#8b5cf6',
                countries_ja: 'ブラジル, メキシコ, インド',
                country_count: 3
            }
        ];
        
        this.renderZoneSelector();
    }

    /**
     * ゾーン選択UI描画
     */
    renderZoneSelector() {
        const container = document.getElementById('matrixDestinationContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="zone-selector-container">
                <label class="form-label" for="matrixDestination">
                    <i class="fas fa-globe"></i> 配送先ゾーン
                </label>
                
                <!-- メイン選択ボックス -->
                <select id="matrixDestination" class="form-input zone-select" onchange="window.zoneSelector.onZoneChange(this.value)">
                    <option value="">配送先ゾーンを選択してください</option>
                    ${this.zones.map(zone => `
                        <option value="${zone.zone_code}" data-color="${zone.zone_color}">
                            ${zone.zone_name} (${zone.country_count}カ国)
                        </option>
                    `).join('')}
                </select>
                
                <!-- ビジュアルゾーンカード -->
                <div class="zone-cards-container" id="zoneCardsContainer">
                    ${this.zones.map(zone => this.generateZoneCard(zone)).join('')}
                </div>
                
                <!-- 選択中ゾーン詳細 -->
                <div id="selectedZoneDetails" class="selected-zone-details" style="display: none;">
                    <h4><i class="fas fa-map-marker-alt"></i> 選択中のゾーン</h4>
                    <div id="selectedZoneContent"></div>
                </div>
            </div>
            
            <style>
                .zone-selector-container {
                    margin-bottom: var(--matrix-space-lg);
                }
                
                .zone-select {
                    margin-bottom: var(--matrix-space-md);
                }
                
                .zone-cards-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: var(--matrix-space-sm);
                    margin-bottom: var(--matrix-space-md);
                }
                
                .zone-card {
                    border: 2px solid #e5e7eb;
                    border-radius: var(--matrix-radius-lg);
                    padding: var(--matrix-space-md);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background: white;
                    position: relative;
                    overflow: hidden;
                }
                
                .zone-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: var(--zone-color);
                }
                
                .zone-card:hover {
                    border-color: var(--zone-color);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .zone-card.selected {
                    border-color: var(--zone-color);
                    background: rgba(59, 130, 246, 0.05);
                    transform: scale(1.02);
                }
                
                .zone-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--matrix-space-sm);
                }
                
                .zone-card-title {
                    font-weight: 700;
                    color: var(--matrix-text-primary);
                    font-size: 1rem;
                }
                
                .zone-card-count {
                    background: var(--zone-color);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .zone-card-countries {
                    color: var(--matrix-text-secondary);
                    font-size: 0.875rem;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .selected-zone-details {
                    background: var(--matrix-bg-tertiary);
                    border-radius: var(--matrix-radius-md);
                    padding: var(--matrix-space-md);
                    border-left: 4px solid var(--matrix-primary);
                }
                
                .selected-zone-details h4 {
                    color: var(--matrix-text-primary);
                    margin-bottom: var(--matrix-space-sm);
                    display: flex;
                    align-items: center;
                    gap: var(--matrix-space-sm);
                }
                
                @media (max-width: 768px) {
                    .zone-cards-container {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;
    }

    /**
     * ゾーンカード生成
     */
    generateZoneCard(zone) {
        return `
            <div class="zone-card" 
                 style="--zone-color: ${zone.zone_color};" 
                 onclick="window.zoneSelector.selectZone('${zone.zone_code}')"
                 data-zone="${zone.zone_code}">
                <div class="zone-card-header">
                    <div class="zone-card-title">${zone.zone_name}</div>
                    <div class="zone-card-count">${zone.country_count}カ国</div>
                </div>
                <div class="zone-card-countries">${zone.countries_ja || '国情報取得中...'}</div>
            </div>
        `;
    }

    /**
     * ゾーン選択処理
     */
    selectZone(zoneCode) {
        // 前の選択を解除
        document.querySelectorAll('.zone-card').forEach(card => {
            card.classList.remove('selected');
        });

        // 新しい選択を設定
        const selectedCard = document.querySelector(`[data-zone="${zoneCode}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        // セレクトボックス同期
        const selectElement = document.getElementById('matrixDestination');
        if (selectElement) {
            selectElement.value = zoneCode;
        }

        this.currentZone = zoneCode;
        this.showZoneDetails(zoneCode);

        // マトリックス自動更新（オプション）
        if (window.matrixManager && typeof window.matrixManager.generateMatrix === 'function') {
            // 自動生成は任意で実装
            console.log(`ゾーン選択: ${zoneCode}`);
        }
    }

    /**
     * ゾーン変更ハンドラー（セレクトボックス）
     */
    onZoneChange(zoneCode) {
        if (zoneCode) {
            this.selectZone(zoneCode);
        } else {
            this.clearSelection();
        }
    }

    /**
     * 選択クリア
     */
    clearSelection() {
        document.querySelectorAll('.zone-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.getElementById('selectedZoneDetails').style.display = 'none';
        this.currentZone = null;
    }

    /**
     * ゾーン詳細表示
     */
    showZoneDetails(zoneCode) {
        const zone = this.zones.find(z => z.zone_code === zoneCode);
        if (!zone) return;

        const detailsContainer = document.getElementById('selectedZoneDetails');
        const contentContainer = document.getElementById('selectedZoneContent');

        if (detailsContainer && contentContainer) {
            contentContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: var(--matrix-space-sm); margin-bottom: var(--matrix-space-sm);">
                    <div style="width: 20px; height: 20px; background: ${zone.zone_color}; border-radius: 4px;"></div>
                    <strong style="color: var(--matrix-text-primary);">${zone.zone_name}</strong>
                    <span style="color: var(--matrix-text-muted);">(${zone.country_count}カ国)</span>
                </div>
                <div style="color: var(--matrix-text-secondary); font-size: 0.9rem;">
                    <strong>対象国:</strong> ${zone.countries_ja || '国情報を取得中...'}
                </div>
            `;
            
            detailsContainer.style.display = 'block';
        }
    }

    /**
     * 選択中ゾーン取得
     */
    getCurrentZone() {
        return this.currentZone;
    }

    /**
     * 特定ゾーンの国リスト取得
     */
    getZoneCountries(zoneCode) {
        const zone = this.zones.find(z => z.zone_code === zoneCode);
        return zone ? zone.countries_ja : '';
    }
}

// グローバルインスタンス作成
window.zoneSelector = new ZoneSelector();

console.log('🗺️ CPass基準ゾーン選択システム初期化完了');
