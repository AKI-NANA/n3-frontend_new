// app/tools/editing/components/EditingTable.tsx
'use client'

import { useState, useEffect } from 'react'
import type { Product, ProductUpdate } from '../types/product'
import { ListingStatusBadge } from './ListingStatusBadge'
import { AlertCircle } from 'lucide-react'

// 数値フォーマット関数
function formatPercentage(value: number | null | undefined): string {
  if (value == null) return '-'
  // 四捨五入、小数点なし
  return `${Math.round(value)}%`
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  // 小数点第2位まで
  return `${value.toFixed(2)}`
}

function getValueClass(value: number | null | undefined): string {
  if (value == null) return ''
  // マイナス値は赤色
  return value < 0 ? 'text-red-600 dark:text-red-400' : ''
}

// 🎯 HTS判定結果に応じた背景色を返す
function getHTSBackgroundColor(htsCode?: string, confidence?: string): string | undefined {
  if (!htsCode || htsCode === '要確認' || htsCode === '取得失敗') {
    return '#fef3c7' // yellow-100
  }
  if (confidence === 'low' || confidence === 'uncertain') {
    return '#fed7aa' // orange-100
  }
  return undefined // デフォルト
}

// 🎓 HTSスコアの背景色を返す（学習システム用）
function getScoreBackgroundColor(score: number | null | undefined, confidence?: string): string {
  if (!score) return '#fef2f2' // red-50 - スコアなし
  
  // 信頼度による色分け
  if (confidence === 'very_high' || score >= 900) {
    return '#f0fdf4' // green-50 - 学習済み（最高信頼度）
  }
  if (confidence === 'high' || score >= 700) {
    return '#eff6ff' // blue-50 - マスター推定（高信頼度）
  }
  if (confidence === 'medium' || score >= 300) {
    return '#fffbeb' // yellow-50 - 検索結果（中信頼度）
  }
  return '#fef2f2' // red-50 - 要確認（低信頼度）
}

// 🎯 信頼度アイコンを返す（軽量化）
function getConfidenceIcon(confidence?: string): string {
  if (confidence === 'very_high') return '✓' // 学習済み
  if (confidence === 'high') return '○' // マスター推定
  if (confidence === 'medium') return '△' // 検索結果
  return '?' // 要確認
}

// 編集可能なセルコンポーネント
interface EditableCellProps {
  value: string
  align: string
  productId: string
  field: string
  modifiedIds: Set<string>
  onFocus: () => void
  onBlur: (value: string) => void
  bgColor?: string
  showWarning?: boolean // ⚠️アイコン表示
  multiline?: boolean // 🆕 2行表示フラグ
}

function EditableCell({ 
  value, 
  align, 
  productId, 
  field, 
  modifiedIds, 
  onFocus, 
  onBlur, 
  bgColor,
  showWarning,
  multiline = false // 🆕 デフォルトはfalse
}: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value)
  
  useEffect(() => {
    setLocalValue(value)
  }, [value])
  
  // 🆕 2行表示の場合はtextareaを使用
  if (multiline) {
    return (
      <td className="p-0 border-r border-border relative">
        {showWarning && (
          <div className="absolute top-0.5 right-0.5 z-10">
            <AlertCircle className="w-3 h-3 text-orange-500" />
          </div>
        )}
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={onFocus}
          onBlur={() => onBlur(localValue)}
          rows={2}
          className={`w-full px-1.5 py-1 hover:bg-muted/50 focus:bg-card focus:outline focus:outline-2 focus:outline-primary text-${align} text-foreground resize-none ${
            modifiedIds.has(productId) ? 'border-l-2 border-amber-500' : ''
          }`}
          style={{ 
            minHeight: '40px',
            lineHeight: '1.4',
            backgroundColor: bgColor || (localValue ? 'rgb(var(--muted) / 0.3)' : 'rgb(var(--muted) / 0.3)')
          }}
        />
      </td>
    )
  }
  
  return (
    <td className="p-0 border-r border-border relative">
      {showWarning && (
        <div className="absolute top-0.5 right-0.5 z-10">
          <AlertCircle className="w-3 h-3 text-orange-500" />
        </div>
      )}
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={onFocus}
        onBlur={() => onBlur(localValue)}
        className={`w-full px-1 py-0.5 hover:bg-muted/50 focus:bg-card focus:outline focus:outline-2 focus:outline-primary text-${align} text-foreground ${
          modifiedIds.has(productId) ? 'border-l-2 border-amber-500' : ''
        }`}
        style={{ 
        minHeight: '22px',
          backgroundColor: bgColor || (localValue ? 'rgb(var(--muted) / 0.3)' : 'rgb(var(--muted) / 0.3)')
        }}
      />
    </td>
  )
}

