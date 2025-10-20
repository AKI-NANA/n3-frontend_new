'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/auth/supabase'
import { LogIn, AlertCircle, Loader } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Supabase でログイン
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message || 'ログインに失敗しました')
        setIsLoading(false)
        return
      }

      if (!data.user) {
        setError('ログインに失敗しました')
        setIsLoading(false)
        return
      }

      // ログイン成功 → ダッシュボードにリダイレクト
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <LogIn className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NAGANO-3</h1>
          <p className="text-slate-400">統合 eコマース管理システム</p>
        </div>

        {/* ログインフォーム */}
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* メール入力 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg 
                           text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                           focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
                required
              />
            </div>

            {/* パスワード入力 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg 
                           text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                           focus:ring-1 focus:ring-blue-500 transition disabled:opacity-50"
                required
              />
            </div>

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 
                         text-white font-medium py-3 px-4 rounded-lg transition
                         flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  ログイン中...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  ログイン
                </>
              )}
            </button>

            {/* フッター情報 */}
            <p className="text-center text-slate-500 text-sm">
              テストアカウント: demo@example.com / password123
            </p>
          </form>
        </div>

        {/* セキュリティ情報 */}
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-slate-400 text-xs">
            このサイトは暗号化されています。
            <br />
            ログイン情報は安全に保護されます。
          </p>
        </div>
      </div>
    </div>
  )
}
