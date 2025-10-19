/**
 * 棚卸しシステム JavaScript - Stage 2: Ajax機能追加版
 * N3フレームワーク準拠版
 */

(function() {
    'use strict';
    
    console.log('📜 棚卸しシステム Stage 2: Ajax機能追加版 読み込み開始');
    
    // グローバル変数の初期化
    window.TanaoroshiSystem = window.TanaoroshiSystem || {};
    window.TanaoroshiSystem.isInitialized = false;
    
    // DOM初期化（一回限り実行保証）
    document.addEventListener('DOMContentLoaded', function() {
        if (window.TanaoroshiSystem.isInitialized) {
            console.log('⚠️ 重複初期化を防止');
            return;
        }
        window.TanaoroshiSystem.isInitialized = true;
        
        console.log('🚀 棚卸しシステム Stage 2 初期化開始');
        initializeStage2();
        console.log('✅ 棚卸しシステム Stage 2 初期化完了');
    });
    
    // Stage 2初期化
    function initializeStage2() {
        // 3秒後にAjax処理開始
        setTimeout(function() {
            loadEbayInventoryData();
        }, 3000);
    }
    
    // eBayデータ読み込み（Ajax機能テスト）
    function loadEbayInventoryData() {
        console.log('📂 Stage 2: eBayデータベース連携開始');
        
        try {
            showSimpleMessage('eBayデータ取得開始...');
            
            // N3準拠でindex.php経由Ajax
            if (typeof window.executeAjax === 'function') {
                console.log('🔗 N3 executeAjax関数が利用可能です');
                
                window.executeAjax('ebay_inventory_get_data', {
                    page: 'tanaoroshi_inline_complete',
                    limit: 10,
                    with_images: true
                }).then(function(result) {
                    console.log('📊 Stage 2: Ajax応答受信:', result);
                    handleDataResponse(result);
                }).catch(function(error) {
                    console.error('❌ Stage 2: Ajax エラー:', error);
                    showSimpleMessage('Ajax通信エラー: ' + error.message);
                    loadDemoData();
                });
            } else {
                console.log('⚠️ Stage 2: N3 executeAjax関数が使用できません');
                showSimpleMessage('executeAjax関数が利用できません。デモデータを表示します。');
                loadDemoData();
            }
            
        } catch (error) {
            console.error('❌ Stage 2: データ取得例外:', error);
            showSimpleMessage('データ取得エラー: ' + error.message);
            loadDemoData();
        }
    }
    
    // データ応答処理
    function handleDataResponse(result) {
        console.log('📊 Stage 2: データ応答処理開始:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ Stage 2: eBayデータ取得成功:', result.data.length, '件');
                showSimpleMessage('eBayデータ取得成功: ' + result.data.length + '件');
                displaySimpleData(result.data);
            } else {
                console.log('⚠️ Stage 2: eBayデータが空です');
                showSimpleMessage('eBayデータが空でした。デモデータを表示します。');
                loadDemoData();
            }
        } else {
            console.error('❌ Stage 2: eBayデータ構造エラー:', result);
            showSimpleMessage('データ構造エラー。デモデータを表示します。');
            loadDemoData();
        }
    }
    
    // デモデータ表示
    function loadDemoData() {
        console.log('🔄 Stage 2: デモデータ表示開始');
        showSimpleMessage('デモデータ表示中（3件）');
        
        var demoData = [
            { id: 1, title: 'iPhone 15 Pro Max - Demo', price: 299.99 },
            { id: 2, title: 'Samsung Galaxy S24 - Demo', price: 499.99 },
            { id: 3, title: 'MacBook Pro M3 - Demo', price: 799.99 }
        ];
        
        displaySimpleData(demoData);
    }
    
    // シンプルデータ表示
    function displaySimpleData(data) {
        console.log('🎨 Stage 2: シンプルデータ表示:', data.length, '件');
        
        var container = document.getElementById('card-view');
        if (!container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        var html = '<div style="grid-column: 1 / -1; padding: 2rem; text-align: center;">';
        html += '<h3>Stage 2: Ajax機能テスト結果</h3>';
        html += '<p>データ件数: ' + data.length + '件</p>';
        html += '<ul style="text-align: left; display: inline-block;">';
        
        data.forEach(function(item, index) {
            var title = item.title || item.name || 'タイトル不明';
            var price = item.price || item.start_price || 0;
            html += '<li>' + (index + 1) + '. ' + title + ' - $' + price + '</li>';
        });
        
        html += '</ul></div>';
        
        container.innerHTML = html;
        console.log('✅ Stage 2: データ表示完了');
    }
    
    // シンプルメッセージ表示
    function showSimpleMessage(message) {
        console.log('📊 Stage 2: メッセージ表示:', message);
        
        var container = document.getElementById('card-view');
        if (container) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #64748b;"><p>' + message + '</p></div>';
        }
    }
    
    // グローバル関数として公開
    window.loadEbayInventoryData = loadEbayInventoryData;
    
    console.log('📜 棚卸しシステム Stage 2: Ajax機能追加版 読み込み完了');
    
})();
