// FrenchMarketsMapper.js: Cdiscount / Fnac API向けデータマッピング関数 (ヨーロッパニッチ)

/**
 * eBay形式のマスターデータをCdiscountまたはFnac APIペイロードに変換します。
 * @param {object} masterListing - マスターリスティングデータ
 * @param {string} targetMarket - ターゲットモール ('Cdiscount' or 'Fnac')
 * @returns {object} APIへの送信ペイロード
 */
function mapToFrenchMarketsPayload(masterListing, targetMarket) {
    const finalPriceEUR = masterListing.final_price_eur; // DDP込みのEUR価格を前提

    let payload = {
        // 共通属性 (フランス語または英語で構成)
        Name: masterListing.title,
        Description: masterListing.description_html,
        Price: finalPriceEUR.toFixed(2),
        Quantity: masterListing.inventory_count,
        
        // DDP/HSコードとVAT情報
        CountryOfOrigin: masterListing.origin_country,
        // VAT (付加価値税) 率 - フランスは標準20% (ここでは仮の値を使用)
        VatRate: 0.20, 
        CustomsTariffCode: masterListing.hs_code_final,
    };

    switch (targetMarket) {
        case 'Cdiscount':
            // Cdiscount特有の在庫管理と配送設定
            payload.Sku: masterListing.master_id,
            payload.ProductCondition: masterListing.is_vintage ? "Used" : "New",
            // T30: フランス語のカテゴリ名が必要になる場合がある
            payload.CategoryName: masterListing.cdiscount_category_fr || "Produit de Collection",
            // 配送設定をDDP対応プロファイルにマッピング
            payload.ShippingMethods: [{
                Method: "GLOBAL_DDP_TRACKED",
                Price: 0.00 // DDP価格に含まれるため送料はゼロ
            }],
            break;
            
        case 'Fnac':
            // Fnacは技術・文化商品に強い。EAN/GTINコードを厳格に要求
            payload.ProductReference: masterListing.master_id,
            payload.EanCode: masterListing.ean_code, // EANコードは必須
            payload.SellerOffer: {
                Price: finalPriceEUR.toFixed(2),
                Condition: masterListing.is_vintage ? "Reconditionné" : "Neuf" // フランス語の状態コード
            },
            // T30: 文化的商品の属性（例：作者、レーベルなど）
            payload.Author: masterListing.author_name || "",
            break;

        default:
            throw new Error(`Unsupported French market: ${targetMarket}`);
    }

    return payload;
}