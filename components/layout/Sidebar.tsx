"use client"

import { useState, useEffect, useRef } from "react"
import {
  Home, Package, Warehouse, ShoppingCart, Bot, Calculator, Settings,
  Link, List, Plus, Tags, BarChart3,
  TrendingUp, Archive, Truck, AlertCircle, Zap, Target, Database,
  FileText, DollarSign, Users, Shield, Globe,
  Pin, ChevronRight, Upload, Cog, CheckCircle, Edit, Calendar
} from "lucide-react"

type SidebarState = "hidden" | "expanded" | "icon-only"

const iconMap: any = {
  home: Home, cube: Package, warehouse: Warehouse, "shopping-cart": ShoppingCart,
  robot: Bot, calculator: Calculator, settings: Settings, link: Link,
  list: List, plus: Plus, tags: Tags,
  "bar-chart": BarChart3, "trending-up": TrendingUp, archive: Archive,
  truck: Truck, "alert-circle": AlertCircle, zap: Zap, target: Target,
  database: Database, "file-text": FileText, "dollar-sign": DollarSign,
  users: Users, shield: Shield, globe: Globe, upload: Upload,
  cog: Cog, "check-circle": CheckCircle, edit: Edit, calendar: Calendar
}

const statusLabels = {
  ready: "稼働中",
  new: "新規",
  pending: "準備中"
}

