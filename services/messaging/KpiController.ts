// /services/messaging/KpiController.ts
// KPI制御とタスク管理サービス

import {
  ReplyStatus,
  UnifiedMessage,
  SourceMall,
  MessageStats,
  CalendarTask,
} from '@/types/messaging';

/**
 * 顧客メッセージの対応完了ステータスを更新し、KPIログを作成する
 */
export async function markMessageAsCompleted(
  messageId: string,
  staffId: string
): Promise<void> {
  console.log(
    `[KPI] Message ${messageId} marked as Completed by Staff ${staffId}`
  );

  try {
    // 1. DBのstatusを'Completed'に更新
    // 💡 実際にはSupabase接続が必要
    // const supabase = createClient();
    // const { error: updateError } = await supabase
    //   .from('unified_messages')
    //   .update({
    //     reply_status: 'Completed',
    //     completed_by: staffId,
    //     completed_at: new Date().toISOString(),
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('message_id', messageId);
    //
    // if (updateError) throw updateError;

    // 2. 外注KPIログを作成（外注業務実績サマリー用）
    // 💡 KPIログテーブルへの書き込み
    // const { error: kpiError } = await supabase
    //   .from('kpi_logs')
    //   .insert({
    //     staff_id: staffId,
    //     activity_type: 'MessageCompletion',
    //     count: 1,
    //     timestamp: new Date().toISOString(),
    //     metadata: {
    //       message_id: messageId,
    //     },
    //   });
    //
    // if (kpiError) throw kpiError;

    console.log('[KPI] メッセージ完了ステータスとKPIログを正常に更新しました');
  } catch (error) {
    console.error('[KPI] メッセージ完了処理に失敗しました:', error);
    throw error;
  }
}

/**
 * 複数メッセージを一括で完了としてマーク
 */
export async function markMultipleMessagesAsCompleted(
  messageIds: string[],
  staffId: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const messageId of messageIds) {
    try {
      await markMessageAsCompleted(messageId, staffId);
      success++;
    } catch (error) {
      console.error(`[KPI] メッセージ ${messageId} の完了処理に失敗:`, error);
      failed++;
    }
  }

  console.log(
    `[KPI] 一括完了処理: 成功 ${success}件, 失敗 ${failed}件`
  );

  return { success, failed };
}

/**
 * 緊急度の高い通知をGoogleカレンダーに登録する
 * 💡 Google Calendar API連携ロジック
 */
export async function registerAlertToCalendar(
  notificationTitle: string,
  sourceMall: SourceMall,
  dueDate?: Date,
  description?: string
): Promise<CalendarTask> {
  const taskTitle = `[緊急対応] ${sourceMall}: ${notificationTitle}`;
  const task: CalendarTask = {
    title: taskTitle,
    description: description || notificationTitle,
    due_date: dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000), // デフォルト: 24時間後
    source_message_id: '', // 呼び出し元で設定
    source_mall: sourceMall,
    priority: 'high',
    completed: false,
  };

  console.log(`[Calendar Sync] タスク "${taskTitle}" をカレンダーに登録中...`);

  try {
    // 💡 Google Calendar API連携ロジック
    // const oauth2Client = getGoogleOAuthClient();
    // const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    //
    // const event = {
    //   summary: task.title,
    //   description: task.description,
    //   start: {
    //     dateTime: new Date().toISOString(),
    //     timeZone: 'Asia/Tokyo',
    //   },
    //   end: {
    //     dateTime: task.due_date.toISOString(),
    //     timeZone: 'Asia/Tokyo',
    //   },
    //   reminders: {
    //     useDefault: false,
    //     overrides: [
    //       { method: 'email', minutes: 24 * 60 },
    //       { method: 'popup', minutes: 60 },
    //     ],
    //   },
    // };
    //
    // const response = await calendar.events.insert({
    //   calendarId: 'primary',
    //   requestBody: event,
    // });
    //
    // task.calendar_event_id = response.data.id || undefined;

    // モック実装（開発用）
    task.id = 'TASK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    task.calendar_event_id = 'CAL-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    console.log('[Calendar Sync] タスクを正常にカレンダーに登録しました:', task.id);

    // DBにタスクを保存
    // const supabase = createClient();
    // await supabase.from('calendar_tasks').insert(task);

    return task;
  } catch (error) {
    console.error('[Calendar Sync] カレンダーへの登録に失敗しました:', error);
    throw error;
  }
}

