/**
 * Payment Processor
 *
 * Purpose: クレジットカード情報の安全な管理と決済処理
 *
 * Security:
 * - 暗号化されたカード情報保存（Supabase Vault または環境変数）
 * - PCI-DSS準拠のベストプラクティス
 * - カード情報はメモリ上にのみ保持
 * - トランザクション記録と監査ログ
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface PaymentMethod {
  id: string
  account_id: string
  card_type: 'visa' | 'mastercard' | 'amex' | 'discover'
  card_last4: string
  card_exp_month: number
  card_exp_year: number
  billing_address: BillingAddress
  is_active: boolean
  daily_limit: number
  monthly_limit: number
  daily_used: number
  monthly_used: number
  last_used_at?: string
  created_at: string
}

export interface BillingAddress {
  name: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface PaymentRequest {
  accountId: string
  amount: number
  currency: 'USD' | 'JPY'
  description: string
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  amount?: number
  error?: string
  retryable?: boolean
}

export class PaymentProcessor {
  private readonly encryptionKey: string

  constructor() {
    this.encryptionKey = process.env.PAYMENT_ENCRYPTION_KEY || ''

    if (!this.encryptionKey) {
      console.warn('⚠️ PAYMENT_ENCRYPTION_KEY not set - payment functionality will be limited')
    }
  }

  /**
   * カード情報を暗号化
   */
  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    )

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
  }

  /**
   * カード情報を復号化
   */
  private decrypt(encryptedData: string): string {
    const [ivHex, encrypted, authTagHex] = encryptedData.split(':')

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.encryptionKey, 'hex'),
      Buffer.from(ivHex, 'hex')
    )

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * 最適な決済方法を選択
   */
  async selectOptimalPaymentMethod(
    accountId: string,
    amount: number
  ): Promise<PaymentMethod | null> {
    const supabase = createClient()

    // 利用可能な決済方法を取得
    const { data: methods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .gte('daily_limit', amount)
      .gte('monthly_limit', amount)
      .order('daily_used', { ascending: true })

    if (error || !methods || methods.length === 0) {
      console.error('No available payment methods:', error)
      return null
    }

    // 有効期限チェック
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const validMethods = methods.filter(m =>
      m.card_exp_year > currentYear ||
      (m.card_exp_year === currentYear && m.card_exp_month >= currentMonth)
    )

    if (validMethods.length === 0) {
      console.error('All payment methods expired')
      return null
    }

    // 最も使用されていない決済方法を選択
    const selected = validMethods[0]

    console.log(`💳 Selected payment method: **** **** **** ${selected.card_last4}`)

    return selected
  }

  /**
   * 決済実行（リトライロジック付き）
   */
  async processPayment(
    request: PaymentRequest,
    maxRetries: number = 3
  ): Promise<PaymentResult> {
    let attempt = 0
    let lastError: string = ''

    while (attempt < maxRetries) {
      attempt++

      try {
        console.log(`💳 Processing payment (attempt ${attempt}/${maxRetries})...`)

        // 決済方法を選択
        const paymentMethod = await this.selectOptimalPaymentMethod(
          request.accountId,
          request.amount
        )

        if (!paymentMethod) {
          return {
            success: false,
            error: 'No available payment methods',
            retryable: false
          }
        }

        // 決済処理（実際にはAmazonの決済はブラウザ自動化で行うため、ここは記録のみ）
        const result = await this.executePayment(paymentMethod, request)

        if (result.success) {
          // 使用記録を更新
          await this.recordPaymentUsage(paymentMethod.id, request.amount)

          // トランザクション記録
          await this.recordTransaction(paymentMethod.id, request, result)

          return result
        }

        lastError = result.error || 'Unknown error'

        // リトライ可能なエラーの場合、次の試行へ
        if (result.retryable && attempt < maxRetries) {
          console.warn(`⚠️ Payment failed (retryable): ${lastError}. Retrying...`)
          await this.delay(2000 * attempt) // 指数バックオフ
          continue
        }

        return result
      } catch (error: any) {
        lastError = error.message

        if (attempt < maxRetries) {
          console.warn(`⚠️ Payment attempt ${attempt} failed: ${lastError}. Retrying...`)
          await this.delay(2000 * attempt)
          continue
        }
      }
    }

    return {
      success: false,
      error: `Payment failed after ${maxRetries} attempts: ${lastError}`,
      retryable: false
    }
  }

  /**
   * 実際の決済実行（プレースホルダー）
   *
   * 注意：実際の決済はPuppeteerによるブラウザ自動化で行われる
   * ここでは決済方法の検証と記録のみを行う
   */
  private async executePayment(
    paymentMethod: PaymentMethod,
    request: PaymentRequest
  ): Promise<PaymentResult> {
    // 限度額チェック
    if (paymentMethod.daily_used + request.amount > paymentMethod.daily_limit) {
      return {
        success: false,
        error: 'Daily limit exceeded',
        retryable: false
      }
    }

    if (paymentMethod.monthly_used + request.amount > paymentMethod.monthly_limit) {
      return {
        success: false,
        error: 'Monthly limit exceeded',
        retryable: false
      }
    }

    // 決済成功（実際の決済はブラウザ自動化で行われる）
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    return {
      success: true,
      transactionId,
      amount: request.amount
    }
  }

  /**
   * 決済方法の使用記録を更新
   */
  private async recordPaymentUsage(paymentMethodId: string, amount: number): Promise<void> {
    const supabase = createClient()

    // 現在の使用状況を取得
    const { data: method } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', paymentMethodId)
      .single()

    if (!method) {
      throw new Error('Payment method not found')
    }

    // 使用額を更新
    await supabase
      .from('payment_methods')
      .update({
        daily_used: method.daily_used + amount,
        monthly_used: method.monthly_used + amount,
        last_used_at: new Date().toISOString()
      })
      .eq('id', paymentMethodId)

    console.log(`📊 Payment method usage updated: +$${amount}`)
  }

  /**
   * トランザクション記録
   */
  private async recordTransaction(
    paymentMethodId: string,
    request: PaymentRequest,
    result: PaymentResult
  ): Promise<void> {
    const supabase = createClient()

    await supabase.from('payment_transactions').insert({
      payment_method_id: paymentMethodId,
      account_id: request.accountId,
      transaction_id: result.transactionId,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      status: result.success ? 'completed' : 'failed',
      error_message: result.error,
      created_at: new Date().toISOString()
    })
  }

  /**
   * 日次・月次カウンターをリセット
   */
  async resetUsageCounters(): Promise<void> {
    const supabase = createClient()

    const now = new Date()

    // 日次リセット
    const lastResetDaily = new Date(now)
    lastResetDaily.setHours(0, 0, 0, 0)

    await supabase
      .from('payment_methods')
      .update({ daily_used: 0 })
      .lt('last_used_at', lastResetDaily.toISOString())

    // 月次リセット
    const lastResetMonthly = new Date(now.getFullYear(), now.getMonth(), 1)

    await supabase
      .from('payment_methods')
      .update({ monthly_used: 0 })
      .lt('last_used_at', lastResetMonthly.toISOString())

    console.log('✅ Payment usage counters reset')
  }

  /**
   * 不正検知チェック
   */
  async detectFraud(request: PaymentRequest): Promise<{
    isFraudulent: boolean
    riskScore: number
    reasons: string[]
  }> {
    const supabase = createClient()

    let riskScore = 0
    const reasons: string[] = []

    // 短時間内の複数取引チェック
    const fiveMinutesAgo = new Date()
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5)

    const { data: recentTransactions } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('account_id', request.accountId)
      .gte('created_at', fiveMinutesAgo.toISOString())

    if (recentTransactions && recentTransactions.length > 3) {
      riskScore += 30
      reasons.push('Multiple transactions in short time')
    }

    // 高額取引チェック
    if (request.amount > 500) {
      riskScore += 20
      reasons.push('High transaction amount')
    }

    // 異常な時間帯チェック（深夜2-5時）
    const hour = new Date().getHours()
    if (hour >= 2 && hour < 5) {
      riskScore += 15
      reasons.push('Unusual transaction time')
    }

    return {
      isFraudulent: riskScore >= 50,
      riskScore,
      reasons
    }
  }

  /**
   * 遅延ユーティリティ
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// シングルトンインスタンス
export const paymentProcessor = new PaymentProcessor()
