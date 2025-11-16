/**
 * 在庫変動管理 API
 * 検知された変動の取得・承認・eBay反映
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

/**
 * GET: 変動一覧の取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')
    const productId = searchParams.get('productId')

    const supabase = createClient()

    let query = supabase
      .from('inventory_changes')
      .select(`
        *,
        product:products_master(
          id,
          sku,
          title_ja,
          title_en,
          source_url,
          ebay_listed,
          ebay_listing_id,
          current_stock
        )
      `)
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data: changes, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      changes: changes || [],
      count: changes?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST: 変動のアクション実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action,
      changeIds,
      autoUpdateEbay = false
    } = body

    if (!action || !changeIds || changeIds.length === 0) {
      return NextResponse.json(
        { error: 'action and changeIds are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    switch (action) {
      case 'approve':
        // 変動を承認
        const { error: approveError } = await supabase
          .from('inventory_changes')
          .update({
            status: 'reviewed',
            reviewed_at: new Date().toISOString()
          })
          .in('id', changeIds)

        if (approveError) {
          return NextResponse.json(
            { error: approveError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `${changeIds.length}件の変動を承認しました`
        })

      case 'apply':
        // 変動をproducts_masterに適用
        const { data: changes, error: fetchError } = await supabase
          .from('inventory_changes')
          .select('*')
          .in('id', changeIds)

        if (fetchError || !changes) {
          return NextResponse.json(
            { error: fetchError?.message || 'Changes not found' },
            { status: 500 }
          )
        }

        let applied = 0
        let failed = 0

        for (const change of changes) {
          try {
            const updateData: any = {
              updated_at: new Date().toISOString()
            }

            // 変動タイプに応じてproducts_masterを更新
            if (change.change_type === 'price' && change.new_price_jpy) {
              // scraped_dataを更新
              const { data: product } = await supabase
                .from('products_master')
                .select('scraped_data')
                .eq('id', change.product_id)
                .single()

              if (product) {
                updateData.scraped_data = {
                  ...(product.scraped_data || {}),
                  price_jpy: change.new_price_jpy,
                  updated_at: new Date().toISOString()
                }
              }
            } else if (change.change_type === 'stock' && change.new_stock !== undefined) {
              updateData.current_stock = change.new_stock

              // scraped_dataも更新
              const { data: product } = await supabase
                .from('products_master')
                .select('scraped_data')
                .eq('id', change.product_id)
                .single()

              if (product) {
                updateData.scraped_data = {
                  ...(product.scraped_data || {}),
                  stock: change.new_stock,
                  updated_at: new Date().toISOString()
                }
              }
            }

            // products_masterを更新
            const { error: updateError } = await supabase
              .from('products_master')
              .update(updateData)
              .eq('id', change.product_id)

            if (updateError) {
              console.error(`Failed to update product ${change.product_id}:`, updateError)
              failed++
              continue
            }

            // 変動ステータスを更新
            await supabase
              .from('inventory_changes')
              .update({
                status: 'applied',
                applied_at: new Date().toISOString()
              })
              .eq('id', change.id)

            applied++

          } catch (error: any) {
            console.error(`Error applying change ${change.id}:`, error)
            failed++
          }
        }

        // eBay自動更新
        if (autoUpdateEbay && applied > 0) {
          // TODO: eBay更新ロジックを呼び出し
          console.log('eBay auto-update triggered')
        }

        return NextResponse.json({
          success: true,
          applied,
          failed,
          message: `${applied}件適用、${failed}件失敗`
        })

      case 'ignore':
        // 変動を無視
        const { error: ignoreError } = await supabase
          .from('inventory_changes')
          .update({
            status: 'ignored',
            reviewed_at: new Date().toISOString()
          })
          .in('id', changeIds)

        if (ignoreError) {
          return NextResponse.json(
            { error: ignoreError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `${changeIds.length}件の変動を無視しました`
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH: 個別の変動を更新
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { changeId, status, notes } = body

    if (!changeId) {
      return NextResponse.json(
        { error: 'changeId is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
      if (status === 'reviewed' || status === 'ignored') {
        updateData.reviewed_at = new Date().toISOString()
      } else if (status === 'applied') {
        updateData.applied_at = new Date().toISOString()
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { error } = await supabase
      .from('inventory_changes')
      .update(updateData)
      .eq('id', changeId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '変動を更新しました'
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
