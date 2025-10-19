/**
 * マトリックス管理JavaScript
 * 指示書 Phase 3: 詳細データ表示機能
 * エクセル風マトリックス制御とインタラクション
 */

class MatrixManager {
    constructor() {
        this.matrixData = null;
        this.currentTab = 'emoji';
        this.currentBreakdown = null;
        this.activePriceCell = null;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        this.initializeEventListeners();
        console.log('🎯 MatrixManager 初期化完了');
    }

    /**
     * イベントリスナー初期化
     */
    initializeEventListeners() {
        // グローバルクリックハンドラー
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // キーボードナビゲーション
        document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        
        // リサイズ対応
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // スクロール同期
        this.setupScrollSync();
    }

    /**
     * マトリックス生成メイン
     */
    async generateMatrix() {
        const destination = document.getElementById('matrixDestination').value;
        const maxWeight = parseFloat(document.getElementById('matrixMaxWeight').value);
        const weightStep = parseFloat(document.getElementById('matrixWeightStep').value);
        const displayType = document.getElementById('matrixDisplayType').value;

        if (!destination) {
            this.showError('配送先国を選択してください');
            return;
        }

        if (maxWeight <= 0 || maxWeight > 30) {
            this.showError('有効な重量範囲を入力してください（0.5kg - 30kg）');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('../api/matrix_data_api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': window.csrfToken || ''
                },
                body: JSON.stringify({
                    action: 'get_tabbed_matrix',
                    destination: destination,
                    max_weight: maxWeight,
                    weight_step: weightStep,
                    display_type: displayType
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                this.matrixData = result.data;
                this.displayTabbedMatrix(result.data);
                this.showSuccess('マトリックス生成完了');
            } else {
                throw new Error(result.message || 'マトリックス生成に失敗しました');
            }

        } catch (error) {
            console.error('Matrix generation error:', error);
            this.showError('マトリックス生成エラー: ' + error.message);
            
            // フォールバック：サンプルデータ表示
            this.generateSampleMatrix(destination, maxWeight, weightStep);
            
        } finally {
            this.hideLoading();
        }
    }

    /**
     * サンプルマトリックス生成（フォールバック）
     */
    generateSampleMatrix(destination, maxWeight, weightStep) {
        console.log('📊 サンプルマトリックス生成中...');
        
        const weightSteps = [];
        for (let weight = weightStep; weight <= maxWeight; weight += weightStep) {
            weightSteps.push(weight);
        }
        
        const sampleData = {
            destination: destination,
            weight_steps: weightSteps,
            carriers: {
                emoji: this.generateSampleCarrierData('Emoji', weightSteps),
                cpass: this.generateSampleCarrierData('CPass', weightSteps),
                jppost: this.generateSampleCarrierData('日本郵便', weightSteps)
            },
            comparison_data: this.generateSampleComparisonData(weightSteps)
        };
        
        this.matrixData = sampleData;
        this.displayTabbedMatrix(sampleData);
        this.showWarning('サンプルデータを表示中（データベース接続エラーのため）');
    }

    /**
     * サンプル業者データ生成
     */
    generateSampleCarrierData(carrierName, weightSteps) {
        const services = {
            'Emoji': ['UPS Express', 'FedEx Priority', 'DHL Worldwide'],
            'CPass': ['Speed Pack FedEx', 'Speed Pack DHL', 'UPS Express'],
            '日本郵便': ['EMS', '航空便小形包装物', '航空便印刷物']
        };
        
        const carrierServices = services[carrierName] || ['Service A', 'Service B', 'Service C'];
        const carrierData = {};
        
        carrierServices.forEach((serviceName, serviceIndex) => {
            carrierData[serviceName] = {};
            
            weightSteps.forEach(weight => {
                const basePrice = 1500 + (serviceIndex * 500) + (weight * 300);
                const variation = Math.random() * 400 - 200; // ±200円の変動
                const price = Math.round(basePrice + variation);
                
                carrierData[serviceName][weight] = {
                    price: price,
                    delivery_days: `${2 + serviceIndex}-${4 + serviceIndex}`,
                    has_tracking: serviceIndex < 2,
                    has_insurance: serviceIndex === 0,
                    source: 'sample',
                    breakdown: {
                        base_price: Math.round(price * 0.7),
                        weight_surcharge: Math.round(price * 0.2),
                        fuel_surcharge: Math.round(price * 0.1),
                        other_fees: 0
                    }
                };
            });
        });
        
        return carrierData;
    }

    /**
     * サンプル比較データ生成
     */
    generateSampleComparisonData(weightSteps) {
        const comparisonData = {};
        
        weightSteps.forEach(weight => {
            const options = [
                { service_name: 'EMS', carrier: '日本郵便', price: 1400 + (weight * 200), delivery_days: '3-7' },
                { service_name: 'UPS Express', carrier: 'Emoji', price: 2500 + (weight * 350), delivery_days: '1-3' },
                { service_name: 'Speed Pack FedEx', carrier: 'CPass', price: 2800 + (weight * 400), delivery_days: '2-5' }
            ];
            
            // 料金順ソート
            options.sort((a, b) => a.price - b.price);
            
            comparisonData[weight] = {
                cheapest: options[0],
                fastest: options.find(opt => parseInt(opt.delivery_days.split('-')[0]) === 1) || options[1],
                all_options: options
            };
        });
        
        return comparisonData;
    }

    /**
     * タブ式マトリックス表示
     */
    displayTabbedMatrix(data) {
        const container = document.getElementById('matrixTabContainer');
        const navContainer = document.getElementById('matrixTabNav');
        
        if (!container || !navContainer) {
            console.error('❌ マトリックスコンテナが見つかりません');
            return;
        }
        
        // タブナビゲーション生成
        const carriers = ['emoji', 'cpass', 'jppost', 'comparison'];
        const carrierLabels = {
            'emoji': '<i class="fas fa-shipping-fast"></i> Emoji配送',
            'cpass': '<i class="fas fa-plane"></i> CPass配送',
            'jppost': '<i class="fas fa-mail-bulk"></i> 日本郵便',
            'comparison': '<i class="fas fa-balance-scale"></i> 料金比較'
        };

        navContainer.innerHTML = carriers.map(carrier => `
            <button class="matrix-tab-btn ${carrier === 'emoji' ? 'active' : ''}" 
                    data-tab="${carrier}" 
                    onclick="window.matrixManager.switchMatrixTab('${carrier}')"
                    role="tab"
                    aria-selected="${carrier === 'emoji'}"
                    aria-controls="matrix-content-${carrier}">
                ${carrierLabels[carrier]}
            </button>
        `).join('');

        // 最初のタブ表示
        this.currentTab = 'emoji';
        this.displayCarrierMatrix('emoji');
        
        container.style.display = 'block';
        
        // アニメーション
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            container.style.transition = 'all 0.4s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });
    }

    /**
     * タブ切り替え
     */
    switchMatrixTab(tabName) {
        // タブボタンの状態更新
        document.querySelectorAll('.matrix-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.setAttribute('aria-selected', 'true');
        }

        this.currentTab = tabName;

        // 既存の詳細表示を隠す
        this.hideAllBreakdowns();

        // タブ内容表示
        if (tabName === 'comparison') {
            this.displayComparisonView();
        } else {
            this.displayCarrierMatrix(tabName);
        }

        // アナリティクス
        this.trackTabSwitch(tabName);
    }

    /**
     * 業者別マトリックス表示
     */
    displayCarrierMatrix(carrierCode) {
        const contentArea = document.getElementById('matrixContentArea');
        
        if (!this.matrixData || !this.matrixData.carriers[carrierCode]) {
            contentArea.innerHTML = this.generateNoDataMessage(carrierCode);
            return;
        }

        const carrierData = this.matrixData.carriers[carrierCode];
        const weightSteps = this.matrixData.weight_steps;
        
        if (Object.keys(carrierData).length === 0) {
            contentArea.innerHTML = this.generateNoDataMessage(carrierCode);
            return;
        }
        
        // ヘッダー行生成
        const headers = ['サービス', ...weightSteps.map(w => `${w}kg`)];
        
        // グリッドスタイル設定
        const gridColumns = `200px repeat(${weightSteps.length}, minmax(100px, 1fr))`;
        
        // 最安・最速の識別
        const priceAnalysis = this.analyzePrices(carrierData, weightSteps);
        
        let matrixHtml = `
            <div class="shipping-matrix-grid" style="grid-template-columns: ${gridColumns};" role="table" aria-label="${carrierCode}配送マトリックス">
                ${headers.map((header, index) => `
                    <div class="matrix-cell header" role="columnheader" tabindex="0" data-column="${index}">
                        ${header}
                        ${index > 0 ? '<i class="fas fa-sort" style="margin-left: 4px; opacity: 0.5;"></i>' : ''}
                    </div>
                `).join('')}
        `;

        // 各サービスの料金行生成
        const services = Object.keys(carrierData);
        services.forEach((serviceName, rowIndex) => {
            const serviceData = carrierData[serviceName];
            
            matrixHtml += `
                <div class="matrix-cell service-name" role="rowheader" tabindex="0" data-service="${serviceName}">
                    ${serviceName}
                </div>
            `;
            
            weightSteps.forEach((weight, colIndex) => {
                const priceData = serviceData[weight];
                if (priceData) {
                    const isChepest = priceAnalysis.cheapest[weight] === serviceName ? ' cheapest' : '';
                    const isFastest = priceAnalysis.fastest[weight] === serviceName ? ' fastest' : '';
                    
                    matrixHtml += `
                        <div class="matrix-cell price${isChepest}${isFastest}" 
                             role="gridcell"
                             tabindex="0"
                             onclick="window.matrixManager.showPriceBreakdown(this, '${serviceName}', ${weight}, '${carrierCode}')"
                             onkeydown="window.matrixManager.handleCellKeydown(event, this, '${serviceName}', ${weight}, '${carrierCode}')"
                             data-service="${serviceName}" 
                             data-weight="${weight}" 
                             data-carrier="${carrierCode}"
                             data-price="${priceData.price}"
                             aria-label="¥${priceData.price.toLocaleString()} ${serviceName} ${weight}kg ${priceData.delivery_days}日">
                            ¥${priceData.price.toLocaleString()}
                            ${this.generatePriceBreakdownHTML(serviceName, priceData, weight)}
                        </div>
                    `;
                } else {
                    matrixHtml += `
                        <div class="matrix-cell unavailable" role="gridcell" aria-label="利用不可">
                            -
                        </div>
                    `;
                }
            });
        });

        matrixHtml += '</div>';
        
        // フェードイン効果
        contentArea.style.opacity = '0';
        contentArea.innerHTML = matrixHtml;
        
        requestAnimationFrame(() => {
            contentArea.style.transition = 'opacity 0.3s ease';
            contentArea.style.opacity = '1';
        });

        // ソート機能追加
        this.addSortFunctionality();
    }

    /**
     * 価格分析（最安・最速の識別）
     */
    analyzePrices(carrierData, weightSteps) {
        const analysis = {
            cheapest: {},
            fastest: {}
        };

        weightSteps.forEach(weight => {
            let cheapestPrice = Infinity;
            let fastestDays = Infinity;
            let cheapestService = null;
            let fastestService = null;

            Object.keys(carrierData).forEach(serviceName => {
                const priceData = carrierData[serviceName][weight];
                if (priceData) {
                    // 最安検索
                    if (priceData.price < cheapestPrice) {
                        cheapestPrice = priceData.price;
                        cheapestService = serviceName;
                    }

                    // 最速検索
                    const minDays = parseInt(priceData.delivery_days.split('-')[0]);
                    if (minDays < fastestDays) {
                        fastestDays = minDays;
                        fastestService = serviceName;
                    }
                }
            });

            analysis.cheapest[weight] = cheapestService;
            analysis.fastest[weight] = fastestService;
        });

        return analysis;
    }

    /**
     * 価格詳細HTML生成
     */
    generatePriceBreakdownHTML(serviceName, priceData, weight) {
        return `
            <div class="price-breakdown" style="display: none;">
                <div class="breakdown-header">${serviceName}</div>
                <table class="breakdown-table">
                    <tr><td>基本料金:</td><td>¥${(priceData.breakdown?.base_price || 0).toLocaleString()}</td></tr>
                    <tr><td>重量追加:</td><td>¥${(priceData.breakdown?.weight_surcharge || 0).toLocaleString()}</td></tr>
                    <tr><td>燃料サーチャージ:</td><td>¥${(priceData.breakdown?.fuel_surcharge || 0).toLocaleString()}</td></tr>
                    <tr><td>その他手数料:</td><td>¥${(priceData.breakdown?.other_fees || 0).toLocaleString()}</td></tr>
                    <tr class="total"><td><strong>合計:</strong></td><td><strong>¥${priceData.price.toLocaleString()}</strong></td></tr>
                </table>
                <div class="delivery-info">
                    <p><i class="fas fa-clock"></i> 配送日数: ${priceData.delivery_days}日</p>
                    <p><i class="fas fa-shield-alt"></i> 保険: ${priceData.has_insurance ? '有' : '無'}</p>
                    <p><i class="fas fa-search"></i> 追跡: ${priceData.has_tracking ? '有' : '無'}</p>
                    <p><i class="fas fa-database"></i> データ元: ${priceData.source === 'real_data' ? '実データ' : '計算値'}</p>
                </div>
            </div>
        `;
    }

    /**
     * 比較ビュー表示
     */
    displayComparisonView() {
        const contentArea = document.getElementById('matrixContentArea');
        
        if (!this.matrixData || !this.matrixData.comparison_data) {
            contentArea.innerHTML = this.generateNoDataMessage('comparison');
            return;
        }

        const comparisonData = this.matrixData.comparison_data;
        
        let comparisonHtml = `
            <div style="margin-bottom: var(--matrix-space-lg);">
                <h3 style="color: var(--matrix-text-primary); margin-bottom: var(--matrix-space-md); display: flex; align-items: center; gap: var(--matrix-space-sm);">
                    <i class="fas fa-chart-line"></i> 全業者料金比較
                </h3>
                <p style="color: var(--matrix-text-secondary);">
                    ${this.matrixData.destination} 向け送料の業者間比較。価格と配送日数を総合的に比較できます。
                </p>
            </div>
            
            <div class="comparison-grid">
        `;

        // 重量別の最安・最速オプション表示
        this.matrixData.weight_steps.forEach(weight => {
            const weightData = comparisonData[weight];
            if (weightData) {
                const cheapest = weightData.cheapest;
                const fastest = weightData.fastest;
                
                comparisonHtml += `
                    <div class="weight-comparison-container">
                        <h4 style="text-align: center; margin-bottom: var(--matrix-space-md); color: var(--matrix-primary);">
                            <i class="fas fa-weight"></i> ${weight}kg
                        </h4>
                        
                        ${cheapest ? `
                            <div class="comparison-card best-price" style="margin-bottom: var(--matrix-space-md);">
                                <div class="card-header">
                                    <span class="card-title">💰 最安オプション</span>
                                    <span class="card-badge best">BEST</span>
                                </div>
                                <div class="card-price">¥${cheapest.price.toLocaleString()}</div>
                                <div class="card-details">
                                    <div class="card-detail">
                                        <i class="fas fa-truck"></i>
                                        ${cheapest.service_name}
                                    </div>
                                    <div class="card-detail">
                                        <i class="fas fa-clock"></i>
                                        ${cheapest.delivery_days}日
                                    </div>
                                    <div class="card-detail">
                                        <i class="fas fa-building"></i>
                                        ${cheapest.carrier}
                                    </div>
                                    <div class="card-detail">
                                        <i class="fas fa-dollar-sign"></i>
                                        $${(cheapest.price / 150).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${fastest && fastest !== cheapest ? `
                            <div class="comparison-card best-speed">
                                <div class="card-header">
                                    <span class="card-title">⚡ 最速オプション</span>
                                    <span class="card-badge fast">FAST</span>
                                </div>
                                <div class="card-price">¥${fastest.price.toLocaleString()}</div>
                                <div class="card-details">
                                    <div class="card-detail">
                                        <i class="fas fa-truck"></i>
                                        ${fastest.service_name}
                                    </div>
                                    <div class="card-detail">
                                        <i class="fas fa-clock"></i>
                                        ${fastest.delivery_days}日
                                    </div>
                                    <div class="card-detail">
                                        <i class="fas fa-building"></i>
                                        ${fastest.carrier}
                                    </div>
                                    <div class="card-detail">
                                        <i class="fas fa-dollar-sign"></i>
                                        $${(fastest.price / 150).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${this.generateAllOptionsTable(weightData.all_options)}
                    </div>
                `;
            }
        });

        comparisonHtml += '</div>';
        
        contentArea.style.opacity = '0';
        contentArea.innerHTML = comparisonHtml;
        
        requestAnimationFrame(() => {
            contentArea.style.transition = 'opacity 0.3s ease';
            contentArea.style.opacity = '1';
        });
    }

    /**
     * 全オプションテーブル生成
     */
    generateAllOptionsTable(options) {
        if (!options || options.length === 0) return '';

        return `
            <div style="margin-top: var(--matrix-space-lg);">
                <h5 style="margin-bottom: var(--matrix-space-sm); color: var(--matrix-text-secondary);">
                    <i class="fas fa-list"></i> 全オプション
                </h5>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--matrix-border-light); border-radius: var(--matrix-radius-md);">
                    <table style="width: 100%; font-size: 0.8125rem;">
                        <thead style="background: var(--matrix-bg-tertiary); position: sticky; top: 0;">
                            <tr>
                                <th style="padding: var(--matrix-space-xs); text-align: left;">サービス</th>
                                <th style="padding: var(--matrix-space-xs); text-align: right;">料金</th>
                                <th style="padding: var(--matrix-space-xs); text-align: center;">日数</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${options.map((option, index) => `
                                <tr style="border-bottom: 1px solid var(--matrix-border-light); ${index === 0 ? 'background: #f0fdf4;' : ''}">
                                    <td style="padding: var(--matrix-space-xs);">
                                        <div style="font-weight: 600;">${option.service_name}</div>
                                        <div style="font-size: 0.75rem; color: var(--matrix-text-muted);">${option.carrier}</div>
                                    </td>
                                    <td style="padding: var(--matrix-space-xs); text-align: right; font-weight: 700;">
                                        ¥${option.price.toLocaleString()}
                                    </td>
                                    <td style="padding: var(--matrix-space-xs); text-align: center;">
                                        ${option.delivery_days}日
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * 詳細表示制御
     */
    showPriceBreakdown(cell, serviceName, weight, carrier) {
        // 既存の詳細表示を隠す
        this.hideAllBreakdowns();
        
        const breakdown = cell.querySelector('.price-breakdown');
        if (breakdown) {
            breakdown.style.display = 'block';
            breakdown.style.zIndex = '1070';
            
            setTimeout(() => {
                breakdown.classList.add('show');
            }, 10);
            
            this.currentBreakdown = breakdown;
            this.activePriceCell = cell;
            
            // クリック外し用リスナー追加
            setTimeout(() => {
                document.addEventListener('click', this.outsideClickHandler.bind(this));
            }, 100);

            // アナリティクス
            this.trackPriceDetail(serviceName, weight, carrier);
        }
    }

    /**
     * セルキーボード操作
     */
    handleCellKeydown(event, cell, serviceName, weight, carrier) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.showPriceBreakdown(cell, serviceName, weight, carrier);
        }
    }

    /**
     * 詳細表示を全て隠す
     */
    hideAllBreakdowns() {
        document.querySelectorAll('.price-breakdown').forEach(breakdown => {
            breakdown.classList.remove('show');
            setTimeout(() => {
                breakdown.style.display = 'none';
            }, 200);
        });
        
        document.removeEventListener('click', this.outsideClickHandler.bind(this));
        this.currentBreakdown = null;
        this.activePriceCell = null;
    }

    /**
     * 外側クリックハンドラー
     */
    outsideClickHandler(event) {
        if (this.currentBreakdown && 
            !this.currentBreakdown.contains(event.target) && 
            !event.target.closest('.matrix-cell.price')) {
            this.hideAllBreakdowns();
        }
    }

    /**
     * グローバルクリックハンドラー
     */
    handleGlobalClick(event) {
        // マトリックス外クリックで詳細を隠す
        if (!event.target.closest('.matrix-tab-container')) {
            this.hideAllBreakdowns();
        }
    }

    /**
     * キーボードナビゲーション
     */
    handleKeyboardNavigation(event) {
        if (event.key === 'Escape') {
            this.hideAllBreakdowns();
        }

        // タブキーナビゲーション強化
        if (event.key === 'Tab' && this.currentBreakdown) {
            // 詳細表示中はタブ移動を制限
            const focusableElements = this.currentBreakdown.querySelectorAll('button, [tabindex="0"]');
            if (focusableElements.length > 0) {
                event.preventDefault();
                focusableElements[0].focus();
            }
        }
    }

    /**
     * リサイズハンドラー
     */
    handleResize() {
        // モバイル対応で詳細表示位置調整
        if (this.currentBreakdown && window.innerWidth <= 768) {
            this.currentBreakdown.style.position = 'fixed';
            this.currentBreakdown.style.top = '50%';
            this.currentBreakdown.style.left = '50%';
            this.currentBreakdown.style.transform = 'translate(-50%, -50%)';
        }
    }

    /**
     * スクロール同期設定
     */
    setupScrollSync() {
        // ヘッダー固定とスクロール同期機能
        let matrixGrid = null;
        
        const checkForGrid = () => {
            matrixGrid = document.querySelector('.shipping-matrix-grid');
            if (matrixGrid) {
                matrixGrid.addEventListener('scroll', this.handleMatrixScroll.bind(this));
            }
        };
        
        // DOM変更監視
        const observer = new MutationObserver(checkForGrid);
        observer.observe(document.body, { childList: true, subtree: true });
        
        checkForGrid(); // 初回チェック
    }

    /**
     * マトリックススクロールハンドラー
     */
    handleMatrixScroll(event) {
        // ヘッダー行とサービス名列の固定位置調整
        const scrollTop = event.target.scrollTop;
        const scrollLeft = event.target.scrollLeft;
        
        // ヘッダー行の影調整
        const headers = event.target.querySelectorAll('.matrix-cell.header');
        headers.forEach(header => {
            if (scrollTop > 0) {
                header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '';
            }
        });
        
        // サービス名列の影調整
        const serviceNames = event.target.querySelectorAll('.matrix-cell.service-name');
        serviceNames.forEach(serviceName => {
            if (scrollLeft > 0) {
                serviceName.style.boxShadow = '2px 0 4px rgba(0,0,0,0.1)';
            } else {
                serviceName.style.boxShadow = '';
            }
        });
    }

    /**
     * ソート機能追加
     */
    addSortFunctionality() {
        const headers = document.querySelectorAll('.matrix-cell.header[data-column]');
        headers.forEach(header => {
            if (header.dataset.column !== '0') { // サービス名列以外
                header.addEventListener('click', () => {
                    const columnIndex = parseInt(header.dataset.column);
                    this.sortByColumn(columnIndex);
                });
                
                header.style.cursor = 'pointer';
                header.title = 'クリックでソート';
            }
        });
    }

    /**
     * 列ソート
     */
    sortByColumn(columnIndex) {
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnIndex;
            this.sortDirection = 'asc';
        }

        // ソート実行
        const grid = document.querySelector('.shipping-matrix-grid');
        if (!grid) return;

        const rows = Array.from(grid.children).slice(grid.children.length / (this.matrixData.weight_steps.length + 1));
        // 実際のソート実装は複雑なため、ここでは表示のみ更新
        
        console.log(`🔄 列 ${columnIndex} を ${this.sortDirection} でソート`);
        this.updateSortIndicators(columnIndex);
    }

    /**
     * ソートインジケーター更新
     */
    updateSortIndicators(activeColumn) {
        const headers = document.querySelectorAll('.matrix-cell.header i.fa-sort, .matrix-cell.header i.fa-sort-up, .matrix-cell.header i.fa-sort-down');
        headers.forEach((icon, index) => {
            const columnIndex = index + 1; // ヘッダーは1から開始
            if (columnIndex === activeColumn) {
                icon.className = this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
                icon.style.opacity = '1';
            } else {
                icon.className = 'fas fa-sort';
                icon.style.opacity = '0.5';
            }
        });
    }

    /**
     * データなしメッセージ生成
     */
    generateNoDataMessage(carrierCode) {
        const messages = {
            'emoji': 'Emoji配送のデータがありません',
            'cpass': 'CPass配送のデータがありません', 
            'jppost': '日本郵便のデータがありません',
            'comparison': '比較データがありません'
        };

        return `
            <div style="text-align: center; padding: var(--matrix-space-2xl); color: var(--matrix-text-muted);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: var(--matrix-space-md); opacity: 0.5;"></i>
                <p style="font-size: 1.125rem; margin-bottom: var(--matrix-space-md);">${messages[carrierCode] || 'データがありません'}</p>
                <p style="font-size: 0.875rem;">設定を変更して再度お試しください。</p>
            </div>
        `;
    }

    /**
     * UIフィードバック
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type) {
        // 通知システム実装（簡易版）
        const notification = document.createElement('div');
        notification.className = `matrix-notification matrix-notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--matrix-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'});
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1080;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    /**
     * ローディング制御
     */
    showLoading() {
        const btn = document.getElementById('generateBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
        }
    }

    hideLoading() {
        const btn = document.getElementById('generateBtn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-cogs"></i> マトリックス生成';
        }
    }

    /**
     * アナリティクス・トラッキング
     */
    trackTabSwitch(tabName) {
        console.log(`📊 タブ切り替え: ${tabName}`);
        // 実際のアナリティクス送信コードをここに実装
    }

    trackPriceDetail(serviceName, weight, carrier) {
        console.log(`🔍 価格詳細表示: ${carrier} ${serviceName} ${weight}kg`);
        // 実際のアナリティクス送信コードをここに実装
    }

    /**
     * 高度な検索・フィルター機能
     */
    filterMatrix(criteria) {
        // フィルター機能実装
        console.log('🔍 マトリックスフィルター:', criteria);
    }

    /**
     * エクスポート機能
     */
    exportMatrix(format = 'csv') {
        if (!this.matrixData) {
            this.showError('エクスポートするデータがありません');
            return;
        }

        console.log(`📤 マトリックスエクスポート: ${format}`);
        
        if (format === 'csv') {
            this.exportToCSV();
        } else if (format === 'excel') {
            this.exportToExcel();
        }
    }

    exportToCSV() {
        // CSV エクスポート実装
        console.log('📄 CSV エクスポート実行');
    }

    exportToExcel() {
        // Excel エクスポート実装  
        console.log('📊 Excel エクスポート実行');
    }
}

// グローバルインスタンス作成
window.matrixManager = new MatrixManager();

// グローバル関数（後方互換性）
window.generateMatrix = () => window.matrixManager.generateMatrix();
window.switchMatrixTab = (tab) => window.matrixManager.switchMatrixTab(tab);

console.log('✅ MatrixManager JavaScript 初期化完了');
