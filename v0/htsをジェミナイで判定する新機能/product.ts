// /types/product.ts

// 既存の Product 型を拡張
export interface Product {
  id: number;
  sku: string | null;
  title: string | null;
  english_title: string | null;
  description: string | null;
  english_description: string | null;
  price_jpy: number | null;
  price_usd: number | null;
  cost_price: number | null;
  profit_amount: number | null;
  profit_margin: number | null;
  gallery_images: string[] | null;
  primary_image_url: string | null;
  scraped_data: any | null;
  listing_data: any | null;
  ebay_api_data: any | null;

  // 🔽 HTS 関連の新規追加フィールド 🔽
  hts_code: string | null;
  origin_country: string | null;
  material: string | null;
  // 🔼 HTS 関連の新規追加フィールド 🔼
}

// ... (その他の型定義が続く場合があります)
