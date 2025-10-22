// app/api/inventory-monitoring/export-csv/route.ts
// 変動データをCSV出力（eBayフォーマット対応）

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const changeIds = searchParams.get('changeIds')?.split(',') || []
    const format = searchParams.get('format') || 'ebay' // 'ebay' or 'all'

    if (changeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '変動IDが指定されていません' },
        { status: 400 }
      )
    }

    // 変動データを取得
    const { data: changes, error } = await supabase
      .from('inventory_changes')
      .select(
        `
        *,
        product:products (
          id,
          sku,
          ebay_sku,
          title,
          english_title,
          current_stock,
          acquired_price_jpy,
          ddp_price_usd,
          ddu_price_usd,
          buy_it_now_price_usd,
          ebay_listing_id,
          ebay_category_id,
          condition,
          html_description,
          scraped_data,
          fulfillment_policy_id,
          payment_policy_id,
          return_policy_id
        )
      `
      )
      .in('id', changeIds)

    if (error) throw error

    if (!changes || changes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'データが見つかりません' },
        { status: 404 }
      )
    }

    let csv: string

    if (format === 'ebay') {
      csv = generateEbayCsv(changes)
    } else {
      csv = generateFullCsv(changes)
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventory-changes-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('❌ CSV出力エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'CSV出力に失敗しました',
      },
      { status: 500 }
    )
  }
}

/**
 * eBayフォーマットのCSV生成
 * File Exchange形式に準拠
 */
function generateEbayCsv(changes: any[]): string {
  // eBay File Exchangeのヘッダー
  const headers = [
    'Action',
    'CustomLabel',
    'SKU',
    'Quantity',
    'Price',
    'Title',
    'Description',
    'Category',
    'ConditionID',
    'Format',
    'Duration',
    'Location',
    'ShippingProfileID',
    'PaymentProfileID',
    'ReturnProfileID',
  ]

  const rows: string[] = []
  rows.push(headers.join(','))

  for (const change of changes) {
    const product = change.product

    if (!product) continue

    // 在庫または価格が変動した場合のみ出力
    if (change.change_type === 'stock' || change.change_type === 'price') {
      const row = [
        'Revise', // 既存商品を更新
        `"${product.ebay_listing_id || product.sku}"`, // CustomLabel
        `"${product.ebay_sku || product.sku}"`, // SKU
        change.change_type === 'stock' ? change.new_stock || 0 : product.current_stock || 0, // Quantity
        change.change_type === 'price'
          ? (change.recalculated_ebay_price_usd || product.ddp_price_usd || 0).toFixed(2)
          : (product.ddp_price_usd || 0).toFixed(2), // Price
        `"${escapeQuotes(product.english_title || product.title || '')}"`, // Title
        `"${escapeQuotes(product.html_description || '')}"`, // Description
        product.ebay_category_id || '', // Category
        mapConditionToId(product.condition || 'Used'), // ConditionID
        'FixedPrice', // Format
        'GTC', // Duration (Good 'Til Cancelled)
        'Japan', // Location
        product.fulfillment_policy_id || '', // ShippingProfileID
        product.payment_policy_id || '', // PaymentProfileID
        product.return_policy_id || '', // ReturnProfileID
      ]

      rows.push(row.join(','))
    } else if (change.change_type === 'page_deleted') {
      // ページ削除の場合は在庫を0に
      const row = [
        'Revise',
        `"${product.ebay_listing_id || product.sku}"`,
        `"${product.ebay_sku || product.sku}"`,
        '0', // Quantity = 0
        (product.ddp_price_usd || 0).toFixed(2),
        `"${escapeQuotes(product.english_title || product.title || '')}"`,
        `"${escapeQuotes(product.html_description || '')}"`,
        product.ebay_category_id || '',
        mapConditionToId(product.condition || 'Used'),
        'FixedPrice',
        'GTC',
        'Japan',
        product.fulfillment_policy_id || '',
        product.payment_policy_id || '',
        product.return_policy_id || '',
      ]

      rows.push(row.join(','))
    }
  }

  return rows.join('\n')
}

/**
 * 全データのCSV生成（詳細版）
 */
function generateFullCsv(changes: any[]): string {
  const headers = [
    'ID',
    'Product ID',
    'SKU',
    'Title',
    'Change Type',
    'Old Value',
    'New Value',
    'Old Price (JPY)',
    'New Price (JPY)',
    'Old Stock',
    'New Stock',
    'Recalculated Price (USD)',
    'Recalculated Profit Margin (%)',
    'Status',
    'Detected At',
    'Applied At',
  ]

  const rows: string[] = []
  rows.push(headers.join(','))

  for (const change of changes) {
    const product = change.product

    const row = [
      change.id,
      product?.id || '',
      `"${product?.sku || ''}"`,
      `"${escapeQuotes(product?.title || '')}"`,
      change.change_type,
      `"${change.old_value || ''}"`,
      `"${change.new_value || ''}"`,
      change.old_price_jpy || '',
      change.new_price_jpy || '',
      change.old_stock !== null ? change.old_stock : '',
      change.new_stock !== null ? change.new_stock : '',
      change.recalculated_ebay_price_usd
        ? change.recalculated_ebay_price_usd.toFixed(2)
        : '',
      change.recalculated_profit_margin
        ? change.recalculated_profit_margin.toFixed(2)
        : '',
      change.status,
      change.detected_at || '',
      change.applied_at || '',
    ]

    rows.push(row.join(','))
  }

  return rows.join('\n')
}

/**
 * Conditionを eBay ConditionID にマッピング
 */
function mapConditionToId(condition: string): string {
  const conditionMap: Record<string, string> = {
    New: '1000',
    'Like New': '1500',
    'Very Good': '4000',
    Used: '3000',
    Good: '5000',
    Acceptable: '6000',
    新品: '1000',
    中古: '3000',
  }

  return conditionMap[condition] || '3000'
}

/**
 * CSV内のダブルクォートをエスケープ
 */
function escapeQuotes(str: string): string {
  return str.replace(/"/g, '""')
}
