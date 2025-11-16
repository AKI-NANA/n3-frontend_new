// /types/product.ts の末尾などに追記

/**
 * 中間データ編集画面で扱うリサーチ情報
 */
export interface IntermediateResearchData {
    input_title: string;          // ユーザーがコピペしたタイトル
    input_url: string;            // ユーザーがコピペした主要URL
    supplier_candidates: string[]; // 仕入れ先候補のURLリスト (Gemini支援)
    market_listing_count: number;  // 市場流通数 (Gemini支援)
    community_score_summary: string; // 商品評価サマリー (Gemini支援)
    ebay_title_draft: string;      // eBay向けリライトタイトル案 (Gemini支援)
    
    // ステップ2 (Claude) の結果
    hts_code?: string;
    origin_country?: string;
    vero_risk_level?: 'High' | 'Medium' | 'Low' | 'N/A';
    vero_safe_title?: string; // VEROリスク回避用タイトル
}

// ... 既存の型定義（EbayCategoryなど）を保持