/**
 * 総合ダッシュボード向けに未対応件数と緊急通知数を集計する
 */
export async function getUnansweredMessageCount(): Promise<{
  totalUncompleted: number;
  emergencyAlerts: number;
}> {
  try {
    // 💡 DBから'Unanswered'および'Pending'のメッセージをカウント
    // const supabase = createClient();
    //
    // const { count: uncompletedCount, error: uncompletedError } = await supabase
    //   .from('unified_messages')
    //   .select('*', { count: 'exact', head: true })
    //   .in('reply_status', ['Unanswered', 'Pending'])
    //   .eq('is_customer_message', true);
    //
    // if (uncompletedError) throw uncompletedError;
    //
    // // 💡 DBから'緊急対応 (赤)'の通知をカウント
    // const { count: emergencyAlertCount, error: emergencyError } = await supabase
    //   .from('unified_messages')
    //   .select('*', { count: 'exact', head: true })
    //   .eq('ai_urgency', '緊急対応 (赤)')
    //   .eq('is_customer_message', false)
    //   .in('reply_status', ['Unanswered', 'Pending']);
    //
    // if (emergencyError) throw emergencyError;

    // モックデータ（開発用）
    const totalUncompleted = 42;
    const emergencyAlerts = 5;

    console.log(
      `[KPI] 未対応件数: ${totalUncompleted}, 緊急アラート: ${emergencyAlerts}`
    );

    return {
      totalUncompleted: totalUncompleted,
      emergencyAlerts: emergencyAlerts,
    };
  } catch (error) {
    console.error('[KPI] 未対応件数の取得に失敗しました:', error);
    throw error;
  }
}

/**
 * メッセージ統計情報を取得
 */
export async function getMessageStats(
  dateFrom?: Date,
  dateTo?: Date
): Promise<MessageStats> {
  try {
    // 💡 実際のDB集計ロジック
    // const supabase = createClient();
    //
    // let query = supabase.from('unified_messages').select('*');
    //
    // if (dateFrom) {
    //   query = query.gte('received_at', dateFrom.toISOString());
    // }
    // if (dateTo) {
    //   query = query.lte('received_at', dateTo.toISOString());
    // }
    //
    // const { data: messages, error } = await query;
    // if (error) throw error;

    // モックデータ（開発用）
    const stats: MessageStats = {
      total_messages: 520,
      unanswered_count: 32,
      pending_count: 15,
      completed_count: 473,
      urgent_count: 8,
      by_mall: {
        eBay_US: { total: 280, unanswered: 18, urgent: 4 },
        eBay_UK: { total: 45, unanswered: 2, urgent: 0 },
        eBay_DE: { total: 30, unanswered: 1, urgent: 0 },
        Amazon_JP: { total: 85, unanswered: 5, urgent: 2 },
        Amazon_US: { total: 20, unanswered: 0, urgent: 0 },
        Shopee_TW: { total: 35, unanswered: 4, urgent: 1 },
        Shopee_SG: { total: 15, unanswered: 1, urgent: 1 },
        Qoo10_JP: { total: 5, unanswered: 1, urgent: 0 },
        Yahoo_JP: { total: 3, unanswered: 0, urgent: 0 },
        Mercari_JP: { total: 2, unanswered: 0, urgent: 0 },
        Internal: { total: 0, unanswered: 0, urgent: 0 },
      },
      avg_response_time_hours: 4.5,
      median_response_time_hours: 3.2,
      by_staff: {
        'staff-001': { completed_count: 158, avg_response_time_hours: 3.8 },
        'staff-002': { completed_count: 142, avg_response_time_hours: 4.2 },
        'staff-003': { completed_count: 173, avg_response_time_hours: 5.1 },
      },
    };

    return stats;
  } catch (error) {
    console.error('[KPI] メッセージ統計の取得に失敗しました:', error);
    throw error;
  }
}

/**
 * 外注スタッフのパフォーマンスを取得
 */
