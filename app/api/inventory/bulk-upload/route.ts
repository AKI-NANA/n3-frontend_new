/**
 * 画像一括登録API
 * POST /api/inventory/bulk-upload
 * 
 * 機能:
 * 1. 複数画像をアップロード
 * 2. 各画像に自動SKU付与（ITEM-000001形式）
 * 3. inventory_masterに一括登録
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBulkSKUs } from '@/lib/utils/sku-generator'
import { uploadBulkImages } from '@/lib/utils/image-processor'

export async function POST(req: NextRequest) {
  try {
    // FormDataを取得
    const formData = await req.formData()
    const imageFiles = formData.getAll('images') as File[]
    const category = formData.get('category') as string || 'Toys & Hobbies'
    const condition = formData.get('condition') as string || 'Used'
    const marketplace = formData.get('marketplace') as string || 'manual'
    
    // 画像が選択されているか確認
    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: '画像が選択されていません' },
        { status: 400 }
      )
    }
    
    console.log(`📦 画像一括登録開始: ${imageFiles.length}枚`)
    
    // SKUを一括生成
    const skus = await generateBulkSKUs(imageFiles.length)
    console.log(`  ✅ SKU生成完了: ${skus[0]} ～ ${skus[skus.length - 1]}`)
    
    // 画像を一括アップロード
    let imageUrls: string[] = []
    try {
      imageUrls = await uploadBulkImages(imageFiles, skus)
      console.log(`  ✅ 画像アップロード完了: ${imageUrls.length}枚`)
    } catch (uploadError: any) {
      console.error('❌ 画像アップロードエラー:', uploadError)
      return NextResponse.json(
        { error: `画像アップロード失敗: ${uploadError.message}` },
        { status: 500 }
      )
    }
    
    // inventory_masterに一括登録
    const supabase = createClient()
    const productsToInsert = imageFiles.map((file, index) => ({
      unique_id: skus[index],
      product_name: `未設定 - ${file.name}`,
      sku: skus[index],
      product_type: 'stock' as const,
      physical_quantity: 1, // デフォルト在庫数
      listing_quantity: 0,
      cost_price: 0, // 後から編集
      selling_price: 0, // 後から編集
      condition_name: condition,
      category: category,
      images: [imageUrls[index]],
      is_manual_entry: true,
      priority_score: 0,
      notes: `一括登録（${new Date().toISOString()}）`
    }))
    
    const { data, error } = await supabase
      .from('inventory_master')
      .insert(productsToInsert)
      .select()
    
    if (error) {
      console.error('❌ データベース登録エラー:', error)
      return NextResponse.json(
        { error: `データベース登録失敗: ${error.message}` },
        { status: 500 }
      )
    }
    
    console.log(`  ✅ inventory_master登録完了: ${data.length}件`)
    
    // 登録結果を整形
    const results = data.map((product, index) => ({
      id: product.id,
      sku: product.sku,
      filename: imageFiles[index].name,
      imageUrl: imageUrls[index]
    }))
    
    return NextResponse.json({
      success: true,
      registered: data.length,
      failed: 0,
      products: results,
      errors: []
    })
    
  } catch (error: any) {
    console.error('❌ 一括登録エラー:', error)
    return NextResponse.json(
      { error: `一括登録エラー: ${error.message}` },
      { status: 500 }
    )
  }
}

// POSTのみ許可
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
