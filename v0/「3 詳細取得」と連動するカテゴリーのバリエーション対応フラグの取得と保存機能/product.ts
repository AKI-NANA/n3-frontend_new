// /types/product.ts の末尾などに追記
// ... (既存の型定義)

// 💡 ebay_categoriesテーブルの情報を扱う型
export interface EbayCategory {
  category_id: string; // DBのカラム名が category_id の場合を想定
  name: string;
  supports_variations?: boolean; // DBスキーマ変更に対応
}

// ... (既存の ResearchPromptType など)