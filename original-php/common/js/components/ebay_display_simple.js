/**
 * EbayImageDisplay - 構文エラー回避版
 */

function displayEbayImages() {
    console.log('eBay画像表示システム開始');
    
    // データ取得と表示
    fetch('/modules/ebay_test_viewer/database_postgresql_array.php')
        .then(response => response.json())
        .then(result => {
            if (result.success && result.products) {
                console.log('データ取得成功:', result.count + '件');
                renderProductCards(result.products);
            } else {
                console.error('データ取得失敗');
            }
        })
        .catch(error => {
            console.error('通信エラー:', error);
        });
}

function renderProductCards(products) {
    // コンテナを探すか作成
    let container = document.getElementById('sample-data') || 
                   document.getElementById('cards-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'ebay-display-container';
        document.body.appendChild(container);
    }
    
    // HTML生成
    let html = '<div class="ebay-header">eBay商品画像表示システム (' + products.length + '件)</div>';
    html += '<div class="ebay-grid">';
    
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const imageUrl = product.image_urls && product.image_urls[0] ? product.image_urls[0] : '';
        const price = product.current_price_value || '0.00';
        
        html += '<div class="ebay-card" onclick="showDetail(' + i + ')">';
        html += '  <img src="' + imageUrl + '" alt="商品画像" class="ebay-img">';
        html += '  <div class="ebay-info">';
        html += '    <h3>' + (product.title || 'タイトルなし') + '</h3>';
        html += '    <p class="price">$' + price + '</p>';
        html += '  </div>';
        html += '</div>';
    }
    
    html += '</div>';
    
    // CSS追加
    html += '<style>';
    html += '.ebay-header { text-align: center; padding: 20px; background: #059669; color: white; border-radius: 8px; margin-bottom: 20px; }';
    html += '.ebay-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }';
    html += '.ebay-card { background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; cursor: pointer; transition: transform 0.3s ease; }';
    html += '.ebay-card:hover { transform: translateY(-4px); }';
    html += '.ebay-img { width: 100%; height: 200px; object-fit: cover; }';
    html += '.ebay-info { padding: 15px; }';
    html += '.ebay-info h3 { margin: 0 0 10px 0; font-size: 14px; line-height: 1.3; }';
    html += '.price { font-weight: bold; color: #059669; margin: 0; font-size: 18px; }';
    html += '</style>';
    
    container.innerHTML = html;
    
    // グローバル関数設定
    window.currentProducts = products;
    window.showDetail = function(index) {
        const product = products[index];
        alert('商品詳細:\n' + product.title + '\n価格: $' + product.current_price_value);
    };
    
    console.log('画像表示完了:', products.length + '件');
}

// 実行
displayEbayImages();

console.log('eBay画像表示システム読み込み完了');
