/**
 * Amazon Account Manager
 *
 * Purpose: 複数Amazonアカウントのローテーション管理とリスク最小化
 *
 * Features:
 * - アカウントプール管理
 * - 使用頻度追跡とクールダウン
 * - プロキシローテーション
 * - リスクスコア計算
 * - アカウント停止予防
 */

import { createClient } from '@/lib/supabase/server'

export interface AmazonAccount {
  id: string
  email: string
  password: string
  marketplace: 'US' | 'JP'
  proxy_url?: string
  is_active: boolean
  risk_score: number
  last_used_at?: string
  total_purchases: number
  daily_purchases: number
  weekly_purchases: number
  cooldown_until?: string
  created_at: string
}

export interface AccountSelectionCriteria {
  marketplace: 'US' | 'JP'
  minCooldownHours?: number
  maxDailyPurchases?: number
  maxWeeklyPurchases?: number
  maxRiskScore?: number
}

export interface ProxyConfig {
  url: string
  type: 'residential' | 'datacenter' | 'mobile'
  location: string
  is_active: boolean
  last_used_at?: string
}

export class AmazonAccountManager {
  /**
   * 最適なアカウントを選択
   */
  async selectOptimalAccount(criteria: AccountSelectionCriteria): Promise<AmazonAccount | null> {
    const supabase = createClient()

    const {
      marketplace,
      minCooldownHours = 2,
      maxDailyPurchases = 5,
      maxWeeklyPurchases = 20,
      maxRiskScore = 50
    } = criteria

    // クールダウン期間を過ぎたアカウントを取得
    const cooldownThreshold = new Date()
    cooldownThreshold.setHours(cooldownThreshold.getHours() - minCooldownHours)

    const { data: accounts, error } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('marketplace', marketplace)
      .eq('is_active', true)
      .lte('daily_purchases', maxDailyPurchases)
      .lte('weekly_purchases', maxWeeklyPurchases)
      .lte('risk_score', maxRiskScore)
      .or(`cooldown_until.is.null,cooldown_until.lt.${new Date().toISOString()}`)
      .order('risk_score', { ascending: true })
      .order('last_used_at', { ascending: true })

    if (error || !accounts || accounts.length === 0) {
      console.error('No available accounts:', error)
      return null
    }

    // リスクスコアが最も低く、最も長く使用されていないアカウントを選択
    const selectedAccount = accounts[0]

    console.log(`✅ Selected account: ${selectedAccount.email} (Risk: ${selectedAccount.risk_score})`)

    return selectedAccount
  }

  /**
   * アカウント使用記録を更新
   */
  async recordAccountUsage(
    accountId: string,
    purchaseSuccess: boolean,
    purchaseAmount?: number
  ): Promise<void> {
    const supabase = createClient()

    // 現在の使用状況を取得
    const { data: account } = await supabase
      .from('amazon_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (!account) {
      throw new Error('Account not found')
    }

    // 使用回数を更新
    const updates: Partial<AmazonAccount> = {
      last_used_at: new Date().toISOString(),
      total_purchases: account.total_purchases + 1,
      daily_purchases: account.daily_purchases + 1,
      weekly_purchases: account.weekly_purchases + 1
    }

    // リスクスコア計算
    let riskScore = account.risk_score

    if (purchaseSuccess) {
      // 成功した場合、リスクスコアを減少（最低0）
      riskScore = Math.max(0, riskScore - 2)
    } else {
      // 失敗した場合、リスクスコアを増加
      riskScore += 10
    }

    // 1日の購入回数が多い場合、リスクスコアを増加
    if (updates.daily_purchases! > 5) {
      riskScore += 5
    }

    // 1週間の購入回数が多い場合、リスクスコアを増加
    if (updates.weekly_purchases! > 20) {
      riskScore += 10
    }

    updates.risk_score = Math.min(100, riskScore)

    // クールダウン期間を設定（リスクスコアに応じて）
    const cooldownHours = this.calculateCooldownHours(updates.risk_score)
    const cooldownUntil = new Date()
    cooldownUntil.setHours(cooldownUntil.getHours() + cooldownHours)
    updates.cooldown_until = cooldownUntil.toISOString()

    // DBを更新
    await supabase
      .from('amazon_accounts')
      .update(updates)
      .eq('id', accountId)

    // 使用履歴を記録
    await supabase.from('amazon_account_usage_log').insert({
      account_id: accountId,
      purchase_success: purchaseSuccess,
      purchase_amount: purchaseAmount,
      risk_score_after: updates.risk_score,
      cooldown_hours: cooldownHours,
      created_at: new Date().toISOString()
    })

    console.log(`📊 Account usage updated: Risk=${updates.risk_score}, Cooldown=${cooldownHours}h`)
  }

