// types/inventory.ts
// 棚卸しシステム型定義

export type ProductType = 'stock' | 'dropship' | 'set' | 'hybrid'
export type ChangeType = 'sale' | 'import' | 'manual' | 'adjustment' | 'set_sale'
export type ConditionType = 'new' | 'used' | 'refurbished'

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
  condition_name: ConditionType | string
  category: string
  subcategory: string | null
  images: string[]
  source_data: Record<string, any>
  supplier_info: Record<string, any>
  is_manual_entry: boolean
  priority_score: number
  notes: string | null
  created_at: string
  updated_at: string
  // マーケットプレイス情報
  marketplace?: 'ebay' | 'shopee' | 'amazon-global' | 'amazon-jp' | 'coupang' | 'shopify' | 'q10'
  account?: string  // green, mjt など
  currency?: string // USD, JPY など
  // eBay固有データ
  ebay_data?: {
    offer_id?: string
    listing_id?: string
    status?: string
    marketplace_id?: string
    description?: string
    aspects?: Record<string, string[]>
    weight?: any
    dimensions?: any
  }
  // セット品の場合の構成情報
  set_components?: SetComponent[]
}

export interface SetComponent {
  id: string
  set_product_id: string
  component_product_id: string
  quantity_required: number
  created_at: string
  // JOIN結果
  component?: InventoryProduct
}

export interface InventoryChange {
  id: string
  product_id: string
  change_type: ChangeType
  quantity_before: number
  quantity_after: number
  source: string
  notes: string | null
  metadata: Record<string, any>
  created_at: string
}

export interface InventoryStats {
  total: number
  in_stock: number
  out_of_stock: number
  stock_count: number
  dropship_count: number
  set_count: number
  total_value: number
}

export interface InventoryFilter {
  search?: string
  product_type?: ProductType | 'all'
  category?: string
  stock_status?: 'in_stock' | 'out_of_stock' | 'all'
  condition?: ConditionType | 'all'
}

export interface ProductFormData {
  product_name: string
  sku: string
  product_type: ProductType
  cost_price: number
  selling_price: number
  physical_quantity: number
  condition_name: ConditionType
  category: string
  images: string[]
  supplier_info?: {
    url?: string
    tracking_id?: string
  }
  notes?: string
}

export interface SetProductFormData {
  product_name: string
  sku: string
  selling_price: number
  components: Array<{
    product_id: string
    quantity: number
  }>
}
