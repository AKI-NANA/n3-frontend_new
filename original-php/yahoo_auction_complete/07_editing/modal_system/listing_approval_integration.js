/**
 * 直接出品と承認システム連携機能
 */

Object.assign(IntegratedListingModal, {
    
    /**
     * 🔴 直接出品（承認システムをスキップ）
     */
    async directListing() {
        if (!confirm('⚠️ 承認システムをスキップして直接出品しますか？\n\n承認システムを使うと以下のメリットがあります：\n• 全データの最終確認が可能\n• AI推奨スコアの確認\n• 一括処理で効率化\n• 出品履歴の完全な記録')) {
            return;
        }
        
        this.showNotification('出品処理を開始します...', 'info');
        
        try {
            const listingData = this.gatherListingData();
            
            const response = await fetch('../08_listing/api/listing.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_listing',
                    marketplace: this.state.currentMarketplace,
                    listing_data: listingData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`✅ 出品完了！ Item ID: ${result.item_id}`, 'success');
                
                // 出品成功後の処理
                setTimeout(() => {
                    if (confirm('出品が完了しました。モーダルを閉じますか？')) {
                        this.close();
                    }
                }, 2000);
            } else {
                this.showNotification('出品エラー: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('[DirectListing] Error:', error);
            this.showNotification('出品処理中にエラーが発生しました', 'error');
        }
    },
    
    /**
     * 🔴 承認システムへ遷移
     */
    async goToApproval() {
        // ツール実行完了チェック
        const requiredTools = ['category', 'shipping', 'profit', 'filter'];
        const missingTools = requiredTools.filter(tool => !this.state.toolResults[tool]);
        
        if (missingTools.length > 0) {
            const runAll = confirm(
                `⚠️ 以下のツールが未実行です：\n${missingTools.join(', ')}\n\n` +
                `すべてのツールを実行してから承認システムへ送信しますか？\n` +
                `「OK」= 全ツール実行後に送信\n「キャンセル」= このまま送信`
            );
            
            if (runAll) {
                this.showNotification('全ツールを実行中...', 'info');
                await this.runAllTools();
                
                // ツール実行完了を待つ
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        this.showNotification('承認システムへデータを送信中...', 'info');
        
        try {
            const listingData = this.gatherListingData();
            
            // 承認システムAPIに送信
            const response = await fetch('../03_approval/api/add_to_approval_queue.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_to_approval_queue',
                    product_id: this.state.productData.db_id || this.state.productData.id,
                    item_id: this.state.productData.item_id,
                    title: listingData.title,
                    price: listingData.price,
                    marketplace: this.state.currentMarketplace,
                    source: this.state.currentSource,
                    listing_data: listingData,
                    tool_results: this.state.toolResults,
                    images: listingData.images
                })
            });
            
            const result = await response.json();
            
            console.log('[GoToApproval] Result:', result);
            
            if (result.success) {
                this.showNotification('✅ 承認システムへ追加完了', 'success');
                
                // 承認システムへ遷移を案内
                setTimeout(() => {
                    const goNow = confirm(
                        `承認システムへの追加が完了しました！\n\n` +
                        `AI信頼度スコア: ${result.data.ai_score}/100\n` +
                        `AI推奨: ${this.getAIRecommendationText(result.data.ai_recommendation)}\n` +
                        `承認期限: ${new Date(result.data.deadline).toLocaleString('ja-JP')}\n\n` +
                        `今すぐ承認システムへ移動しますか？`
                    );
                    
                    if (goNow) {
                        window.location.href = '../03_approval/approval.php';
                    } else {
                        this.close();
                    }
                }, 1000);
            } else {
                this.showNotification('エラー: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('[GoToApproval] Error:', error);
            this.showNotification('承認システムへの送信中にエラーが発生しました', 'error');
        }
    },
    
    /**
     * 🔴 出品データ収集
     */
    gatherListingData() {
        const product = this.state.productData;
        
        // 共通データ
        const commonData = {
            product_id: product.db_id || product.id,
            item_id: product.item_id,
            title: document.getElementById('common-title')?.value || product.title,
            price: parseFloat(document.getElementById('common-price')?.value || product.current_price || 0),
            description: document.getElementById('common-description')?.value || product.description,
            condition: document.getElementById('common-condition')?.value || product.condition,
            sku: document.getElementById('generated-sku')?.value,
            images: this.state.selectedImages.map(idx => product.images[idx])
        };
        
        // マーケットプレイス別データ
        let marketplaceData = {};
        
        if (this.state.currentMarketplace === 'ebay') {
            marketplaceData = {
                ebay_title: document.getElementById('ebay-title')?.value,
                ebay_price: document.getElementById('ebay-price')?.value,
                ebay_condition: document.getElementById('ebay-condition')?.value,
                ebay_category: document.getElementById('ebay-category')?.value,
                ebay_category_id: document.getElementById('ebay-category-id')?.value,
                ebay_item_specifics: document.getElementById('ebay-item-specifics')?.value,
                ebay_duration: document.getElementById('ebay-duration')?.value,
                ebay_quantity: document.getElementById('ebay-quantity')?.value,
                html_description: document.getElementById('html-editor')?.value
            };
        }
        
        return {
            ...commonData,
            ...marketplaceData,
            manual_data: product.manual_input_data,
            source: this.state.currentSource,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * 🔴 AI推奨テキスト取得
     */
    getAIRecommendationText(recommendation) {
        const texts = {
            'approved': '✅ 承認推奨（高信頼度）',
            'review': '⚠️ 要レビュー（中程度）',
            'rejected': '❌ 非推奨（低信頼度）'
        };
        return texts[recommendation] || '不明';
    },
    
    /**
     * 🔴 自動承認システム遷移（全ツール完了後）
     */
    async autoTransitionToApproval() {
        const allToolsComplete = ['category', 'shipping', 'profit', 'filter', 'sellermirror']
            .every(tool => this.state.toolResults[tool]);
        
        if (!allToolsComplete) {
            console.log('[AutoTransition] Not all tools completed yet');
            return;
        }
        
        // 自動遷移の確認
        const confirmed = confirm(
            '✅ すべてのツール実行が完了しました！\n\n' +
            '承認システムへ自動的にデータを送信しますか？\n' +
            '（送信後、承認ページで最終確認できます）'
        );
        
        if (confirmed) {
            await this.goToApproval();
        } else {
            this.showNotification('承認システムへの送信をスキップしました', 'info');
        }
    }
});

// 全ツール実行完了時に自動遷移をチェック
const originalRunAllTools = IntegratedListingModal.runAllTools;
IntegratedListingModal.runAllTools = async function() {
    await originalRunAllTools.call(this);
    
    // 全ツール完了後、自動遷移を提案
    setTimeout(() => {
        this.autoTransitionToApproval();
    }, 1000);
};

console.log('✅ Direct Listing & Approval System Integration loaded with Auto-Transition');
