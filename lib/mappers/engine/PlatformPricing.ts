// /lib/pricing/PlatformPricing.ts

import { ProductData } from '@/types/product'; // products_masterの型を想定
// 💡 為替レート取得用の外部APIクライアントを別途用意することを想定
// import { getExchangeRate } from '@/lib/currency-api-client';

/**
 * プラットフォームごとの販売手数料と送料の設定（簡略化されたモック）
 * 実際にはDBから読み込むか、より詳細なカテゴリ別設定が必要
 */
const PLATFORM_FEES = {
    Coupang: {
        commission_rate: 0.10, // 10%
        shipping_per_kg: 500, // KRW (例: Coupang Wing)
        base_shipping_krw: 3000 // KRW (基本送料)
    },
    Qoo10: {
        commission_rate: 0.08, // 8%
        shipping_per_kg: 1000, // JPY (例: Qxpress Japan)
        base_shipping_jpy: 800 // JPY (基本送料)
    },
    Amazon_AU: {
        commission_rate: 0.15, // 15%
        fba_per_kg: 10, // AUD (FBA手数料/kg)
        fbm_per_kg: 5, // AUD (FBM送料/kg)
    },
    Amazon_JP: {
        commission_rate: 0.10, // 10%
        fba_per_kg: 500, // JPY (FBA手数料/kg)
        fbm_per_kg: 300, // JPY (FBM送料/kg)
    },
    Shopify: { // Shopify Payments手数料のみ
        commission_rate: 0.03, // 3%
        shipping_per_kg: 0, // Shopify自身は送料徴収しないため外部サービスに依存
    }
};

interface PricingOptions {
    targetPlatform: 'Coupang' | 'Qoo10' | 'Amazon_AU' | 'Amazon_JP' | 'Shopify';
    targetCountry: string; // 'KR', 'JP', 'AU'など
    minProfitRate: number; // 最低利益率 (例: 0.20 = 20%)
    isFBA?: boolean; // Amazon FBA/FBM用
    productWeightGrams: number; // products_master.listing_data.weight_g を想定
    exchangeRateJpyToTarget?: number; // JPYからターゲット通貨への為替レート
}

interface CalculatedPrice {
    finalSalesPrice: number; // ターゲット通貨での最終販売価格
    platformFee: number;     // ターゲット通貨でのプラットフォーム手数料
    shippingCost: number;    // ターゲット通貨での送料
    profit: number;          // ターゲット通貨での利益
    profitRate: number;      // 利益率
    currency: string;        // ターゲット通貨コード
}

/**
 * 各プラットフォームの送料・手数料を考慮した最適な販売価格を計算する
 * @param productCostJpy 商品の仕入れ原価（日本円）
 * @param options 価格計算オプション
 * @returns 計算された最適な販売価格と詳細
 */
