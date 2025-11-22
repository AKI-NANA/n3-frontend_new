// lib/research/research-workflow.ts
/**
 * リサーチデータ管理システム: 承認ワークフローロジック
 *
 * 統合開発指示書 タスク3に対応
 * - UIからの承認/拒否操作に応じて、research_repository の status フィールドを更新
 * - 承認（Promoted）された場合のみ、データを products_master（SKUマスター）にコピー
 */

import { supabase } from '@/lib/supabase'

// ========================================
// 型定義
// ========================================

export interface ResearchRepositoryItem {
  id?: string
  ebay_item_id: string
  search_keyword: string
  title: string
  price_usd: number
  sold_count?: number
  category_id?: string
  category_name?: string
  condition?: string
  image_url?: string
  view_item_url?: string
  lowest_price_usd?: number
  average_price_usd?: number
  competitor_count?: number
  estimated_weight_g?: number
  profit_margin_at_lowest?: number
  profit_amount_at_lowest_usd?: number
  profit_amount_at_lowest_jpy?: number
  recommended_cost_jpy?: number
  status?: 'pending' | 'approved' | 'rejected' | 'promoted'
  reviewed_at?: string
  reviewed_by?: string
  reject_reason?: string
  promoted_to_sku?: boolean
  promoted_at?: string
  product_master_id?: string
  item_specifics?: any
  notes?: string
}

// ========================================
// CRUD操作
// ========================================

/**
 * リサーチリポジトリにアイテムを追加
 */
