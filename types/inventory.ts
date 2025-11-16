/**
 * 棚卸し・在庫管理システムの型定義
 */

// 商品タイプ
export type ProductType = 'stock' | 'dropship' | 'set' | 'hybrid'

// 商品状態
export type ConditionType = 'new' | 'used' | 'refurbished'

// 在庫変更タイプ
export type ChangeType = 'sale' | 'import' | 'manual' | 'adjustment' | 'set_sale'

// マーケットプレイス
export type Marketplace = 'ebay' | 'amazon' | 'shopee' | 'manual' | 'all'

// 棚卸し商品データ
export interface InventoryProduct {
  id: string
  unique_id: string
  product_name: string
  sku: string | null
  product_type: ProductType
  physical_quantity: number
  listing_quantity: number
  cost_price: number
  selling_price: number
  condition_name: string
  category: string
  subcategory?: string | null
  images: string[]
  source_data?: any
  supplier_info?: {
    url?: string
    tracking_id?: string
  }
  is_manual_entry: boolean
  priority_score: number
  notes?: string | null
  created_at: string
  updated_at: string
  
  // モール情報（拡張）
  marketplace?: Marketplace
  account?: string
  
  // eBay固有データ
  ebay_data?: {
    listing_id?: string
    offer_id?: string
    item_id?: string
    [key: string]: any
  }
}

// セット商品構成
export interface SetComponent {
  id: string
  set_product_id: string
  component_product_id: string
  quantity_required: number
  created_at: string
}

// 在庫変更履歴
export interface InventoryChange {
  id: string
  product_id: string
  change_type: ChangeType
  quantity_before: number
  quantity_after: number
  source: string
  notes?: string | null
  metadata?: any
  created_at: string
}

// フィルター条件
export interface InventoryFilter {
  search?: string
  product_type?: ProductType | 'all'
  stock_status?: 'in_stock' | 'out_of_stock' | 'all'
  condition?: ConditionType | 'all'
  category?: string
  marketplace?: Marketplace
}

// 統計情報
export interface InventoryStats {
  total: number
  in_stock: number
  out_of_stock: number
  stock_count: number
  dropship_count: number
  set_count: number
  total_value: number
}
