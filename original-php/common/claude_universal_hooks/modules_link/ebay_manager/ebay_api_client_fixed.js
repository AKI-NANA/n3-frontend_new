// eBay実データ取得・データベース保存（完全修正版・表示問題解決）
async function fetchRealEbayData(limit = 50) {
    try {
        console.log(`🚀 eBay実データ取得開始: ${limit}件`);
        
        const result = await window.executeAjax('fetch_real_ebay_data', {
            limit: limit
        });
        
        console.log('✅ 完全API Response:', result);
        console.log('✅ Total Count詳細:', result.total_count, typeof result.total_count);
        
        if (result.success) {
            // 完全確実なデータ取得
            const totalCount = result.total_count || result.returned_count || result.data?.length || 0;
            const source = result.source || 'unknown';
            const apiMethod = result.api_method || 'Trading API';
            const apiVersion = result.api_version || '1271';
            const sellerAccount = result.seller_account || 'mystical-japan-treasures';
            const message = result.message || 'データ取得完了';
            
            // 詳細ログ出力
            console.log('📊 解析結果:', {
                totalCount,
                source,
                apiMethod,
                apiVersion,
                sellerAccount,
                originalMessage: message
            });
            
            alert(`✅ eBay実データ取得成功！

${message}
取得件数: ${totalCount}件
ソース: ${source}
APIメソッド: ${apiMethod}
APIバージョン: ${apiVersion}
アカウント: ${sellerAccount}`);
            
            // ページリロードでデータベース状態更新
            setTimeout(() => location.reload(), 1000);
        } else {
            throw new Error(result.error || '未知のエラー');
        }
        
    } catch (error) {
        alert(`❌ eBay実データ取得失敗: ${error.message}`);
        console.error('eBay Real Data Fetch Error:', error);
    }
}

// Trading API実データ取得・データベース保存（完全修正版）
async function fetchTradingAPIData(limit = 50) {
    try {
        console.log(`🚀 Trading API実データ取得開始: ${limit}件`);
        
        const result = await window.executeAjax('fetch_trading_api_data', {
            limit: limit
        });
        
        console.log('✅ Trading API Response:', result);
        
        if (result.success) {
            // レスポンス構造に完全対応
            const displayData = {
                total_count: result.total_count || result.returned_count || 0,
                source: result.source || 'trading_api',
                api_method: result.api_method || 'GetSellerList',
                api_version: result.api_version || '1271',
                seller_account: result.seller_account || 'mystical-japan-treasures'
            };
            
            alert(`✅ Trading API実データ取得成功！

取得件数: ${displayData.total_count}件
ソース: ${displayData.source}
APIメソッド: ${displayData.api_method}
APIバージョン: ${displayData.api_version}
アカウント: ${displayData.seller_account}`);
            
            // ページリロードでデータベース状態更新
            setTimeout(() => location.reload(), 1000);
        } else {
            throw new Error(result.error || '未知のエラー');
        }
        
    } catch (error) {
        alert(`❌ Trading API実データ取得失敗: ${error.message}`);
        console.error('Trading API Fetch Error:', error);
    }
}

console.log('✅ eBay API JavaScript（完全修正版）読み込み完了');