const navigationItems = [
  { id: "dashboard", label: "ダッシュボード", icon: "home", link: "/" },
  {
    id: "listing-tools", label: "出品ツール", icon: "upload",
    submenu: [
      { text: "全体概要", link: "/dashboard", icon: "home", status: "ready" as const },
      { text: "データ取得", link: "/data-collection", icon: "database", status: "ready" as const },
      { text: "データ編集", link: "/tools/editing", icon: "edit", status: "ready" as const },
      { text: "フィルター管理", link: "/management/filter", icon: "shield", status: "ready" as const },
      { text: "商品承認", link: "/approval", icon: "check-circle", status: "ready" as const },
      { text: "在庫管理", link: "/inventory", icon: "warehouse", status: "ready" as const },
      { text: "在庫監視システム", link: "/inventory-monitoring", icon: "bar-chart", status: "ready" as const },
      { text: "管理ツール", link: "/management", icon: "settings", status: "ready" as const },
      { text: "出品管理", link: "/management/listing", icon: "upload", status: "ready" as const },
      { text: "出品スケジューラー", link: "/listing-management", icon: "calendar", status: "ready" as const },
      { text: "送料計算", link: "/shipping-calculator", icon: "truck", status: "ready" as const },
      { text: "配送ポリシー管理", link: "/shipping-policy-manager", icon: "settings", status: "ready" as const },
      { text: "eBay価格計算", link: "/ebay-pricing", icon: "calculator", status: "ready" as const },
      { text: "カテゴリ管理", link: "/category-management", icon: "tags", status: "ready" as const },
      { text: "出品ツール", link: "/listing-tool", icon: "shopping-cart", status: "ready" as const },
      { text: "Yahoo!オークション", link: "/yahoo-auction-dashboard", icon: "globe", status: "ready" as const },
      { text: "メルカリ", link: "/mercari", icon: "shopping-cart", status: "ready" as const },
      { text: "eBay", link: "/ebay", icon: "globe", status: "ready" as const },
      { text: "eBay API テスト", link: "/ebay-api-test", icon: "zap", status: "new" as const },
      { text: "一括出品", link: "/bulk-listing", icon: "list", status: "ready" as const },
    ],
  },
  {
    id: "products", label: "商品管理", icon: "cube",
    submenu: [
      { text: "商品一覧", link: "/shohin", icon: "list", status: "ready" as const },
      { text: "商品登録", link: "/shohin/add", icon: "plus", status: "ready" as const },
      { text: "Amazon商品登録", link: "/asin-upload", icon: "globe", status: "pending" as const },
      { text: "カテゴリ管理", link: "/shohin/category", icon: "tags", status: "pending" as const },
    ],
  },
  {
    id: "inventory", label: "在庫管理", icon: "warehouse",
    submenu: [
      { text: "在庫一覧", link: "/zaiko", icon: "bar-chart", status: "ready" as const },
      { text: "入庫管理", link: "/zaiko/nyuko", icon: "trending-up", status: "ready" as const },
      { text: "出庫管理", link: "/zaiko/shukko", icon: "archive", status: "ready" as const },
      { text: "棚卸し", link: "/zaiko/tanaoroshi", icon: "list", status: "new" as const },
      { text: "在庫調整", link: "/zaiko/chosei", icon: "settings", status: "pending" as const },
    ],
  },
  {
    id: "orders", label: "受注管理", icon: "shopping-cart",
    submenu: [
      { text: "受注一覧", link: "/juchu", icon: "list", status: "ready" as const },
      { text: "出荷管理", link: "/shukka", icon: "truck", status: "ready" as const },
      { text: "返品管理", link: "/henpin", icon: "alert-circle", status: "new" as const },
      { text: "配送追跡", link: "/haisou", icon: "truck", status: "pending" as const },
    ],
  },
  {
    id: "ai", label: "AI制御", icon: "robot",
    submenu: [
      { text: "AI分析", link: "/ai/analysis", icon: "zap", status: "new" as const },
      { text: "需要予測", link: "/ai/demand", icon: "target", status: "new" as const },
      { text: "価格最適化", link: "/ai/pricing", icon: "dollar-sign", status: "pending" as const },
      { text: "レコメンド", link: "/ai/recommend", icon: "robot", status: "pending" as const },
    ],
  },
  {
    id: "accounting", label: "記帳会計", icon: "calculator",
    submenu: [
      { text: "売上管理", link: "/uriage", icon: "dollar-sign", status: "ready" as const },
      { text: "仕入管理", link: "/shiire", icon: "file-text", status: "ready" as const },
      { text: "財務レポート", link: "/zaimu", icon: "bar-chart", status: "new" as const },
    ],
  },
  {
    id: "system", label: "システム管理", icon: "settings",
    submenu: [
      { text: "ユーザー管理", link: "/users", icon: "users", status: "ready" as const },
      { text: "権限設定", link: "/permissions", icon: "shield", status: "ready" as const },
      { text: "バックアップ", link: "/backup", icon: "database", status: "new" as const },
      { text: "ログ管理", link: "/logs", icon: "file-text", status: "pending" as const },
    ],
  },
  {
    id: "external", label: "外部連携", icon: "link",
    submenu: [
      { text: "Amazon連携", link: "/amazon", icon: "globe", status: "ready" as const },
      { text: "楽天連携", link: "/rakuten", icon: "globe", status: "ready" as const },
      { text: "Yahoo連携", link: "/yahoo", icon: "globe", status: "pending" as const },
      { text: "Yahooオークション", link: "/yahoo-auction-dashboard", icon: "shopping-cart", status: "ready" as const },
      { text: "API管理", link: "/api", icon: "database", status: "new" as const },
    ],
  },
  {
    id: "analytics", label: "分析", icon: "bar-chart",
    submenu: [
      { text: "売上分析", link: "/analytics/sales", icon: "dollar-sign", status: "ready" as const },
      { text: "在庫回転率", link: "/analytics/inventory", icon: "trending-up", status: "ready" as const },
      { text: "価格トレンド", link: "/analytics/price-trends", icon: "bar-chart", status: "pending" as const },
      { text: "顧客分析", link: "/analytics/customers", icon: "users", status: "pending" as const },
    ],
  },
  {
    id: "research", label: "リサーチ", icon: "target",
    submenu: [
      { text: "eBay リサーチ", link: "/research/ebay-research", icon: "globe", status: "ready" as const },
      { text: "市場リサーチ", link: "/research/market-research", icon: "trending-up", status: "ready" as const },
      { text: "スコアリング", link: "/research/scoring", icon: "bar-chart", status: "ready" as const },
    ],
  },
  {
    id: "settings", label: "設定", icon: "cog",
    submenu: [
      { text: "ユーザー管理", link: "/settings/users", icon: "users", status: "ready" as const },
      { text: "API設定", link: "/settings/api", icon: "database", status: "ready" as const },
      { text: "通知設定", link: "/settings/notifications", icon: "alert-circle", status: "pending" as const },
      { text: "バックアップ", link: "/settings/backup", icon: "database", status: "pending" as const },
    ],
  },
]

