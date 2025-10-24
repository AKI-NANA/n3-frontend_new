// app/tools/editing/components/ProductModal.tsx
'use client'

import { useMemo } from 'react'
import { FullFeaturedModal } from '@/components/ProductModal'
import { SKUInfoPanel } from '@/components/SKUInfoPanel'
import type { Product as EditingProduct, ProductUpdate } from '../types/product'
import type { Product as ModalProduct } from '@/types/product'

interface ProductModalProps {
  product: EditingProduct
  onClose: () => void
  onSave: (updates: ProductUpdate) => void
}

export function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  console.log('ProductModal - product:', product);
  console.log('ProductModal - sku:', product.sku);
  console.log('ProductModal - master_key:', product.master_key);
  
  // 🇪🇺 EU責任者情報のデバッグ出力
  console.log('🇪🇺 EU Responsible Person Data:', {
    company: product.eu_responsible_company_name,
    address: product.eu_responsible_address_line1,
    city: product.eu_responsible_city,
    country: product.eu_responsible_country
  });

  // 画像データを取得（useMemoでメモ化して無限ループを防止）
  const images = useMemo(() => {
    const imageUrls = product.scraped_data?.image_urls || product.listing_data?.image_urls || []
    return Array.isArray(imageUrls)
      ? imageUrls.map((url, index) => ({
          id: `img${index + 1}`,
          url: url,
          isMain: index === 0,
          order: index + 1
        }))
      : []
  }, [product.scraped_data?.image_urls, product.listing_data?.image_urls])

  const selectedImages = useMemo(() => images.map(img => img.id), [images])

  // EditingProduct を ModalProduct に変換（useMemoでメモ化）
  const modalProduct: ModalProduct = useMemo(() => ({
    id: String(product.id), // 文字列に変換
    asin: product.source_item_id || '',
    sku: product.sku || '',
    master_key: product.master_key,
    title: product.title,
    english_title: product.english_title, // 英語タイトル追加
    description: product.listing_data?.html_description || '',
    price: product.listing_data?.ddp_price_usd || product.price_usd || 0,
    price_jpy: product.price_jpy, // JPY価格追加
    price_usd: product.price_usd, // USD価格追加
    cost: product.price_jpy || 0,
    profit: product.profit_amount_usd || 0,
    images,
    selectedImages,
    category: {
      id: product.ebay_api_data?.category_id || '',
      name: product.ebay_api_data?.category_name || '',
      path: product.ebay_api_data?.category_name ? [product.ebay_api_data.category_name] : [],
      confidence: 1
    },
    stock: {
      available: product.current_stock || 0,
      reserved: 0,
      location: ''
    },
    marketplace: {
      id: 'ebay',
      name: 'eBay',
      status: product.status === 'ready' ? 'ready' : 'draft'
    },
    listing_data: {
      ...product.listing_data,
      // EU責任者情報を明示的に含める
      eu_responsible_company_name: product.eu_responsible_company_name,
      eu_responsible_address_line1: product.eu_responsible_address_line1,
      eu_responsible_address_line2: product.eu_responsible_address_line2,
      eu_responsible_city: product.eu_responsible_city,
      eu_responsible_state_or_province: product.eu_responsible_state_or_province,
      eu_responsible_postal_code: product.eu_responsible_postal_code,
      eu_responsible_country: product.eu_responsible_country,
      eu_responsible_email: product.eu_responsible_email,
      eu_responsible_phone: product.eu_responsible_phone,
      eu_responsible_contact_url: product.eu_responsible_contact_url,
    },
    ebay_api_data: product.ebay_api_data, // ebay_api_dataをそのまま渡す
    scraped_data: product.scraped_data, // scraped_dataをそのまま渡す
    sm_lowest_price: product.sm_lowest_price, // SellerMirror最低価格
    sm_average_price: product.sm_average_price, // SellerMirror平均価格
    sm_competitor_count: product.sm_competitor_count, // SellerMirror競合数
    sm_profit_margin: product.sm_profit_margin, // SellerMirror利益率
    sm_profit_amount_usd: product.sm_profit_amount_usd, // SellerMirror利益額
    profit_margin: product.profit_margin, // 利益率
    profit_amount_usd: product.profit_amount_usd, // 利益額
    source_item_id: product.source_item_id, // source_item_id
    createdAt: product.created_at || new Date().toISOString(),
    updatedAt: product.updated_at || new Date().toISOString()
  } as any), [
    product.id,
    product.source_item_id,
    product.sku,
    product.master_key,
    product.title,
    product.english_title,
    product.listing_data,
    product.price_usd,
    product.price_jpy,
    product.profit_amount_usd,
    product.ebay_api_data,
    product.scraped_data,
    product.sm_lowest_price,
    product.sm_average_price,
    product.sm_competitor_count,
    product.sm_profit_margin,
    product.sm_profit_amount_usd,
    product.profit_margin,
    product.status,
    product.current_stock,
    product.created_at,
    product.updated_at,
    product.eu_responsible_company_name,
    product.eu_responsible_address_line1,
    product.eu_responsible_address_line2,
    product.eu_responsible_city,
    product.eu_responsible_state_or_province,
    product.eu_responsible_postal_code,
    product.eu_responsible_country,
    product.eu_responsible_email,
    product.eu_responsible_phone,
    product.eu_responsible_contact_url,
    images,
    selectedImages
  ]) // 型エラー回避のためas any

  return (
    <FullFeaturedModal
      product={modalProduct}
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      onSave={onSave}
    />
  )
}
