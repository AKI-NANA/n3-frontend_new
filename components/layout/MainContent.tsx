"use client"

import { useEffect, useState } from "react"

export default function MainContent({ children }: { children: React.ReactNode }) {
  const [topPadding, setTopPadding] = useState(16)
  const [leftMargin, setLeftMargin] = useState(0)

  useEffect(() => {
    const updateLayout = () => {
      // ヘッダー表示状態の確認
      const headerVisible = document.body.getAttribute('data-header-visible') === 'true'
      
      if (headerVisible) {
        setTopPadding(80) // 64px(header) + 16px(余白)
      } else {
        setTopPadding(16)
      }

      // サイドバー幅の確認
      const sidebarState = document.body.getAttribute('data-sidebar-state') || 'expanded'
      
      switch (sidebarState) {
        case 'hidden':
          setLeftMargin(0)
          break
        case 'icon-only':
          setLeftMargin(60) // アイコンのみ表示時
          break
        case 'expanded':
          setLeftMargin(220) // 展開時
          break
        default:
          setLeftMargin(0)
      }
    }

    updateLayout()

    // サイドバー状態の変化を監視
    const observer = new MutationObserver(updateLayout)
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-header-visible', 'data-sidebar-state'] 
    })

    return () => observer.disconnect()
  }, [])

  return (
    <main 
      className="pb-14 px-6 min-h-screen transition-all duration-300"
      style={{ 
        paddingTop: `${topPadding}px`,
        marginLeft: `${leftMargin}px`
      }}
    >
      {children}
    </main>
  )
}
