/**
 * カテゴリー判定 + 手数料取得機能 - 既存モーダル統合版
 * ファイル名: category_fee_addon.js
 * 配置: /07_editing/modal_system/
 */

// 既存の IntegratedListingModal に機能を追加
if (typeof IntegratedListingModal !== 'undefined') {
    
    /**
     * カテゴリー判定 + 手数料取得（統合実行）
     */
    IntegratedListingModal.runCategoryTool = async function() {
        const product = this.state.productData;
        
        if (!product) {
            alert('商品データが読み込まれていません');
            return;
        }

        console.log('[Category+Fee] Starting...');
        
        // ボタンを処理中に
        const btn = document.getElementById('ilm-category-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
            btn.disabled = true;
        }

        try {
            // 1️⃣ カテゴリー判定
            const categoryResponse = await fetch('../11_category/unified_api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'select_category',
                    product_info: {
                        title: product.title,
                        price_jpy: product.current_price || 0,
                        brand: product.brand || '',
                        description: product.description || ''
                    }
                })
            });

            const categoryResult = await categoryResponse.json();
            console.log('[Category+Fee] Category:', categoryResult);

            if (!categoryResult.success || !categoryResult.category) {
                throw new Error('カテゴリー判定失敗');
            }

            const category = categoryResult.category;

            // 2️⃣ 手数料取得
            let feeData = null;
            let hasFeeError = false;

            try {
                const feeResponse = await fetch('../11_category/backend/api/fee_api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get_category_fee',
                        category_id: category.category_id,
                        price_usd: (product.current_price || 0) / 150
                    })
                });

                const feeResult = await feeResponse.json();
                console.log('[Category+Fee] Fee:', feeResult);

                if (feeResult.success && feeResult.fee) {
                    feeData = feeResult.fee;
                } else {
                    hasFeeError = true;
                    console.warn('[Category+Fee] No fee data');
                }
            } catch (feeError) {
                console.error('[Category+Fee] Fee API error:', feeError);
                hasFeeError = true;
            }

            // 3️⃣ データ保存
            this.state.toolResults.category = {
                ...category,
                fee: feeData,
                hasFeeError: hasFeeError
            };

            // 4️⃣ 結果表示
            this.displayCategoryFeeResult(category, feeData, hasFeeError);

            // 5️⃣ Excel用保存
            this.saveCategoryForExport(category, feeData, hasFeeError);

            // ボタンを完了に
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> 完了';
                btn.style.background = '#28a745';
            }

            // ステータス更新
            const statusEl = document.getElementById('ilm-step2-status');
            if (statusEl) {
                statusEl.textContent = 'カテゴリ判定完了';
                statusEl.style.color = '#28a745';
            }

        } catch (error) {
            console.error('[Category+Fee] Error:', error);
            
            if (btn) {
                btn.innerHTML = '<i class="fas fa-play"></i> 再実行';
                btn.disabled = false;
            }
            
            alert('エラー: ' + error.message);
        }
    };

    /**
     * 結果表示（カテゴリー + 手数料統合）
     */
    IntegratedListingModal.displayCategoryFeeResult = function(category, feeData, hasFeeError) {
        const container = document.getElementById('ilm-category-results');
        if (!container) return;

        container.innerHTML = `
            <div style="
                background: ${hasFeeError ? '#fff3cd' : 'white'};
                border: 1px solid ${hasFeeError ? '#ffc107' : '#e0e0e0'};
                border-radius: 6px;
                padding: 12px;
            ">
                <!-- カテゴリー情報 -->
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;">
                    <div style="margin-bottom: 6px;">
                        <span style="font-weight: 600; color: #666; font-size: 12px;">カテゴリ:</span>
                        <div style="color: #0064d2; font-weight: 600; font-size: 14px; margin-top: 2px;">
                            ${category.category_name}
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                        <div>
                            <span style="font-weight: 600; color: #666; font-size: 11px;">ID:</span>
                            <div style="
                                background: #f0f0f0;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-family: monospace;
                                font-weight: 700;
                                font-size: 13px;
                                color: #0064d2;
                                margin-top: 2px;
                            ">${category.category_id}</div>
                        </div>
                        
                        <div>
                            <span style="font-weight: 600; color: #666; font-size: 11px;">信頼度:</span>
                            <div style="
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-weight: 600;
                                font-size: 13px;
                                margin-top: 2px;
                                ${category.confidence >= 80 
                                    ? 'background: #d4edda; color: #155724;' 
                                    : 'background: #fff3cd; color: #856404;'}
                            ">${category.confidence}%</div>
                        </div>
                    </div>
                </div>

                <!-- 手数料情報 -->
                ${feeData ? `
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 4px;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 8px; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-dollar-sign" style="color: #28a745;"></i>
                            eBay手数料
                        </div>
                        
                        <div style="font-size: 11px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #666;">Final Value Fee:</span>
                                <span style="font-weight: 600; color: #333;">
                                    ${feeData.final_value_fee_percent}% 
                                    <span style="color: #28a745;">($${feeData.final_value_fee_amount?.toFixed(2)})</span>
                                </span>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="color: #666;">PayPal Fee:</span>
                                <span style="font-weight: 600; color: #28a745;">
                                    $${feeData.paypal_fee?.toFixed(2)}
                                </span>
                            </div>
                            
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                padding-top: 6px;
                                border-top: 1px solid #dee2e6;
                                margin-top: 4px;
                            ">
                                <span style="font-weight: 600; color: #666;">総手数料:</span>
                                <span style="font-weight: 700; font-size: 14px; color: #dc3545;">
                                    $${feeData.total_fee?.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div style="
                        background: #f8d7da;
                        border: 1px solid #f5c6cb;
                        color: #721c24;
                        padding: 10px;
                        border-radius: 4px;
                        font-size: 12px;
                    ">
                        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 4px;">
                            <i class="fas fa-exclamation-triangle"></i>
                            手数料データなし
                        </div>
                        <div style="font-size: 11px;">
                            このカテゴリーの手数料データが見つかりません。<br>
                            利益計算でエラーが発生します。
                        </div>
                    </div>
                `}
            </div>
        `;
    };

    /**
     * Excel出力用に保存
     */
    IntegratedListingModal.saveCategoryForExport = function(category, feeData, hasFeeError) {
        // 隠しフィールドに保存
        const fields = {
            'ebay-category-id': category.category_id,
            'ebay-category-name': category.category_name,
            'ebay-fee-data': feeData ? JSON.stringify(feeData) : '',
            'ebay-fee-error': hasFeeError ? '1' : '0'
        };

        Object.entries(fields).forEach(([id, value]) => {
            let input = document.getElementById(id);
            if (!input) {
                input = document.createElement('input');
                input.type = 'hidden';
                input.id = id;
                input.name = id.replace(/-/g, '_');
                document.body.appendChild(input);
            }
            input.value = value;
        });

        console.log('[Category+Fee] Saved for export:', {
            categoryId: category.category_id,
            hasFee: !!feeData,
            hasError: hasFeeError
        });
    };

    console.log('✅ Category + Fee Tool Integration loaded');
}
