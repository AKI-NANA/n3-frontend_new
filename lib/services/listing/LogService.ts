// /services/data/LogService.ts

interface PriceLog {
    timestamp: Date;
    old_price: number;
    new_price: number;
    reason: string;
}

interface StockLog {
    timestamp: Date;
    source: string;
    change: number; // +5, -1など
    current_count: number;
}

/**
 * SKUに紐づく全ての履歴データを取得する（ログ取得 API用）
 */
export async function fetchListingLogs(sku: string): Promise<{ priceLogs: PriceLog[], stockLogs: StockLog[] }> {
    // 💡 Claude/MCPは、ログDB（例: FirestoreのLogsコレクション）からデータを取得するロジックを実装

    // モックデータ
    const priceLogs: PriceLog[] = [
        { timestamp: new Date(Date.now() - 86400000), old_price: 160.00, new_price: 155.00, reason: 'Competitor undercut' },
        { timestamp: new Date(Date.now() - 172800000), old_price: 155.00, new_price: 150.99, reason: 'Manual Adjustment' },
    ];
    
    const stockLogs: StockLog[] = [
        { timestamp: new Date(Date.now() - 3600000), source: '自社有在庫', change: -1, current_count: 4 },
        { timestamp: new Date(Date.now() - 7200000), source: '仕入れ先A', change: 3, current_count: 3 },
    ];

    return { priceLogs, stockLogs };
}