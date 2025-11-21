/**
 * 統合出品データ管理UI - 型定義
 */

import type { Platform } from '@/lib/multichannel/types';

/**
 * 出品モード
 */
export type ListingMode = 'used_priority' | 'new_priority';

/**
 * モール別ステータス
 */
export type MallStatusType = 'Active' | 'Inactive' | 'Error';

export interface MallStatus {
  platform: Platform;
  status: MallStatusType;
  listingId?: string;
  errorMessage?: string;
  lastSyncedAt?: Date;
}

/**
 * パフォーマンススコアグレード
 */
export type PerformanceGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * 仕入れ先情報
 */
export interface SupplierInfo {
  supplierId: string;
  supplierName: string;
  stockQuantity: number;
  costJpy: number;
  priority: number;
  isActive: boolean;
}

/**
 * 在庫詳細情報
 */
export interface StockDetail {
  ownStock: number; // 自社有在庫
  suppliers: SupplierInfo[]; // 仕入れ先別在庫
  totalAvailable: number; // 合計利用可能在庫
  currentCostBasis: {
    // 現在の原価ベース
    supplierId: string;
    supplierName: string;
    costJpy: number;
  };
}

/**
 * 価格変動履歴
 */
export interface PriceHistory {
  id: number;
  sku: string;
  platform: Platform;
  priceJpy: number;
  reason: string; // 変動理由（例: "競合価格下落", "仕入れ原価上昇"）
  changedAt: Date;
}

/**
 * 在庫変動履歴
 */
export interface StockHistory {
  id: number;
  sku: string;
  supplierId?: string;
  quantityChange: number; // プラス/マイナス
  newQuantity: number;
  reason: string; // 変動理由（例: "販売", "仕入れ", "棚卸し調整"）
  changedAt: Date;
}

/**
 * HTML解析エラー履歴
 */
