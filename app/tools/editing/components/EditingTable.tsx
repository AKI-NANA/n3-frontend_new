// app/tools/editing/components/EditingTable.tsx
'use client'

import { useState, useEffect } from 'react'
import type { Product, ProductUpdate } from '../types/product'
import { ListingStatusBadge } from './ListingStatusBadge'

// 編集可能なセルコンポーネント
interface EditableCellProps {
  value: string
  align: string
  productId: string
  field: string
  modifiedIds: Set<string>
  onFocus: () => void
  onBlur: (value: string) => void
}

function EditableCell({ value, align, productId, field, modifiedIds, onFocus, onBlur }: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value)
  
  useEffect(() => {
    setLocalValue(value)
  }, [value])
  
  return (
    <td className="p-0 border-r border-border">
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={onFocus}
        onBlur={() => onBlur(localValue)}
        className={`w-full px-2 py-1.5 bg-muted/30 hover:bg-muted/50 focus:bg-card focus:outline focus:outline-2 focus:outline-primary text-${align} text-foreground ${
          modifiedIds.has(productId) ? 'border-l-2 border-amber-500' : ''
        }`}
        style={{ minHeight: '28px' }}
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
    const currentValue = product[field as keyof Product]
    if (value !== String(currentValue ?? '')) {
      const numericFields = [
        'price_jpy', 'price_usd', 'current_stock',
        'profit_margin', 'profit_amount_usd',
        'sm_competitor_count', 'sm_lowest_price', 'sm_average_price', 
        'sm_profit_margin', 'sm_profit_amount_usd'
      ]

      let parsedValue: any = value
      if (numericFields.includes(field)) {
        parsedValue = value === '' ? null : parseFloat(value)
      }

      // メモリ上で変更を保持（DB保存は「一括実行」ボタンで行う）
      onCellChange(product.id, { [field]: parsedValue })
    }
    setEditingCell(null)
  }

  const getScoreBadgeClass = (score: number | null) => {
    if (!score) return 'bg-muted text-muted-foreground'
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const getImageUrl = (product: Product) => {
    // scraped_dataの中に画像があれば使用
    const imageUrls = product.scraped_data?.image_urls
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      return imageUrls[0]
    }
    // listing_dataからも確認
    const listingImages = product.listing_data?.image_urls
    if (listingImages && Array.isArray(listingImages) && listingImages.length > 0) {
      return listingImages[0]
    }
    // なければプレースホルダー
    return 'https://placehold.co/35x35/6b7280/fff?text=No+Img'
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="overflow-x-scroll overflow-y-auto max-h-[calc(100vh-380px)] min-h-[320px]" style={{ overflowX: 'scroll' }}>
        <table className="w-full text-xs border-collapse" style={{ minWidth: '2500px' }}>
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
              <th className="p-2 text-center border-r border-border w-10 text-foreground">画像</th>
              {/* <th className="p-2 border-r border-border min-w-[100px] text-foreground">Item ID</th> */}
              <th className="p-2 border-r border-border min-w-[120px] text-foreground">SKU</th>
              <th className="p-2 border-r border-border min-w-[180px] text-foreground">商品名</th>
              <th className="p-2 border-r border-border min-w-[200px] text-foreground">英語タイトル</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">取得価格<div className="text-[10px] text-muted-foreground">(JPY)</div></th>
              <th className="p-2 border-r border-border w-[50px] text-foreground">長さ<div className="text-[10px] text-muted-foreground">(cm)</div></th>
              <th className="p-2 border-r border-border w-[50px] text-foreground">幅<div className="text-[10px] text-muted-foreground">(cm)</div></th>
              <th className="p-2 border-r border-border w-[50px] text-foreground">高さ<div className="text-[10px] text-muted-foreground">(cm)</div></th>
              <th className="p-2 border-r border-border w-[55px] text-foreground">重さ<div className="text-[10px] text-muted-foreground">(g)</div></th>
              <th className="p-2 border-r border-border w-[80px] text-foreground">状態</th>
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
              {/* <th className="p-2 border-r border-border min-w-[80px] text-foreground">ハンドリング<br/>タイム</th> */}
              <th className="p-2 border-r border-border w-[50px] text-foreground">HTML</th>
              <th className="p-2 border-r border-border w-[60px] text-foreground">SM<br/>競合数</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">SM<br/>最安値<div className="text-[10px] text-muted-foreground">(USD)</div></th>
              <th className="p-2 border-r border-border w-[60px] text-foreground">SM最安<br/>利益率%</th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">SM最安<br/>利益額<div className="text-[10px] text-muted-foreground">(USD)</div></th>
              <th className="p-2 border-r border-border w-[70px] text-foreground">スコア</th>
              <th className="p-2 border-r border-border w-[60px] text-foreground">出品<br/>可否</th>
              <th className="p-2 border-r border-border min-w-[150px] text-foreground">出品ステータス</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
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
                
                <td className="p-2 text-center border-r border-border">
                  <img
                    src={getImageUrl(product)}
                    alt=""
                    className="w-9 h-9 object-cover rounded cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => onProductClick(product)}
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/35x35/6b7280/fff?text=Error'
                    }}
                  />
                </td>

                {/* 編集可能セル (配送サービスの前まで) */}
                {[
                  { field: 'sku', align: 'left' },
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
                ].map(({ field, align, jsonb, fallback }) => {
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
                    />
                  )
                })}

                {/* 配送サービス (読み取り専用) */}
                <td className="p-2 text-left border-r border-border text-foreground">
                  {product.listing_data?.shipping_service || '-'}
                </td>

                {/* 実送料、送料込（DDP）、配送ポリシー (編集可能/読み取り専用) */}
                {/* 実送料（読み取り専用） */}
                <td className="p-2 text-right border-r border-border text-foreground">
                  {product.listing_data?.base_shipping_usd ? `${product.listing_data.base_shipping_usd.toFixed(2)}` : '-'}
                </td>
                
                {/* 送料込（DDP）、配送ポリシー (編集可能) */}
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

                {/* 利益率 (読み取り専用, 小数点第1位) */}
                <td className="p-2 text-right border-r border-border">
                  {product.listing_data?.profit_margin ? (
                    <span className={`font-semibold ${
                      product.listing_data.profit_margin > 15 ? 'text-green-700 dark:text-green-400' : 
                      product.listing_data.profit_margin > 0 ? 'text-yellow-700 dark:text-yellow-400' :
                      'text-red-700 dark:text-red-400'
                    }`}>
                      {product.listing_data.profit_margin.toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>

                {/* 利益額 (読み取り専用, 小数点第2位) */}
                <td className="p-2 text-right border-r border-border">
                  {product.listing_data?.profit_amount_usd ? (
                    <span className={`font-semibold ${
                      product.listing_data.profit_amount_usd > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      ${product.listing_data.profit_amount_usd.toFixed(2)}
                    </span>
                  ) : '-'}
                </td>

                {/* 利益率（還付後） (読み取り専用, 小数点第1位) */}
                <td className="p-2 text-right border-r border-border">
                  {product.listing_data?.profit_margin_refund ? (
                    <span className={`font-semibold ${
                      product.listing_data.profit_margin_refund > 15 ? 'text-green-700 dark:text-green-400' : 
                      product.listing_data.profit_margin_refund > 0 ? 'text-yellow-700 dark:text-yellow-400' :
                      'text-red-700 dark:text-red-400'
                    }`}>
                      {product.listing_data.profit_margin_refund.toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>

                {/* 利益額（還付後） (読み取り専用, 小数点第2位) */}
                <td className="p-2 text-right border-r border-border">
                  {product.listing_data?.profit_amount_refund ? (
                    <span className={`font-semibold ${
                      product.listing_data.profit_amount_refund > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      ${product.listing_data.profit_amount_refund.toFixed(2)}
                    </span>
                  ) : '-'}
                </td>

                {/* 在庫数、カテゴリ (編集可能) */}
                {[
                  { field: 'current_stock', align: 'right' },
                  { field: 'ebay_api_data.category_name', align: 'left', jsonb: true },
                  { field: 'ebay_api_data.category_id', align: 'right', jsonb: true },
                ].map(({ field, align, jsonb }) => {
                  let value = ''
                  if (jsonb && field.includes('.')) {
                    const [obj, key] = field.split('.')
                    value = product[obj as keyof Product]?.[key] ?? ''
                  } else {
                    value = product[field as keyof Product] ?? ''
                  }
                  
                  return (
                    <td key={field} className="p-0 border-r border-border">
                      <input
                        type="text"
                        value={value}
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

                <td className="p-2 text-right border-r border-border text-foreground">
                  {product.sm_competitor_count || '-'}
                </td>
                <td className="p-2 text-right border-r border-border text-foreground">
                  {product.sm_lowest_price ? `${product.sm_lowest_price}` : '-'}
                </td>
                <td className="p-2 text-right border-r border-border">
                  {product.sm_profit_margin ? (
                    <span className={`font-semibold ${
                      product.sm_profit_margin > 15 ? 'text-green-700 dark:text-green-400' : 
                      product.sm_profit_margin > 0 ? 'text-yellow-700 dark:text-yellow-400' :
                      'text-red-700 dark:text-red-400'
                    }`}>
                      {product.sm_profit_margin.toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>
                <td className="p-2 text-right border-r border-border">
                  {product.sm_profit_amount_usd ? (
                    <span className={`font-semibold ${
                      product.sm_profit_amount_usd > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      ${product.sm_profit_amount_usd.toFixed(2)}
                    </span>
                  ) : '-'}
                </td>

                <td className="p-2 text-center border-r border-border">
                  {product.listing_data?.listing_score ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getScoreBadgeClass(product.listing_data.listing_score)}`}>
                      {product.listing_data.listing_score}
                    </span>
                  ) : '-'}
                </td>

                <td className="p-2 text-center border-r border-border">
                  <span className={`font-semibold ${
                    product.status === 'ready' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    {product.status === 'ready' ? '✓' : '✗'}
                  </span>
                </td>
                
                <td className="p-2 border-r border-border">
                  <ListingStatusBadge product={product} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-muted/50 px-3 py-2 flex justify-between items-center text-xs">
        <div className="text-foreground">表示中: 1-{products.length} / 全 {products.length}件</div>
        <div className="text-muted-foreground">横スクロールで全項目表示</div>
      </div>
    </div>
  )
}
