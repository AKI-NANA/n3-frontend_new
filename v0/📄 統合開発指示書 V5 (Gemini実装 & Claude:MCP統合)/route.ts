// /api/research/decision/route.ts (承認APIのバックエンドロジック)

import { fetchProductFromDB, promoteToSKUMaster } from '@/services/data_architecture/ResearchDataService';

export async function POST(request: Request) {
    const { productId, decision, selectedFormat } = await request.json();
    
    if (decision === 'Promoted') {
        const product = await fetchProductFromDB(productId);
        
        // 💡 ブロック条件: (eu_risk_flag = TRUE) AND (eu_ar_status = REQUIRED_NO_AR)
        const shouldBlock = (
            product.eu_risk_flag === true && 
            product.eu_ar_status === 'REQUIRED_NO_AR'
        );

        if (shouldBlock) {
            // 承認をブロックし、エラーを返す
            return new Response(JSON.stringify({ 
                error: true, 
                message: `EUリスク回避フィルターにより、出品スケジュールへの登録はブロックされました。理由: ${product.eu_risk_reason}` 
            }), { status: 403 });
        }

        // 承認処理続行: SKUマスターへのデータコピー
        await promoteToSKUMaster(product, selectedFormat); 
        
        // 中リスク商品の処理 (EU圏配送除外設定をフラグとして出品キューに付加)
        if (product.eu_risk_flag === true) {
            console.log(`[Approval] Product ${productId} promoted, but flagged for EU shipping exclusion.`);
        }
        
        return new Response(JSON.stringify({ success: true, message: "承認が完了し、出品キューに転送されました。" }));

    }
    // ... Rejected ロジック ...
}