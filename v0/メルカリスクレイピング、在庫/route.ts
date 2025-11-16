// /app/api/scrape/inventory-data/route.ts

import { NextResponse } from 'next/server';
import { scrapeInventoryAndSellerData } from '@/lib/scraping-core';
import { saveInventoryHistory } from '@/services/inventoryService';

/**
 * POST /api/scrape/inventory-data
 * 特定のSKU/ASINの在庫と市場データを取得し、履歴に保存する
 */
export async function POST(req: Request) {
    try {
        // 💡 実際には、監視対象リスト全体をDBから取得し、ループで処理する方が一般的ですが、
        // ここでは単一のリクエストで処理するシンプルな構成とします。
        const { sku, url } = await req.json();

        if (!sku || !url) {
            return NextResponse.json({ success: false, error: 'SKU and URL are required.' }, { status: 400 });
        }

        // 1. スクレイピングコア関数を実行
        const scrapedData = await scrapeInventoryAndSellerData(url, sku);

        // 2. 履歴サービスに結果を渡して保存
        await saveInventoryHistory(scrapedData);

        return NextResponse.json({ 
            success: true, 
            message: `Inventory data scraped and saved for SKU: ${sku}`,
            data: scrapedData
        }, { status: 200 });

    } catch (error: any) {
        console.error('Inventory Scraping API Error:', error.message);
        return NextResponse.json(
            { success: false, error: '在庫データのスクレイピングに失敗しました。' },
            { status: 500 }
        );
    }
}