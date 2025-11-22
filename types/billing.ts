// ========================================
// 出荷請求グループシステム - TypeScript型定義
// 作成日: 2025-11-22
// 目的: 税務調査対応のための請求書グループ管理システムの型定義
// ========================================

/**
 * 請求タイプの列挙型
 */
export type InvoiceGroupType =
  | 'C_PASS_FEDEX'           // FedEx C-PASSまとめ請求
  | 'JAPAN_POST_INDIVIDUAL'  // 日本郵便個別請求
  | 'OTHER_BULK';            // その他まとめ請求

/**
 * 出荷請求書グループ
 * 1つの請求書PDFに対して複数の受注を紐付けるための中間エンティティ
 */
export interface ShippingInvoiceGroup {
  /** 請求書グループID（一意識別子） */
  Group_ID: string;

  /** 請求タイプ */
  Group_Type: InvoiceGroupType;

  /** 請求書PDFまたは画像の保存先パス（S3/Google Driveなど） */
  Invoice_File_Path: string | null;

  /** 請求書に記載された総送料（経費）JPY */
  Invoice_Total_Cost_JPY: number;

  /** ファイルをアップロードした担当者 */
  Uploaded_By: string | null;

  /** ファイルのアップロード日時 */
  Uploaded_Date: Date;

  /** 作成日時 */
  Created_At?: Date;

  /** 更新日時 */
  Updated_At?: Date;
}

/**
 * 受注データ（Orderインターフェースの拡張）
 * 既存のOrder型に請求グループ関連フィールドを追加
 */
export interface OrderWithInvoiceGroup {
  id: string;
  customerID: string;
  marketplace: "eBay" | "Amazon" | "Shopee" | "Qoo10";
  orderDate: string;
  shippingDeadline: string;
  items: { sku: string; name: string; quantity: number; salePrice: number }[];

  // 仕入れ・利益管理
  inquiryHistoryCount: number;
  estimatedProfit: number;
  purchaseStatus: "未仕入れ" | "仕入れ済み" | "キャンセル";
  estimatedPurchaseUrl: string;
  actualPurchaseUrl: string | null;
  actualPurchaseCostJPY: number | null;
  estimatedShippingCostJPY: number;

  // 🆕 請求グループ関連（税務調査対応）
  /** 確定送料（この受注単体にかかった送料） */
  finalShippingCostJPY: number | null;

  /** 確定純利益 */
  finalProfit: number | null;

  /** 利益確定済みフラグ */
  isProfitConfirmed: boolean;

  /** 紐づく請求書グループのID（NULLでないことが「経費証明済み」の条件） */
  Invoice_Group_ID: string | null;

  /** この受注単体にかかった確定送料（グループ総額からの按分または個別金額） */
  Actual_Shipping_Cost_JPY: number | null;
}

/**
 * 出荷管理用の受注データ型
 */
export interface ShippingOrder {
  id: string;
  itemName: string;
  customerName: string;
  shippingStatus: "PENDING" | "READY" | "COMPLETED";
  finalShippingCost: number | null;
  trackingNumber: string | null;

  /** 紐づく請求書グループのID */
  invoiceGroupId: string | null;

  /** 配送タイプ（個別請求かまとめ請求か） */
  shippingType?: 'INDIVIDUAL' | 'BULK';

  /** 配送業者 */
  carrier?: 'JAPAN_POST' | 'FEDEX' | 'DHL' | 'OTHER';
}

/**
 * 請求書グループ作成リクエスト
 */
export interface CreateInvoiceGroupRequest {
  Group_Type: InvoiceGroupType;
  Invoice_File_Path?: string;
  Invoice_Total_Cost_JPY: number;
  Uploaded_By: string;
}

/**
 * 請求書グループ更新リクエスト
 */
export interface UpdateInvoiceGroupRequest {
  Group_ID: string;
  Invoice_File_Path?: string;
  Invoice_Total_Cost_JPY?: number;
}

/**
 * 受注と請求書グループの紐付けリクエスト
 */
export interface LinkOrdersToGroupRequest {
  /** 請求書グループID */
  Group_ID: string;

  /** 紐付ける受注IDのリスト */
  Order_IDs: string[];

  /** 各受注の確定送料（按分計算結果または手動入力） */
  Shipping_Costs?: { [orderId: string]: number };
}

/**
 * 個別請求証明書アップロードリクエスト
 */
export interface UploadIndividualInvoiceRequest {
  /** 受注ID */
  Order_ID: string;

  /** 配送業者 */
  Carrier: 'JAPAN_POST' | 'OTHER';

  /** 確定送料 */
  Final_Shipping_Cost_JPY: number;

  /** 追跡番号 */
  Tracking_Number: string;

  /** アップロードファイル（base64または URL） */
  Invoice_File: string | File;

  /** アップロード担当者 */
  Uploaded_By: string;
}

/**
 * まとめ請求の未紐付け受注
 */
export interface UnlinkedShippingOrder {
  id: string;
  itemName: string;
  customerName: string;
  shippingDate: string;
  trackingNumber: string | null;
  estimatedShippingCost: number;
  carrier: string;
}

/**
 * 税務コンプライアンスアラート
 */
export interface ComplianceAlert {
  /** アラートタイプ */
  type: 'MISSING_INVOICE_PROOF';

  /** 対象件数 */
  count: number;

  /** アラートメッセージ */
  message: string;

  /** 優先度 */
  severity: 'HIGH' | 'MEDIUM' | 'LOW';

  /** 対象受注IDリスト */
  affectedOrderIds?: string[];
}
