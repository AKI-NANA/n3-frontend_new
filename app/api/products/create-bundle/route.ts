// /app/api/products/create-bundle/route.ts
/**
 * セット品作成API（全モール共通）
 *
 * 機能:
 * 1. 複数のアイテムを組み合わせて1つのセット品として登録
 * 2. 原価の自動計算（構成品の合計）
 * 3. 最大在庫数の決定（構成品の最小在庫数）
 * 4. データ継承（優先度の高いアイテムから）
 * 5. bundle_compositionsテーブルへの構成品登録
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import type { GroupingItem } from '@/types/product'

const supabase = createClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selectedItems, bundleSkuName, bundleTitle } = body as {
      selectedItems: GroupingItem[]
      bundleSkuName: string
      bundleTitle: string
    }

    console.log('🎁 セット品作成開始:', { bundleSkuName, itemCount: selectedItems.length })

    // ===== ステップ1: バリデーション =====
    if (selectedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'セット品には少なくとも1つのアイテムが必要です' },
        { status: 400 }
      )
    }

    if (!bundleSkuName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'セット品SKU名を入力してください' },
        { status: 400 }
      )
    }

    // SKUの重複チェック
    const { data: existingProduct } = await supabase
      .from('products_master')
      .select('sku')
      .eq('sku', bundleSkuName)
      .single()

    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: `SKU「${bundleSkuName}」は既に存在します` },
        { status: 400 }
      )
    }

    // ===== ステップ2: 自動計算 =====

    // 原価合計
    const totalCost = selectedItems.reduce((sum, item) =>
      sum + (item.ddp_cost_usd * item.quantity), 0
    )

    // 最大在庫数（構成品の中で最小）
    const maxStock = Math.min(...selectedItems.map(item =>
      Math.floor((item.stock_quantity || 0) / item.quantity)
    ))

    // 優先度の高いアイテム（最も高価なアイテム）からデータを継承
    const priorityItem = selectedItems.reduce((max, item) =>
      item.ddp_cost_usd > max.ddp_cost_usd ? item : max
    )

    console.log('💰 自動計算結果:', {
      totalCost,
      maxStock,
      priorityItemSku: priorityItem.sku
    })

    // ===== ステップ3: 構成品情報の生成 =====
    const components = selectedItems.map(item => ({
      child_sku: item.sku,
      child_title: item.title,
      quantity: item.quantity,
      unit_cost: item.ddp_cost_usd,
      total_cost: item.ddp_cost_usd * item.quantity
    }))

    // ===== ステップ4: 親SKU（セット品）のlisting_data構築 =====
    const bundleListingData = {
      components: components,
      total_component_cost: totalCost
    }

    // ===== ステップ5: 優先度の高いアイテムから商品情報を取得 =====
    const { data: priorityProduct, error: priorityError } = await supabase
      .from('products_master')
      .select('*')
      .eq('sku', priorityItem.sku)
      .single()

    if (priorityError || !priorityProduct) {
      console.error('❌ 優先アイテム取得エラー:', priorityError)
      return NextResponse.json(
        { success: false, error: '優先アイテムの取得に失敗しました' },
        { status: 500 }
      )
    }

    // ===== ステップ6: セット品をDBに挿入 =====
    const finalBundleTitle = bundleTitle?.trim() || `${priorityProduct.title} (Bundle)`

    const { data: bundleProduct, error: bundleError } = await supabase
      .from('products_master')
      .insert({
        sku: bundleSkuName,
        title: finalBundleTitle,
        english_title: priorityProduct.english_title || priorityProduct.title_en,
        description: priorityProduct.description,
        variation_type: 'Parent',  // セット品も親SKUとして扱う
        parent_sku_id: null,
        cost_price: totalCost,
        ddp_price_usd: totalCost * 1.3,  // 仮の販売価格（原価 × 1.3）
        price_usd: totalCost * 1.3,
        current_stock: maxStock,
        inventory_quantity: maxStock,
        listing_data: bundleListingData,
        category_name: priorityProduct.category_name,
        category_id: priorityProduct.category_id,
        hts_code: priorityProduct.hts_code,
        origin_country: priorityProduct.origin_country,
        primary_image_url: priorityProduct.primary_image_url,
        images: priorityProduct.images,
        status: 'Draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (bundleError) {
      console.error('❌ セット品作成エラー:', bundleError)
      return NextResponse.json(
        { success: false, error: `セット品作成に失敗しました: ${bundleError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ セット品作成成功:', bundleProduct.sku)

    // ===== ステップ7: bundle_compositionsテーブルへの登録 =====
    const compositionInserts = selectedItems.map(item => ({
      parent_sku: bundleSkuName,
      child_sku: item.sku,
      quantity: item.quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: compositionError } = await supabase
      .from('bundle_compositions')
      .insert(compositionInserts)

    if (compositionError) {
      console.error('❌ 構成品登録エラー:', compositionError)
      // セット品は作成されたが、構成品の紐付けに失敗
      return NextResponse.json(
        {
          success: true,  // 部分的成功
          message: 'セット品は作成されましたが、構成品の紐付けに失敗しました',
          bundleSku: bundleProduct.sku,
          totalCost: totalCost,
          maxStock: maxStock,
          components: components,
          warnings: ['構成品の紐付けに失敗しました。手動で確認してください。']
        }
      )
    }

    console.log('✅ 構成品登録成功:', compositionInserts.length, '件')

    // ===== ステップ8: 子SKUのステータス更新（オプション） =====
    // 構成品として使用されていることを示すフラグを立てる
    const childStatusUpdates = selectedItems.map(async (item) => {
      const { error: updateError } = await supabase
        .from('products_master')
        .update({
          // 構成品として使用されている旨を記録（カスタムフィールド）
          listing_data: {
            ...item,
            used_in_bundles: [bundleSkuName]  // 複数のセット品で使用される可能性がある
          },
          updated_at: new Date().toISOString()
        })
        .eq('sku', item.sku)

      if (updateError) {
        console.warn(`⚠️ 子SKUステータス更新失敗 (${item.sku}):`, updateError)
      }
    })

    await Promise.all(childStatusUpdates)

    // ===== ステップ9: 成功レスポンス =====
    return NextResponse.json({
      success: true,
      message: 'セット品が正常に作成されました',
      bundleSku: bundleProduct.sku,
      bundleTitle: finalBundleTitle,
      totalCost: totalCost,
      maxStock: maxStock,
      components: components,
      summary: {
        totalComponents: selectedItems.length,
        estimatedPrice: totalCost * 1.3,
        profitMargin: 0.3,  // 30%
        inheritedFrom: priorityItem.sku
      }
    })

  } catch (error: any) {
    console.error('❌ セット品作成APIエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'セット品作成中にエラーが発生しました',
        details: error.message
      },
      { status: 500 }
    )
  }
}