interface EditingTableProps {
  products: Product[]
  selectedIds: Set<string>
  modifiedIds: Set<string>
  onSelectChange: (ids: Set<string>) => void
  onCellChange: (id: string, updates: ProductUpdate) => void
  onProductClick: (product: Product) => void
}

export function EditingTable({
  products,
  selectedIds,
  modifiedIds,
  onSelectChange,
  onCellChange,
  onProductClick
}: EditingTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)

  // 🔍 デバッグ: 商品データの確認
  useEffect(() => {
    console.log('📦 EditingTable: productsデータ', {
      件数: products.length,
      最初の3件: products.slice(0, 3).map(p => ({
        id: p.id,
        title: p.title?.substring(0, 30),
        hts_code: p.hts_code,
        hts_confidence: p.hts_confidence,
        sm_sales_count: p.sm_sales_count,
        sm_profit_margin: p.sm_profit_margin,
        sm_profit_amount_usd: p.sm_profit_amount_usd,
        shipping_service: p.listing_data?.shipping_service,
        usa_shipping_policy_name: p.listing_data?.usa_shipping_policy_name
      }))
    })
  }, [products])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectChange(new Set(products.map(p => String(p.id))))
    } else {
      onSelectChange(new Set())
    }
  }

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds)
    const idStr = String(id)
    if (checked) {
      newSet.add(idStr)
    } else {
      newSet.delete(idStr)
    }
    onSelectChange(newSet)
  }

  const handleCellBlur = async (product: Product, field: string, value: string) => {
    // 🔥 JSONBフィールドの処理を追加
    let updates: ProductUpdate = {}
    
    // ネストされたフィールド（listing_data.xxx）の処理
    if (field.includes('.')) {
      const [parentField, childField] = field.split('.')
      
      // 現在の値を取得
      const currentValue = (product[parentField as keyof Product] as any)?.[childField]
      
      // 値が変更されていない場合はスキップ
      if (value === String(currentValue ?? '')) {
        setEditingCell(null)
        return
      }
      
      // 数値フィールドの判定
      const numericFields = [
        'weight_g', 'length_cm', 'width_cm', 'height_cm',
        'ddp_price_usd', 'ddu_price_usd', 'shipping_cost_usd',
        'profit_margin', 'profit_amount_usd', 'image_count'
      ]
      
      let parsedValue: any = value
      if (numericFields.includes(childField)) {
        parsedValue = value === '' ? null : parseFloat(value)
      }
      
      // 既存のlisting_dataとマージ
      const existingData = (product[parentField as keyof Product] as any) || {}
      updates[parentField] = {
        ...existingData,
        [childField]: parsedValue
      }
      
      console.log(`📝 JSONBフィールド編集: ${field} = ${value}`, {
        親フィールド: parentField,
        子フィールド: childField,
        新しい値: parsedValue,
        マージ後: updates[parentField]
      })
      
    } else {
      // 通常のフィールド
      const currentValue = product[field as keyof Product]
      
      if (value === String(currentValue ?? '')) {
        setEditingCell(null)
        return
      }
      
      const numericFields = [
        'price_jpy', 'price_usd', 'current_stock',
        'profit_margin', 'profit_amount_usd',
        'sm_sales_count', 'sm_competitor_count', 'sm_lowest_price', 'sm_average_price', 
        'sm_profit_margin', 'sm_profit_amount_usd',
        'research_sold_count', 'research_competitor_count', 'research_lowest_price',
        'research_profit_margin', 'research_profit_amount',
        'hts_duty_rate', 'origin_country_duty_rate', 'material_duty_rate'
      ]

      let parsedValue: any = value
      if (numericFields.includes(field)) {
        parsedValue = value === '' ? null : parseFloat(value)
      }

      updates = { [field]: parsedValue }
      
      console.log(`📝 通常フィールド編集: ${field} = ${value}`, {
        新しい値: parsedValue
      })
    }

    // メモリ上で変更を保持（DB保存は「保存(1)」ボタンで行う）
    onCellChange(product.id, updates)
    setEditingCell(null)
  }

  const getScoreBadgeClass = (score: number | null) => {
    if (!score) return 'bg-muted text-muted-foreground'
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const getImageUrl = (product: Product) => {
    // 🔥 複数ソースから画像を取得
    
    // 1. primary_image_urlを優先
    if (product.primary_image_url) {
      return product.primary_image_url
    }
    
    // 2. images配列（直接フィールド）
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // 文字列配列の場合
      if (typeof product.images[0] === 'string') {
        return product.images[0]
      }
      // オブジェクト配列の場合
      if (product.images[0]?.url) {
        return product.images[0].url
      }
    }
    
    // 3. scraped_data.images
    if (product.scraped_data?.images && Array.isArray(product.scraped_data.images)) {
      const scrapedImages = product.scraped_data.images
      if (scrapedImages.length > 0) {
        return typeof scrapedImages[0] === 'string' ? scrapedImages[0] : scrapedImages[0]?.url
      }
    }
    
    // 4. gallery_images
    if (product.gallery_images && Array.isArray(product.gallery_images) && product.gallery_images.length > 0) {
      return product.gallery_images[0]
    }
    
    // 5. listing_data.image_urls
    const listingImages = product.listing_data?.image_urls
    if (listingImages && Array.isArray(listingImages) && listingImages.length > 0) {
      return listingImages[0]
    }
    
    // 6. scraped_data.image_urls
    const scrapedImageUrls = product.scraped_data?.image_urls
    if (scrapedImageUrls && Array.isArray(scrapedImageUrls) && scrapedImageUrls.length > 0) {
      return scrapedImageUrls[0]
    }
    
    // 7. プレースホルダー
    return 'https://placehold.co/35x35/6b7280/fff?text=No+Img'
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="overflow-x-auto" style={{ overflowX: 'scroll' }}>
        <table className="w-full text-[11px] border-collapse" style={{ minWidth: '2500px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted border-b-2 border-border">
              <th className="p-2 text-center border-r border-border">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selectedIds.size === products.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-input"
                />
              </th>
              <th className="p-1 text-center border-r border-border w-16 text-foreground text-[10px]">画像</th>
              <th className="p-1 border-r border-border w-[100px] text-foreground text-[10px]">SKU</th>
              <th className="p-1 border-r border-border w-[180px] text-foreground text-[10px] bg-indigo-50 dark:bg-indigo-900/20">Master Key</th>
              <th className="p-1 border-r border-border w-[300px] text-foreground text-[10px]">商品名</th>
              <th className="p-1 border-r border-border w-[320px] text-foreground text-[10px]">英語タイトル</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">取得価格<div className="text-[10px] text-muted-foreground">(JPY)</div></th>
              <th className="p-2 border-r border-border w-[50px] text-foreground">長さ<div className="text-[10px] text-muted-foreground">(cm)</div></th>
              <th className="p-2 border-r border-border w-[50px] text-foreground">幅<div className="text-[10px] text-muted-foreground">(cm)</div></th>
              <th className="p-2 border-r border-border w-[50px] text-foreground">高さ<div className="text-[10px] text-muted-foreground">(cm)</div></th>
              <th className="p-2 border-r border-border w-[55px] text-foreground">重さ<div className="text-[10px] text-muted-foreground">(g)</div></th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">状態</th>
              <th className="p-2 border-r border-border w-[55px] text-foreground">画像<br/>枚数</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">DDP価格<div className="text-[10px] text-muted-foreground">(USD)</div></th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">DDU価格<div className="text-[10px] text-muted-foreground">(USD)</div></th>
              <th className="p-2 border-r border-border min-w-[80px] text-foreground">配送サービス</th>
              <th className="p-2 border-r border-border w-[65px] text-foreground">実送料<div className="text-[10px] text-muted-foreground">(USD)</div></th>
              <th className="p-2 border-r border-border w-[65px] text-foreground">送料込<div className="text-[10px] text-muted-foreground">(DDP)</div></th>
              <th className="p-2 border-r border-border min-w-[100px] text-foreground">配送ポリシー</th>
              <th className="p-2 border-r border-border w-[60px] text-foreground">利益率<div className="text-[10px] text-muted-foreground">(%)</div></th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">利益額<div className="text-[10px] text-muted-foreground">(USD)</div></th>
              <th className="p-2 border-r border-border w-[60px] text-foreground">利益率<div className="text-[10px] text-muted-foreground">(還付後)</div></th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">利益額<div className="text-[10px] text-muted-foreground">(還付後)</div></th>
              <th className="p-2 border-r border-border w-[50px] text-foreground">在庫数</th>
              <th className="p-2 border-r border-border min-w-[100px] text-foreground">カテゴリ名</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">カテゴリ<br/>番号</th>
              <th className="p-2 border-r border-border w-[40px] text-foreground">HTML</th>
              <th className="p-2 border-r border-border w-[80px] text-foreground bg-green-50 dark:bg-green-900/20">HTSスコア</th>
              <th className="p-1 border-r border-border w-[130px] text-foreground text-[10px] bg-blue-50 dark:bg-blue-900/20">HSコード<div className="text-[10px] text-muted-foreground">(10桁)</div></th>
              <th className="p-2 border-r border-border w-[280px] text-foreground bg-blue-50 dark:bg-blue-900/20">HTS説明</th>
              <th className="p-2 border-r border-border w-[80px] text-foreground bg-blue-50 dark:bg-blue-900/20">
                HTS関税率
                <div className="text-[10px] text-muted-foreground">(%)</div>
              </th>
              <th className="p-2 border-r border-border w-[80px] text-foreground bg-blue-50 dark:bg-blue-900/20">原産国</th>
              <th className="p-2 border-r border-border w-[60px] text-foreground bg-blue-50 dark:bg-blue-900/20">原産国<br/>関税率<div className="text-[10px] text-muted-foreground">(%)</div></th>
              <th className="p-2 border-r border-border w-[80px] text-foreground bg-blue-50 dark:bg-blue-900/20">素材</th>
              <th className="p-2 border-r border-border w-[60px] text-foreground bg-blue-50 dark:bg-blue-900/20">素材関税率<div className="text-[10px] text-muted-foreground">(%)</div></th>
              <th className="p-2 border-r border-border w-[60px] text-foreground bg-purple-50 dark:bg-purple-900/20">競合sold数<div className="text-[10px] text-muted-foreground">(総販売)</div></th>
              <th className="p-2 border-r border-border w-[60px] text-foreground bg-purple-50 dark:bg-purple-900/20">競合数</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground bg-purple-50 dark:bg-purple-900/20">最安値<div className="text-[10px] text-muted-foreground">(送料込)</div></th>
              <th className="p-2 border-r border-border w-[60px] text-foreground bg-purple-50 dark:bg-purple-900/20">最安<br/>利益率%</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground bg-purple-50 dark:bg-purple-900/20">最安<br/>利益額<div className="text-[10px] text-muted-foreground">(USD)</div></th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">スコア</th>
              <th className="p-2 border-r border-border w-[60px] text-foreground">出品<br/>可否</th>
              <th className="p-1 border-r border-border w-[180px] text-foreground text-[10px]">出品ステータス</th>
              <th className="p-2 border-r border-border w-[80px] text-foreground bg-orange-50 dark:bg-orange-900/20">フィルター<br/>チェック</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {products.map((product) => {
              // 🎯 HTS判定結果の取得
              const htsNeedsReview = !product.hts_code || 
                                     product.hts_code === '要確認' || 
                                     product.hts_code === '取得失敗' ||
                                     product.hts_confidence === 'low' ||
                                     product.hts_confidence === 'uncertain'

              return (
                <tr
                  key={product.id}
                  className={`border-b border-border hover:bg-accent/50 ${
                    modifiedIds.has(String(product.id)) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                  } ${product.status === 'ready' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className="p-2 text-center border-r border-border">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(String(product.id))}
                      onChange={(e) => handleSelectOne(product.id, e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-input"
                    />
                  </td>
                  
                  <td className="p-0.5 text-center border-r border-border">
                    <img
                      src={getImageUrl(product)}
                      alt=""
                      className="object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                      style={{ width: '40px', height: '40px' }}
                      onClick={() => onProductClick(product)}
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/40x40/6b7280/fff?text=No'
                      }}
                    />
                  </td>

                  {/* 編集可能セル (配送サービスの前まで) */}
                  {[
                    { field: 'sku', align: 'left' },
                  ].map(({ field, align }) => (
                    <EditableCell
                      key={field}
                      value={String(product[field as keyof Product] ?? '')}
                      align={align}
                      productId={String(product.id)}
                      field={field}
                      modifiedIds={modifiedIds}
                      onFocus={() => setEditingCell({ id: String(product.id), field })}
                      onBlur={(val) => handleCellBlur(product, field, val)}
                    />
                  ))}

                  {/* Master Key（読み取り専用） */}
                  <td className="p-0 border-r border-border bg-indigo-50/30 dark:bg-indigo-900/10">
                    <div className="px-1.5 py-1 text-[10px] text-indigo-700 dark:text-indigo-300 font-mono">
                      {product.master_key || '-'}
                    </div>
                  </td>

                  {[
                    { field: 'title', align: 'left' },
                    { field: 'english_title', align: 'left' },
                    { field: 'price_jpy', align: 'right' },
                    { field: 'listing_data.length_cm', align: 'right', jsonb: true },
                    { field: 'listing_data.width_cm', align: 'right', jsonb: true },
                    { field: 'listing_data.height_cm', align: 'right', jsonb: true },
                    { field: 'listing_data.weight_g', align: 'right', jsonb: true },
                    { field: 'listing_data.condition', align: 'center', jsonb: true, fallback: 'scraped_data.condition' },
                    { field: 'listing_data.image_count', align: 'right', jsonb: true, fallback: 'scraped_data.image_urls' },
                    { field: 'listing_data.ddp_price_usd', align: 'right', jsonb: true },
                    { field: 'listing_data.ddu_price_usd', align: 'right', jsonb: true },
                  ].map(({ field, align, jsonb, fallback, multiline }) => {
                    // JSONBフィールドから値を取得
                    let value = ''
                    if (jsonb && field.includes('.')) {
                      const [obj, key] = field.split('.')
                      value = product[obj as keyof Product]?.[key] ?? ''
                      
                      // fallbackがあり、値が空の場合
                      if (!value && fallback && fallback.includes('.')) {
                        const [fallbackObj, fallbackKey] = fallback.split('.')
                        const fallbackValue = product[fallbackObj as keyof Product]?.[fallbackKey]
                        
                        // image_countの場合は配列の長さを返す
                        if (key === 'image_count' && Array.isArray(fallbackValue)) {
                          value = String(fallbackValue.length)
                        } else {
                          value = fallbackValue ?? ''
                        }
                      }
                    } else {
                      value = product[field as keyof Product] ?? ''
                    }
                    
                    return (
                      <EditableCell
                        key={field}
                        value={String(value)}
                        align={align}
                        productId={String(product.id)}
                        field={field}
                        modifiedIds={modifiedIds}
                        onFocus={() => setEditingCell({ id: String(product.id), field })}
                        onBlur={(val) => handleCellBlur(product, field, val)}
                        multiline={multiline} // 🆕 2行表示フラグを渡す
                      />
                    )
                  })}

                  {/* 配送サービス～配送ポリシー */}
                  <EditableCell
                    key="listing_data.shipping_service"
                    value={String(product.listing_data?.shipping_service || product.listing_data?.usa_shipping_policy_name || '')}
                    align="left"
                    productId={String(product.id)}
                    field="listing_data.shipping_service"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'listing_data.shipping_service' })}
                    onBlur={(val) => handleCellBlur(product, 'listing_data.shipping_service', val)}
                  />

                  <EditableCell
                    key="listing_data.base_shipping_usd"
                    value={String(product.listing_data?.base_shipping_usd || '')}
                    align="right"
                    productId={String(product.id)}
                    field="listing_data.base_shipping_usd"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'listing_data.base_shipping_usd' })}
                    onBlur={(val) => handleCellBlur(product, 'listing_data.base_shipping_usd', val)}
                  />
                  
                  {[
                    { field: 'listing_data.shipping_cost_usd', align: 'right', jsonb: true },
                    { field: 'listing_data.usa_shipping_policy_name', align: 'left', jsonb: true },
                  ].map(({ field, align, jsonb }) => {
                    let value = ''
                    if (jsonb && field.includes('.')) {
                      const [obj, key] = field.split('.')
                      value = product[obj as keyof Product]?.[key] ?? ''
                    } else {
                      value = product[field as keyof Product] ?? ''
                    }
                    
                    return (
                      <EditableCell
                        key={field}
                        value={String(value)}
                        align={align}
                        productId={String(product.id)}
                        field={field}
                        modifiedIds={modifiedIds}
                        onFocus={() => setEditingCell({ id: String(product.id), field })}
                        onBlur={(val) => handleCellBlur(product, field, val)}
                      />
                    )
                  })}

                  {/* 利益率～在庫数 */}
                  {[
                    { field: 'listing_data.profit_margin', jsonb: true },
                    { field: 'listing_data.profit_amount_usd', jsonb: true },
                    { field: 'listing_data.profit_margin_refund', jsonb: true },
                    { field: 'listing_data.profit_amount_refund', jsonb: true },
                  ].map(({ field, jsonb }) => {
                    let value = ''
                    if (jsonb && field.includes('.')) {
                      const [obj, key] = field.split('.')
                      value = product[obj as keyof Product]?.[key] ?? ''
                    }
                    
                    return (
                      <EditableCell
                        key={field}
                        value={String(value)}
                        align="right"
                        productId={String(product.id)}
                        field={field}
                        modifiedIds={modifiedIds}
                        onFocus={() => setEditingCell({ id: String(product.id), field })}
                        onBlur={(val) => handleCellBlur(product, field, val)}
                      />
                    )
                  })}

                  {/* 在庫数、カテゴリ */}
                  {[
                    { field: 'current_stock', align: 'right', multiSource: true },
                    { field: 'category_name', align: 'left', multiSource: true },
                    { field: 'category_id', align: 'right', multiSource: true },
                  ].map(({ field, align, multiSource }) => {
                    let value = ''
                    
                    if (multiSource && field === 'current_stock') {
                      value = 
                        product.current_stock ||
                        product.scraped_data?.stock ||
                        product.listing_data?.quantity ||
                        '1'
                    }
                    else if (multiSource && field === 'category_name') {
                      value = 
                        product.ebay_api_data?.category_name ||
                        product.category_name ||
                        ''
                    }
                    else if (multiSource && field === 'category_id') {
                      value = 
                        product.ebay_api_data?.category_id ||
                        product.ebay_category_id ||
                        product.category_id ||
                        ''
                    }
                    else {
                      value = product[field as keyof Product] ?? ''
                    }
                    
                    return (
                      <td key={field} className="p-0 border-r border-border">
                        <input
                          type="text"
                          value={String(value)}
                          onChange={(e) => {}}
                          onFocus={() => setEditingCell({ id: String(product.id), field })}
                          onBlur={(e) => handleCellBlur(product, field, e.target.value)}
                          className={`w-full px-2 py-1.5 bg-muted/30 hover:bg-muted/50 focus:bg-card focus:outline focus:outline-2 focus:outline-primary text-${align} text-foreground ${
                            modifiedIds.has(String(product.id)) ? 'border-l-2 border-amber-500' : ''
                          }`}
                          style={{ minHeight: '28px' }}
                        />
                      </td>
                    )
                  })}

                  <td className="p-2 text-center border-r border-border">
                    <span className={`font-semibold ${
                      product.listing_data?.html_description ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {product.listing_data?.html_description ? '✓' : '✗'}
                    </span>
                  </td>

                  {/* 🎓 HTSスコア表示（学習システム） */}
                  <td 
                    className="p-2 text-center border-r border-border"
                    style={{ backgroundColor: getScoreBackgroundColor(product.hts_score, product.hts_confidence) }}
                    title={`信頼度: ${product.hts_confidence || '不明'} / ソース: ${product.hts_source || '未取得'}`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm font-bold" style={{ 
                        color: product.hts_score && product.hts_score >= 700 ? '#16a34a' : 
                               product.hts_score && product.hts_score >= 300 ? '#ca8a04' : '#dc2626'
                      }}>
                        {getConfidenceIcon(product.hts_confidence)}
                      </span>
                      <span className="text-xs font-semibold">{product.hts_score || '-'}</span>
                    </div>
                  </td>

                  {/* 🎯 HTS情報 - 要確認の場合は黄色背景 + ⚠️アイコン */}
                  <EditableCell
                    key="hts_code"
                    value={String(product.hts_code || '')}
                    align="center"
                    productId={String(product.id)}
                    field="hts_code"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'hts_code' })}
                    onBlur={(val) => handleCellBlur(product, 'hts_code', val)}
                    bgColor={getHTSBackgroundColor(product.hts_code, product.hts_confidence)}
                    showWarning={htsNeedsReview}
                  />
                  <EditableCell
                    key="hts_description"
                    value={String(product.hts_description || '')}
                    align="left"
                    productId={String(product.id)}
                    field="hts_description"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'hts_description' })}
                    onBlur={(val) => handleCellBlur(product, 'hts_description', val)}
                    bgColor={getHTSBackgroundColor(product.hts_code, product.hts_confidence)}
                    multiline={true} // 🆕 2行表示
                  />
                  <EditableCell
                    key="hts_duty_rate"
                    value={product.hts_duty_rate != null 
                      ? `${product.hts_duty_rate}%` 
                      : '-'
                    }
                    align="right"
                    productId={String(product.id)}
                    field="hts_duty_rate"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'hts_duty_rate' })}
                    onBlur={(val) => {
                      // "%"を除去して数値だけ保存
                      const numericValue = val.replace('%', '').trim()
                      handleCellBlur(product, 'hts_duty_rate', numericValue)
                    }}
                    bgColor={getHTSBackgroundColor(product.hts_code, product.hts_confidence)}
                  />
                  <EditableCell
                    key="origin_country"
                    value={String(product.origin_country || '')}
                    align="center"
                    productId={String(product.id)}
                    field="origin_country"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'origin_country' })}
                    onBlur={(val) => handleCellBlur(product, 'origin_country', val)}
                  />
                  <EditableCell
                    key="origin_country_duty_rate"
                    value={product.origin_country_duty_rate != null 
                      ? `${product.origin_country_duty_rate}%` 
                      : '-'
                    }
                    align="right"
                    productId={String(product.id)}
                    field="origin_country_duty_rate"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'origin_country_duty_rate' })}
                    onBlur={(val) => {
                      const numericValue = val.replace('%', '').trim()
                      handleCellBlur(product, 'origin_country_duty_rate', numericValue)
                    }}
                    bgColor={(product as any).origin_fetch_failed ? '#e5e7eb' : undefined}
                  />
                  <EditableCell
                    key="material"
                    value={String(product.material || '')}
                    align="center"
                    productId={String(product.id)}
                    field="material"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'material' })}
                    onBlur={(val) => handleCellBlur(product, 'material', val)}
                  />
                  <EditableCell
                    key="material_duty_rate"
                    value={product.material_duty_rate != null 
                      ? `${product.material_duty_rate}%` 
                      : '-'
                    }
                    align="right"
                    productId={String(product.id)}
                    field="material_duty_rate"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'material_duty_rate' })}
                    onBlur={(val) => {
                      const numericValue = val.replace('%', '').trim()
                      handleCellBlur(product, 'material_duty_rate', numericValue)
                    }}
                    bgColor={(product as any).material_fetch_failed ? '#e5e7eb' : undefined}
                  />

                  {/* SellerMirror結果 - ✅ sm_total_sold_quantityを優先表示 */}
                  <EditableCell
                    key="sm_total_sold_quantity"
                    value={String(product.sm_total_sold_quantity || product.sm_sales_count || '')}
                    align="right"
                    productId={String(product.id)}
                    field="sm_total_sold_quantity"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'sm_total_sold_quantity' })}
                    onBlur={(val) => handleCellBlur(product, 'sm_total_sold_quantity', val)}
                  />
                  
                  {[
                    'sm_competitor_count',
                    'sm_lowest_price',
                    'sm_profit_margin',
                    'sm_profit_amount_usd',
                  ].map((field) => (
                    <EditableCell
                      key={field}
                      value={String(product[field as keyof Product] || '')}
                      align="right"
                      productId={String(product.id)}
                      field={field}
                      modifiedIds={modifiedIds}
                      onFocus={() => setEditingCell({ id: String(product.id), field })}
                      onBlur={(val) => handleCellBlur(product, field, val)}
                    />
                  ))}

                  {/* スコア表示 - listing_dataではなく直接listing_scoreを参照 */}
                  <td className="p-2 text-center border-r border-border">
                    <div className="px-2 py-1 rounded font-semibold" style={{
                      backgroundColor: product.listing_score && product.listing_score >= 80000 ? '#d1fae5' :
                                       product.listing_score && product.listing_score >= 60000 ? '#dbeafe' :
                                       product.listing_score && product.listing_score >= 40000 ? '#fef3c7' :
                                       product.listing_score ? '#fecaca' : '#f3f4f6',
                      color: product.listing_score && product.listing_score >= 80000 ? '#065f46' :
                             product.listing_score && product.listing_score >= 60000 ? '#1e40af' :
                             product.listing_score && product.listing_score >= 40000 ? '#92400e' :
                             product.listing_score ? '#991b1b' : '#6b7280'
                    }}>
                      {product.listing_score ? product.listing_score.toLocaleString() : '-'}
                    </div>
                  </td>

                  <EditableCell
                    key="status"
                    value={String(product.status || '')}
                    align="center"
                    productId={String(product.id)}
                    field="status"
                    modifiedIds={modifiedIds}
                    onFocus={() => setEditingCell({ id: String(product.id), field: 'status' })}
                    onBlur={(val) => handleCellBlur(product, 'status', val)}
                  />
                  
                  <td className="p-2 border-r border-border">
                    <ListingStatusBadge product={product} />
                  </td>
                  
                  <td className="p-2 text-center border-r border-border bg-orange-50/30 dark:bg-orange-900/10">
                    {product.listing_data?.filter_checked_at ? (
                      product.listing_data?.filter_passed ? (
                        <span className="inline-block text-xs text-green-600 dark:text-green-400" title="フィルター通過">✓</span>
                      ) : (
                        <span className="inline-block text-xs text-gray-500 dark:text-gray-400" title="要確認">×</span>
                      )
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500" title="未チェック">?</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-muted/50 px-3 py-2 flex justify-between items-center text-xs">
        <div className="text-foreground">表示中: 1-{products.length} / 全 {products.length}件</div>
        <div className="text-muted-foreground flex items-center gap-4">
          <span>⚠️ = HTS要確認（Geminiで判定推奨）</span>
          <span>横スクロールで全項目表示</span>
        </div>
      </div>
    </div>
  )
}
