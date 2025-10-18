"use client"

import { useState, useEffect } from "react"
import {
  Home,
  Package,
  Warehouse,
  ShoppingCart,
  Brain,
  Calculator,
  Settings,
  Link,
  MoreHorizontal,
  ChevronRight,
  Menu,
  List,
  Plus,
  Tags,
  BarChart3,
  TrendingUp,
  Archive,
  Truck,
  AlertCircle,
  Zap,
  Target,
  Database,
  FileText,
  DollarSign,
  Users,
  Shield,
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  HelpCircle,
} from "lucide-react"

type SidebarState = "expanded" | "collapsed" | "hidden"

interface SubMenuItem {
  text: string
  link: string
  icon: string
  status: "ready" | "new" | "pending"
}

interface MenuItem {
  id: string
  label: string
  icon: string
  link?: string
  submenu?: SubMenuItem[]
  top?: number
}

// アイコンマッピング
const iconMap: { [key: string]: any } = {
  home: Home,
  cube: Package,
  warehouse: Warehouse,
  "shopping-cart": ShoppingCart,
  brain: Brain,
  calculator: Calculator,
  settings: Settings,
  link: Link,
  "more-horizontal": MoreHorizontal,
  list: List,
  plus: Plus,
  tags: Tags,
  "bar-chart": BarChart3,
  "trending-up": TrendingUp,
  archive: Archive,
  truck: Truck,
  "alert-circle": AlertCircle,
  zap: Zap,
  target: Target,
  database: Database,
  "file-text": FileText,
  "dollar-sign": DollarSign,
  users: Users,
  shield: Shield,
  globe: Globe,
  smartphone: Smartphone,
  mail: Mail,
  "message-square": MessageSquare,
  "help-circle": HelpCircle,
}

// ナビゲーションデータ
export const navigationItems: MenuItem[] = [
  { id: "dashboard", label: "ダッシュボード", icon: "home", link: "/dashboard" },
  {
    id: "products",
    label: "商品管理",
    icon: "cube",
    top: 135,
    submenu: [
      { text: "商品一覧", link: "/shohin", icon: "list", status: "ready" },
      { text: "商品登録", link: "/shohin/add", icon: "plus", status: "ready" },
      { text: "Amazon商品登録", link: "/asin-upload", icon: "globe", status: "pending" },
      { text: "カテゴリ管理", link: "/shohin/category", icon: "tags", status: "pending" },
    ],
  },
  {
    id: "inventory",
    label: "在庫管理",
    icon: "warehouse",
    top: 189,
    submenu: [
      { text: "在庫一覧", link: "/zaiko", icon: "bar-chart", status: "ready" },
      { text: "入庫管理", link: "/zaiko/nyuko", icon: "trending-up", status: "ready" },
      { text: "出庫管理", link: "/zaiko/shukko", icon: "archive", status: "ready" },
      { text: "棚卸し", link: "/zaiko/tanaoroshi", icon: "list", status: "new" },
      { text: "在庫調整", link: "/zaiko/chosei", icon: "settings", status: "pending" },
    ],
  },
  {
    id: "orders",
    label: "受注管理",
    icon: "shopping-cart",
    top: 243,
    submenu: [
      { text: "受注一覧", link: "/juchu", icon: "list", status: "ready" },
      { text: "出荷管理", link: "/shukka", icon: "truck", status: "ready" },
      { text: "返品管理", link: "/henpin", icon: "alert-circle", status: "new" },
      { text: "配送追跡", link: "/haisou", icon: "truck", status: "pending" },
    ],
  },
  {
    id: "ai",
    label: "AI制御",
    icon: "brain",
    top: 297,
    submenu: [
      { text: "AI分析", link: "/ai/analysis", icon: "zap", status: "new" },
      { text: "需要予測", link: "/ai/demand", icon: "target", status: "new" },
      { text: "価格最適化", link: "/ai/pricing", icon: "dollar-sign", status: "pending" },
      { text: "レコメンド", link: "/ai/recommend", icon: "brain", status: "pending" },
    ],
  },
  {
    id: "accounting",
    label: "記帳会計",
    icon: "calculator",
    top: 351,
    submenu: [
      { text: "売上管理", link: "/uriage", icon: "dollar-sign", status: "ready" },
      { text: "仕入管理", link: "/shiire", icon: "file-text", status: "ready" },
      { text: "財務レポート", link: "/zaimu", icon: "bar-chart", status: "new" },
    ],
  },
  {
    id: "system",
    label: "システム管理",
    icon: "settings",
    top: 405,
    submenu: [
      { text: "ユーザー管理", link: "/users", icon: "users", status: "ready" },
      { text: "権限設定", link: "/permissions", icon: "shield", status: "ready" },
      { text: "バックアップ", link: "/backup", icon: "database", status: "new" },
      { text: "ログ管理", link: "/logs", icon: "file-text", status: "pending" },
      { text: "システム設定", link: "/system-config", icon: "settings", status: "ready" },
    ],
  },
  {
    id: "external",
    label: "外部連携",
    icon: "link",
    top: 459,
    submenu: [
      { text: "Amazon連携", link: "/amazon", icon: "globe", status: "ready" },
      { text: "楽天連携", link: "/rakuten", icon: "globe", status: "ready" },
      { text: "Yahoo連携", link: "/yahoo", icon: "globe", status: "pending" },
      { text: "API管理", link: "/api", icon: "database", status: "new" },
      { text: "Webhook設定", link: "/webhook", icon: "zap", status: "pending" },
      { text: "モバイルアプリ", link: "/mobile", icon: "smartphone", status: "new" },
      { text: "メール連携", link: "/mail", icon: "mail", status: "ready" },
      { text: "チャット連携", link: "/chat", icon: "message-square", status: "pending" },
    ],
  },
  {
    id: "others",
    label: "その他",
    icon: "more-horizontal",
    top: 513,
    submenu: [
      { text: "ヘルプ", link: "/help", icon: "help-circle", status: "ready" },
      { text: "マニュアル", link: "/manual", icon: "file-text", status: "ready" },
      { text: "お問い合わせ", link: "/contact", icon: "mail", status: "ready" },
      { text: "バージョン情報", link: "/version", icon: "settings", status: "ready" },
    ],
  },
]

