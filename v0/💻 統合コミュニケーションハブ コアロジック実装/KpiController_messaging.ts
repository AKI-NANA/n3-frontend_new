// /services/messaging/KpiController.ts

import { ReplyStatus, UnifiedMessage, SourceMall } from '@/types/messaging';

/**
 * 顧客メッセージの対応完了ステータスを更新し、KPIログを作成する
 */
export async function markMessageAsCompleted(messageId: string, staffId: string): Promise<void> {
    // 1. DBの status を 'Completed' に更新
    // 💡 実際にはDB接続が必要
    console.log(`[KPI] Message ${messageId} marked as Completed by Staff ${staffId}. (DB更新はClaude/MCP担当)`);

    // 2. 外注KPIログを作成（III. 外注KPI）
    // 💡 KPIログテーブルへの書き込み
    // await db.kpi_logs.create({ staff_id: staffId, type: 'MessageCompletion', count: 1, timestamp: new Date() });
}

/**
 * 緊急度の高い通知をGoogleカレンダーに登録する
 */
export async function registerAlertToCalendar(notificationTitle: string, sourceMall: SourceMall): Promise<void> {
    const taskTitle = `[緊急対応] ${sourceMall}: ${notificationTitle}`;
    
    // 💡 Google Calendar API連携ロジックをClaude/MCPが実装
    console.log(`[Calendar Sync] Task "${taskTitle}" registered to Google Calendar. (API連携はClaude/MCP担当)`);
}

/**
 * 総合ダッシュボード向けに未対応件数と緊急通知数を集計する
 */
export async function getUnansweredMessageCount(): Promise<{ totalUncompleted: number, emergencyAlerts: number }> {
    // 💡 DBから 'Unanswered' および 'Pending' のメッセージをカウント
    // const uncompletedCount = await db.messages.count({ reply_status: { $in: ['Unanswered', 'Pending'] }, is_customer_message: true });
    
    // 💡 DBから '緊急対応 (赤)' の通知をカウント
    // const emergencyAlertCount = await db.messages.count({ ai_urgency: '緊急対応 (赤)', is_customer_message: false });

    // モックデータ
    const totalUncompleted = 42; 
    const emergencyAlerts = 5; 
    
    // UI側の「未対応問い合わせ件数」に両方を合算して表示する
    return { totalUncompleted: totalUncompleted + emergencyAlerts, emergencyAlerts };
}