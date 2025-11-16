// /lib/shopee/profitCalculator.ts

import { ProductData } from '@/types/product'; // products_masterの型を想定

/**
 * 💡 Shopeeの国別手数料・送料・補助率のデータ構造（モック）
 * 実際にはDBまたは設定ファイルから取得します。
 */
const SHOPEE_CONFIG = {
    'TW': { // 台湾 (TWD)
        currency: 'TWD',
        commission_rate: 0.06, // 6%
        payment_fee: 0.02, // 2%
        sls_shipping_twd_per_kg: 100, // SLS送料/kg
        sls_subsidy_rate: 0.50, // 補助率 50%
    },
    'TH': { // タイ (THB)
        currency: 'THB',
        commission_rate: 0.08, // 8%
        payment_fee: 0.03, // 3%
        sls_shipping_thb_per_kg: 150,
        sls_subsidy_rate: 0.30, 
    }
};

interface PricingInputs {
    priceJpy: number; // 仕入れ円
    domesticShippingJpy: number; // 国内送料 (販路外経費含む)
    targetCountry: 'TW' | 'TH'; // ターゲット国
    targetProfitRate: number; // 目標利益率 (例: 0.20)
    productWeightKg: number; // 商品重量 (kg)
    exchangeRateJpyToTarget: number; // JPYからターゲット通貨へのレート
}

interface ShopeePriceResult {
    finalSalesPrice: number; // 現地通貨での最終価格
    currency: string;
    profitRate: number;
    details: {
        totalCostTarget: number; // 現地通貨での総原価
        slsCost: number;         // 補助後のSLS送料 (現地通貨)
        platformFees: number;    // 手数料合計 (現地通貨)
    }
}

/**
 * Shopeeの複雑な数式に基づき、最適な現地通貨価格を算出する
 */
export function calculateShopeePrice(inputs: PricingInputs): ShopeePriceResult {
    const config = SHOPEE_CONFIG[inputs.targetCountry];
    if (!config) {
        throw new Error(`Shopee config not found for country: ${inputs.targetCountry}`);
    }

    const { priceJpy, domesticShippingJpy, targetProfitRate, productWeightKg, exchangeRateJpyToTarget } = inputs;
    
    // 1. JPYベースの総原価を現地通貨に変換
    const totalCostJpy = priceJpy + domesticShippingJpy;
    const totalCostTarget = totalCostJpy * exchangeRateJpyToTarget;

    // 2. SLS送料の計算 (現地通貨)
    const slsCostFull = config.sls_shipping_twd_per_kg * productWeightKg; // 補助なし送料
    const slsCostSubsidized = slsCostFull * (1 - config.sls_subsidy_rate); // 補助後の実質送料

    // 3. 販売価格の逆算 (数式を使用)
    // Shopee価格 = [ (総原価_現地通貨) + (SLS送料_補助後) ] / [ 1 - 手数料率_合計 - 利益率 ]
    
    const totalCommissionRate = config.commission_rate + config.payment_fee;
    
    const numerator = totalCostTarget + slsCostSubsidized;
    const denominator = 1 - totalCommissionRate - targetProfitRate;

    if (denominator <= 0) {
        // 利益率が高すぎるか手数料が高すぎて利益が出せない
        throw new Error(`Target profit rate (${targetProfitRate * 100}%) is too high for current fees.`);
    }

    const finalSalesPrice = numerator / denominator;
    
    // 4. 検算
    const platformFees = finalSalesPrice * totalCommissionRate;
    const profit = finalSalesPrice - totalCostTarget - slsCostSubsidized - platformFees;
    const profitRate = profit / finalSalesPrice;

    return {
        finalSalesPrice: parseFloat(finalSalesPrice.toFixed(2)),
        currency: config.currency,
        profitRate: parseFloat(profitRate.toFixed(4)),
        details: {
            totalCostTarget: parseFloat(totalCostTarget.toFixed(2)),
            slsCost: parseFloat(slsCostSubsidized.toFixed(2)),
            platformFees: parseFloat(platformFees.toFixed(2)),
        }
    };
}