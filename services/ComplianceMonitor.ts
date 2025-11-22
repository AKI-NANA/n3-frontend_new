// ========================================
// ComplianceMonitor サービス
// 作成日: 2025-11-22
// 目的: 税務調査対策のための経費証明不一致アラートロジック
// ========================================

import { createClient } from '@/lib/supabase/server';
import type { ComplianceAlert, ShippingOrder } from '@/types/billing';

/**
 * ComplianceMonitorService
 *
 * 税務調査で問題が発生しないための最重要ロジック。
 * 出荷済みの受注に対して送料証明書が紐付けられているかを監視する。
 */
export class ComplianceMonitorService {
  /**
   * 経費証明不一致アラートのチェック
   *
   * 照合ロジック:
   * - 受注ステータスが「出荷済み」(COMPLETED) かつ
   * - Invoice_Group_ID が NULL
   *
   * この条件に該当する受注は、経費の証明ができないリスクがあるため、
   * 総合ダッシュボードの最重要アラートに表示する。
   *
   * @returns ComplianceAlert オブジェクト
   */
  static async checkMissingInvoiceProof(): Promise<ComplianceAlert> {
    try {
      const supabase = await createClient();

      // Sales_Ordersテーブルから出荷済み受注を取得
      // 注: 実際のテーブル名とカラム名は環境に応じて調整が必要
      const { data: orders, error } = await supabase
        .from('Sales_Orders')
        .select('id, Invoice_Group_ID, shippingStatus')
        .eq('shippingStatus', 'COMPLETED')
        .is('Invoice_Group_ID', null);

      if (error) {
        console.error('[ComplianceMonitor] データベースエラー:', error);
        return {
          type: 'MISSING_INVOICE_PROOF',
          count: 0,
          message: 'データベース接続エラー。システム管理者に連絡してください。',
          severity: 'HIGH',
          affectedOrderIds: [],
        };
      }

      const count = orders?.length || 0;
      const affectedOrderIds = orders?.map(order => order.id) || [];

      return {
        type: 'MISSING_INVOICE_PROOF',
        count,
        message: count > 0
          ? `${count}件の出荷済み受注に対して、送料証明書が紐付けられていません。経費が証明できないリスクがあります。`
          : '現在、経費証明不一致はありません。',
        severity: count > 0 ? 'HIGH' : 'LOW',
        affectedOrderIds,
      };
    } catch (error) {
      console.error('[ComplianceMonitor] 予期しないエラー:', error);
      return {
        type: 'MISSING_INVOICE_PROOF',
        count: 0,
        message: '予期しないエラーが発生しました。',
        severity: 'HIGH',
        affectedOrderIds: [],
      };
    }
  }

  /**
   * 未証明の出荷済み受注リストを取得
   *
   * @returns 未証明の出荷済み受注の配列
   */
  static async getUnprovenShippedOrders(): Promise<ShippingOrder[]> {
    try {
      const supabase = await createClient();

      const { data: orders, error } = await supabase
        .from('Sales_Orders')
        .select(`
          id,
          itemName,
          customerName,
          shippingStatus,
          finalShippingCost,
          trackingNumber,
          Invoice_Group_ID
        `)
        .eq('shippingStatus', 'COMPLETED')
        .is('Invoice_Group_ID', null)
        .order('orderDate', { ascending: false });

      if (error) {
        console.error('[ComplianceMonitor] データ取得エラー:', error);
        return [];
      }

      return (orders || []).map(order => ({
        id: order.id,
        itemName: order.itemName || '商品名不明',
        customerName: order.customerName || '顧客名不明',
        shippingStatus: order.shippingStatus,
        finalShippingCost: order.finalShippingCost,
        trackingNumber: order.trackingNumber,
        invoiceGroupId: order.Invoice_Group_ID,
      }));
    } catch (error) {
      console.error('[ComplianceMonitor] 予期しないエラー:', error);
      return [];
    }
  }

  /**
   * 経費証明率（カバレッジ）の計算
   *
   * 出荷済み受注のうち、何%が送料証明書と紐付いているかを計算。
   *
   * @returns 経費証明率（0.0 〜 1.0）
   */
  static async calculateInvoiceProofCoverage(): Promise<number> {
    try {
      const supabase = await createClient();

      // 出荷済み受注の総数を取得
      const { count: totalCount, error: totalError } = await supabase
        .from('Sales_Orders')
        .select('*', { count: 'exact', head: true })
        .eq('shippingStatus', 'COMPLETED');

      if (totalError || !totalCount) {
        console.error('[ComplianceMonitor] 総数取得エラー:', totalError);
        return 0;
      }

      // 証明書が紐付いている受注数を取得
      const { count: provenCount, error: provenError } = await supabase
        .from('Sales_Orders')
        .select('*', { count: 'exact', head: true })
        .eq('shippingStatus', 'COMPLETED')
        .not('Invoice_Group_ID', 'is', null);

      if (provenError) {
        console.error('[ComplianceMonitor] 証明済み数取得エラー:', provenError);
        return 0;
      }

      const coverage = totalCount > 0 ? (provenCount || 0) / totalCount : 1.0;
      return Math.round(coverage * 100) / 100; // 小数点2桁まで
    } catch (error) {
      console.error('[ComplianceMonitor] カバレッジ計算エラー:', error);
      return 0;
    }
  }

  /**
   * 請求書グループ別の統計情報を取得
   *
   * @returns グループタイプ別の統計
   */
  static async getInvoiceGroupStatistics(): Promise<{
    groupType: string;
    totalGroups: number;
    totalOrders: number;
    totalCost: number;
  }[]> {
    try {
      const supabase = await createClient();

      const { data: groups, error } = await supabase
        .from('Shipping_Invoice_Group')
        .select(`
          Group_ID,
          Group_Type,
          Invoice_Total_Cost_JPY,
          Sales_Orders!inner(id)
        `);

      if (error) {
        console.error('[ComplianceMonitor] 統計データ取得エラー:', error);
        return [];
      }

      // グループタイプ別に集計
      const stats: { [key: string]: {
        totalGroups: number;
        totalOrders: number;
        totalCost: number;
      } } = {};

      groups?.forEach(group => {
        const type = group.Group_Type;
        if (!stats[type]) {
          stats[type] = { totalGroups: 0, totalOrders: 0, totalCost: 0 };
        }
        stats[type].totalGroups += 1;
        stats[type].totalOrders += (group as any).Sales_Orders?.length || 0;
        stats[type].totalCost += group.Invoice_Total_Cost_JPY || 0;
      });

      return Object.entries(stats).map(([groupType, data]) => ({
        groupType,
        ...data,
      }));
    } catch (error) {
      console.error('[ComplianceMonitor] 統計計算エラー:', error);
      return [];
    }
  }
}

/**
 * 便利なヘルパー関数: モック環境での使用
 */
export const getMockComplianceAlert = (count: number = 7): ComplianceAlert => ({
  type: 'MISSING_INVOICE_PROOF',
  count,
  message: count > 0
    ? `${count}件の出荷済み受注に対して、送料証明書が紐付けられていません。経費が証明できないリスクがあります。`
    : '現在、経費証明不一致はありません。',
  severity: count > 0 ? 'HIGH' : 'LOW',
  affectedOrderIds: Array.from({ length: count }, (_, i) => `ORD-${1000 + i}`),
});