export default function Sidebar() {
  const [mounted, setMounted] = useState(false)
  const [sidebarState, setSidebarState] = useState<SidebarState>("expanded")
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const handleMouseMove = (e: MouseEvent) => {
      const sidebar = sidebarRef.current
      const submenu = submenuRef.current
      
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect()
        const submenuRect = submenu?.getBoundingClientRect()
        
        const inSidebar = e.clientX >= sidebarRect.left && e.clientX <= sidebarRect.right
        const inSubmenu = submenuRect && e.clientX >= submenuRect.left && e.clientX <= submenuRect.right
        
        if (e.clientX < 80 || inSidebar || inSubmenu) {
          if (sidebarState === "hidden") setSidebarState("expanded")
        } else {
          if (sidebarState === "expanded") {
            setSidebarState("hidden")
            setActiveSubmenu(null)
          }
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [sidebarState, mounted])

  useEffect(() => {
    if (mounted) {
      document.body.setAttribute('data-sidebar-state', sidebarState)
    }
  }, [sidebarState, mounted])

  const handleToggle = () => {
    if (sidebarState === "expanded") {
      setSidebarState("icon-only")
      setActiveSubmenu(null)
    } else if (sidebarState === "icon-only") {
      setSidebarState("hidden")
    } else {
      setSidebarState("expanded")
    }
  }

  const handleMenuEnter = (id: string, hasSubmenu: boolean) => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current)
    if (hasSubmenu) {
      setActiveSubmenu(id)
    }
  }

  const handleMenuLeave = (hasSubmenu: boolean) => {
    if (hasSubmenu) {
      submenuTimeoutRef.current = setTimeout(() => {
        setActiveSubmenu(null)
      }, 300)
    } else {
      setActiveSubmenu(null)
    }
  }

  const handleSubmenuEnter = () => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current)
  }

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null)
    }, 300)
  }

  const renderIcon = (name: string, size = 20) => {
    const Icon = iconMap[name] || Home
    return <Icon size={size} />
  }

  const getSidebarWidth = () => {
    if (sidebarState === "expanded") return "170px"
    if (sidebarState === "icon-only") return "60px"
    return "0px"
  }

  const getSubmenuLeft = () => {
    if (sidebarState === "expanded") return "170px"
    if (sidebarState === "icon-only") return "60px"
    return "0px"
  }

  if (!mounted) {
    return (
      <nav
        className="fixed top-0 bottom-0 transition-all duration-200 z-[2000] overflow-visible"
        style={{ 
          left: "0",
          width: "170px",
          backgroundColor: 'var(--sidebar-bg, #2c3e50)'
        }}
      >
        <div style={{ marginTop: '64px' }}>
        </div>
      </nav>
    )
  }

  return (
    <nav
      ref={sidebarRef}
      className="fixed top-0 bottom-0 transition-all duration-200 z-[2000] overflow-visible"
      style={{ 
        left: sidebarState === "hidden" ? "-170px" : "0",
        width: getSidebarWidth(),
        backgroundColor: 'var(--sidebar-bg, #2c3e50)'
      }}
    >
      <div style={{ marginTop: '64px' }}>
        {sidebarState !== "hidden" && (
          <div
            className="h-[54px] px-3 flex items-center text-white/70 hover:text-white 
                     border-b border-white/10 transition-colors cursor-pointer"
            onClick={handleToggle}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover, rgba(52, 152, 219, 0.3))'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div className="w-5 flex-shrink-0">
              <Pin size={18} />
            </div>
            {sidebarState === "expanded" && (
              <span className="ml-3 text-xs font-medium">固定</span>
            )}
          </div>
        )}

        {navigationItems.map((item, index) => (
          <div
            key={item.id}
            onMouseEnter={() => handleMenuEnter(item.id, !!item.submenu)}
            onMouseLeave={() => handleMenuLeave(!!item.submenu)}
            className="relative"
          >
            <a
              href={item.link || "#"}
              className="h-[54px] px-3 flex items-center text-white/70 hover:text-white 
                       border-b border-white/10 transition-colors cursor-pointer group"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover, rgba(52, 152, 219, 0.3))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="w-5 flex-shrink-0">
                {renderIcon(item.icon)}
              </div>
              {sidebarState === "expanded" && (
                <>
                  <span className="ml-3 text-xs font-medium truncate">{item.label}</span>
                  {item.submenu && <ChevronRight className="ml-auto" size={14} />}
                </>
              )}
            </a>

            {item.submenu && (sidebarState === "expanded" || sidebarState === "icon-only") && (
              <div
                ref={submenuRef}
                className={`fixed w-[240px] rounded-r-xl shadow-2xl 
                          overflow-y-auto z-[99999] transition-opacity duration-150
                          ${activeSubmenu === item.id ? "opacity-100 visible" : 
                            "opacity-0 invisible pointer-events-none"}`}
                style={{ 
                  top: `${64 + 54 + index * 54}px`,
                  bottom: '40px',
                  left: getSubmenuLeft(),
                  backgroundColor: 'var(--submenu-bg, #34495e)'
                }}
                onMouseEnter={handleSubmenuEnter}
                onMouseLeave={handleSubmenuLeave}
              >
                {item.submenu.map((sub, i) => (
                  <a
                    key={i}
                    href={sub.link}
                    className="flex items-center px-3 py-2.5 text-white/85 text-xs 
                             border-b border-white/10 transition-all"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.paddingLeft = '1rem'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.paddingLeft = '0.75rem'
                    }}
                  >
                    <div className="w-4 mr-2">{renderIcon(sub.icon, 14)}</div>
                    <span className="flex-1">{sub.text}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium
                               ${sub.status === "ready" ? "bg-emerald-600/80" :
                                 sub.status === "new" ? "bg-blue-600/80" : "bg-amber-600/80"}`}
                    >
                      {statusLabels[sub.status]}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  )
}
