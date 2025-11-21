/**
 * src/db/marketplace_db_schema.ts
 *
 * 目的: 最終開発指示書 Phase 1-1 に基づき、多販路統合システムの中核となる
 * 3つの新規DBテーブル（マーケットプレイス別データ、設定、送料ルール）のスキーマを定義する。
 * (Next.js/TypeScript環境での利用を想定)
 */

/**
 * products: 商品マスターデータ (既存テーブルの拡張)
 * 全てのモールで共通の基礎データを保持する。
 * (FKの参照元となるため、簡略的に定義)
 */
export interface Product {
  id: number; // Primary Key
  title_jp: string;
  title_en: string;
  description_jp: string;
  cost_price: number; // 仕入れ値 (JPY)
  weight_g: number; // 重量 (グラム)
  current_stock: number; // 実在庫数
  last_price_sync_at: Date | null;
  category_ebay: string; // 共通カテゴリとして利用されるフィールド
  hs_code?: string; // HSコード（Phase 2: クロスボーダー無在庫対応）AIまたは手動で登録
  // ... 既存の他のフィールド
}

/**
 * marketplace_settings: モール別手数料設定 (指示書 Section 2: 新規)
 * 共通利益計算サービスが参照する、モールごとの固定値を管理する。
 */
export interface MarketplaceSetting {
  marketplace_id:
    | "AMAZON_JP"
    | "SHOPEE_SG"
    | "EBAY_US"
    | "COUPANG"
    | "QOO10_JP"
    | "BUYMA"
    | "SHOPIFY"; // Primary Key
  sales_fee_rate: number; // 販売手数料率 (%)
  fixed_fee: number; // 固定手数料 (設定通貨)
  cross_border_fee_rate: number; // 越境手数料率 (%)
  tax_rate: number; // ローカル税率 (%)
  default_currency: "JPY" | "USD" | "SGD" | "KRW"; // 標準表示通貨
  payout_currency: "JPY" | "USD" | "SGD" | "KRW"; // 入金通貨
  target_profit_rate: number; // 目標利益率 (%)
  api_rate_limit_per_hour: number; // API制限値 (Bull Queue制御用)
}

/**
 * marketplace_listings: モール別出品データ (指示書 Section 2: 新規)
 * 在庫・価格連動の核となる最重要テーブル。
 */
export interface MarketplaceListing {
  id: number; // Primary Key
  product_id: number; // Foreign Key to products.id
  marketplace_id: MarketplaceSetting["marketplace_id"];
  listing_id: string; // モール側の出品ID (ASIN, ItemID, SKUなど)
  listing_price: number; // モール上での販売価格 (現地通貨)
  listing_stock: number; // モール上での出品在庫数 (products.current_stockから同期)
  status: "ACTIVE" | "INACTIVE" | "SUPPRESSED" | "PENDING_APPROVAL"; // 出品ステータス
  is_auto_reprice: boolean; // 価格の自動調整を行うか
  is_auto_sync_stock: boolean; // 在庫の自動同期を行うか
  mall_specific_data: any; // モール固有のJSONデータ（例: Coupangの必須認証情報、Shopeeのバリエーション画像マッピングなど）
  last_sync_at: Date; // 最終在庫・価格同期日時
}

/**
 * shipping_rules: 統合送料計算設定 (指示書 Section 2: 新規)
 * 統合送料計算サービスが参照する。
 */
export interface ShippingRule {
  id: number; // Primary Key
  marketplace_id: MarketplaceSetting["marketplace_id"];
  shipping_method: string; // 'DOMESTIC_AMAZON', 'INTERNATIONAL_SHOPEE_SLS', 'BUYMA_EMS' など
  is_fba_like: boolean; // 重量・容積で変動するか (FBA / SLS など)
  rule_json: {
    // 指示書で定義されたJSON構造を格納
    unit: "g" | "kg";
    base_weight: number;
    base_price: number;
    tiers: Array<{
      max_weight: number;
      price?: number;
      price_per_kg?: number;
      region?: string; // 地域別料金の場合
    }>;
    handling_fee: number;
  };
}

/**
 * tax_rate_master: 関税・消費税マスター (Phase 2: クロスボーダー無在庫対応)
 * 国別・品目別の関税率と消費税率を管理する。
 */
export interface TaxRateMaster {
  id: number; // Primary Key
  hs_code: string; // 商品の国際的な品目分類コード (HSコード)
  export_country: string; // 輸出国 (例: US, JP, DE)
  import_country: string; // 輸入国 (販売先国。例: JP, US, DE)
  duty_rate: number; // 基本関税率 (%)
  consumption_tax_rate: number; // 輸入国の消費税率 (%) VAT/GSTなど
  created_at?: Date;
  updated_at?: Date;
}

/**
 * forwarder_api_credentials: フォワーダーAPI接続情報 (Phase 2: DDP自動化)
 * フォワーダーとのAPI連携に必要な認証情報を管理する。
 */
export interface ForwarderApiCredential {
  id: number; // Primary Key
  forwarder_name: string; // フォワーダー名 (例: "DHL", "FedEx", "Custom Forwarder")
  api_endpoint: string; // APIのベースURL
  api_key: string; // API認証キー
  api_secret?: string; // APIシークレット（必要な場合）
  service_type: "DDP" | "DDU" | "BOTH"; // 提供サービスタイプ
  warehouse_address_json: {
    // フォワーダー倉庫住所（各国）
    country: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code: string;
  }[];
  rate_limit_per_hour?: number; // API制限値
  is_active: boolean; // アクティブ状態
  created_at?: Date;
  updated_at?: Date;
}
