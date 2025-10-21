'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Loader } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'user' | 'outsourcer')[]
}

/**
 * 認証が必要なページをラップするコンポーネント
 * 
 * 使い方:
 * ```tsx
 * <ProtectedRoute allowedRoles={['admin']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
export default function ProtectedRoute({ 
  children, 
  allowedRoles 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      // 未ログインの場合はログイン画面へリダイレクト
      // 元のURLをクエリパラメータとして保持（ログイン後に戻れるように）
      const returnUrl = encodeURIComponent(pathname)
      router.push(`/login?returnUrl=${returnUrl}`)
    } else if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // ロールが許可されていない場合はダッシュボードへリダイレクト
      router.push('/')
    }
  }, [user, loading, router, pathname, allowedRoles])

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <p className="text-slate-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未ログイン
  if (!user) {
    return null
  }

  // ロールチェック
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null
  }

  // 認証OK
  return <>{children}</>
}
