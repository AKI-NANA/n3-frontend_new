// app/api/products/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface UploadOptions {
  clearExisting: boolean
  runAllProcesses: boolean
  skipDuplicates: boolean
}

interface CSVRow {
  title?: string
  description?: string
  price?: number | string
  quantity?: number | string
  condition?: string
  sku?: string
  upc?: string
  brand?: string
  category?: string
  weight?: number | string
  length?: number | string
  width?: number | string
  height?: number | string
  images?: string
  cost_price?: number | string
  source_url?: string
  shipping_policy_name?: string
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得
    const { data: csvData, options } = await request.json() as {
      data: CSVRow[]
      options: UploadOptions
    }

    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return NextResponse.json(
        { error: 'CSVデータが空です' },
        { status: 400 }
      )
    }

    console.log(`📥 CSV Upload: ${csvData.length}行受信`)

    // 1. 既存データのクリア
    if (options.clearExisting) {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // 全削除

      if (deleteError) {
        console.error('❌ 既存データ削除エラー:', deleteError)
        throw new Error(`既存データの削除に失敗: ${deleteError.message}`)
      }
      console.log('🗑️  既存データをクリアしました')
    }

    // 2. 重複チェック（skipDuplicates が true の場合）
    let existingSkus = new Set<string>()
    if (options.skipDuplicates) {
      const skusToCheck = csvData
        .map(row => row.sku)
        .filter((sku): sku is string => !!sku)

      if (skusToCheck.length > 0) {
        const { data: existing, error: checkError } = await supabase
          .from('products')
          .select('sku')
          .in('sku', skusToCheck)

        if (checkError) {
          console.error('❌ 重複チェックエラー:', checkError)
        } else if (existing && existing.length > 0) {
          existingSkus = new Set(existing.map(p => p.sku))
          console.log(`⚠️  ${existingSkus.size}件の重複をスキップします`)
        }
      }
    }

    // 3. データ変換（既存のテーブル構造に合わせる）
    const products = csvData
      .filter(row => {
        // 重複スキップ
        if (options.skipDuplicates && row.sku && existingSkus.has(row.sku)) {
          return false
        }
        return true
      })
      .map((row, index) => {
        // 既存のテーブル構造に合わせたマッピング
        const product: any = {
          // 必須フィールド
          item_id: row.sku || `ITEM-${Date.now()}-${index}`,
          title: row.title || '',
          sku: row.sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          
          // 価格情報（既存テーブルのカラム名に合わせる）
          acquired_price_jpy: row.cost_price ? Math.round(parseFloat(String(row.cost_price))) : null,
          ddp_price_usd: row.price ? parseFloat(String(row.price)) : null,
          ddu_price_usd: row.price ? parseFloat(String(row.price)) : null,
          
          // 在庫
          stock_quantity: parseInt(String(row.quantity || 1)),
          condition: row.condition || 'New',
          
          // サイズ・重量
          weight_g: row.weight ? parseFloat(String(row.weight)) * 1000 : null, // kgからgに変換
          length_cm: row.length ? parseFloat(String(row.length)) : null,
          width_cm: row.width ? parseFloat(String(row.width)) : null,
          height_cm: row.height ? parseFloat(String(row.height)) : null,
          
          // カテゴリ
          category_name: row.category_name || row.category || null,
          category_number: row.category_id || null,
          
          // 画像（配列形式に変換）
          image_urls: row.images 
            ? (row.images as string).split(',').map(url => url.trim()).filter(Boolean)
            : [],
          image_count: row.images 
            ? (row.images as string).split(',').filter(Boolean).length
            : 0,
          
          // 配送情報
          shipping_policy: row.shipping_policy_name || null,
          shipping_service: row.shipping_policy_name || null,
          handling_time: '1 day', // デフォルト値
          
          // HTML
          html_description: row.description || null,
          html_applied: false,
          
          // ステータス
          ready_to_list: false,
          listed_marketplaces: [],
          
          // Seller Mirror（初期値）
          sm_competitors: null,
          sm_min_price_usd: null,
          sm_profit_margin: null,
          sm_analyzed_at: null,
          
          // スコア（初期値）
          listing_score: null,
          score_calculated_at: null,
          
          // メタデータ
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        return product
      })

    console.log(`🔄 ${products.length}件の商品データを変換しました`)

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        skipped: csvData.length,
        message: '全ての商品が重複のためスキップされました'
      })
    }

    // 4. バッチインサート（1000件ずつ）
    const batchSize = 1000
    let insertedCount = 0
    const errors: string[] = []
    const insertedIds: string[] = []

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)

      const { data, error } = await supabase
        .from('products')
        .insert(batch)
        .select('id')

      if (error) {
        console.error(`❌ バッチ ${i / batchSize + 1} エラー:`, error)
        errors.push(`バッチ ${i / batchSize + 1}: ${error.message}`)
      } else if (data) {
        insertedCount += data.length
        insertedIds.push(...data.map(p => p.id))
        console.log(`✅ バッチ ${i / batchSize + 1}: ${data.length}件挿入`)
      }
    }

    const skippedCount = csvData.length - insertedCount

    console.log(`📊 アップロード完了: ${insertedCount}件挿入, ${skippedCount}件スキップ`)

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      skipped: skippedCount,
      insertedIds,
      errors: errors.length > 0 ? errors : undefined,
      runAllProcesses: options.runAllProcesses
    })

  } catch (error: any) {
    console.error('❌ CSV Upload Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'アップロードに失敗しました',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
