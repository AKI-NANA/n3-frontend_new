/**
 * Supabase クライアント設定
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * サーバーサイド用 Supabase クライアント
 */
export const createSupabaseServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Supabase から認証ユーザーを取得
 */
export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return null
  }
  return data.user
}

/**
 * ユーザープロフィール取得
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

/**
 * ユーザープロフィール作成または更新
 */
export async function upsertUserProfile(userId: string, profile: any) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile })
    .select()
    .single()

  if (error) {
    console.error('Error upserting user profile:', error)
    return null
  }

  return data
}
