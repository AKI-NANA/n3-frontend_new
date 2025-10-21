"use client"

import { useAuth } from "@/contexts/AuthContext"
import Header from "./Header"
import Sidebar from "./Sidebar"
import Footer from "./Footer"
import RightSidebar from "./RightSidebar"
import MainContent from "./MainContent"
import { ReactNode } from "react"

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

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

  // ログインしていない場合は、レイアウトなしで表示
  return <>{children}</>
}