export default function Sidebar() {
  const [sidebarState, setSidebarState] = useState<SidebarState>("expanded")
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [submenuTimeout, setSubmenuTimeout] = useState<NodeJS.Timeout | null>(null)

  // localStorage から状態を復元
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_state") as SidebarState
    if (saved && ["expanded", "collapsed", "hidden"].includes(saved)) {
      setSidebarState(saved)
    }
  }, [])

  // 3段階トグル制御
  const toggleSidebar = () => {
    const states: SidebarState[] = ["expanded", "collapsed", "hidden"]
    const currentIndex = states.indexOf(sidebarState)
    const nextState = states[(currentIndex + 1) % 3]
    setSidebarState(nextState)
    localStorage.setItem("sidebar_state", nextState)
  }

  // サブメニュー表示制御
  const handleMouseEnter = (id: string) => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout)
      setSubmenuTimeout(null)
    }
    setActiveSubmenu(id)
  }

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setActiveSubmenu(null)
    }, 150) // 150ms遅延
    setSubmenuTimeout(timeout)
  }

  const handleSubmenuMouseEnter = () => {
    if (submenuTimeout) {
      clearTimeout(submenuTimeout)
      setSubmenuTimeout(null)
    }
  }

  const renderIcon = (iconName: string, size = 20) => {
    const IconComponent = iconMap[iconName] || Home
    return <IconComponent size={size} />
  }

  const getStatusBadge = (status: string) => {
    return <span className={`status-badge status-${status}`}>{status}</span>
  }

  return (
    <>
      {/* サイドバー制御タブ */}
      <button className="sidebar-control" onClick={toggleSidebar} title="サイドバー切替">
        <Menu size={20} />
      </button>

      {/* サイドバー */}
      <nav className={`sidebar ${sidebarState}`}>
        <div className="pt-4">
          {navigationItems.map((item) => (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => item.submenu && handleMouseEnter(item.id)}
              onMouseLeave={() => item.submenu && handleMouseLeave()}
            >
              <div className="menu-item">
                <div className="menu-icon">{renderIcon(item.icon)}</div>
                <span className="menu-text">{item.label}</span>
                {item.submenu && <ChevronRight className="menu-arrow" size={16} />}
              </div>

              {/* サブメニュー */}
              {item.submenu && (
                <div
                  className={`submenu ${sidebarState} ${activeSubmenu === item.id ? "show" : ""}`}
                  style={{ top: `${item.top}px` }}
                  onMouseEnter={handleSubmenuMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {item.submenu.map((subItem, index) => (
                    <a key={index} href={subItem.link} className="submenu-item">
                      <div className="submenu-icon">{renderIcon(subItem.icon, 16)}</div>
                      <span className="submenu-text">{subItem.text}</span>
                      {getStatusBadge(subItem.status)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>
    </>
  )
}
