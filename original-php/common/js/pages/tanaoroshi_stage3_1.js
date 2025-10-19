/**
 * 棚卸しシステム JavaScript - Stage 3.1: 簡素カード版（デバッグ用）
 * 構文エラー原因特定版
 */

(function() {
    'use strict';
    
    console.log('📜 棚卸しシステム Stage 3.1: 簡素カード版 読み込み開始');
    
    // グローバル変数の初期化
    window.TanaoroshiSystem = window.TanaoroshiSystem || {};
    window.TanaoroshiSystem.isInitialized = false;
    window.TanaoroshiSystem.exchangeRate = 150.25;
    
    // DOM初期化（一回限り実行保証）
    document.addEventListener('DOMContentLoaded', function() {
        if (window.TanaoroshiSystem.isInitialized) {
            console.log('⚠️ 重複初期化を防止');
            return;
        }
        window.TanaoroshiSystem.isInitialized = true;
        
        console.log('🚀 棚卸しシステム Stage 3.1 初期化開始');
        initializeStage31();
        console.log('✅ 棚卸しシステム Stage 3.1 初期化完了');
    });
    
    // Stage 3.1初期化
    function initializeStage31() {
        // 3秒後にAjax処理開始
        setTimeout(function() {
            loadEbayInventoryData();
        }, 3000);
    }
    
    // eBayデータ読み込み（Ajax機能）
    function loadEbayInventoryData() {
        console.log('📂 Stage 3.1: eBayデータベース連携開始');
        
        try {
            showLoadingMessage();
            
            // N3準拠でindex.php経由Ajax
            if (typeof window.executeAjax === 'function') {
                console.log('🔗 Stage 3.1: N3 executeAjax関数が利用可能です');
                
                window.executeAjax('ebay_inventory_get_data', {
                    page: 'tanaoroshi_inline_complete',
                    limit: 5,
                    with_images: true
                }).then(function(result) {
                    console.log('📊 Stage 3.1: Ajax応答受信:', result);
                    handleDataResponse(result);
                }).catch(function(error) {
                    console.error('❌ Stage 3.1: Ajax エラー:', error);
                    loadDemoData();
                });
            } else {
                console.log('⚠️ Stage 3.1: N3 executeAjax関数が使用できません');
                loadDemoData();
            }
            
        } catch (error) {
            console.error('❌ Stage 3.1: データ取得例外:', error);
            loadDemoData();
        }
    }
    
    // データ応答処理
    function handleDataResponse(result) {
        console.log('📊 Stage 3.1: データ応答処理開始:', result);
        
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ Stage 3.1: eBayデータ取得成功:', result.data.length, '件');
                var convertedData = convertEbayDataSimple(result.data);
                displaySimpleCards(convertedData);
            } else {
                console.log('⚠️ Stage 3.1: eBayデータが空です');
                loadDemoData();
            }
        } else {
            console.error('❌ Stage 3.1: eBayデータ構造エラー:', result);
            loadDemoData();
        }
    }
    
    // eBayデータ変換（簡素版）
    function convertEbayDataSimple(ebayData) {
        console.log('🔄 Stage 3.1: eBayデータ簡素変換開始');
        
        return ebayData.map(function(item, index) {
            return {
                id: item.item_id || index + 1,
                name: item.title || item.name || 'タイトル不明',
                sku: item.sku || 'SKU-' + (index + 1),
                priceUSD: parseFloat(item.price || item.start_price || 0),
                stock: parseInt(item.quantity || item.available_quantity || 0),
                image: item.gallery_url || item.picture_url || ''
            };
        });
    }
    
    // デモデータ表示
    function loadDemoData() {
        console.log('🔄 Stage 3.1: デモデータ表示開始');
        
        var demoData = [
            {
                id: 1,
                name: 'iPhone 15 Pro Max - Demo',
                sku: 'DEMO-IP15',
                priceUSD: 299.99,
                stock: 3,
                image: ''
            },
            {
                id: 2,
                name: 'Samsung Galaxy S24 - Demo',
                sku: 'DEMO-SGS24',
                priceUSD: 499.99,
                stock: 1,
                image: ''
            }
        ];
        
        displaySimpleCards(demoData);
        console.log('📋 Stage 3.1: デモデータ表示完了:', demoData.length, '件');
    }
    
    // 簡素カード表示
    function displaySimpleCards(products) {
        console.log('🎨 Stage 3.1: 簡素カード表示開始:', products.length, '件');
        
        var container = document.getElementById('card-view');
        if (!container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        var cardsHtml = '';
        
        // 構文エラー原因特定のため、forEach を使わない
        for (var i = 0; i < products.length; i++) {
            var product = products[i];
            cardsHtml += createSimpleProductCard(product);
        }
        
        console.log('🔧 Stage 3.1: HTML生成完了、DOM挿入実行');
        container.innerHTML = cardsHtml;
        console.log('✅ Stage 3.1: 簡素カード表示完了:', products.length, '件');
    }
    
    // 簡素商品カード作成（構文エラー原因特定版）
    function createSimpleProductCard(product) {
        console.log('🔧 Stage 3.1: カード作成開始 - ID:', product.id);
        
        // 最小限のHTML（構文エラー原因を特定するため）
        var html = '<div class="inventory__card" data-id="' + product.id + '">';
        html += '<div class="inventory__card-image">';
        
        // 画像部分（シンプル版）
        if (product.image) {
            html += '<img src="' + product.image + '" alt="商品画像" class="inventory__card-img">';
        } else {
            html += '<div class="inventory__card-placeholder">';
            html += '<i class="fas fa-image"></i>';
            html += '<span>画像なし</span>';
            html += '</div>';
        }
        
        html += '</div>';
        html += '<div class="inventory__card-info">';
        html += '<h3 class="inventory__card-title">' + product.name + '</h3>';
        html += '<div class="inventory__card-price">';
        html += '<div class="inventory__card-price-main">$' + product.priceUSD.toFixed(2) + '</div>';
        html += '</div>';
        html += '<div class="inventory__card-footer">';
        html += '<span class="inventory__card-sku">' + product.sku + '</span>';
        html += '<span>在庫:' + product.stock + '</span>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        console.log('🔧 Stage 3.1: カード作成完了 - ID:', product.id);
        return html;
    }
    
    // ローディングメッセージ表示
    function showLoadingMessage() {
        var container = document.getElementById('card-view');
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748b; grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>eBayデータベースから読み込み中...</p></div>';
        }
    }
    
    // グローバル関数として公開
    window.loadEbayInventoryData = loadEbayInventoryData;
    
    console.log('📜 棚卸しシステム Stage 3.1: 簡素カード版 読み込み完了');
    
})();
