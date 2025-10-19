/**
 * 🏷️ HTML差し込みワード完全一覧
 * オリジナルHTMLにコピペして使用してください
 */

// ===== 📦 基本商品情報 =====
{{TITLE}}                    // 商品タイトル
{{PRICE}}                    // 販売価格（$99.99形式）
{{BRAND}}                    // ブランド名
{{CONDITION}}                // 商品状態（New/Used等）
{{DESCRIPTION}}              // 商品説明文
{{SKU}}                      // eBay SKU
{{CATEGORY}}                 // カテゴリ名

// ===== 🖼️ 画像関連 =====
{{MAIN_IMAGE}}               // メイン画像URL
{{IMAGE_1}}                  // 追加画像1
{{IMAGE_2}}                  // 追加画像2
{{IMAGE_3}}                  // 追加画像3
{{IMAGE_4}}                  // 追加画像4
{{IMAGE_5}}                  // 追加画像5
// ... {{IMAGE_24}}まで利用可能

{{IMAGE_GALLERY_HTML}}       // 画像ギャラリー（自動生成HTML）
{{IMAGE_GALLERY_SIMPLE}}     // 画像ギャラリー（シンプル版）

// ===== 📋 商品詳細・仕様 =====
{{MODEL_NUMBER}}             // 型番・モデル番号
{{UPC}}                      // UPCコード
{{EAN}}                      // EANコード
{{COLOR}}                    // 色
{{SIZE}}                     // サイズ
{{WEIGHT}}                   // 重量（0.5 kg形式）
{{DIMENSIONS}}               // 寸法（15.0 x 7.5 x 1.0 cm形式）

{{SPECIFICATIONS_TABLE}}     // 仕様表（自動生成テーブル）
{{SPECIFICATIONS_LIST}}      // 仕様リスト（自動生成リスト）

// ===== 🚚 配送・価格情報 =====
{{SHIPPING_COST}}            // 送料（$25.00形式）
{{SHIPPING_INFO_HTML}}       // 配送情報（自動生成HTML）
{{SHIPPING_WEIGHT}}          // 配送重量
{{SHIPPING_DIMENSIONS}}      // 配送サイズ
{{HANDLING_TIME}}            // 処理日数
{{DELIVERY_TIME}}            // 配送日数

{{FREE_SHIPPING}}            // 送料無料表示（送料0の場合のみ）
{{PAID_SHIPPING}}            // 有料送料表示（送料ありの場合のみ）

// ===== 💰 価格・利益情報 =====
{{ORIGINAL_PRICE_JPY}}       // 元価格（日本円）
{{EXCHANGE_RATE}}            // 為替レート
{{PROFIT_MARGIN}}            // 利益率（25.5%形式）
{{PROFIT_AMOUNT}}            // 利益額（$150.00形式）

// ===== 🏪 販売者・ポリシー情報 =====
{{SELLER_INFO_HTML}}         // 販売者情報（自動生成HTML）
{{RETURN_POLICY_HTML}}       // 返品ポリシー（自動生成HTML）
{{WARRANTY_HTML}}            // 保証情報（自動生成HTML）
{{FEEDBACK_SCORE}}           // フィードバック評価

// ===== 📅 日時情報 =====
{{CURRENT_DATE}}             // 現在日付（2025-09-11形式）
{{CURRENT_DATE_JP}}          // 現在日付（2025年9月11日形式）
{{LISTING_DATE}}             // 出品日
{{END_DATE}}                 // 終了日

// ===== 🌍 地域・通貨情報 =====
{{CURRENCY_SYMBOL}}          // 通貨記号（$）
{{LOCATION}}                 // 発送元地域（Japan）
{{COUNTRY_FLAG}}             // 国旗絵文字（🇯🇵）

// ===== ⭐ 品質・ステータス情報 =====
{{QUALITY_SCORE}}            // 品質スコア（85点形式）
{{CONDITION_DESCRIPTION}}    // 商品状態詳細説明
{{LISTING_STATUS}}           // 出品ステータス
{{APPROVAL_STATUS}}          // 承認ステータス

// ===== 🔢 数量・在庫情報 =====
{{QUANTITY}}                 // 販売数量
{{STOCK_STATUS}}             // 在庫ステータス
{{LOW_STOCK_WARNING}}        // 在庫少警告（在庫少の場合のみ表示）

// ===== 🎯 マーケティング用 =====
{{URGENCY_TEXT}}             // 緊急性テキスト（限定等）
{{BESTSELLER_BADGE}}         // ベストセラーバッジ（条件満たす場合のみ）
{{NEW_ARRIVAL_BADGE}}        // 新着バッジ（新規登録から7日以内）
{{DISCOUNT_BADGE}}           // 割引バッジ（マークダウン価格設定時）

// ===== 🔗 リンク・URL情報 =====
{{SOURCE_URL}}               // 元データURL（Yahoo等）
{{MORE_IMAGES_LINK}}         // 追加画像リンク
{{CONTACT_SELLER_LINK}}      // 販売者連絡リンク

// ===== 📊 分析・SEO用 =====
{{SEARCH_KEYWORDS}}          // 検索キーワード（カンマ区切り）
{{CATEGORY_PATH}}            // カテゴリパス（Electronics > Phones）
{{SIMILAR_ITEMS}}            // 類似商品リンク

// ===== 🎨 レイアウト制御用 =====
{{IF_HAS_BRAND}}...{{/IF_HAS_BRAND}}           // ブランドある場合のみ表示
{{IF_FREE_SHIPPING}}...{{/IF_FREE_SHIPPING}}   // 送料無料の場合のみ表示
{{IF_NEW_CONDITION}}...{{/IF_NEW_CONDITION}}   // 新品の場合のみ表示
{{IF_HAS_WARRANTY}}...{{/IF_HAS_WARRANTY}}     // 保証ありの場合のみ表示

// ===== 使用例 =====
/*
<div class="product-listing">
    <h1>{{TITLE}}</h1>
    <div class="price">${{PRICE}}</div>
    
    {{IF_HAS_BRAND}}
    <div class="brand">Brand: {{BRAND}}</div>
    {{/IF_HAS_BRAND}}
    
    <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}">
    
    <div class="description">
        {{DESCRIPTION}}
    </div>
    
    <div class="specifications">
        {{SPECIFICATIONS_TABLE}}
    </div>
    
    <div class="shipping">
        {{IF_FREE_SHIPPING}}
        <p class="free-shipping">🚚 FREE SHIPPING WORLDWIDE!</p>
        {{/IF_FREE_SHIPPING}}
        
        {{IF_PAID_SHIPPING}}
        <p>Shipping: ${{SHIPPING_COST}}</p>
        {{/IF_PAID_SHIPPING}}
        
        <p>Weight: {{WEIGHT}}</p>
        <p>Dimensions: {{DIMENSIONS}}</p>
    </div>
    
    <div class="seller-info">
        {{SELLER_INFO_HTML}}
    </div>
</div>
*/