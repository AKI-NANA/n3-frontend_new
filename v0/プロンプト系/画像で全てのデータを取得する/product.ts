// /types/product.ts の末尾などに追記

/**
 * AIリサーチプロンプトのタイプ
 */
export type ResearchPromptType = 
  | 'IMAGE_ONLY'             // 画像のみバージョン (最安値リサーチを含む)
  | 'FILL_MISSING_DATA'      // 取得できていないデータを全て取得するバージョン
  | 'FULL_RESEARCH_STANDARD' // 標準バージョン: HTS, 原産国, 素材をもしあれば取得する（市場調査なし）
  | 'LISTING_DATA_ONLY'      // 出品に必要なデータのみ取得するバージョン（市場調査なし）
  | 'HTS_CLAUDE_MCP';        // HTS専用（Claude MCP + Supabase接続）

// ... 既存の Product, ProductVariation, ListingData などの型定義も保持