  /**
   * クールダウン時間を計算（リスクスコアに基づく）
   */
  private calculateCooldownHours(riskScore: number): number {
    if (riskScore < 20) return 1 // 低リスク: 1時間
    if (riskScore < 40) return 2 // 中リスク: 2時間
    if (riskScore < 60) return 4 // 高リスク: 4時間
    if (riskScore < 80) return 8 // 非常に高リスク: 8時間
    return 24 // 危険レベル: 24時間
  }

  /**
   * 日次・週次カウンターをリセット
   */
  async resetPurchaseCounters(): Promise<void> {
    const supabase = createClient()

    const now = new Date()
    const lastResetDaily = new Date(now)
    lastResetDaily.setHours(0, 0, 0, 0)

    const lastResetWeekly = new Date(now)
    lastResetWeekly.setDate(lastResetWeekly.getDate() - lastResetWeekly.getDay())
    lastResetWeekly.setHours(0, 0, 0, 0)

    // 日次リセット
    await supabase
      .from('amazon_accounts')
      .update({ daily_purchases: 0 })
      .lt('last_used_at', lastResetDaily.toISOString())

    // 週次リセット
    await supabase
      .from('amazon_accounts')
      .update({ weekly_purchases: 0 })
      .lt('last_used_at', lastResetWeekly.toISOString())

    console.log('✅ Purchase counters reset')
  }

  /**
   * プロキシをローテーション
   */
  async rotateProxy(accountId: string): Promise<string | null> {
    const supabase = createClient()

    // 利用可能なプロキシを取得
    const { data: proxies } = await supabase
      .from('proxy_pool')
      .select('*')
      .eq('is_active', true)
      .order('last_used_at', { ascending: true })
      .limit(1)

    if (!proxies || proxies.length === 0) {
      console.warn('No available proxies')
      return null
    }

    const proxy = proxies[0]

    // プロキシを割り当て
    await supabase
      .from('amazon_accounts')
      .update({ proxy_url: proxy.url })
      .eq('id', accountId)

    // プロキシ使用記録を更新
    await supabase
      .from('proxy_pool')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', proxy.id)

    console.log(`🌐 Proxy rotated: ${proxy.url}`)

    return proxy.url
  }

  /**
   * アカウントヘルスチェック
   */
  async healthCheck(): Promise<{
    total: number
    active: number
    highRisk: number
    inCooldown: number
    available: number
  }> {
    const supabase = createClient()

    const { data: accounts } = await supabase
      .from('amazon_accounts')
      .select('*')

    if (!accounts) {
      return {
        total: 0,
        active: 0,
        highRisk: 0,
        inCooldown: 0,
        available: 0
      }
    }

    const now = new Date()

    const stats = {
      total: accounts.length,
      active: accounts.filter(a => a.is_active).length,
      highRisk: accounts.filter(a => a.risk_score > 60).length,
      inCooldown: accounts.filter(a => a.cooldown_until && new Date(a.cooldown_until) > now).length,
      available: 0
    }

    stats.available = accounts.filter(a =>
      a.is_active &&
      a.risk_score <= 50 &&
      (!a.cooldown_until || new Date(a.cooldown_until) <= now)
    ).length

    return stats
  }

  /**
   * アカウントを無効化（停止リスクが高い場合）
   */
  async deactivateAccount(accountId: string, reason: string): Promise<void> {
    const supabase = createClient()

    await supabase
      .from('amazon_accounts')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivation_reason: reason
      })
      .eq('id', accountId)

    console.log(`⚠️ Account deactivated: ${reason}`)
  }

  /**
   * アカウントを再アクティブ化
   */
  async reactivateAccount(accountId: string): Promise<void> {
    const supabase = createClient()

    await supabase
      .from('amazon_accounts')
      .update({
        is_active: true,
        risk_score: 0,
        daily_purchases: 0,
        weekly_purchases: 0,
        cooldown_until: null,
        deactivated_at: null,
        deactivation_reason: null
      })
      .eq('id', accountId)

    console.log(`✅ Account reactivated`)
  }
}

// シングルトンインスタンス
export const accountManager = new AmazonAccountManager()
