// ================================================================
// 📦 ShipmentAuditor Service
// ================================================================
// 作成日: 2025-11-23
// 目的: バーコードスキャン監査、梱包材チェック、作業ログ記録を一元管理
// 連携: sales_orders, shipping_process_log, packing_instructions_master
// ================================================================

import { createClient } from '@supabase/supabase-js';

// ================================================================
// 型定義
// ================================================================

export interface ValidationResult {
  success: boolean;
  message: string;
  errorCode?: string;
  errorDetails?: string;
}

export interface ScanValidationParams {
  orderId: string;
  scannedValue: string;
  actionType: ActionType;
  operatorId: string;
  operatorName?: string;
  metadata?: Record<string, any>;
}

export interface LogRecordParams {
  orderId: string;
  salesOrderUuid?: string;
  operatorId: string;
  operatorName?: string;
  actionType: ActionType;
  scannedValue?: string;
  inputValue?: string;
  validationStatus?: ValidationStatus;
  validationMessage?: string;
  errorCode?: string;
  errorDetails?: string;
  metadata?: Record<string, any>;
  processingTimeMs?: number;
}

export type ActionType =
  | 'SCAN_ORDER_ID'
  | 'SCAN_ITEM'
  | 'SCAN_PACKING_MAT'
  | 'ENTER_TRACKING'
  | 'PRINT_LABEL'
  | 'COMPLETE_SHIPMENT'
  | 'UPDATE_STATUS'
  | 'UPLOAD_PROOF';

export type ValidationStatus = 'success' | 'failed' | 'pending' | 'skipped';

export interface PackingChecklistItem {
  material_name: string;
  size: string;
  quantity: number | string;
  scanned?: boolean;
}

// ================================================================
// ShipmentAuditor クラス
// ================================================================

