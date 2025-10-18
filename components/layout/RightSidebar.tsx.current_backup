"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, X, ExternalLink, Pin } from "lucide-react"

interface Shortcut {
  id: string
  name: string
  url: string
}

const defaultShortcuts: Shortcut[] = [
  { id: "1", name: "eBay", url: "https://www.ebay.com" },
  { id: "2", name: "Amazon", url: "https://www.amazon.co.jp" },
  { id: "3", name: "ヤフオク", url: "https://auctions.yahoo.co.jp" },
  { id: "4", name: "メルカリ", url: "https://jp.mercari.com" },
  { id: "5", name: "楽天", url: "https://www.rakuten.co.jp" },
  { id: "6", name: "Gmail", url: "https://mail.google.com" },
  { id: "7", name: "Drive", url: "https://drive.google.com" },
]

export default function RightSidebar() {
  const [isVisible, setIsVisible] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(defaultShortcuts)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newUrl, setNewUrl] = useState("")
  const [newName, setNewName] = useState("")
  const sidebarRef = useRef<HTMLDivElement>(null)

  // localStorageから読み込み
  useEffect(() => {
    const saved = localStorage.getItem("nagano3_shortcuts")
    if (saved) {
      setShortcuts(JSON.parse(saved))
    }
  }, [])

  // マウス位置監視
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPinned) return
      
      const sidebar = sidebarRef.current
      if (sidebar) {
        const rect = sidebar.getBoundingClientRect()
        if (e.clientX > window.innerWidth - 80 || (e.clientX >= rect.left && e.clientX <= rect.right)) {
          setIsVisible(true)
        } else {
          setIsVisible(false)
        }
      }
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [isPinned])

  // メイン領域に右サイドバー状態を通知
  useEffect(() => {
    if (isPinned) {
      document.body.setAttribute('data-right-sidebar-state', 'pinned')
    } else if (isVisible) {
      document.body.setAttribute('data-right-sidebar-state', 'expanded')
    } else {
      document.body.setAttribute('data-right-sidebar-state', 'hidden')
    }
  }, [isPinned, isVisible])

  // 保存
  const saveShortcuts = (newShortcuts: Shortcut[]) => {
    setShortcuts(newShortcuts)
    localStorage.setItem("nagano3_shortcuts", JSON.stringify(newShortcuts))
  }

  // 追加
  const handleAdd = () => {
    if (!newUrl || !newName) return
    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      name: newName,
      url: newUrl.startsWith("http") ? newUrl : `https://${newUrl}`,
    }
    saveShortcuts([...shortcuts, newShortcut])
    setNewUrl("")
    setNewName("")
    setIsAddingNew(false)
  }

  // 削除
  const handleDelete = (id: string) => {
    saveShortcuts(shortcuts.filter(s => s.id !== id))
  }

  // ファビコン取得
  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return ""
    }
  }

  const getWidth = () => {
    if (isPinned) return "60px"
    return isVisible ? "200px" : "0px"
  }

  return (
    <div 
      ref={sidebarRef}
      style={{ 
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        width: getWidth()
      }}
      className={`fixed top-0 bottom-0 right-0 border-l shadow-xl z-[2500] 
                 transition-all duration-200 overflow-y-auto
                 ${isVisible || isPinned ? "translate-x-0" : "translate-x-full"}`}
    >
      <div style={{ marginTop: '64px' }}>
        {/* ヘッダー */}
        <div className="h-[54px] px-3 flex items-center justify-end border-b"
             style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setIsPinned(!isPinned)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isPinned ? 'var(--primary)' : 'transparent',
              color: isPinned ? 'var(--primary-foreground)' : 'inherit'
            }}
            title={isPinned ? "展開" : "固定"}
          >
            <Pin size={18} />
          </button>
        </div>

        <div className="p-3">
          {!isPinned && (
            <>
              <button
                onClick={() => setIsAddingNew(!isAddingNew)}
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                className="w-full mb-3 py-2 rounded-lg text-sm 
                         flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                <span>追加</span>
              </button>

              {isAddingNew && (
                <div className="mb-3 p-2 rounded-lg space-y-2" style={{ backgroundColor: 'var(--muted)' }}>
                  <input
                    type="text"
                    placeholder="名前"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--foreground)'
                    }}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  />
                  <input
                    type="text"
                    placeholder="URL"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    style={{ 
                      borderColor: 'var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--foreground)'
                    }}
                    className="w-full px-2 py-1.5 text-xs border rounded"
                  />
                  <button
                    onClick={handleAdd}
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
                    className="w-full py-1.5 text-xs rounded hover:opacity-90"
                  >
                    保存
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    style={{ backgroundColor: 'var(--muted)' }}
                    className="group relative flex items-center gap-2 p-2 rounded-lg transition-colors"
                  >
                    <a
                      href={shortcut.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <img 
                        src={getFavicon(shortcut.url)} 
                        alt="" 
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{shortcut.name}</div>
                      </div>
                      <ExternalLink size={12} style={{ color: 'var(--muted-foreground)' }} className="flex-shrink-0" />
                    </a>
                    <button
                      onClick={() => handleDelete(shortcut.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full
                               flex items-center justify-center opacity-0 group-hover:opacity-100 
                               transition-opacity shadow-md"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {isPinned && (
            <div className="space-y-3">
              {shortcuts.map((shortcut) => (
                <a
                  key={shortcut.id}
                  href={shortcut.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center p-2 rounded-lg transition-colors"
                  title={shortcut.name}
                >
                  <img 
                    src={getFavicon(shortcut.url)} 
                    alt={shortcut.name} 
                    className="w-6 h-6"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
