/**
 * 棚卸しシステム JavaScript - 根本的解決版
 * 最小限DOM操作 + 遅延読み込み戦略
 */

(function() {
    'use strict';
    
    console.log('🚀 棚卸しシステム 根本的解決版 読み込み開始');
    
    // 最小限のグローバル変数
    var TanaoroshiSimple = {
        isInitialized: false,
        products: [],
        container: null
    };
    
    // 一回限り初期化
    document.addEventListener('DOMContentLoaded', function() {
        if (TanaoroshiSimple.isInitialized) return;
        TanaoroshiSimple.isInitialized = true;
        
        console.log('📱 根本的解決版 初期化開始');
        
        TanaoroshiSimple.container = document.getElementById('card-view');
        if (!TanaoroshiSimple.container) {
            console.error('❌ card-view要素が見つかりません');
            return;
        }
        
        // 即座にローディング表示
        showSimpleLoading();
        
        // 5秒後にデータ取得開始
        setTimeout(startDataLoad, 5000);
        
        console.log('✅ 根本的解決版 初期化完了');
    });
    
    // シンプルローディング表示
    function showSimpleLoading() {
        if (!TanaoroshiSimple.container) return;
        
        TanaoroshiSimple.container.innerHTML = [
            '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">',
            '<div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>',
            '<h3>根本的解決版でデータ読み込み中...</h3>',
            '<p>新しいアプローチでエラーを回避します</p>',
            '</div>'
        ].join('');
    }
    
    // データ取得開始
    function startDataLoad() {
        console.log('📂 根本的解決版 データ取得開始');
        
        if (typeof window.executeAjax === 'function') {
            console.log('🔗 N3 Ajax関数を使用してデータ取得');
            
            window.executeAjax('ebay_inventory_get_data', {
                page: 'tanaoroshi_inline_complete',
                limit: 20,
                with_images: false  // 画像なしで安全性向上
            }).then(function(result) {
                console.log('📊 Ajax応答受信:', result);
                handleSuccessResponse(result);
            }).catch(function(error) {
                console.error('❌ Ajax エラー:', error);
                showFallbackData();
            });
        } else {
            console.log('⚠️ N3 Ajax関数が使用できません');
            showFallbackData();
        }
    }
    
    // 成功応答処理
    function handleSuccessResponse(result) {
        if (result && result.success && result.data && Array.isArray(result.data)) {
            if (result.data.length > 0) {
                console.log('✅ データ取得成功:', result.data.length, '件');
                TanaoroshiSimple.products = result.data;
                showMinimalCards();
            } else {
                console.log('⚠️ データが空です');
                showFallbackData();
            }
        } else {
            console.error('❌ データ構造エラー');
            showFallbackData();
        }
    }
    
    // 最小限カード表示
    function showMinimalCards() {
        console.log('🎨 最小限カード表示開始');
        
        if (!TanaoroshiSimple.container) return;
        
        var html = '<div style="grid-column: 1 / -1; margin-bottom: 2rem; text-align: center;">';
        html += '<h3>✅ 根本的解決版 動作成功！</h3>';
        html += '<p>データ件数: ' + TanaoroshiSimple.products.length + '件</p>';
        html += '</div>';
        
        // 最小限のカード（DOM操作を最小化）
        for (var i = 0; i < Math.min(TanaoroshiSimple.products.length, 10); i++) {
            var item = TanaoroshiSimple.products[i];
            html += createMinimalCard(item, i);
        }
        
        // 一回のDOM操作で完了
        TanaoroshiSimple.container.innerHTML = html;
        
        // 統計情報更新
        updateSimpleStats();
        
        console.log('✅ 最小限カード表示完了');
    }
    
    // 最小限カード作成
    function createMinimalCard(item, index) {
        var title = item.title || item.name || 'タイトル不明';
        var price = item.price || item.start_price || 0;
        var quantity = item.quantity || item.available_quantity || 0;
        var sku = item.sku || 'SKU-' + (index + 1);
        
        return [
            '<div class="inventory__card" style="height: 220px;">',
            '<div class="inventory__card-image" style="background: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 120px;">',
            '<div style="text-align: center; color: #64748b;">',
            '<div style="font-size: 2rem;">📦</div>',
            '<div style="font-size: 0.8rem;">No Image</div>',
            '</div>',
            '</div>',
            '<div class="inventory__card-info" style="padding: 1rem;">',
            '<h3 style="font-size: 0.9rem; margin: 0 0 0.5rem 0; height: 2.5rem; overflow: hidden;">' + title.substring(0, 50) + (title.length > 50 ? '...' : '') + '</h3>',
            '<div style="font-size: 1.1rem; font-weight: bold; color: #059669; margin-bottom: 0.5rem;">$' + parseFloat(price).toFixed(2) + '</div>',
            '<div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #64748b;">',
            '<span>' + sku + '</span>',
            '<span>在庫:' + quantity + '</span>',
            '</div>',
            '</div>',
            '</div>'
        ].join('');
    }
    
    // フォールバックデータ表示
    function showFallbackData() {
        console.log('🔄 フォールバックデータ表示');
        
        if (!TanaoroshiSimple.container) return;
        
        var html = '<div style="grid-column: 1 / -1; margin-bottom: 2rem; text-align: center;">';
        html += '<h3>📋 根本的解決版 フォールバック動作</h3>';
        html += '<p>Ajax接続できないため、サンプルデータを表示</p>';
        html += '</div>';
        
        var sampleData = [
            { title: 'iPhone 15 Pro Max - Sample', price: 299.99, quantity: 3, sku: 'SAMPLE-001' },
            { title: 'Samsung Galaxy S24 - Sample', price: 499.99, quantity: 1, sku: 'SAMPLE-002' },
            { title: 'MacBook Pro M3 - Sample', price: 799.99, quantity: 2, sku: 'SAMPLE-003' }
        ];
        
        for (var i = 0; i < sampleData.length; i++) {
            html += createMinimalCard(sampleData[i], i);
        }
        
        TanaoroshiSimple.container.innerHTML = html;
        TanaoroshiSimple.products = sampleData;
        updateSimpleStats();
        
        console.log('✅ フォールバックデータ表示完了');
    }
    
    // 簡単統計更新
    function updateSimpleStats() {
        var totalEl = document.getElementById('total-products');
        var stockEl = document.getElementById('stock-products');
        var valueEl = document.getElementById('total-value');
        
        if (totalEl) totalEl.textContent = TanaoroshiSimple.products.length;
        if (stockEl) {
            var stockCount = 0;
            for (var i = 0; i < TanaoroshiSimple.products.length; i++) {
                var qty = parseInt(TanaoroshiSimple.products[i].quantity || TanaoroshiSimple.products[i].available_quantity || 0);
                if (qty > 0) stockCount++;
            }
            stockEl.textContent = stockCount;
        }
        if (valueEl) {
            var totalValue = 0;
            for (var i = 0; i < TanaoroshiSimple.products.length; i++) {
                var price = parseFloat(TanaoroshiSimple.products[i].price || TanaoroshiSimple.products[i].start_price || 0);
                totalValue += price;
            }
            valueEl.textContent = '$' + Math.round(totalValue);
        }
        
        console.log('📈 簡単統計更新完了');
    }
    
    // グローバル関数（最小限）
    window.loadEbayInventoryData = startDataLoad;
    
    console.log('🚀 棚卸しシステム 根本的解決版 読み込み完了');
    
})();
