/**
 * 仕入れ先データベースサービス
 * DB連携ロジック（Supabase）
 */

import { supabase } from '@/lib/supabase/client';
import {
  SupplierCandidate,
  SupplierSearchResult,
  AIResearchQueueItem,
  QueueStatus,
  ResearchStatus,
  ResearchManagementView,
  ResearchFilterCriteria,
  ResearchSortCriteria,
} from '@/types/supplier';

/**
 * 仕入れ先データベースサービスクラス
 */
export class SupplierDatabaseService {
  /**
   * 仕入れ先候補をDBに保存
   */
  async saveCandidates(
    candidates: Omit<SupplierCandidate, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<SupplierCandidate[]> {
    if (candidates.length === 0) return [];

    const { data, error } = await supabase
      .from('supplier_candidates')
      .upsert(
        candidates.map((c) => ({
          product_id: c.product_id,
          supplier_url: c.supplier_url,
          supplier_platform: c.supplier_platform,
          supplier_name: c.supplier_name,
          candidate_price_jpy: c.candidate_price_jpy,
          estimated_domestic_shipping_jpy: c.estimated_domestic_shipping_jpy,
          confidence_score: c.confidence_score,
          matching_method: c.matching_method,
          similarity_score: c.similarity_score,
          in_stock: c.in_stock,
          stock_quantity: c.stock_quantity,
          stock_checked_at: c.stock_checked_at,
          verified_by_human: c.verified_by_human,
          verification_notes: c.verification_notes,
          search_keywords: c.search_keywords,
          image_search_used: c.image_search_used,
        })),
        {
          onConflict: 'product_id,supplier_url', // 重複時は更新
          ignoreDuplicates: false,
        }
      )
      .select();

    if (error) {
      console.error('[SupplierDB] 候補保存エラー:', error);
      throw new Error(`候補保存に失敗: ${error.message}`);
    }

    return data as SupplierCandidate[];
  }

  /**
   * 商品の最良仕入れ先を更新
   */
  async updateBestSupplier(
    productId: string,
    bestCandidateId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('products_master')
      .update({
        best_supplier_id: bestCandidateId,
        ai_cost_status: true,
        research_status: 'AI_COMPLETED',
      })
      .eq('id', productId);

    if (error) {
      console.error('[SupplierDB] 最良仕入れ先更新エラー:', error);
      throw new Error(`最良仕入れ先更新に失敗: ${error.message}`);
    }
  }

  /**
   * 商品のリサーチステータスを更新
   */
  async updateResearchStatus(
    productId: string,
    status: ResearchStatus,
    additionalData?: {
      provisional_ui_score?: number;
      final_ui_score?: number;
      last_research_date?: string;
    }
  ): Promise<void> {
    const updateData: any = {
      research_status: status,
      ...additionalData,
    };

    const { error } = await supabase
      .from('products_master')
      .update(updateData)
      .eq('id', productId);

    if (error) {
      console.error('[SupplierDB] ステータス更新エラー:', error);
      throw new Error(`ステータス更新に失敗: ${error.message}`);
    }
  }

  /**
   * AIリサーチキューにアイテムを追加
   */
  async enqueueResearch(
    productIds: string[],
    priority: number = 0,
    requestedBy?: string
  ): Promise<AIResearchQueueItem[]> {
    const queueItems = productIds.map((productId) => ({
      product_id: productId,
      status: 'QUEUED' as QueueStatus,
      priority,
      requested_by: requestedBy,
      queued_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('ai_research_queue')
      .upsert(queueItems, {
        onConflict: 'product_id,status',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      console.error('[SupplierDB] キュー追加エラー:', error);
      throw new Error(`キュー追加に失敗: ${error.message}`);
    }

    // products_master のステータスも更新
    await Promise.all(
      productIds.map((id) => this.updateResearchStatus(id, 'AI_QUEUED'))
    );

    return data as AIResearchQueueItem[];
  }

  /**
   * キューから次の処理対象を取得
   */
  async dequeueNext(): Promise<AIResearchQueueItem | null> {
    // 優先度が高く、古いものから取得
    const { data, error } = await supabase
      .from('ai_research_queue')
      .select()
      .eq('status', 'QUEUED')
      .order('priority', { ascending: false })
      .order('queued_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = No rows found（正常）
      console.error('[SupplierDB] デキューエラー:', error);
      throw new Error(`デキューに失敗: ${error.message}`);
    }

    if (!data) return null;

    // ステータスをPROCESSINGに更新
    await this.updateQueueStatus(data.id, 'PROCESSING', {
      started_at: new Date().toISOString(),
    });

    return data as AIResearchQueueItem;
  }

  /**
   * キューアイテムのステータスを更新
   */
  async updateQueueStatus(
    queueId: string,
    status: QueueStatus,
    additionalData?: {
      started_at?: string;
      completed_at?: string;
      suppliers_found?: number;
      best_price_jpy?: number;
      error_message?: string;
      retry_count?: number;
    }
  ): Promise<void> {
    const updateData: any = {
      status,
      ...additionalData,
    };

    const { error } = await supabase
      .from('ai_research_queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      console.error('[SupplierDB] キューステータス更新エラー:', error);
      throw new Error(`キューステータス更新に失敗: ${error.message}`);
    }
  }

  /**
   * 探索結果をDBに保存（統合処理）
   */
  async saveSearchResult(result: SupplierSearchResult): Promise<void> {
    try {
      // 1. 候補を保存
      if (result.candidates.length > 0) {
        const savedCandidates = await this.saveCandidates(result.candidates);

        // 2. 最良候補があれば、商品マスターを更新
        if (result.best_candidate && savedCandidates.length > 0) {
          const bestSaved = savedCandidates.find(
            (c) => c.supplier_url === result.best_candidate?.supplier_url
          );

          if (bestSaved) {
            await this.updateBestSupplier(result.product_id, bestSaved.id);
          }
        }
      }

      // 3. リサーチステータスを更新
      await this.updateResearchStatus(
        result.product_id,
        result.success ? 'AI_COMPLETED' : 'SCORED',
        {
          last_research_date: result.searched_at,
          ai_cost_status: result.success,
        }
      );

      // 4. キューアイテムを完了にマーク（存在する場合）
      await this.completeQueueItem(result.product_id, result);
    } catch (error) {
      console.error('[SupplierDB] 結果保存エラー:', error);

      // エラー時はキューをFAILEDにマーク
      await this.failQueueItem(
        result.product_id,
        error instanceof Error ? error.message : 'Unknown error'
      );

      throw error;
    }
  }

  /**
   * キューアイテムを完了にマーク
   */
  private async completeQueueItem(
    productId: string,
    result: SupplierSearchResult
  ): Promise<void> {
    const { data } = await supabase
      .from('ai_research_queue')
      .select('id')
      .eq('product_id', productId)
      .in('status', ['QUEUED', 'PROCESSING'])
      .limit(1)
      .maybeSingle();

    if (data) {
      await this.updateQueueStatus(data.id, 'COMPLETED', {
        completed_at: new Date().toISOString(),
        suppliers_found: result.candidates.length,
        best_price_jpy: result.best_candidate?.candidate_price_jpy,
      });
    }
  }

  /**
   * キューアイテムを失敗にマーク
   */
  private async failQueueItem(
    productId: string,
    errorMessage: string
  ): Promise<void> {
    const { data } = await supabase
      .from('ai_research_queue')
      .select('id, retry_count')
      .eq('product_id', productId)
      .in('status', ['QUEUED', 'PROCESSING'])
      .limit(1)
      .maybeSingle();

    if (data) {
      await this.updateQueueStatus(data.id, 'FAILED', {
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
        retry_count: (data.retry_count || 0) + 1,
      });

      // エラーメッセージをproducts_masterにも保存
      await supabase
        .from('products_master')
        .update({
          supplier_search_last_error: errorMessage,
          supplier_search_attempts: supabase.rpc('increment', { x: 1 }),
        })
        .eq('id', productId);
    }
  }

  /**
   * リサーチ管理ビューからデータを取得
   */
  async getResearchManagementData(
    filter?: ResearchFilterCriteria,
    sort?: ResearchSortCriteria,
    limit: number = 100,
    offset: number = 0
  ): Promise<ResearchManagementView[]> {
    let query = supabase.from('research_management_view').select('*');

    // フィルタリング
    if (filter) {
      if (filter.research_status && filter.research_status.length > 0) {
        query = query.in('research_status', filter.research_status);
      }
      if (filter.ai_cost_status !== undefined) {
        query = query.eq('ai_cost_status', filter.ai_cost_status);
      }
      if (filter.min_provisional_score !== undefined) {
        query = query.gte('provisional_ui_score', filter.min_provisional_score);
      }
      if (filter.max_provisional_score !== undefined) {
        query = query.lte('provisional_ui_score', filter.max_provisional_score);
      }
      if (filter.min_sales_count !== undefined) {
        query = query.gte('sm_sales_count', filter.min_sales_count);
      }
      if (filter.max_competitor_count !== undefined) {
        query = query.lte('sm_competitor_count', filter.max_competitor_count);
      }
      if (filter.has_supplier !== undefined) {
        if (filter.has_supplier) {
          query = query.not('best_supplier_url', 'is', null);
        } else {
          query = query.is('best_supplier_url', null);
        }
      }
      if (filter.supplier_platform && filter.supplier_platform.length > 0) {
        query = query.in('best_supplier_platform', filter.supplier_platform);
      }
      if (filter.min_confidence !== undefined) {
        query = query.gte('supplier_confidence', filter.min_confidence);
      }
    }

    // ソート
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    } else {
      // デフォルト: 暫定スコア降順
      query = query.order('provisional_ui_score', {
        ascending: false,
        nullsFirst: false,
      });
    }

    // ページネーション
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('[SupplierDB] リサーチデータ取得エラー:', error);
      throw new Error(`リサーチデータ取得に失敗: ${error.message}`);
    }

    return data as ResearchManagementView[];
  }

  /**
   * 商品の仕入れ先候補を取得
   */
  async getSupplierCandidates(productId: string): Promise<SupplierCandidate[]> {
    const { data, error } = await supabase
      .from('supplier_candidates')
      .select('*')
      .eq('product_id', productId)
      .order('confidence_score', { ascending: false });

    if (error) {
      console.error('[SupplierDB] 候補取得エラー:', error);
      throw new Error(`候補取得に失敗: ${error.message}`);
    }

    return data as SupplierCandidate[];
  }

  /**
   * 仕入れ先候補を人間が検証済みにマーク
   */
  async verifyCandidateByHuman(
    candidateId: string,
    notes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('supplier_candidates')
      .update({
        verified_by_human: true,
        verification_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidateId);

    if (error) {
      console.error('[SupplierDB] 候補検証エラー:', error);
      throw new Error(`候補検証に失敗: ${error.message}`);
    }
  }
}

/**
 * シングルトンインスタンス
 */
export const supplierDbService = new SupplierDatabaseService();