export interface HtmlParseError {
  id: number;
  sku: string;
  platform: Platform;
  errorType: 'image_broken' | 'description_truncated' | 'invalid_html' | 'other';
  errorMessage: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

/**
 * バリエーション（子SKU）
 */
export interface VariationChild {
  childSku: string;
  variationName: string; // 例: "Red - Large"
  stockQuantity: number;
  priceJpy: number;
  imageUrls: string[];
}

/**
 * Item Specifics（eBay等のメタデータ）
 */
export interface ItemSpecific {
  key: string;
  value: string;
}

/**
 * 出品データ（第3層）
 */
export interface ListingData {
  id: number;
  sku: string;
  platform: Platform;
  accountId: string;
  title: string;
  description: string;
  listingMode: ListingMode; // 中古優先 or 新品優先
  itemSpecifics: ItemSpecific[]; // Item Specifics
  variations: VariationChild[]; // バリエーション
  imageUrls: string[]; // 最大24枚
  status: MallStatusType;
  listedAt?: Date;
  updatedAt: Date;
}

/**
 * 統合出品アイテム（UIテーブル表示用）
 */
export interface ListingItem {
  sku: string;
  productId: number;
  title: string;
  category: string;
  condition: 'New' | 'Used' | 'Refurbished';
  totalStockCount: number; // 自社有在庫 + 無在庫仕入れ先の合計
  mallStatuses: MallStatus[]; // 各モールの出品ステータス
  performanceGrade: PerformanceGrade; // A+ / D など
  performanceScore: number; // 実際のスコア（B-2ロジックで算出）
  recommendedPlatform?: Platform; // P-2戦略エンジンの推奨
  currentPriceJpy: number; // 現在の価格（円）
  priceChangeFrequency: number; // 価格変動頻度（直近30日）
  lastUpdatedAt: Date;
  stockDetail?: StockDetail; // 在庫詳細（オンデマンド取得）
}

/**
 * フィルター条件
 */
export interface ListingFilter {
  platforms?: Platform[]; // モール絞り込み
  statuses?: MallStatusType[]; // ステータス絞り込み
  performanceGrades?: PerformanceGrade[]; // スコアグレード絞り込み
  categories?: string[]; // カテゴリ絞り込み
  conditions?: ('New' | 'Used' | 'Refurbished')[]; // コンディション絞り込み
  minStock?: number; // 最小在庫数
  maxStock?: number; // 最大在庫数
  searchQuery?: string; // SKU/タイトル検索
  // 動的フィルター（モール固有）
  ebayCategory?: string; // eBayの出品カテゴリー
  amazonAsinExists?: boolean; // AmazonでASINが存在するか
}

/**
 * ソート条件
 */
export interface ListingSort {
  field:
    | 'sku'
    | 'title'
    | 'totalStockCount'
    | 'performanceScore'
    | 'currentPriceJpy'
    | 'lastUpdatedAt';
  order: 'asc' | 'desc';
}

/**
 * 統合データ取得APIレスポンス
 */
export interface IntegratedListingResponse {
  items: ListingItem[];
  total: number;
  page: number;
  pageSize: number;
  availableFilters: {
    // 動的に利用可能なフィルター
    platforms: Platform[];
    categories: string[];
    ebayCategories?: string[];
  };
}

/**
 * データ編集APIリクエスト
 */
export interface EditListingRequest {
  sku: string;
  platform: Platform;
  accountId: string;
  updates: {
    title?: string;
    description?: string;
    itemSpecifics?: ItemSpecific[];
    variations?: VariationChild[];
    imageUrls?: string[];
  };
}

/**
 * モード切替APIリクエスト
 */
export interface ModeSwitchRequest {
  sku: string;
  platform: Platform;
  accountId: string;
  newMode: ListingMode;
}

/**
 * 出品停止APIリクエスト
 */
export interface StopListingRequest {
  sku: string;
  platform: Platform;
  accountId: string;
  reason?: string;
}

/**
 * ログ取得APIレスポンス
 */
export interface ListingLogsResponse {
  sku: string;
  priceHistory: PriceHistory[];
  stockHistory: StockHistory[];
  htmlParseErrors: HtmlParseError[];
}

/**
 * VERO対策情報
 */
export interface VeroProtection {
  officialBrandName: string; // 正式ブランド名
  isVeroProtected: boolean; // VERO対象か
  recommendedDescription?: string; // 推奨説明文
}

/**
 * 出品実行ステータス
 */
export type ExecutionStatus =
  | 'strategy_determined' // 戦略決定済
  | 'listing_in_progress' // 出品中
  | 'listed' // 出品完了
  | 'api_retry_pending' // APIリトライ待ち
  | 'listing_failed' // 出品停止（要確認）
  | 'delisted'; // 出品取り下げ

/**
 * エラータイプ
 */
export type ErrorType = 'temporary' | 'fatal';

/**
 * 出品実行結果
 */
export interface ExecutionResult {
  sku: string;
  platform: Platform;
  accountId: string;
  success: boolean;
  listingId?: string; // モール側で付与されたID（eBay Item ID, Amazon ASIN等）
  errorType?: ErrorType;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * 出品実行リクエスト
 */
export interface ExecuteListingRequest {
  sku: string;
  platform: Platform;
  accountId: string;
  forceExecute?: boolean; // 強制実行フラグ
}

/**
 * 一括出品実行リクエスト
 */
export interface BatchExecuteRequest {
  filter?: {
    status?: ExecutionStatus;
    minStock?: number;
    platforms?: Platform[];
  };
  dryRun?: boolean; // ドライラン（実際には実行しない）
}

/**
 * 一括出品実行レスポンス
 */
export interface BatchExecuteResponse {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: ExecutionResult[];
  errors: {
    sku: string;
    error: string;
  }[];
}

/**
 * API認証情報（環境変数から取得）
 */
export interface ApiCredentials {
  // eBay
  ebay?: {
    appId: string;
    devId: string;
    certId: string;
    oauthToken: string;
    siteId: string; // 0=US, 15=Australia, 186=Japan
  };
  // Amazon
  amazon?: {
    region: 'us' | 'eu' | 'fe'; // North America, Europe, Far East
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    sellerId: string;
    marketplaceId: string;
  };
  // Coupang
  coupang?: {
    accessKey: string;
    secretKey: string;
    vendorId: string;
  };
}

/**
 * 出品データペイロード（モール共通）
 */
export interface ListingPayload {
  sku: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  condition: 'New' | 'Used' | 'Refurbished';
  categoryId?: string;
  images: string[];
  itemSpecifics?: ItemSpecific[];
  variations?: VariationChild[];
  shippingPolicy?: string;
  returnPolicy?: string;
}
