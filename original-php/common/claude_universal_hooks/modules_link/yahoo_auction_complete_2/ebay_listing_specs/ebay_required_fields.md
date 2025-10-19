# eBay出品必須項目完全仕様書

## 必須フィールド (Required)
```javascript
const ebayRequiredFields = [
    { key: 'title_en', label: 'タイトル (英語)', maxLength: 80, required: true },
    { key: 'category_id', label: 'カテゴリID', type: 'number', required: true },
    { key: 'condition_id', label: '商品状態', options: ['1000', '1500', '2000', '2500', '3000', '4000', '5000', '7000'], required: true },
    { key: 'listing_type', label: '販売形式', options: ['FixedPriceItem', 'Auction'], required: true },
    { key: 'quantity', label: '数量', type: 'number', min: 1, required: true },
    { key: 'start_price', label: '開始価格 (USD)', type: 'currency', required: true },
    { key: 'country', label: '発送国', default: 'JP', required: true },
    { key: 'currency', label: '通貨', default: 'USD', required: true },
    { key: 'dispatch_time_max', label: '発送日数', type: 'number', default: 3, required: true }
];
```

## 推奨フィールド (Recommended)
```javascript
const ebayRecommendedFields = [
    { key: 'description_en', label: '商品説明 (HTML)', type: 'html', maxLength: 500000 },
    { key: 'gallery_plus', label: 'ギャラリープラス', type: 'boolean', fee: 0.35 },
    { key: 'bold_title', label: 'タイトル太字', type: 'boolean', fee: 4.00 },
    { key: 'subtitle', label: 'サブタイトル', maxLength: 55, fee: 1.50 },
    { key: 'private_listing', label: '入札者匿名', type: 'boolean' },
    { key: 'best_offer_enabled', label: 'ベストオファー', type: 'boolean' },
    { key: 'auto_pay', label: '即座支払い要求', type: 'boolean' },
    { key: 'payment_methods', label: '支払方法', type: 'array', default: ['PayPal'] }
];
```

## 配送設定フィールド (Shipping)
```javascript
const ebayShippingFields = [
    { key: 'shipping_type', label: '配送タイプ', options: ['Flat', 'Calculated'], required: true },
    { key: 'shipping_service', label: '配送サービス', required: true },
    { key: 'shipping_cost', label: '配送料 (USD)', type: 'currency' },
    { key: 'additional_shipping_cost', label: '追加配送料', type: 'currency' },
    { key: 'international_shipping', label: '国際配送', type: 'boolean' },
    { key: 'exclude_ship_locations', label: '配送除外地域', type: 'array' },
    { key: 'handling_time', label: '処理時間 (日)', type: 'number', default: 1 }
];
```

## 商品属性フィールド (Item Specifics)
```javascript
const ebayItemSpecifics = [
    { key: 'brand', label: 'ブランド', required_categories: ['electronics', 'clothing'] },
    { key: 'model', label: 'モデル' },
    { key: 'color', label: '色' },
    { key: 'size', label: 'サイズ' },
    { key: 'material', label: '素材' },
    { key: 'country_manufacture', label: '製造国' },
    { key: 'warranty', label: '保証' },
    { key: 'upc', label: 'UPC/EAN/ISBN' },
    { key: 'mpn', label: 'メーカー品番' }
];
```

## 価格計算フィールド
```javascript
const pricingFields = [
    { key: 'cost_price_jpy', label: '仕入価格 (円)', type: 'currency', required: true },
    { key: 'domestic_shipping_jpy', label: '国内送料 (円)', type: 'currency', required: true },
    { key: 'exchange_rate', label: '為替レート', type: 'number', auto_fetch: true },
    { key: 'ebay_fee_percent', label: 'eBay手数料率', type: 'percent', default: 12.9 },
    { key: 'paypal_fee_percent', label: 'PayPal手数料率', type: 'percent', default: 4.1 },
    { key: 'profit_margin_percent', label: '利益率目標', type: 'percent', default: 30 },
    { key: 'calculated_price_usd', label: '計算価格 (USD)', type: 'currency', readonly: true }
];
```

## データソース識別フィールド
```javascript
const sourceIdentificationFields = [
    { key: 'source_platform', label: '取得元', options: ['yahoo_auction', 'mercari', 'rakuten'], required: true },
    { key: 'source_listing_type', label: '販売形式', options: ['auction', 'fixed_price', 'buy_now'] },
    { key: 'source_url', label: '元URL', type: 'url' },
    { key: 'source_id', label: '元商品ID' },
    { key: 'scrape_timestamp', label: '取得日時', type: 'datetime' }
];
```

## ステータス管理フィールド
```javascript
const statusFields = [
    { key: 'status_jp', label: 'ステータス', options: [
        '取得済み', '価格計算済み', 'フィルター通過', '出品準備完了', 
        '出品済み', '販売中', '売切れ', 'エラー', '停止中'
    ]},
    { key: 'filter_passed', label: 'フィルター通過', type: 'boolean' },
    { key: 'price_calculated', label: '価格計算済み', type: 'boolean' },
    { key: 'ready_to_list', label: '出品準備完了', type: 'boolean' },
    { key: 'ebay_item_id', label: 'eBay商品ID' },
    { key: 'ebay_listing_status', label: 'eBay出品状態' }
];
```
