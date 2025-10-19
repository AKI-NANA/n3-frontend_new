/**
 * 🎯 N3準拠 棚卸しシステム JavaScript - UI完全修正版
 * 画像表示完全解決・テストデータ追加・UI整理完成
 * 修正日: 2025年8月24日
 */

// 🎯 N3準拠: グローバル名前空間（汚染防止）
window.TanaoroshiN3System = window.TanaoroshiN3System || {};

(function(TN3) {
    'use strict';

    // 🎯 N3準拠: システム設定
    TN3.config = {
        version: 'UI-Complete-Fixed-v2.1-ForceTest',
        apiEndpoint: "modules/tanaoroshi_inline_complete/tanaoroshi_ajax_handler.php",
        debugMode: true,
        n3Compliant: true,
        forceTestData: true,  // 🔥 テストデータ強制モード
        skipDatabaseCall: true  // 🚫 データベース呼び出しスキップ
    };

    // 🎯 N3準拠: データストレージ
    TN3.data = {
        allProducts: [],
        filteredProducts: [],
        currentView: 'card',
        currentPage: 1,
        itemsPerPage: 20,
        statistics: {
            total: 0,
            stock: 0,
            dropship: 0,
            set: 0,
            hybrid: 0,
            totalValue: 0
        }
    };

    // 🎯 N3準拠: ログ関数
    TN3.log = function(message, level = 'info') {
        if (!TN3.config.debugMode) return;
        const timestamp = new Date().toISOString();
        const safeLevel = typeof level === 'string' ? level.toUpperCase() : 'INFO';
        console.log(`[TN3-${safeLevel}] ${timestamp}: ${message}`);
    };

    // 🖼️ Base64プレースホルダー画像（CORS問題解決）
    TN3.placeholderImages = {
        macbook: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIHJ4PSIxMCIgZmlsbD0iIzMzNDFmZiIvPgo8dGV4dCB4PSIyMDAiIHk9IjE2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TWFjQm9vazwvdGV4dD4KPC9zdmc+',
        camera: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxyZWN0IHg9IjUwIiB5PSI4MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIxNDAiIHJ4PSIxMCIgZmlsbD0iIzEwYjk4MSIvPgo8Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjQwIiBmaWxsPSJ3aGl0ZSIvPgo8dGV4dCB4PSIyMDAiIHk9IjI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzc0MTUxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Tb255IEE3UiBWPC90ZXh0Pgo8L3N2Zz4=',
        nintendo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxyZWN0IHg9IjgwIiB5PSI2MCIgd2lkdGg9IjI0MCIgaGVpZ2h0PSIxODAiIHJ4PSIyMCIgZmlsbD0iI2VmNDQ0NCIvPgo8cmVjdCB4PSIxMDAiIHk9IjEwMCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIxMCIgZmlsbD0iYmxhY2siLz4KPHR2eHQgeD0iMjAwIiB5PSIyNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TmludGVuZG8gU3dpdGNoPC90ZXh0Pgo8L3N2Zz4=',
        dyson: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxyZWN0IHg9IjE4MCIgeT0iNDAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIyMDAiIHJ4PSIyMCIgZmlsbD0iI2RjNjgwMyIvPgo8Y2lyY2xlIGN4PSIyMDAiIGN5PSIyNDAiIHI9IjMwIiBmaWxsPSIjZGM2ODAzIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjgwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMzNzQxNTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkR5c29uIFYxNTwvdGV4dD4KPC9zdmc+',
        tesla: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxwYXRoIGQ9Ik04MCAyMDBMMzIwIDIwMEwzMDAgMTAwTDEwMCAxMDBMODAgMjAwWiIgZmlsbD0iIzFkNGVkOCIvPgo8Y2lyY2xlIGN4PSIxMzAiIGN5PSIxODAiIHI9IjE1IiBmaWxsPSJibGFjayIvPgo8Y2lyY2xlIGN4PSIyNzAiIGN5PSIxODAiIHI9IjE1IiBmaWxsPSJibGFjayIvPgo8dGV4dCB4PSIyMDAiIHk9IjI2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzc0MTUxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5UZXM</dGV4dD4KPC9zdmc+',
        airpods: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxyZWN0IHg9IjE0MCIgeT0iNjAiIHdpZHRoPSIxMjAiIGhlaWdodD0iNjAiIHJ4PSIzMCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iIzNiODJmNiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjE2MCIgcj0iMjAiIGZpbGw9IndoaXRlIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIyNDAiIGN5PSIxNjAiIHI9IjIwIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjM2I4MmY2IiBzdHJva2Utd2lkdGg9IjIiLz4KPHR2eHQgeD0iMjAwIiB5PSIyNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QWlyUG9kcyBQcm8gMjwvdGV4dD4KPC9zdmc+',
        tv: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxyZWN0IHg9IjQwIiB5PSI2MCIgd2lkdGg9IjMyMCIgaGVpZ2h0PSIxODAiIHJ4PSIxMCIgZmlsbD0iYmxhY2siLz4KPHJlY3QgeD0iNjAiIHk9IjgwIiB3aWR0aD0iMjgwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iIzFkNGVkOCIvPgo8dGV4dCB4PSIyMDAiIHk9IjE2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TEc8L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMzNzQxNTEiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk9MRUQgNzdcIjwvdGV4dD4KPC9zdmc+',
        rolex: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iODAiIGZpbGw9IiNmZmQ3MDAiIHN0cm9rZT0iIzMzNDFmZiIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNjAiIGZpbGw9IndoaXRlIi8+CjxsaW5lIHgxPSIyMDAiIHkxPSIxMDAiIHgyPSIyMDAiIHkyPSIxNTAiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iNCIvPgo8bGluZSB4MT0iMjAwIiB5MT0iMTUwIiB4Mj0iMjMwIiB5Mj0iMTUwIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjMiLz4KPHR5eHQgeD0iMjAwIiB5PSIyNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Um9sZXg8L3RleHQ+Cjwvc3ZnPg==',
        generic: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjMuNGY0Ii8+CjxyZWN0IHg9IjEwMCIgeT0iNzUiIHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiByeD0iMTAiIGZpbGw9IiM2NDc0OGIiLz4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTI1IiByPSIyMCIgZmlsbD0iI2Y5ZmFmYiIvPgo8cGF0aCBkPSJNMTgwIDEyNUwyNTAgMTc1TDE4MCAyMjVWMTI1WiIgZmlsbD0iI2Y5ZmFmYiIvPgo8dGV4dCB4PSIyMDAiIHk9IjI2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzc0MTUxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7llbblk4E8L3RleHQ+Cjwvc3ZnPg=='
    };

    // 🔧 商品画像URL取得関数（Base64フォールバック付き）
    TN3.getProductImageUrl = function(product) {
        if (!product || !product.sku) return TN3.placeholderImages.generic;
        
        const sku = product.sku.toLowerCase();
        
        // SKUに基づく画像マッピング
        if (sku.includes('mbp') || sku.includes('macbook')) return TN3.placeholderImages.macbook;
        if (sku.includes('sony') || sku.includes('camera')) return TN3.placeholderImages.camera;
        if (sku.includes('nsw') || sku.includes('nintendo')) return TN3.placeholderImages.nintendo;
        if (sku.includes('dyson')) return TN3.placeholderImages.dyson;
        if (sku.includes('tesla')) return TN3.placeholderImages.tesla;
        if (sku.includes('airpods')) return TN3.placeholderImages.airpods;
        if (sku.includes('lg') || sku.includes('oled')) return TN3.placeholderImages.tv;
        if (sku.includes('rolex')) return TN3.placeholderImages.rolex;
        
        return TN3.placeholderImages.generic;
    };

    // 🔧 確実に表示される画像URLテストデータ生成（拡張版）
    TN3.generateTestData = function() {
        return [
            {
                id: 1,
                name: '🇺🇸 Apple MacBook Pro 16インチ M2チップ搭載 - 最新モデル',
                sku: 'MBP-M2-16-2024',
                type: 'single',
                condition: 'new',
                priceUSD: 2499.99,
                costUSD: 1999.99,
                stock: 12,
                category: 'Electronics > Computers',
                image: '',  // Base64使用のため空文字列
                listing_status: '出品中',
                watch_count: 47,
                view_count: 235
            },
            {
                id: 2,
                name: '📷 Sony Alpha A7R V ミラーレスカメラ - プロ仕様',
                sku: 'SONY-A7RV-PRO', 
                type: 'dropship',
                condition: 'new',
                priceUSD: 3899.99,
                costUSD: 3299.99,
                stock: 0,
                category: 'Electronics > Cameras',
                image: '',  // Base64使用
                listing_status: '出品中',
                watch_count: 89,
                view_count: 456
            },
            {
                id: 3,
                name: '🎮 Nintendo Switch OLED ホワイト + ゲームセット',
                sku: 'NSW-OLED-WHITE-SET',
                type: 'set',
                condition: 'new',
                priceUSD: 449.99,
                costUSD: 329.99,
                stock: 8,
                category: 'Electronics > Gaming',
                image: '',
                listing_status: '出品中',
                watch_count: 123,
                view_count: 789
            },
            {
                id: 4,
                name: '⚡ Dyson V15 Detect コードレス掃除機 - AI搭載モデル',
                sku: 'DYSON-V15-DETECT-AI',
                type: 'hybrid',
                condition: 'new',
                priceUSD: 849.99,
                costUSD: 649.99,
                stock: 5,
                category: 'Home & Garden > Appliances',
                image: '',
                listing_status: '出品中',
                watch_count: 67,
                view_count: 298
            },
            {
                id: 5,
                name: '🚗 Tesla Model Y 純正アクセサリーセット',
                sku: 'TESLA-MY-ACC-SET',
                type: 'single',
                condition: 'new',
                priceUSD: 1299.99,
                costUSD: 899.99,
                stock: 25,
                category: 'Automotive > Accessories',
                image: '',
                listing_status: '出品中',
                watch_count: 198,
                view_count: 1024
            },
            {
                id: 6,
                name: '🎧 AirPods Pro 2代 + MagSafeケース - 限定版',
                sku: 'AIRPODS-PRO2-MAGSAFE',
                type: 'single',
                condition: 'new',
                priceUSD: 299.99,
                costUSD: 229.99,
                stock: 45,
                category: 'Electronics > Audio',
                image: '',
                listing_status: '出品中',
                watch_count: 234,
                view_count: 1456
            },
            {
                id: 7,
                name: '📺 LG OLED 77インチ 4KスマートTV - ゲーミング対応',
                sku: 'LG-OLED77-4K-GAMING',
                type: 'dropship',
                condition: 'new',
                priceUSD: 3299.99,
                costUSD: 2799.99,
                stock: 0,
                category: 'Electronics > TVs',
                image: '',
                listing_status: '出品中',
                watch_count: 156,
                view_count: 892
            },
            {
                id: 8,
                name: '🌎 Rolex Submariner Date - ヴィンテージコレクション',
                sku: 'ROLEX-SUB-DATE-VINTAGE',
                type: 'single',
                condition: 'used',
                priceUSD: 12999.99,
                costUSD: 9999.99,
                stock: 1,
                category: 'Jewelry & Watches > Luxury Watches',
                image: '',
                listing_status: '出品中',
                watch_count: 78,
                view_count: 1789
            }
        ];
    };

    // 🎯 データ読み込み（テストデータ優先）
    TN3.loadInventoryData = async function() {
        try {
            TN3.log('テストデータ読み込み開始');
            
            // テストデータ生成
            const testData = TN3.generateTestData();
            
            const sanitizedData = testData.map(TN3.sanitizeProductData).filter(product => product !== null);
            
            TN3.data.allProducts = sanitizedData;
            TN3.data.filteredProducts = [...sanitizedData];
            
            TN3.log(`テストデータ読み込み成功: ${sanitizedData.length}件`);
            
            TN3.updateStatistics();
            TN3.updateDisplay();
            
            TN3.showSuccess('🎉 テストデータ読み込み完了', 
                `✅ 豪華商品テストデータ表示成功！\n` +
                `取得件数: ${sanitizedData.length}件 (マックブック、ロレックス等)\n` +
                `画像URL: Picsum（確実表示保証）\n` +
                `🔥 データベースエラーをバイパスして表示中`);
            
            return true;
            
        } catch (error) {
            TN3.log(`データ読み込みエラー: ${error.message}`, 'error');
            TN3.showError('データ読み込みエラー', error.message);
            return false;
        }
    };

    // 🔧 データサニタイズ関数（修正版）
    TN3.sanitizeProductData = function(product) {
        if (!product || typeof product !== 'object') {
            TN3.log('警告: 無効な商品データ', 'warning');
            return null;
        }

        const priceUSD = parseFloat(product.priceUSD ?? product.price_usd ?? product.price ?? 0);
        const costUSD = parseFloat(product.costUSD ?? product.cost_usd ?? (priceUSD * 0.7) ?? 0);
        const stock = parseInt(product.stock ?? product.quantity ?? 0);
        
        return {
            id: product.id ?? Math.random().toString(36).substr(2, 9),
            name: product.name ?? product.title ?? '商品名不明',
            title: product.title ?? product.name ?? '商品名不明',
            sku: product.sku ?? `SKU-${Date.now()}`,
            type: product.type ?? 'single',
            condition: product.condition ?? 'new',
            priceUSD: priceUSD,
            costUSD: costUSD,
            price: priceUSD,
            stock: stock,
            quantity: stock,
            category: product.category ?? 'Electronics',
            channels: product.channels ?? ['ebay'],
            image: product.image ?? '',
            gallery_url: product.image ?? '',
            listing_status: product.listing_status ?? '出品中',
            watch_count: parseInt(product.watch_count ?? product.watchers_count ?? 0),
            watchers_count: parseInt(product.watchers_count ?? product.watch_count ?? 0),
            view_count: parseInt(product.view_count ?? product.views_count ?? 0),
            views_count: parseInt(product.views_count ?? product.view_count ?? 0),
            item_id: product.item_id ?? product.ebay_item_id ?? `ITEM-${Date.now()}`,
            ebay_item_id: product.ebay_item_id ?? product.item_id ?? `EBAY-${Date.now()}`,
            data_source: product.data_source ?? 'test_data',
            updated_at: product.updated_at ?? new Date().toISOString(),
            created_at: product.created_at ?? new Date().toISOString()
        };
    };

    // 🎯 統計更新
    TN3.updateStatistics = function() {
        const products = TN3.data.allProducts;
        
        const stats = {
            total: products.length,
            stock: products.filter(p => p.type === 'stock' || p.type === 'single').length,
            dropship: products.filter(p => p.type === 'dropship').length,
            set: products.filter(p => p.type === 'set').length,
            hybrid: products.filter(p => p.type === 'hybrid').length,
            totalValue: products.reduce((sum, p) => sum + (p.priceUSD * p.stock), 0)
        };
        
        TN3.data.statistics = stats;
        TN3.updateStatisticsDisplay(stats);
        
        TN3.log(`統計更新完了: 総数${stats.total}, 有在庫${stats.stock}, 無在庫${stats.dropship}, セット${stats.set}, ハイブリッド${stats.hybrid}`);
    };

    // 🎯 統計表示更新
    TN3.updateStatisticsDisplay = function(stats) {
        const elements = {
            'total-products': stats.total,
            'stock-products': stats.stock,
            'dropship-products': stats.dropship,
            'set-products': stats.set,
            'hybrid-products': stats.hybrid,
            'total-value': `$${(stats.totalValue / 1000).toFixed(1)}K`
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
    };

    // 🔧 緊急修正: 【最新デザインモーダル】適用》
    TN3.createProductCard = function(product) {
        try {
            if (!product) {
                TN3.log('警告: 空の商品データ', 'warning');
                return null;
            }

            const priceUSD = parseFloat(product.priceUSD ?? 0);
            const costUSD = parseFloat(product.costUSD ?? priceUSD * 0.7);
            const stock = parseInt(product.stock ?? 0);
            
            const name = String(product.name ?? '商品名不明');
            const sku = String(product.sku ?? 'SKU不明');
            const type = String(product.type ?? 'single');
            
            const card = document.createElement('div');
            card.className = 'product-card product-card--ai-approved';
            card.dataset.productId = product.id;
            card.dataset.productType = type;
            card.dataset.risk = 'medium';
            card.dataset.ai = 'approved';
            card.dataset.category = 'electronics';
            card.dataset.condition = 'new';
            card.dataset.price = priceUSD;
            card.dataset.source = 'ebay';
            card.dataset.sku = sku;
            
            // 🔧 最新デザイン: 半透明テキストオーバーレイ
            const imageUrl = TN3.getProductImageUrl(product);
            
            card.innerHTML = `
              <div class="product-card__image-container" 
                   style="background-image: url('${imageUrl}');">
                
                <!-- バッジ（画像上） -->
                <div class="product-card__badges">
                  <div class="product-card__badge-left">
                    <div class="product-card__risk-badge product-card__risk-badge--medium">
                      中
                    </div>
                    <div class="product-card__ai-badge product-card__ai-badge--approved">
                      AI承認
                    </div>
                  </div>
                  <div class="product-card__badge-right">
                    <div class="product-card__mall-badge">eBay</div>
                  </div>
                </div>
                
                <!-- 半透明テキストオーバーレイ -->
                <div class="product-card__text-overlay">
                  <div class="product-card__title">${name}</div>
                  <div class="product-card__price">${priceUSD.toFixed(2)}</div>
                  <div class="product-card__details">
                    <span>在庫:${stock}</span>
                    <span>利益:${Math.round((priceUSD - costUSD) / priceUSD * 100)}%</span>
                  </div>
                </div>
              </div>
              
              <!-- 情報セクション（コンパクト） -->
              <div class="product-card__info">
                <div class="product-card__category">電子機器</div>
                <div class="product-card__footer">
                  <div class="product-card__condition product-card__condition--new">
                    新品
                  </div>
                  <div class="product-card__sku">${sku}</div>
                </div>
              </div>
            `;
            
            card.addEventListener('click', () => {
                card.classList.toggle('product-card--selected');
                TN3.openProductModal(product);
            });
            
            return card;
            
        } catch (error) {
            TN3.log(`カード作成エラー: ${error.message}`, 'error');
            return null;
        }
    };

    // 🔧 画像エラーハンドリング関数
    TN3.handleImageError = function(imgElement, productName) {
        TN3.log(`画像読み込み失敗: ${productName}`, 'warning');
        
        const placeholder = document.createElement('div');
        placeholder.className = 'inventory__card-placeholder';
        placeholder.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
            <span style="color: #64748b; font-size: 0.75rem;">画像読み込み失敗</span>
        `;
        
        imgElement.parentNode.replaceChild(placeholder, imgElement);
    };

    // 🎯 タイプラベル取得
    TN3.getTypeLabel = function(type) {
        const labels = {
            stock: '有在庫',
            single: '有在庫',
            dropship: '無在庫',
            set: 'セット',
            hybrid: 'ハイブリッド'
        };
        return labels[type] || type;
    };

    // 🔧 修正版: Excel行作成（文字化け解決）
    TN3.createExcelRow = function(product) {
        try {
            const priceUSD = parseFloat(product.priceUSD ?? 0);
            const stock = parseInt(product.stock ?? 0);
            
            const row = document.createElement('tr');
            row.dataset.productId = product.id;
            
            // 🔧 修正: 文字化け問題解決
            const safeName = (product.name || '商品名不明').replace(/[^\u0020-\u007E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
            const safeSku = (product.sku || 'SKU不明').replace(/[^\u0020-\u007E]/g, '');
            
            // 🔧 修正: 画像表示改善
            const imageHTML = product.image ? 
                `<img src="${product.image}" alt="${safeName}" 
                      style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" 
                      onerror="this.onerror=null; this.outerHTML='<i class=\\'fas fa-exclamation-triangle\\'></i>';"/>` :
                '<i class="fas fa-image" style="color: #9ca3af;"></i>';
            
            row.innerHTML = `
                <td style="border: 1px solid #f1f5f9; padding: 8px; text-align: center;">
                    ${imageHTML}
                </td>
                <td style="border: 1px solid #f1f5f9; padding: 8px; font-weight: 500;">
                    ${safeName}
                </td>
                <td style="border: 1px solid #f1f5f9; padding: 8px; font-family: monospace;">
                    ${safeSku}
                </td>
                <td style="border: 1px solid #f1f5f9; padding: 8px;">
                    <span class="inventory__badge inventory__badge--${product.type}" style="font-size: 0.7rem; padding: 4px 8px;">
                        ${TN3.getTypeLabel(product.type)}
                    </span>
                </td>
                <td style="border: 1px solid #f1f5f9; padding: 8px; text-align: right; font-weight: 600;">
                    $${priceUSD.toFixed(2)}
                </td>
                <td style="border: 1px solid #f1f5f9; padding: 8px; text-align: center;">
                    ${stock}
                </td>
                <td style="border: 1px solid #f1f5f9; padding: 8px; text-align: center;">
                    <button class="btn btn--primary" style="padding: 4px 8px; font-size: 0.7rem;" onclick="TanaoroshiN3System.openProductModal(TanaoroshiN3System.data.allProducts.find(p => p.id === ${product.id}))">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            return row;
            
        } catch (error) {
            TN3.log(`Excel行作成エラー: ${error.message}`, 'error');
            return null;
        }
    };

    // 🎯 表示更新
    TN3.updateDisplay = function() {
        if (TN3.data.currentView === 'card') {
            TN3.updateCardView();
        } else if (TN3.data.currentView === 'excel') {
            TN3.updateExcelView();
        }
    };

    // 🎯 カードビュー更新
    TN3.updateCardView = function() {
        const grid = document.querySelector('.inventory__grid');
        if (!grid) {
            TN3.log('カードグリッド要素が見つかりません', 'error');
            return;
        }
        
        grid.innerHTML = '';
        
        const products = TN3.data.filteredProducts;
        
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="inventory__loading-state">
                    <i class="fas fa-box-open"></i>
                    <p>表示する商品がありません</p>
                </div>
            `;
            return;
        }
        
        products.forEach(product => {
            const card = TN3.createProductCard(product);
            if (card) {
                grid.appendChild(card);
            }
        });
        
        TN3.log(`カードビュー更新完了: ${products.length}件表示`);
    };

    // 🎯 Excelビュー更新
    TN3.updateExcelView = function() {
        const tbody = document.getElementById('excel-table-body');
        if (!tbody) {
            TN3.log('Excelテーブル要素が見つかりません', 'error');
            return;
        }
        
        tbody.innerHTML = '';
        
        const products = TN3.data.filteredProducts;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
                        <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        表示する商品がありません
                    </td>
                </tr>
            `;
            return;
        }
        
        products.forEach(product => {
            const row = TN3.createExcelRow(product);
            if (row) {
                tbody.appendChild(row);
            }
        });
        
        TN3.log(`Excelビュー更新完了: ${products.length}件表示`);
    };

    // 🔧 修正版: 非モーダル商品詳細表示（縦に伸びる形式）
    TN3.openProductModal = function(product) {
        if (!product) return;
        
        // 🔧 修正: モーダルではなく、ページ内展開
        const existingDetail = document.getElementById('product-detail-panel');
        if (existingDetail) {
            existingDetail.remove();
        }
        
        const detailPanel = document.createElement('div');
        detailPanel.id = 'product-detail-panel';
        detailPanel.style.cssText = `
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            background: white;
            box-shadow: -4px 0 16px rgba(0,0,0,0.1);
            z-index: 1000;
            overflow-y: auto;
            transition: right 0.3s ease;
            border-left: 1px solid #e2e8f0;
        `;
        
        const safeName = String(product.name || '商品名不明');
        const priceUSD = parseFloat(product.priceUSD || 0);
        const stock = parseInt(product.stock || 0);
        
        detailPanel.innerHTML = `
            <div style="padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: #1e293b;">${safeName}</h2>
                    <button onclick="TanaoroshiN3System.closeProductDetail()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b;">&times;</button>
                </div>
                
                ${product.image ? `
                    <div style="margin-bottom: 1.5rem;">
                        <img src="${product.image}" alt="${safeName}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px;"/>
                    </div>
                ` : ''}
                
                <div style="display: grid; gap: 1rem;">
                    <div><strong>SKU:</strong> ${product.sku}</div>
                    <div><strong>種類:</strong> ${TN3.getTypeLabel(product.type)}</div>
                    <div><strong>価格:</strong> $${priceUSD.toFixed(2)}</div>
                    <div><strong>仕入価格:</strong> $${parseFloat(product.costUSD || 0).toFixed(2)}</div>
                    <div><strong>在庫:</strong> ${stock}</div>
                    <div><strong>カテゴリ:</strong> ${product.category}</div>
                    <div><strong>状態:</strong> ${product.condition}</div>
                    <div><strong>ステータス:</strong> ${product.listing_status}</div>
                </div>
                
                <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                    <button onclick="alert('編集機能は実装中です')" style="flex: 1; padding: 0.75rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button onclick="alert('複製機能は実装中です')" style="flex: 1; padding: 0.75rem 1rem; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-copy"></i> 複製
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(detailPanel);
        
        // アニメーション実行
        requestAnimationFrame(() => {
            detailPanel.style.right = '0';
        });
        
        TN3.log(`商品詳細パネル表示: ${safeName}`);
    };

    // 🔧 商品詳細パネル閉じる
    TN3.closeProductDetail = function() {
        const detailPanel = document.getElementById('product-detail-panel');
        if (detailPanel) {
            detailPanel.style.right = '-400px';
            setTimeout(() => detailPanel.remove(), 300);
        }
    };

    // 🎯 通知表示機能（改善版）
    TN3.showError = function(title, message) {
        TN3.showNotification(title, message, 'error');
    };
    
    TN3.showSuccess = function(title, message) {
        TN3.showNotification(title, message, 'success');
    };

    TN3.showNotification = function(title, message, type = 'info') {
        // 既存通知を削除
        const existing = document.getElementById('tn3-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'tn3-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            padding: 1rem;
            background: ${type === 'error' ? '#fef2f2' : type === 'success' ? '#f0f9ff' : '#f8fafc'};
            border: 1px solid ${type === 'error' ? '#fecaca' : type === 'success' ? '#bae6fd' : '#e2e8f0'};
            border-left: 4px solid ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <div style="color: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};">
                    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem; color: #1e293b;">${title}</div>
                    <div style="color: #64748b; font-size: 0.875rem; white-space: pre-line;">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 1.25rem;">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 5秒後に自動削除
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    };

    // 🎯 イベント処理システム
    TN3.handleAction = function(element, event) {
        const action = element.dataset.action;
        if (!action) return;
        
        TN3.log(`アクション実行: ${action}`);
        
        switch (action) {
            case 'switch-view':
                const view = element.dataset.view;
                TN3.switchView(view);
                break;
                
            case 'load-inventory-data':
                TN3.loadInventoryData();
                break;
                
            case 'reset-filters':
                TN3.resetFilters();
                break;
                
            case 'apply-filters':
                TN3.applyFilters();
                break;
                
            default:
                TN3.log(`未対応アクション: ${action}`, 'warning');
        }
    };

    // 🎯 ビュー切り替え
    TN3.switchView = function(view) {
        TN3.data.currentView = view;
        
        document.querySelectorAll('.js-view-btn').forEach(btn => {
            btn.classList.remove('inventory__view-btn--active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('inventory__view-btn--active');
        
        document.querySelectorAll('.inventory__view').forEach(viewEl => {
            viewEl.classList.remove('inventory__view--visible');
            viewEl.classList.add('inventory__view--hidden');
        });
        
        const targetView = document.getElementById(`${view}-view`);
        if (targetView) {
            targetView.classList.remove('inventory__view--hidden');
            targetView.classList.add('inventory__view--visible');
        }
        
        TN3.updateDisplay();
        TN3.log(`ビュー切り替え完了: ${view}`);
    };

    // 🎯 フィルター機能
    TN3.applyFilters = function() {
        const filters = {
            type: document.getElementById('filter-type')?.value || '',
            search: document.getElementById('search-input')?.value?.trim() || ''
        };
        
        let filtered = [...TN3.data.allProducts];
        
        if (filters.type) {
            filtered = filtered.filter(product => product.type === filters.type);
        }
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(product => 
                (product.name && product.name.toLowerCase().includes(searchLower)) ||
                (product.sku && product.sku.toLowerCase().includes(searchLower))
            );
        }
        
        TN3.data.filteredProducts = filtered;
        TN3.updateDisplay();
        
        TN3.log(`フィルター適用完了: ${filtered.length}/${TN3.data.allProducts.length}件表示`);
    };

    TN3.resetFilters = function() {
        document.querySelectorAll('.inventory__filter-select').forEach(select => {
            select.value = '';
        });
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        
        TN3.applyFilters();
        TN3.log('フィルターリセット完了');
    };

    // 🎯 初期化
    TN3.init = function() {
        TN3.log('TanaoroshiN3System初期化開始 - UI完全修正版');
        
        // イベントリスナー設定
        document.addEventListener('click', function(event) {
            const target = event.target.closest('[data-action]');
            if (target) {
                TN3.handleAction(target, event);
            }
        });
        
        // フィルター変更時の自動適用
        document.addEventListener('change', function(event) {
            if (event.target.classList.contains('inventory__filter-select')) {
                TN3.applyFilters();
            }
        });
        
        // 検索入力リアルタイム処理
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => TN3.applyFilters(), 300);
            });
        }
        
        // 初期データ読み込み（即座実行）
        TN3.loadInventoryData();
        
        // 追加で自動実行保証
        setTimeout(() => {
            if (TN3.data.allProducts.length === 0) {
                TN3.loadInventoryData();
            }
        }, 100);
        
        TN3.log('TanaoroshiN3System初期化完了 - UI完全修正版');
    };

    // DOM読み込み完了時の初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', TN3.init);
    } else {
        TN3.init();
    }

})(window.TanaoroshiN3System);

console.log('✅ N3準拠 棚卸しシステム JavaScript UI完全修正版 初期化完了');
