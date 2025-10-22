// メール通知機能

import type { MonitoringLog } from './types'

export interface EmailNotificationOptions {
  to: string[]
  subject: string
  html: string
  text?: string
}

/**
 * メール送信（プレースホルダー実装）
 * 本番環境では Resend / SendGrid などに置き換える
 */
async function sendEmail(options: EmailNotificationOptions): Promise<boolean> {
  // TODO: 実際のメール送信APIに置き換える
  // 例: Resend
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'noreply@example.com',
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html
  // })

  console.log('📧 メール送信（シミュレーション）')
  console.log(`To: ${options.to.join(', ')}`)
  console.log(`Subject: ${options.subject}`)
  console.log('---')
  console.log(options.text || options.html)
  console.log('---')

  return true
}

/**
 * 監視完了通知を送信
 */
export async function sendMonitoringCompletedNotification(
  log: MonitoringLog,
  recipients: string[]
): Promise<boolean> {
  if (!recipients || recipients.length === 0) {
    console.log('通知先メールアドレスが設定されていません')
    return false
  }

  const subject = `[在庫監視] 実行完了 - ${log.changes_detected}件の変動を検知`

  const html = `
<h2>在庫監視が完了しました</h2>

<h3>実行結果</h3>
<table border="1" cellpadding="10" cellspacing="0">
  <tr><td><strong>実行タイプ</strong></td><td>${log.execution_type === 'scheduled' ? '自動実行' : '手動実行'}</td></tr>
  <tr><td><strong>ステータス</strong></td><td>${log.status === 'completed' ? '✅ 完了' : '❌ エラー'}</td></tr>
  <tr><td><strong>処理件数</strong></td><td>${log.processed_count} / ${log.target_count}件</td></tr>
  <tr><td><strong>成功</strong></td><td>${log.success_count}件</td></tr>
  <tr><td><strong>エラー</strong></td><td>${log.error_count}件</td></tr>
  <tr><td><strong>所要時間</strong></td><td>${log.duration_seconds}秒</td></tr>
</table>

<h3>変動検知</h3>
<table border="1" cellpadding="10" cellspacing="0">
  <tr><td><strong>変動総数</strong></td><td>${log.changes_detected}件</td></tr>
  <tr><td><strong>価格変動</strong></td><td>${log.price_changes}件</td></tr>
  <tr><td><strong>在庫変動</strong></td><td>${log.stock_changes}件</td></tr>
  <tr><td><strong>ページエラー</strong></td><td>${log.page_errors}件</td></tr>
</table>

${
  log.changes_detected > 0
    ? `
<p><strong>⚠️ 変動が検知されました。在庫監視ダッシュボードで詳細を確認してください。</strong></p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inventory-monitoring">在庫監視ダッシュボードを開く</a></p>
`
    : `
<p>変動は検知されませんでした。</p>
`
}

<hr>
<p><small>実行日時: ${new Date(log.created_at).toLocaleString('ja-JP')}</small></p>
  `

  const text = `
在庫監視が完了しました

実行結果:
- 実行タイプ: ${log.execution_type === 'scheduled' ? '自動実行' : '手動実行'}
- ステータス: ${log.status}
- 処理件数: ${log.processed_count} / ${log.target_count}件
- 成功: ${log.success_count}件
- エラー: ${log.error_count}件
- 所要時間: ${log.duration_seconds}秒

変動検知:
- 変動総数: ${log.changes_detected}件
- 価格変動: ${log.price_changes}件
- 在庫変動: ${log.stock_changes}件
- ページエラー: ${log.page_errors}件

${log.changes_detected > 0 ? '⚠️ 変動が検知されました。在庫監視ダッシュボードで詳細を確認してください。' : '変動は検知されませんでした。'}

実行日時: ${new Date(log.created_at).toLocaleString('ja-JP')}
  `

  try {
    await sendEmail({
      to: recipients,
      subject,
      html,
      text,
    })
    return true
  } catch (error) {
    console.error('メール送信エラー:', error)
    return false
  }
}

/**
 * エラー通知を送信
 */
export async function sendMonitoringErrorNotification(
  log: MonitoringLog,
  recipients: string[]
): Promise<boolean> {
  if (!recipients || recipients.length === 0) {
    return false
  }

  const subject = `[在庫監視] エラー発生`

  const html = `
<h2>在庫監視でエラーが発生しました</h2>

<p><strong>エラー内容:</strong></p>
<pre>${log.error_message || 'Unknown error'}</pre>

<h3>実行情報</h3>
<table border="1" cellpadding="10" cellspacing="0">
  <tr><td><strong>実行タイプ</strong></td><td>${log.execution_type}</td></tr>
  <tr><td><strong>対象件数</strong></td><td>${log.target_count}件</td></tr>
  <tr><td><strong>処理済み</strong></td><td>${log.processed_count}件</td></tr>
</table>

<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inventory-monitoring">在庫監視ダッシュボードを開く</a></p>

<hr>
<p><small>発生日時: ${new Date(log.created_at).toLocaleString('ja-JP')}</small></p>
  `

  const text = `
在庫監視でエラーが発生しました

エラー内容:
${log.error_message || 'Unknown error'}

実行情報:
- 実行タイプ: ${log.execution_type}
- 対象件数: ${log.target_count}件
- 処理済み: ${log.processed_count}件

発生日時: ${new Date(log.created_at).toLocaleString('ja-JP')}
  `

  try {
    await sendEmail({
      to: recipients,
      subject,
      html,
      text,
    })
    return true
  } catch (error) {
    console.error('メール送信エラー:', error)
    return false
  }
}
