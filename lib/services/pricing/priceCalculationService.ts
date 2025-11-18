// /services/priceCalculationService.ts

import { Product, ProductVariation, ListingData } from '../types/product';

/**
 * DDPコストに基づき、バリエーションの Item Price と SKU別送料サーチャージを計算する
 * @param product 親SKUとなる Products テーブルのデータ
 * @param childVariations 子SKUとなるバリエーション（Grouping Boxからのデータ）
 * @returns 更新された Product データ
 */
export function calculateDynamicShippingDdp(
    product: Product, 
    childVariations: Product[] // 選択された子SKU（構成品）の配列
): Product {
    if (!childVariations || childVariations.length === 0) {
        throw new Error("バリエーション子SKUが選択されていません。");
    }

    // 1. 各子SKUの DDP コストを計算 (この関数外で事前計算されている想定だが、ここではモック)
    // 実際には childVariations[i].price_usd + DDP_cost_calc(weight, size) で算出される
    const actualDdpCosts = childVariations.map(v => v.price_usd * 1.5 + 10); // 例として適当な計算

    // 2. 最低 DDP コスト（Item Priceの統一基準）を特定
    const minDdpCost = Math.min(...actualDdpCosts);
    
    // 3. Item Priceを最低コストに設定
    product.price_usd = minDdpCost; 
    
    // 4. listing_data のバリエーションを生成・更新
    const newVariations: ProductVariation[] = childVariations.map((v, index) => {
        const actualDdpCost = actualDdpCosts[index];
        
        // 5. 送料サーチャージの計算
        const shippingSurcharge = actualDdpCost - minDdpCost;

        // 6. 子SKUのデータ構造を構築
        return {
            id: v.id,
            name: v.sku, // 仮の名前
            variation_sku: v.sku, // SKUをそのまま識別子として使用
            actual_ddp_cost_usd: actualDdpCost,
            // 💡 手動Overrideがない限り、この計算結果がDBに格納される
            shipping_surcharge_usd: shippingSurcharge, 
            attributes: {}, // 属性はモーダルでユーザーが設定
            // ... (他のフィールド)
        } as ProductVariation;
    });

    // 7. 親SKUの listing_data を更新
    product.listing_data = {
        ...product.listing_data,
        min_ddp_cost_usd: minDdpCost,
        variations: newVariations,
    };
    
    return product;
}

/**
 * 構成品の原価を合計するロジック（III-1 セット品作成用）
 */
export function calculateTotalCostPrice(items: GroupingItem[], skuMaster: Product[]): number {
    const totalCost = 0;
    // ... SKUマスターから構成品の原価をlookupし、数量を乗算して合計するロジックを実装 ...
    return totalCost;
}