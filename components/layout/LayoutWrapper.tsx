"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import Header from "./Header"
import Sidebar from "./Sidebar"
import Footer from "./Footer"
import RightSidebar from "./RightSidebar"
import MainContent from "./MainContent"
import { ReactNode } from "react"

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // 公開ページのリスト
  const publicPaths = ['/login', '/register']
  const isPublicPath = publicPaths.includes(pathname)

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return

    // 未ログイン かつ 公開ページでない場合 → ログインページへ
    if (!user && !isPublicPath) {
      router.push('/login')
    }

    // ログイン済み かつ ログイン/登録ページの場合 → ダッシュボードへ
    if (user && isPublicPath) {
      router.push('/dashboard')
    }
  }, [user, loading, isPublicPath, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-slate-400">読み込み中...</div>
    </div>
  }

  // ログインしている場合は、ヘッダー・サイドバーを表示
  if (user) {
    return (
      <>
        <Header />
        <Sidebar />
        <RightSidebar />
        <MainContent>
          {children}
        </MainContent>
        <Footer />
      </>
    )
  }

  // 公開ページ（ログイン・登録）はレイアウトなしで表示
  if (isPublicPath) {
    return <>{children}</>
  }

  // それ以外（リダイレクト中）は何も表示しない
  return null
}