export async function addToResearchRepository(item: ResearchRepositoryItem) {
  try {
    console.log(`💾 リサーチリポジトリに追加: ${item.ebay_item_id}`)

    const { data, error } = await supabase
      .from('research_repository')
      .insert({
        ...item,
        status: item.status || 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ DB追加エラー:', error)
      throw error
    }

    console.log('✅ リサーチリポジトリに追加完了')
    return { success: true, data }
  } catch (error) {
    console.error('❌ addToResearchRepository エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * リサーチリポジトリの全アイテムを取得（ステータスフィルタ付き）
 */
export async function getResearchRepositoryItems(
  status?: 'pending' | 'approved' | 'rejected' | 'promoted',
  limit = 100
) {
  try {
    let query = supabase
      .from('research_repository')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('❌ getResearchRepositoryItems エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 単一のリサーチアイテムを取得
 */
export async function getResearchItem(id: string) {
  try {
    const { data, error } = await supabase
      .from('research_repository')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      throw error
    }

    return { success: true, data }
  } catch (error) {
    console.error('❌ getResearchItem エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ========================================
// 承認・拒否ワークフロー
// ========================================

/**
 * リサーチアイテムを承認
 *
 * 指示書 タスク3: UIからの承認操作に応じて、status フィールドを更新
 *
 * @param id - リサーチアイテムのID
 * @param reviewedBy - レビュー担当者
 * @returns 更新結果
 */
export async function approveResearchItem(id: string, reviewedBy?: string) {
  try {
    console.log(`✅ リサーチアイテムを承認: ${id}`)

    const { data, error } = await supabase
      .from('research_repository')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    console.log('✅ 承認完了')
    return { success: true, data }
  } catch (error) {
    console.error('❌ approveResearchItem エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * リサーチアイテムを拒否
 *
 * 指示書 タスク3: UIからの拒否操作に応じて、status フィールドを更新
 *
 * @param id - リサーチアイテムのID
 * @param rejectReason - 拒否理由
 * @param reviewedBy - レビュー担当者
 * @returns 更新結果
 */
export async function rejectResearchItem(id: string, rejectReason: string, reviewedBy?: string) {
  try {
    console.log(`❌ リサーチアイテムを拒否: ${id}`)

    const { data, error } = await supabase
      .from('research_repository')
      .update({
        status: 'rejected',
        reject_reason: rejectReason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    console.log('✅ 拒否完了')
    return { success: true, data }
  } catch (error) {
    console.error('❌ rejectResearchItem エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ========================================
// SKUマスターへの昇格
// ========================================

/**
 * 承認済みアイテムをSKUマスター（products_master）にコピー
 *
 * 指示書 タスク3: 承認（Promoted）された場合のみ、データを products_master にコピー
 *
 * @param repositoryId - リサーチリポジトリのID
 * @returns SKUマスターのID
 */
export async function promoteToSKUMaster(repositoryId: string) {
  try {
    console.log(`🚀 SKUマスターに昇格: ${repositoryId}`)

    // 1. リサーチリポジトリからアイテムを取得
    const { data: researchItem, error: fetchError } = await supabase
      .from('research_repository')
      .select('*')
      .eq('id', repositoryId)
      .single()

    if (fetchError) throw fetchError

    if (!researchItem) {
      throw new Error('リサーチアイテムが見つかりません')
    }

    // 2. ステータスが承認済み（approved）であることを確認
    if (researchItem.status !== 'approved') {
      throw new Error(`承認済みアイテムのみSKUマスターに昇格できます（現在のステータス: ${researchItem.status}）`)
    }

    // 3. 既に昇格済みかチェック
    if (researchItem.promoted_to_sku) {
      throw new Error('このアイテムは既にSKUマスターに昇格済みです')
    }

    // 4. SKUマスター（products_master）にデータをコピー
    // 注: products_master テーブルのスキーマに合わせてマッピング
    const skuData = {
      sku: `RES-${researchItem.ebay_item_id}`, // リサーチIDベースのSKU
      title: researchItem.title,
      english_title: researchItem.title, // 英語タイトル（仮）
      price_usd: researchItem.price_usd,
      recommended_cost_jpy: researchItem.recommended_cost_jpy,
      category_name: researchItem.category_name,
      condition: researchItem.condition,
      image_urls: researchItem.image_url ? [researchItem.image_url] : [],
      lowest_price_usd: researchItem.lowest_price_usd,
      average_price_usd: researchItem.average_price_usd,
      estimated_weight_g: researchItem.estimated_weight_g,
      profit_margin_at_lowest: researchItem.profit_margin_at_lowest,
      // その他のフィールドは必要に応じて追加
      notes: `リサーチリポジトリから昇格: ${repositoryId}`,
      stock_quantity: 0, // 初期在庫なし
      ready_to_list: false, // 出品準備未完
    }

    const { data: skuMaster, error: insertError } = await supabase
      .from('products_master')
      .insert(skuData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ SKUマスターへの挿入エラー:', insertError)
      throw insertError
    }

    // 5. リサーチリポジトリのステータスを更新
    const { error: updateError } = await supabase
      .from('research_repository')
      .update({
        status: 'promoted',
        promoted_to_sku: true,
        promoted_at: new Date().toISOString(),
        product_master_id: skuMaster.id
      })
      .eq('id', repositoryId)

    if (updateError) throw updateError

    console.log(`✅ SKUマスターに昇格完了: ${skuMaster.id}`)
    return {
      success: true,
      data: skuMaster,
      message: `SKU ${skuMaster.sku} として登録されました`
    }
  } catch (error) {
    console.error('❌ promoteToSKUMaster エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 一括承認処理
 *
 * 複数のリサーチアイテムを一括で承認します
 */
export async function bulkApproveResearchItems(ids: string[], reviewedBy?: string) {
  try {
    console.log(`✅ ${ids.length}件のリサーチアイテムを一括承認`)

    const { data, error } = await supabase
      .from('research_repository')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy
      })
      .in('id', ids)
      .select()

    if (error) throw error

    console.log(`✅ ${data.length}件の承認完了`)
    return { success: true, data }
  } catch (error) {
    console.error('❌ bulkApproveResearchItems エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 一括拒否処理
 */
export async function bulkRejectResearchItems(ids: string[], rejectReason: string, reviewedBy?: string) {
  try {
    console.log(`❌ ${ids.length}件のリサーチアイテムを一括拒否`)

    const { data, error } = await supabase
      .from('research_repository')
      .update({
        status: 'rejected',
        reject_reason: rejectReason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy
      })
      .in('id', ids)
      .select()

    if (error) throw error

    console.log(`✅ ${data.length}件の拒否完了`)
    return { success: true, data }
  } catch (error) {
    console.error('❌ bulkRejectResearchItems エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 統計情報の取得
 */
export async function getResearchRepositoryStats() {
  try {
    const { data, error } = await supabase.rpc('get_research_repository_stats')

    // RPCが未定義の場合は、手動で集計
    if (error && error.code === '42883') {
      const [pending, approved, rejected, promoted] = await Promise.all([
        supabase.from('research_repository').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('research_repository').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('research_repository').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('research_repository').select('id', { count: 'exact', head: true }).eq('status', 'promoted'),
      ])

      return {
        success: true,
        data: {
          pending: pending.count || 0,
          approved: approved.count || 0,
          rejected: rejected.count || 0,
          promoted: promoted.count || 0,
          total: (pending.count || 0) + (approved.count || 0) + (rejected.count || 0) + (promoted.count || 0)
        }
      }
    }

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('❌ getResearchRepositoryStats エラー:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
