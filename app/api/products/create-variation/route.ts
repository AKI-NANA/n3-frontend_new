// /app/api/products/create-variation/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Product, GroupingItem } from '@/types/product';

// Stub function for calculateDynamicShippingDdp (service not yet implemented)
function calculateDynamicShippingDdp(parentProduct: Product, childProducts: Product[]): Product {
    // TODO: Implement actual shipping calculation logic
    return parentProduct;
}

// ⚠️ 注意: ここではDB操作のモックと Supabase/Prisma/SQL の抽象化を前提とします。
// 実際には Supabase クライアントなどを使用します。

// DB操作のモック関数
async function getProductByIds(ids: number[]): Promise<Product[]> {
    // データベースから構成品データを取得するロジック
    return ids.map(id => ({ 
        id, 
        sku: `ITEM-${id}`, 
        price_usd: 50 + id * 10, // 仮の価格
        // ... (他の必要なフィールド)
    } as Product));
}

async function saveProduct(product: Product): Promise<void> {
    // DBに親SKUと子SKUのデータを保存するロジック (transaction処理が必要)
    console.log(`親SKUをDBに保存: ${product.sku} (Price: ${product.price_usd})`);
    product.listing_data.variations?.forEach(v => {
        console.log(`子SKUをDBに更新/保存: ${v.variation_sku} (Surcharge: ${v.shipping_surcharge_usd})`);
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // ユーザー入力データ
        const { selectedItemIds, parentSkuName, attributes, composition } = body as {
            selectedItemIds: number[];
            parentSkuName: string;
            attributes: Record<string, string>; // 属性定義
            composition: GroupingItem[]; // Grouping Boxの内容
        };

        // 1. 構成品/子SKUのデータを取得
        const childProducts = await getProductByIds(selectedItemIds);
        if (childProducts.length < 2) {
            return NextResponse.json({ error: 'バリエーションには2つ以上のアイテムが必要です。' }, { status: 400 });
        }

        // 2. 親SKUの初期データを作成
        let parentProduct: Product = {
            id: -1, // 新規作成
            sku: parentSkuName,
            product_name: parentSkuName,
            variation_type: 'Parent',
            status: 'Draft',
            price_usd: 0,
            policy_group_id: '',
            cost_price: 0,
            stock_quantity: 0,
            parent_sku_id: null,
            listing_data: { components: composition },
        };

        // 3. 価格計算とロジックの実行
        parentProduct = calculateDynamicShippingDdp(parentProduct, childProducts);

        // 4. リスクチェック（最終防衛線）
        const hasRisk = parentProduct.listing_data.variations?.some(v => 
            v.shipping_surcharge_usd > 50 || // 過大な加算額
            parentProduct.status === 'ExternalToolSyncFail' // 連携失敗モック (実際は連携APIの結果を見る)
        );
        
        if (hasRisk) {
            parentProduct.status = 'NeedsApproval: ShippingRisk';
        }

        // 5. DB保存と子SKUの紐付け (トランザクション処理が必要)
        await saveProduct(parentProduct);
        
        // 6. 成功応答
        return NextResponse.json({ 
            success: true, 
            message: 'バリエーションの親SKUが作成され、価格ロジックが適用されました。',
            parentSku: parentProduct.sku,
            minPrice: parentProduct.price_usd
        });

    } catch (error) {
        console.error('バリエーション作成APIエラー:', error);
        return NextResponse.json({ error: 'バリエーション作成中にエラーが発生しました。' }, { status: 500 });
    }
}