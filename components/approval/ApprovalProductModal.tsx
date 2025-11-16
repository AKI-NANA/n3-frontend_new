'use client'

import { useMemo } from 'react'
import { FullFeaturedModal } from '@/components/ProductModal'
import type { Product as ModalProduct } from '@/types/product'

interface ApprovalProduct {
  id: number
  sku: string
  title: string
  title_en: string
  images: string[]
  scraped_data?: { images?: string[] }
  condition: string
  source: string
  source_table: string
  store_name?: string
  store_id?: string
  store_url?: string
  category_name: string
  profit_margin_percent: number
  ai_confidence_score: number
  approval_status: string
  hts_code?: string
  hts_duty_rate?: number
  origin_country?: string
  inventory_quantity?: number
  stock_quantity?: number
  primary_image_url?: string
  gallery_images?: string[]
  listing_priority?: string
  profit_amount?: number
  current_price?: number
  listing_price?: number
  listing_data?: any
  ebay_api_data?: any
  [key: string]: any
}

interface ApprovalProductModalProps {
  product: ApprovalProduct
  onClose: () => void
}

export function ApprovalProductModal({ product, onClose }: ApprovalProductModalProps) {
  console.log('ApprovalProductModal - product:', product)
  
  // 画像データを取得
  const images = useMemo(() => {
    console.log('🖼️ 画像データ確認:', {
      primary_image_url: product.primary_image_url,
      gallery_images: product.gallery_images,
      images_array: product.images,
      scraped_data_images: product.scraped_data?.images
    })
    
    // 優先順位: gallery_images > primary_image_url > images > scraped_data.images
    let imageData: string[] = []
    
    if (product.gallery_images && product.gallery_images.length > 0) {
      imageData = product.gallery_images
    } else if (product.primary_image_url) {
      imageData = [product.primary_image_url]
    } else if (product.images && product.images.length > 0) {
      imageData = product.images
    } else if (product.scraped_data?.images && product.scraped_data.images.length > 0) {
      imageData = product.scraped_data.images
    }
    
    return imageData.map((url, index) => ({
      id: `img${index + 1}`,
      url: url,
      isMain: index === 0,
      order: index + 1
    })).filter(img => img.url)
  }, [product.primary_image_url, product.gallery_images, product.images, product.scraped_data?.images])

  // 選択された画像（全て選択）
  const selectedImages = useMemo(() => {
    return images.map(img => img.id)
  }, [images])

  // ApprovalProduct を ModalProduct に変換
  const modalProduct: ModalProduct = useMemo(() => {
    console.log('💰 ApprovalProductModal - 利益データ:', {
      profit_amount: product.profit_amount,
      profit_amount_usd: product.profit_amount_usd,
      profit_margin_percent: product.profit_margin_percent,
      sm_profit_amount_usd: product.sm_profit_amount_usd,
      current_price: product.current_price,
      listing_price: product.listing_price
    })

    return {
    id: String(product.id),
    asin: product.sku || '',
    sku: product.sku || '',
    master_key: product.sku,
    title: product.title,
    english_title: product.title_en || product.title,
    description: product.listing_data?.html_description || '',
    
    // 💰 価格情報 - 正しいフィールドを使用
    price: product.current_price || 0,
    price_jpy: product.current_price || 0,
    price_usd: product.listing_price || product.recommended_price_usd || 0,
    cost: product.current_price || 0,
    profit: product.profit_amount_usd || product.profit_amount || 0,
    
    images,
    selectedImages,
    
    // カテゴリ情報
    category: {
      id: product.ebay_api_data?.category_id || '',
      name: product.category_name || '',
      path: product.category_name ? [product.category_name] : [],
      confidence: 1
    },
    
    // 在庫情報
    stock: {
      available: product.inventory_quantity || product.stock_quantity || 0,
      reserved: 0,
      location: ''
    },
    
    // マーケットプレイス情報
    marketplace: {
      id: 'ebay',
      name: 'eBay',
      status: product.approval_status === 'approved' ? 'ready' : 'draft'
    },
    
    // データ
    listing_data: product.listing_data,
    ebay_api_data: product.ebay_api_data,
    scraped_data: product.scraped_data,
    
    // 🔍 SellerMirror - 正しい利益データを使用
    sm_lowest_price: product.sm_lowest_price,
    sm_average_price: product.sm_average_price,
    sm_competitor_count: product.sm_competitor_count,
    // sm_profit_marginとsm_profit_amount_usdは最安価格での利益（マイナスの場合あり）
    sm_profit_margin: product.sm_profit_margin,
    sm_profit_amount_usd: product.sm_profit_amount_usd,
    
    // 💰 利益情報 - デフォルト計算結果を使用
    profit_margin: product.profit_margin_percent || 0,
    profit_amount_usd: product.profit_amount_usd || product.profit_amount || 0,
    
    source_item_id: product.sku,
    createdAt: product.created_at || new Date().toISOString(),
    updatedAt: product.updated_at || new Date().toISOString()
  } as any
  }, [product, images, selectedImages])

  return (
    <FullFeaturedModal
      product={modalProduct}
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    />
  )
}
