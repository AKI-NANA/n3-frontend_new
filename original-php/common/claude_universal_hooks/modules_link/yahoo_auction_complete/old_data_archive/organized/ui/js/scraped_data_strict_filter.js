// 🎯 スクレイピングデータ検索機能（完全修正版）
function loadEditingDataStrict() {
    SystemLogger.info('🎯 真のスクレイピングデータのみを厳密表示します（COMPLETE_SCRAPING_*のみ）');
    
    const tableBody = safeGetElement('editingTableBody');
    if (!tableBody) {
        SystemLogger.error('テーブルボディが見つかりません');
        return;
    }
    
    // ローディング表示
    tableBody.innerHTML = `
        <tr>
            <td colspan="11" style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-spinner fa-spin"></i> 真のスクレイピングデータ（COMPLETE_SCRAPING_*）のみ読み込み中...
            </td>
        </tr>
    `;
    
    // 🚨 get_scraped_products アクションで厳密フィルタリング
    fetch(PHP_BASE_URL + '?action=get_scraped_products&strict=true&page=1&limit=50')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data) {
                const products = data.data.data || data.data;
                
                // 🎯 COMPLETE_SCRAPING_* 以外を完全除外
                const strictScrapedOnly = products.filter(item => 
                    item.item_id && item.item_id.startsWith('COMPLETE_SCRAPING_')
                );
                
                if (strictScrapedOnly.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="11" style="text-align: center; padding: 3rem;">
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 2rem; margin: 1rem;">
                                    <h4 style="margin: 0 0 1rem 0; color: #856404;">
                                        🎯 真のスクレイピングデータがありません
                                    </h4>
                                    <p style="margin: 0.5rem 0; color: #856404; font-size: 1rem;">
                                        <strong>COMPLETE_SCRAPING_*</strong> で始まるアイテムが <strong>0件</strong> です。<br>
                                        データ取得タブでYahooオークションをスクレイピングしてください。
                                    </p>
                                    <div style="margin-top: 1.5rem;">
                                        <button class="btn btn-primary" onclick="switchTab('scraping')" style="margin-right: 1rem;">
                                            📡 データ取得タブへ
                                        </button>
                                        <button class="btn btn-info" onclick="loadAllData()">
                                            🔍 全データ表示（確認用）
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    displayEditingData(strictScrapedOnly, false);
                    updatePagination(strictScrapedOnly.length, 1, 1);
                }
                
                SystemLogger.success(`真のスクレイピングデータ表示完了: ${strictScrapedOnly.length}件（フィルタリング後）`);
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 2rem; color: #dc3545;">
                            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 1.5rem;">
                                <h4><i class="fas fa-exclamation-triangle"></i> データ取得エラー</h4>
                                <p>${data.message || 'スクレイピングデータの取得に失敗しました'}</p>
                                <button class="btn btn-primary" onclick="loadEditingDataStrict()">🔄 再試行</button>
                            </div>
                        </td>
                    </tr>
                `;
                SystemLogger.error(`スクレイピングデータ取得エラー: ${data.message}`);
            }
        })
        .catch(error => {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 2rem; color: #dc3545;">
                        <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 1.5rem;">
                            <h4><i class="fas fa-exclamation-circle"></i> 接続エラー</h4>
                            <p>サーバーへの接続に失敗しました: ${error.message}</p>
                            <button class="btn btn-info" onclick="loadEditingDataStrict()">🔄 再試行</button>
                        </div>
                    </td>
                </tr>
            `;
            SystemLogger.error(`スクレイピングデータ読み込みエラー: ${error.message}`);
        });
}
