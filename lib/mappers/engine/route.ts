// /app/api/products/transform-multichannel/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { ProductData } from '@/types/product'; // products_masterの型を想定
import { calculateOptimalPrice } from '@/lib/pricing/PlatformPricing';

// 💡 LLM翻訳サービスと画像処理サービスを別途用意することを想定
// import { translateText } from '@/services/translationService';
// import { adjustImageSpecs } from '@/services/imageProcessingService';

const supabase = createClient();

// プラットフォームごとの画像規格設定 (例)
const PLATFORM_IMAGE_SPECS = {
    Coupang: { width: 1000, height: 1000, ratio: '1:1', max_images: 10 },
    Qoo10: { width: 800, height: 800, ratio: '1:1', max_images: 15 },
    Amazon_AU: { width: 1500, height: 1500, ratio: '1:1', max_images: 7 },
    Amazon_JP: { width: 1500, height: 1500, ratio: '1:1', max_images: 7 },
    Shopify: { width: 2000, height: 2000, ratio: 'flexible', max_images: 20 },
};

/**
 * POST /api/products/transform-multichannel
 * products_masterのデータをターゲットプラットフォームと国に合わせて変換する
 */
export async function POST(req: NextRequest) {
    try {
        const { sku, targetPlatform, targetCountry, minProfitRate = 0.20, isFBA = false } = await req.json();

        if (!sku || !targetPlatform || !targetCountry) {
            return NextResponse.json({ success: false, error: 'SKU, targetPlatform, and targetCountry are required.' }, { status: 400 });
        }

        // 1. products_masterから商品データを取得
        const { data: product, error } = await supabase
            .from('products_master')
            .select('*')
            .eq('sku', sku)
            .single();

        if (error || !product) {
            console.error('Failed to fetch product data:', error?.message);
            return NextResponse.json({ success: false, error: 'Product not found or DB error.' }, { status: 404 });
        }

        // 2. タイトル/説明文の翻訳
        let transformedTitle = product.name || '';
        let transformedDescription = product.description || '';
        let targetLang = '';

        switch (targetPlatform) {
            case 'Coupang': targetLang = 'ko'; break; // 韓国語
            case 'Amazon_AU': targetLang = 'en'; break; // 英語
            case 'Amazon_JP': targetLang = 'ja'; break; // 日本語
            case 'Qoo10': targetLang = 'ja'; break; // 日本語
            case 'Shopify': targetLang = 'en'; break; // 英語 (ストア設定による)
        }

        if (targetLang && targetLang !== 'ja') { // 日本語以外に翻訳が必要な場合
            // transformedTitle = await translateText(transformedTitle, targetLang);
            // transformedDescription = await translateText(transformedDescription, targetLang);
            console.log(`[Translation Mock] Translating to ${targetLang} for ${targetPlatform}`);
            transformedTitle = `[${targetLang}] ${transformedTitle}`;
            transformedDescription = `[${targetLang}] ${transformedDescription}`;
        }

        // 3. 画像規格の調整
        const imageSpecs = PLATFORM_IMAGE_SPECS[targetPlatform];
        let adjustedImages = product.gallery_images || [];
        if (imageSpecs) {
            // adjustedImages = await adjustImageSpecs(product.gallery_images, imageSpecs);
            console.log(`[Image Processing Mock] Adjusting images for ${targetPlatform}`);
            adjustedImages = adjustedImages.slice(0, imageSpecs.max_images || adjustedImages.length).map(img => ({
                ...img,
                url: `${img.url}?w=${imageSpecs.width}&h=${imageSpecs.height}` // URLパラメータでサイズ変更を表現
            }));
        }

        // 4. SKU/在庫のマッピング (例: Coupangは独自のItem IDを持つ)
        let platformSku = product.sku;
        const stockQuantity = product.stock_quantity;
        const additionalFields: any = {};

        switch (targetPlatform) {
            case 'Coupang':
                platformSku = `CPN-${product.sku}`; // Coupang向けのSKUプレフィックス
                additionalFields.coupang_item_id = `ITEM-${product.id}`; // 独自のItem ID生成
                break;
            case 'Amazon_AU':
            case 'Amazon_JP':
                additionalFields.amazon_asin_jan = product.asin || product.jan_code; // ASIN/JANコード
                additionalFields.fulfillment_method = isFBA ? 'FBA' : 'FBM';
                break;
            case 'Qoo10':
                additionalFields.qoo10_normal_price = product.price_jpy * 2; // 二重価格の例
                additionalFields.qoo10_sale_price = product.price_jpy * 1.5;
                break;
            case 'Shopify':
                // Shopifyはproducts_masterの情報をほぼそのまま利用
                break;
        }

        // 5. 利益計算
        const pricingResult = await calculateOptimalPrice(product.price_jpy, {
            targetPlatform,
            targetCountry,
            minProfitRate,
            isFBA,
            productWeightGrams: product.listing_data?.weight_g || 500 // デフォルト値
        });

        // 6. 変換済みデータの構築
        const transformedData = {
            sku: platformSku,
            original_sku: product.sku,
            platform: targetPlatform,
            country: targetCountry,
            title: transformedTitle,
            description: transformedDescription,
            images: adjustedImages,
            stock_quantity: stockQuantity,
            sales_price: pricingResult.finalSalesPrice,
            currency: pricingResult.currency,
            platform_specific_fields: additionalFields,
            pricing_details: pricingResult,
            // ... その他のproducts_masterからのデータ
            origin_country: product.origin_country, // products_masterから活用
            material_composition: product.material_composition,
        };

        // 7. 出力パターン: CSV生成または一時テーブル保存
        const outputType = req.headers.get('x-output-type') || 'json'; // 'csv' or 'json'

        if (outputType === 'csv') {
            // 💡 変換済みデータをCSVフォーマットに整形するロジック
            const csvData = `SKU,Title,Price\n${transformedData.sku},"${transformedData.title}",${transformedData.sales_price}`;
            return new NextResponse(csvData, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${sku}_${targetPlatform}.csv"`,
                },
            });
        } else if (outputType === 'api-queue') {
            // 💡 変換済みデータをDBの一時テーブルに保存するロジック
            // const { error: queueError } = await supabase.from('multichannel_export_queue').insert({
            //     sku: transformedData.sku,
            //     platform: transformedData.platform,
            //     data_payload: transformedData,
            //     status: 'pending'
            // });
            // if (queueError) throw queueError;
            console.log(`[API Queue Mock] Saved transformed data for SKU: ${sku} to temporary table.`);
            return NextResponse.json({ success: true, message: 'Transformed data saved to API queue.', data: transformedData }, { status: 200 });
        }

        // デフォルト: JSONレスポンス
        return NextResponse.json({ success: true, data: transformedData }, { status: 200 });

    } catch (error: any) {
        console.error('Multichannel Transform API Error:', error.message);
        return NextResponse.json(
            { success: false, error: '多販路データ変換中にエラーが発生しました。', details: error.message },
            { status: 500 }
        );
    }
}