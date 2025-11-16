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
    console.log('🖼️ 画像データ確認:', {
      gallery_images: product.gallery_images,
      scraped_data_images: product.scraped_data?.images,
      images_array: product.images,
      image_urls: product.image_urls
    });
    
    // 🔥 優先順位: gallery_images > scraped_data.images > images > image_urls
    let imageData = 
      product.gallery_images || 
      product.scraped_data?.images || 
      product.images || 
      product.image_urls || 
      []
    
    // 既に配列の場合はそのまま、文字列URLの場合は変換
    if (!Array.isArray(imageData)) {
      imageData = []
    }
    
    const processedImages = imageData.map((item, index) => {
      // 画像データがオブジェクトの場合と文字列の場合の両方に対応
      const url = typeof item === 'string' ? item : item.url || item.original || item.imageUrl || ''
      return {
        id: `img${index + 1}`,
        url: url,
        isMain: index === 0,
        order: index + 1
      }
    }).filter(img => img.url) // URLが空のものは除外
    
    console.log('✅ 処理後の画像数:', processedImages.length);
    
    return processedImages
  }, [product.gallery_images, product.scraped_data?.images, product.images, product.image_urls])

  // 選択された画像は listing_data から復元
  const selectedImages = useMemo(() => {
    const savedImageUrls = product.listing_data?.image_urls
    if (savedImageUrls && Array.isArray(savedImageUrls)) {
      // 保存されたURLからIDを復元
      return images
        .filter(img => savedImageUrls.includes(img.url))
        .map(img => img.id)
    }
    // 保存データがなければ全選択（初回のみ）
    return images.map(img => img.id)
  }, [images, product.listing_data?.image_urls])

  // EditingProduct を ModalProduct に変換（useMemoでメモ化）
  const modalProduct: ModalProduct = useMemo(() => ({
    id: String(product.id),
    asin: product.source_item_id || product.source_id || '',
    sku: product.sku || '',
    master_key: product.master_key,
    title: product.title || '',  // 🔥 日本語タイトルをそのまま使用
    english_title: product.english_title || product.title_en,
    description: product.description || '',  // 🔥 日本語説明をそのまま使用
    english_description: product.english_description || product.description_en,
    
    // 💰 価格情報（複数ソース対応）
    price: product.listing_data?.ddp_price_usd || product.price_usd || product.listing_price || product.current_price || 0,
    price_jpy: product.price_jpy || product.purchase_price_jpy || product.current_price,
    price_usd: product.price_usd || product.recommended_price_usd,
    cost: product.price_jpy || product.purchase_price_jpy || product.cost_price || 0,
    profit: product.profit_amount_usd || product.profit_amount || 0,
    
    images,
    selectedImages,
    
    // 📋 カテゴリ情報（複数ソース対応）
    category: {
      id: product.ebay_api_data?.category_id || product.ebay_category_id || product.category_id || '',
      name: product.ebay_api_data?.category_name || product.category_name || product.category || '',
      path: product.ebay_category_path ? [product.ebay_category_path] : 
            (product.category_name ? [product.category_name] : []),
      confidence: product.category_confidence || 1
    },
    
    // 📦 在庫情報
    stock: {
      available: product.current_stock || product.inventory_quantity || 0,
      reserved: 0,
      location: product.inventory_location || ''
    },
    
    // 🏪 マーケットプレイス情報
    marketplace: {
      id: 'ebay',
      name: 'eBay',
      status: product.status === 'ready' || product.workflow_status === 'ready_to_list' ? 'ready' : 'draft'
    },
    
    // 📝 出品データ
    listing_data: product.listing_data,
    
    // 📦 各種API/データ
    ebay_api_data: product.ebay_api_data,
    scraped_data: product.scraped_data,
    
    // 📊 SellerMirror分析結果
    sm_lowest_price: product.sm_lowest_price || product.competitors_lowest_price,
    sm_average_price: product.sm_average_price || product.competitors_average_price,
    sm_competitor_count: product.sm_competitor_count || product.competitors_count,
    sm_profit_margin: product.sm_profit_margin,
    sm_profit_amount_usd: product.sm_profit_amount_usd,
    
    // 📈 利益情報
    profit_margin: product.profit_margin || product.profit_margin_percent,
    profit_amount_usd: product.profit_amount_usd || product.profit_amount,
    profit_margin_percent: product.profit_margin_percent, // 🔥 追加
    
    // 🧾 関税情報
    hts_code: product.hts_code,
    origin_country: product.origin_country,
    material: product.material,
    tariff_rate: product.tariff_rate || product.hts_duty_rate,
    total_tariff_rate: product.total_tariff_rate,
    origin_country_duty_rate: product.origin_country_duty_rate,
    material_duty_rate: product.material_duty_rate,
    section232_rate: product.section232_rate,
    section301_rate: product.section301_rate,
    customs_value_usd: product.listing_data?.customs_value_usd,
    hts_description: product.hts_description,
    
    // 📦 状態情報
    condition: product.listing_data?.condition || product.condition || product.condition_name,
    condition_id: product.listing_data?.condition_id,
    condition_en: product.listing_data?.condition_en || product.english_condition,
    
    // 🔗 その他
    source_item_id: product.source_item_id || product.source_id,
    createdAt: product.created_at || new Date().toISOString(),
    updatedAt: product.updated_at || new Date().toISOString()
  } as any), [
    product.id,
    product.source_item_id,
    product.source_id,
    product.sku,
    product.master_key,
    product.title,
    product.english_title,
    product.title_en,
    product.listing_data,
    product.price_usd,
    product.price_jpy,
    product.current_price,
    product.listing_price,
    product.profit_amount_usd,
    product.profit_amount,
    product.ebay_api_data,
    product.scraped_data,
    product.category,
    product.category_name,
    product.sm_lowest_price,
    product.sm_average_price,
    product.sm_competitor_count,
    product.sm_profit_margin,
    product.sm_profit_amount_usd,
    product.profit_margin,
    product.profit_margin_percent,
    product.status,
    product.workflow_status,
    product.current_stock,
    product.inventory_quantity,
    product.created_at,
    product.updated_at,
    images,
    selectedImages
  ])

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
