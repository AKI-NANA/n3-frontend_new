import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// グローバル変数でAPI呼び出し時刻を記録
let lastApiCallTime = 0
const MIN_INTERVAL_MS = 2000 // 最小2秒間隔

interface ApiCallStatus {
  callCount: number
  dailyLimit: number
  remaining: number
  percentage: number
  canCall: boolean
  hourlyCount?: number
  hourlyLimit?: number
}

/**
 * API呼び出し可能かチェック（レート制限考慮）
 */
export async function canMakeApiCallSafely(apiName: string): Promise<{
  canCall: boolean
  reason?: string
  waitTime?: number
}> {
  // 1日の制限チェック
  const dailyStatus = await getApiCallStatus(apiName)
  if (!dailyStatus.canCall) {
    return {
      canCall: false,
      reason: '1日の上限（5000回）に達しました'
    }
  }

  // 1時間の制限チェック
  const hourlyCount = await getHourlyCallCount(apiName)
  if (hourlyCount >= 500) {
    return {
      canCall: false,
      reason: '1時間の上限（500回）に達しました',
      waitTime: 3600000 // 1時間
    }
  }

  // 最小間隔チェック
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCallTime
  if (timeSinceLastCall < MIN_INTERVAL_MS) {
    return {
      canCall: false,
      reason: 'リクエスト間隔が短すぎます',
      waitTime: MIN_INTERVAL_MS - timeSinceLastCall
    }
  }

  return { canCall: true }
}

/**
 * API呼び出し前に待機（必要な場合）
 */
export async function waitBeforeApiCall(): Promise<void> {
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCallTime
  
  if (timeSinceLastCall < MIN_INTERVAL_MS) {
    const waitTime = MIN_INTERVAL_MS - timeSinceLastCall
    console.log(`⏳ API呼び出し間隔調整: ${waitTime}ms 待機中...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
  
  lastApiCallTime = Date.now()
}

/**
 * 1時間以内のAPI呼び出し回数を取得
 */
async function getHourlyCallCount(apiName: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
  
  try {
    const { data, error } = await supabase
      .from('api_call_tracker')
      .select('call_count, updated_at')
      .eq('api_name', apiName)
      .gte('updated_at', oneHourAgo)
      
    if (error) throw error
    
    // 1時間以内の合計呼び出し回数
    const totalCalls = data?.reduce((sum, record) => sum + record.call_count, 0) || 0
    
    console.log(`📊 1時間以内のAPI呼び出し: ${totalCalls}/500回`)
    return totalCalls
  } catch (error) {
    console.error('1時間カウント取得エラー:', error)
    return 0
  }
}

/**
 * API呼び出し回数を記録（既存機能）
 */
export async function incrementApiCallCount(apiName: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const { data: existing } = await supabase
      .from('api_call_tracker')
      .select('*')
      .eq('api_name', apiName)
      .eq('call_date', today)
      .single()

    if (existing) {
      await supabase
        .from('api_call_tracker')
        .update({
          call_count: existing.call_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('api_call_tracker')
        .insert({
          api_name: apiName,
          call_date: today,
          call_count: 1,
          daily_limit: 5000
        })
    }

    console.log(`📊 API呼び出しカウント更新: ${apiName}`)
  } catch (error) {
    console.error('❌ API呼び出しカウント更新エラー:', error)
  }
}

/**
 * 現在のAPI呼び出し状況を取得（既存機能）
 */
export async function getApiCallStatus(apiName: string): Promise<ApiCallStatus> {
  const today = new Date().toISOString().split('T')[0]
  
  try {
    const { data } = await supabase
      .from('api_call_tracker')
      .select('*')
      .eq('api_name', apiName)
      .eq('call_date', today)
      .single()

    if (data) {
      const remaining = data.daily_limit - data.call_count
      const percentage = (data.call_count / data.daily_limit) * 100
      
      // 1時間のカウントも取得
      const hourlyCount = await getHourlyCallCount(apiName)
      
      return {
        callCount: data.call_count,
        dailyLimit: data.daily_limit,
        remaining: Math.max(0, remaining),
        percentage: Math.min(100, percentage),
        canCall: remaining > 0,
        hourlyCount,
        hourlyLimit: 500
      }
    }

    return {
      callCount: 0,
      dailyLimit: 5000,
      remaining: 5000,
      percentage: 0,
      canCall: true,
      hourlyCount: 0,
      hourlyLimit: 500
    }
  } catch (error) {
    console.error('❌ API呼び出し状況取得エラー:', error)
    return {
      callCount: 0,
      dailyLimit: 5000,
      remaining: 5000,
      percentage: 0,
      canCall: true,
      hourlyCount: 0,
      hourlyLimit: 500
    }
  }
}

/**
 * 警告レベルを判定
 */
export function getWarningLevel(percentage: number): 'safe' | 'warning' | 'danger' | 'critical' {
  if (percentage < 50) return 'safe'
  if (percentage < 80) return 'warning'
  if (percentage < 95) return 'danger'
  return 'critical'
}