export async function calculateOptimalPrice(
    productCostJpy: number,
    options: PricingOptions
): Promise<CalculatedPrice> {
    const { targetPlatform, targetCountry, minProfitRate, isFBA, productWeightGrams } = options;
    const config = PLATFORM_FEES[targetPlatform];

    if (!config) {
        throw new Error(`Unsupported platform: ${targetPlatform}`);
    }

    const weightKg = productWeightGrams / 1000;
    let shippingCostJpy = 0;
    let targetCurrency = '';

    // 1. 送料の計算 (JPY換算で一旦計算)
    switch (targetPlatform) {
        case 'Coupang':
            // KRW換算後、JPYに戻すか、後でまとめて変換
            targetCurrency = 'KRW';
            const baseShippingKrw = config.base_shipping_krw || 0;
            const shippingPerKgKrw = config.shipping_per_kg || 0;
            const totalShippingKrw = baseShippingKrw + (shippingPerKgKrw * weightKg);
            // 💡 JPYからKRWへの為替レートが必要。ここでは一旦KRWで保持
            shippingCostJpy = totalShippingKrw / (options.exchangeRateJpyToTarget || 10); // 仮の為替レート
            break;
        case 'Qoo10':
            targetCurrency = 'JPY'; // Qoo10はJPY建ての場合も多い
            shippingCostJpy = (config.base_shipping_jpy || 0) + ((config.shipping_per_kg || 0) * weightKg);
            break;
        case 'Amazon_AU':
            targetCurrency = 'AUD';
            if (isFBA) {
                shippingCostJpy = (config.fba_per_kg || 0) * weightKg / (options.exchangeRateJpyToTarget || 90); // AUD->JPY仮換算
            } else { // FBM
                shippingCostJpy = (config.fbm_per_kg || 0) * weightKg / (options.exchangeRateJpyToTarget || 90); // AUD->JPY仮換算
            }
            break;
        case 'Amazon_JP':
            targetCurrency = 'JPY';
            if (isFBA) {
                shippingCostJpy = (config.fba_per_kg || 0) * weightKg;
            } else { // FBM
                shippingCostJpy = (config.fbm_per_kg || 0) * weightKg;
            }
            break;
        case 'Shopify':
            targetCurrency = 'JPY'; // ShopifyはJPY建ての想定
            shippingCostJpy = 0; // 送料は外部配送サービスが決定
            break;
    }

    // 2. JPYからターゲット通貨への変換レートを取得
    const exchangeRateJpyToTarget = options.exchangeRateJpyToTarget || await getExchangeRate('JPY', targetCurrency);
    if (!exchangeRateJpyToTarget) {
        throw new Error(`Failed to get exchange rate for ${targetCurrency}`);
    }

    // JPYベースのコスト
    const totalCostJpy = productCostJpy + shippingCostJpy;

    // 3. 最低利益率を考慮した販売価格の逆算
    // SalesPrice * (1 - CommissionRate) - Cost = Profit
    // SalesPrice * (1 - CommissionRate) = Cost + Profit
    // SalesPrice * (1 - CommissionRate) = Cost + SalesPrice * MinProfitRate
    // SalesPrice * (1 - CommissionRate - MinProfitRate) = Cost
    // SalesPrice = Cost / (1 - CommissionRate - MinProfitRate)

    // JPYからターゲット通貨へ変換した原価
    const productCostTarget = productCostJpy * exchangeRateJpyToTarget;
    const shippingCostTarget = shippingCostJpy * exchangeRateJpyToTarget;
    const totalCostTarget = productCostTarget + shippingCostTarget;

    const targetCommissionRate = config.commission_rate;
    
    // 最低利益率を確保するための販売価格
    let finalSalesPriceTarget = totalCostTarget / (1 - targetCommissionRate - minProfitRate);

    // 計算が負になるなど不可能な場合のエラーハンドリング
    if (finalSalesPriceTarget < totalCostTarget) {
        finalSalesPriceTarget = totalCostTarget * (1 + minProfitRate); // 最低原価+利益で設定
        console.warn(`[Pricing] Price calculation resulted in a lower than cost price for ${targetPlatform}. Adjusted to min profit.`);
    }

    const platformFeeTarget = finalSalesPriceTarget * targetCommissionRate;
    const profitTarget = finalSalesPriceTarget - totalCostTarget - platformFeeTarget;
    const calculatedProfitRate = profitTarget / finalSalesPriceTarget;

    return {
        finalSalesPrice: parseFloat(finalSalesPriceTarget.toFixed(2)),
        platformFee: parseFloat(platformFeeTarget.toFixed(2)),
        shippingCost: parseFloat(shippingCostTarget.toFixed(2)),
        profit: parseFloat(profitTarget.toFixed(2)),
        profitRate: parseFloat(calculatedProfitRate.toFixed(4)),
        currency: targetCurrency
    };
}

// 💡 モックの為替レート取得関数
async function getExchangeRate(from: string, to: string): Promise<number> {
    console.log(`[Exchange Rate Simulation] Getting rate from ${from} to ${to}`);
    // 実際には外部API (Open Exchange Rates, Fixer.ioなど) を呼び出す
    if (from === 'JPY' && to === 'KRW') return 10.5; // 例: 1 JPY = 10.5 KRW
    if (from === 'JPY' && to === 'AUD') return 0.010; // 例: 1 JPY = 0.010 AUD
    if (from === 'JPY' && to === 'JPY') return 1;
    if (from === 'AUD' && to === 'JPY') return 90;
    if (from === 'KRW' && to === 'JPY') return 0.09;
    return 1; // デフォルト
}