export async function getStaffPerformance(
  staffId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  messages_handled: number;
  avg_response_time_hours: number;
  quality_score: number;
  tasks_completed: number;
}> {
  try {
    // 💡 実際のDB集計ロジック
    // const supabase = createClient();
    //
    // let query = supabase
    //   .from('unified_messages')
    //   .select('*')
    //   .eq('completed_by', staffId)
    //   .eq('reply_status', 'Completed');
    //
    // if (dateFrom) {
    //   query = query.gte('completed_at', dateFrom.toISOString());
    // }
    // if (dateTo) {
    //   query = query.lte('completed_at', dateTo.toISOString());
    // }
    //
    // const { data: messages, error } = await query;
    // if (error) throw error;

    // モックデータ（開発用）
    return {
      messages_handled: 128,
      avg_response_time_hours: 4.2,
      quality_score: 92,
      tasks_completed: 85,
    };
  } catch (error) {
    console.error('[KPI] スタッフパフォーマンスの取得に失敗しました:', error);
    throw error;
  }
}

/**
 * メッセージの応答時間を計算
 */
export function calculateResponseTime(
  message: UnifiedMessage
): number | null {
  if (!message.completed_at || message.reply_status !== 'Completed') {
    return null;
  }

  const receivedAt = new Date(message.received_at).getTime();
  const completedAt = new Date(message.completed_at).getTime();

  const diffMs = completedAt - receivedAt;
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours;
}

/**
 * ダッシュボードのアラート情報を更新
 * 💡 Zustand storeと連携
 */
export async function updateDashboardAlerts(): Promise<{
  urgent: number;
  paymentDue: number;
  unhandledTasks: number;
}> {
  try {
    const { totalUncompleted, emergencyAlerts } = await getUnansweredMessageCount();

    // 💡 支払期限が本日のタスクを取得
    // const supabase = createClient();
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // const tomorrow = new Date(today);
    // tomorrow.setDate(tomorrow.getDate() + 1);
    //
    // const { count: paymentDueCount, error } = await supabase
    //   .from('calendar_tasks')
    //   .select('*', { count: 'exact', head: true })
    //   .gte('due_date', today.toISOString())
    //   .lt('due_date', tomorrow.toISOString())
    //   .eq('completed', false);
    //
    // if (error) throw error;

    const paymentDueCount = 2; // モック

    return {
      urgent: emergencyAlerts,
      paymentDue: paymentDueCount,
      unhandledTasks: totalUncompleted,
    };
  } catch (error) {
    console.error('[KPI] ダッシュボードアラートの更新に失敗しました:', error);
    throw error;
  }
}

/**
 * メッセージのリマインダーを設定
 * 💡 未対応メッセージに対して、一定時間後にリマインダーを送信
 */
export async function setMessageReminder(
  messageId: string,
  reminderDate: Date
): Promise<void> {
  console.log(
    `[Reminder] メッセージ ${messageId} のリマインダーを ${reminderDate} に設定`
  );

  try {
    // 💡 リマインダー設定ロジック
    // スケジューラー（cron job）やタスクキューに登録
    // const supabase = createClient();
    // await supabase.from('message_reminders').insert({
    //   message_id: messageId,
    //   reminder_date: reminderDate.toISOString(),
    //   sent: false,
    // });

    console.log('[Reminder] リマインダーを正常に設定しました');
  } catch (error) {
    console.error('[Reminder] リマインダーの設定に失敗しました:', error);
    throw error;
  }
}

/**
 * スタッフに未対応メッセージを割り当て
 */
export async function assignMessageToStaff(
  messageId: string,
  staffId: string
): Promise<void> {
  console.log(`[Assignment] メッセージ ${messageId} をスタッフ ${staffId} に割り当て`);

  try {
    // 💡 DB更新ロジック
    // const supabase = createClient();
    // await supabase
    //   .from('unified_messages')
    //   .update({
    //     assigned_to: staffId,
    //     reply_status: 'Pending',
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('message_id', messageId);

    console.log('[Assignment] メッセージを正常に割り当てました');
  } catch (error) {
    console.error('[Assignment] メッセージの割り当てに失敗しました:', error);
    throw error;
  }
}