export class ShipmentAuditor {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // Supabaseクライアントの初期化
    // 環境変数から取得、またはパラメータで指定
    const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    this.supabase = createClient(url, key);
  }

  // ================================================================
  // メインメソッド: バーコードスキャンの検証
  // ================================================================

  /**
   * バーコードスキャンの検証を実行
   * @param params スキャン検証パラメータ
   * @returns 検証結果
   */
  async validateScan(params: ScanValidationParams): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // アクションタイプ別の検証ロジック
      let validationResult: ValidationResult;

      switch (params.actionType) {
        case 'SCAN_ORDER_ID':
          validationResult = await this.validateOrderId(params.scannedValue);
          break;

        case 'SCAN_ITEM':
          validationResult = await this.validateItemBarcode(
            params.orderId,
            params.scannedValue
          );
          break;

        case 'SCAN_PACKING_MAT':
          validationResult = await this.validatePackingMaterial(
            params.orderId,
            params.scannedValue
          );
          break;

        case 'ENTER_TRACKING':
          validationResult = await this.validateTrackingNumber(params.scannedValue);
          break;

        default:
          validationResult = {
            success: true,
            message: `${params.actionType} のスキャンを記録しました`,
          };
      }

      // 作業ログの記録
      const processingTimeMs = Date.now() - startTime;
      await this.recordLog({
        orderId: params.orderId,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        actionType: params.actionType,
        scannedValue: params.scannedValue,
        validationStatus: validationResult.success ? 'success' : 'failed',
        validationMessage: validationResult.message,
        errorCode: validationResult.errorCode,
        errorDetails: validationResult.errorDetails,
        metadata: params.metadata,
        processingTimeMs,
      });

      return validationResult;
    } catch (error: any) {
      // エラーハンドリング
      const errorResult: ValidationResult = {
        success: false,
        message: 'スキャン検証中にエラーが発生しました',
        errorCode: 'VALIDATION_ERROR',
        errorDetails: error.message,
      };

      // エラーログの記録
      await this.recordLog({
        orderId: params.orderId,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
        actionType: params.actionType,
        scannedValue: params.scannedValue,
        validationStatus: 'failed',
        validationMessage: errorResult.message,
        errorCode: errorResult.errorCode,
        errorDetails: errorResult.errorDetails,
        metadata: params.metadata,
        processingTimeMs: Date.now() - startTime,
      });

      return errorResult;
    }
  }

  // ================================================================
  // 検証ロジック: 受注ID
  // ================================================================

  private async validateOrderId(orderId: string): Promise<ValidationResult> {
    // sales_orders テーブルから受注を検索
    const { data: order, error } = await this.supabase
      .from('sales_orders')
      .select('id, order_id, shipping_status')
      .eq('order_id', orderId)
      .single();

    if (error || !order) {
      return {
        success: false,
        message: `受注ID "${orderId}" が見つかりません`,
        errorCode: 'ORDER_NOT_FOUND',
        errorDetails: error?.message,
      };
    }

    // 出荷済みの場合は警告
    if (order.shipping_status === 'COMPLETED') {
      return {
        success: false,
        message: `受注ID "${orderId}" は既に出荷完了しています`,
        errorCode: 'ORDER_ALREADY_SHIPPED',
      };
    }

    return {
      success: true,
      message: `受注ID "${orderId}" の検証に成功しました`,
    };
  }

  // ================================================================
  // 検証ロジック: 商品バーコード
  // ================================================================

  private async validateItemBarcode(
    orderId: string,
    itemBarcode: string
  ): Promise<ValidationResult> {
    // 受注情報を取得
    const { data: order, error: orderError } = await this.supabase
      .from('sales_orders')
      .select('item_id, item_name')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        message: '受注情報の取得に失敗しました',
        errorCode: 'ORDER_FETCH_ERROR',
        errorDetails: orderError?.message,
      };
    }

    // 商品IDとスキャン値を照合
    if (order.item_id !== itemBarcode) {
      return {
        success: false,
        message: `商品バーコードが一致しません。期待値: ${order.item_id}, スキャン値: ${itemBarcode}`,
        errorCode: 'ITEM_MISMATCH',
      };
    }

    return {
      success: true,
      message: `商品バーコード "${itemBarcode}" の検証に成功しました`,
    };
  }

  // ================================================================
  // 検証ロジック: 梱包材バーコード
  // ================================================================

  private async validatePackingMaterial(
    orderId: string,
    materialBarcode: string
  ): Promise<ValidationResult> {
    // 受注の商品IDを取得
    const { data: order } = await this.supabase
      .from('sales_orders')
      .select('item_id')
      .eq('order_id', orderId)
      .single();

    if (!order) {
      return {
        success: false,
        message: '受注情報が見つかりません',
        errorCode: 'ORDER_NOT_FOUND',
      };
    }

    // 梱包指示書から必要な梱包材リストを取得
    const { data: instructions } = await this.supabase
      .from('packing_instructions_master')
      .select('packing_material_list')
      .eq('item_id', order.item_id)
      .single();

    if (!instructions || !instructions.packing_material_list) {
      return {
        success: true,
        message: '梱包材のスキャンを記録しました（梱包指示書なし）',
      };
    }

    // 梱包材リストに含まれているか確認（簡易実装）
    const materials = instructions.packing_material_list as PackingChecklistItem[];
    const found = materials.some(
      (mat) => mat.material_name.includes(materialBarcode) || materialBarcode.includes(mat.material_name)
    );

    if (!found) {
      return {
        success: false,
        message: `梱包材 "${materialBarcode}" は梱包指示書に含まれていません`,
        errorCode: 'MATERIAL_NOT_IN_LIST',
      };
    }

    return {
      success: true,
      message: `梱包材 "${materialBarcode}" の検証に成功しました`,
    };
  }

  // ================================================================
  // 検証ロジック: 追跡番号
  // ================================================================

  private async validateTrackingNumber(trackingNumber: string): Promise<ValidationResult> {
    // 追跡番号の形式チェック（簡易実装）
    if (!trackingNumber || trackingNumber.trim().length < 5) {
      return {
        success: false,
        message: '追跡番号が短すぎます（最低5文字以上）',
        errorCode: 'INVALID_TRACKING_FORMAT',
      };
    }

    // 重複チェック（既に使用されている追跡番号かどうか）
    const { data: existingOrder } = await this.supabase
      .from('sales_orders')
      .select('order_id')
      .eq('tracking_number', trackingNumber)
      .single();

    if (existingOrder) {
      return {
        success: false,
        message: `追跡番号 "${trackingNumber}" は既に使用されています（受注ID: ${existingOrder.order_id}）`,
        errorCode: 'DUPLICATE_TRACKING_NUMBER',
      };
    }

    return {
      success: true,
      message: `追跡番号 "${trackingNumber}" の検証に成功しました`,
    };
  }

  // ================================================================
  // 梱包材チェックリストの完了確認
  // ================================================================

  /**
   * 梱包材チェックリストが完了しているか確認
   * @param orderId 受注ID
   * @returns 完了フラグとメッセージ
   */
  async checkPackingListComplete(orderId: string): Promise<ValidationResult> {
    try {
      // 受注の商品IDを取得
      const { data: order } = await this.supabase
        .from('sales_orders')
        .select('item_id')
        .eq('order_id', orderId)
        .single();

      if (!order) {
        return {
          success: false,
          message: '受注情報が見つかりません',
          errorCode: 'ORDER_NOT_FOUND',
        };
      }

      // 梱包指示書から必要な梱包材リストを取得
      const { data: instructions } = await this.supabase
        .from('packing_instructions_master')
        .select('packing_material_list')
        .eq('item_id', order.item_id)
        .single();

      if (!instructions || !instructions.packing_material_list) {
        return {
          success: true,
          message: '梱包指示書が未登録のため、チェックをスキップします',
        };
      }

      const materials = instructions.packing_material_list as PackingChecklistItem[];

      // この受注の梱包材スキャンログを取得
      const { data: logs } = await this.supabase
        .from('shipping_process_log')
        .select('scanned_value')
        .eq('order_id', orderId)
        .eq('action_type', 'SCAN_PACKING_MAT')
        .eq('validation_status', 'success');

      const scannedMaterials = logs?.map((log) => log.scanned_value) || [];

      // 全ての梱包材がスキャンされているか確認（簡易実装）
      const missingMaterials = materials.filter(
        (mat) => !scannedMaterials.some((scanned) => scanned?.includes(mat.material_name))
      );

      if (missingMaterials.length > 0) {
        return {
          success: false,
          message: `未スキャンの梱包材があります: ${missingMaterials.map((m) => m.material_name).join(', ')}`,
          errorCode: 'PACKING_LIST_INCOMPLETE',
        };
      }

      return {
        success: true,
        message: '全ての梱包材がスキャン済みです',
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'チェックリスト確認中にエラーが発生しました',
        errorCode: 'CHECKLIST_ERROR',
        errorDetails: error.message,
      };
    }
  }

  // ================================================================
  // 作業ログの記録
  // ================================================================

  /**
   * 作業ログをshipping_process_logテーブルに記録
   * @param params ログ記録パラメータ
   */
  async recordLog(params: LogRecordParams): Promise<void> {
    try {
      // sales_orders から UUID を取得（必要に応じて）
      let salesOrderUuid = params.salesOrderUuid;
      if (!salesOrderUuid) {
        const { data: order } = await this.supabase
          .from('sales_orders')
          .select('id')
          .eq('order_id', params.orderId)
          .single();

        salesOrderUuid = order?.id;
      }

      // ログレコードを挿入
      const { error } = await this.supabase.from('shipping_process_log').insert({
        order_id: params.orderId,
        sales_order_uuid: salesOrderUuid,
        operator_id: params.operatorId,
        operator_name: params.operatorName,
        action_type: params.actionType,
        scanned_value: params.scannedValue,
        input_value: params.inputValue,
        validation_status: params.validationStatus || 'pending',
        validation_message: params.validationMessage,
        error_code: params.errorCode,
        error_details: params.errorDetails,
        metadata: params.metadata || {},
        processing_time_ms: params.processingTimeMs,
      });

      if (error) {
        console.error('作業ログ記録エラー:', error);
      }
    } catch (error: any) {
      console.error('作業ログ記録中に例外が発生:', error);
    }
  }

  // ================================================================
  // ユーティリティメソッド: 作業者KPI取得
  // ================================================================

  /**
   * 作業者のKPIを取得
   * @param operatorId 作業者ID
   * @param workDate 作業日（省略時は今日）
   * @returns KPIデータ
   */
  async getOperatorKPI(operatorId: string, workDate?: string) {
    const targetDate = workDate || new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('v_operator_kpi')
      .select('*')
      .eq('operator_id', operatorId)
      .eq('work_date', targetDate)
      .single();

    if (error) {
      console.error('KPI取得エラー:', error);
      return null;
    }

    return data;
  }

  // ================================================================
  // ユーティリティメソッド: 受注の作業履歴取得
  // ================================================================

  /**
   * 受注の作業履歴を取得
   * @param orderId 受注ID
   * @returns 作業履歴配列
   */
  async getOrderProcessHistory(orderId: string) {
    const { data, error } = await this.supabase
      .from('v_order_process_history')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('作業履歴取得エラー:', error);
      return [];
    }

    return data || [];
  }
}

// ================================================================
// デフォルトインスタンスのエクスポート
// ================================================================

export const shipmentAuditor = new ShipmentAuditor();
