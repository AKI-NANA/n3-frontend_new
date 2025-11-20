'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Package, Warehouse, ShoppingCart, Bot, Calculator, Settings,
  Link as LinkIcon, List, Plus, Tags, BarChart3,
  TrendingUp, Archive, Truck, AlertCircle, Zap, Target, Database,
  FileText, DollarSign, Users, Shield, Globe,
  Upload, Cog, CheckCircle, Edit, Calendar, GitBranch
} from 'lucide-react'

const navigationItems = [
  { id: "dashboard", label: "ダッシュボード", icon: Home, link: "/" },
  {
    id: "listing-tools", 
    label: "出品ツール", 
    icon: Upload,
    submenu: [
      { text: "データ取得", link: "/data-collection", icon: Database, status: "ready" as const },
      { text: "データ編集", link: "/tools/editing", icon: Edit, status: "ready" as const },
      { text: "在庫管理", link: "/inventory", icon: Warehouse, status: "ready" as const },
      { text: "在庫監視システム", link: "/inventory-monitoring", icon: BarChart3, status: "ready" as const },
      { text: "出品スケジューラー", link: "/listing-management", icon: Calendar, status: "ready" as const },
      { text: "送料計算", link: "/shipping-calculator", icon: Truck, status: "ready" as const },
      { text: "カテゴリ管理", link: "/category-management", icon: Tags, status: "ready" as const },
      { text: "出品ツール", link: "/listing-tool", icon: ShoppingCart, status: "ready" as const },
      { text: "Yahoo!オークション", link: "/yahoo-auction-dashboard", icon: Globe, status: "ready" as const },
      { text: "メルカリ", link: "/mercari", icon: ShoppingCart, status: "ready" as const },
      { text: "eBay", link: "/ebay", icon: Globe, status: "ready" as const },
      { text: "一括出品", link: "/bulk-listing", icon: List, status: "ready" as const },
      { text: "開発ナレッジ", link: "/tools/wisdom-core", icon: FileText, status: "new" as const },
    ],
  },
  {
    id: "products", 
    label: "商品管理", 
    icon: Package,
    submenu: [
      { text: "商品一覧", link: "/shohin", icon: List, status: "ready" as const },
      { text: "商品登録", link: "/shohin/add", icon: Plus, status: "ready" as const },
      { text: "Amazon商品登録", link: "/asin-upload", icon: Globe, status: "pending" as const },
      { text: "カテゴリ管理", link: "/shohin/category", icon: Tags, status: "pending" as const },
    ],
  },
  {
    id: "inventory", 
    label: "在庫管理", 
    icon: Warehouse,
    submenu: [
      { text: "在庫一覧", link: "/zaiko", icon: BarChart3, status: "ready" as const },
      { text: "入庫管理", link: "/zaiko/nyuko", icon: TrendingUp, status: "ready" as const },
      { text: "出庫管理", link: "/zaiko/shukko", icon: Archive, status: "ready" as const },
      { text: "棚卸し", link: "/zaiko/tanaoroshi", icon: List, status: "new" as const },
      { text: "在庫調整", link: "/zaiko/chosei", icon: Settings, status: "pending" as const },
    ],
  },
  {
    id: "orders", 
    label: "受注管理", 
    icon: ShoppingCart,
    submenu: [
      { text: "受注一覧", link: "/juchu", icon: List, status: "ready" as const },
      { text: "出荷管理", link: "/shukka", icon: Truck, status: "ready" as const },
      { text: "返品管理", link: "/henpin", icon: AlertCircle, status: "new" as const },
      { text: "配送追跡", link: "/haisou", icon: Truck, status: "pending" as const },
    ],
  },
  {
    id: "ai", 
    label: "AI制御", 
    icon: Bot,
    submenu: [
      { text: "AI分析", link: "/ai/analysis", icon: Zap, status: "new" as const },
      { text: "需要予測", link: "/ai/demand", icon: Target, status: "new" as const },
      { text: "価格最適化", link: "/ai/pricing", icon: DollarSign, status: "pending" as const },
      { text: "レコメンド", link: "/ai/recommend", icon: Bot, status: "pending" as const },
    ],
  },
  {
    id: "accounting", 
    label: "記帳会計", 
    icon: Calculator,
    submenu: [
      { text: "売上管理", link: "/uriage", icon: DollarSign, status: "ready" as const },
      { text: "仕入管理", link: "/shiire", icon: FileText, status: "ready" as const },
      { text: "財務レポート", link: "/zaimu", icon: BarChart3, status: "new" as const },
    ],
  },
  {
    id: "system",
    label: "システム管理",
    icon: Settings,
    submenu: [
      { text: "ユーザー管理", link: "/users", icon: Users, status: "ready" as const },
      { text: "権限設定", link: "/permissions", icon: Shield, status: "ready" as const },
      { text: "バックアップ", link: "/backup", icon: Database, status: "new" as const },
      { text: "ログ管理", link: "/logs", icon: FileText, status: "pending" as const },
      { text: "開発ガバナンス・ルール", link: "/tools/governance-rules", icon: Shield, status: "new" as const },
      { text: "Gitデプロイ・ガバナンス", link: "/tools/git-deploy", icon: GitBranch, status: "new" as const },
    ],
  },
  {
    id: "external", 
    label: "外部連携", 
    icon: LinkIcon,
    submenu: [
      { text: "Amazon連携", link: "/amazon", icon: Globe, status: "ready" as const },
      { text: "楽天連携", link: "/rakuten", icon: Globe, status: "ready" as const },
      { text: "Yahoo連携", link: "/yahoo", icon: Globe, status: "pending" as const },
      { text: "Yahooオークション", link: "/yahoo-auction-dashboard", icon: ShoppingCart, status: "ready" as const },
      { text: "API管理", link: "/api", icon: Database, status: "new" as const },
    ],
  },
  {
    id: "analytics", 
    label: "分析", 
    icon: BarChart3,
    submenu: [
      { text: "売上分析", link: "/analytics/sales", icon: DollarSign, status: "ready" as const },
      { text: "在庫回転率", link: "/analytics/inventory", icon: TrendingUp, status: "ready" as const },
      { text: "価格トレンド", link: "/analytics/price-trends", icon: BarChart3, status: "pending" as const },
      { text: "顧客分析", link: "/analytics/customers", icon: Users, status: "pending" as const },
    ],
  },
  {
    id: "settings", 
    label: "設定", 
    icon: Cog,
    submenu: [
      { text: "ユーザー管理", link: "/settings/users", icon: Users, status: "ready" as const },
      { text: "API設定", link: "/settings/api", icon: Database, status: "ready" as const },
      { text: "通知設定", link: "/settings/notifications", icon: AlertCircle, status: "pending" as const },
      { text: "バックアップ", link: "/settings/backup", icon: Database, status: "pending" as const },
    ],
  },
]

const statusLabels = {
  ready: "稼働中",
  new: "新規",
  pending: "準備中"
}

export function ToolsSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const pathname = usePathname()

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus)
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId)
    } else {
      newExpanded.add(menuId)
    }
    setExpandedMenus(newExpanded)
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-[220px] bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-20 flex items-center px-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">ツール</h2>
        </div>
        
        <nav className="flex-1 overflow-y-auto">
          <div className="p-2">
            {navigationItems.map((item) => (
              <div key={item.id} className="mb-1">
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <span className={`transform transition-transform ${
                        expandedMenus.has(item.id) ? 'rotate-90' : ''
                      }`}>
                        ▶
                      </span>
                    </button>
                    
                    {expandedMenus.has(item.id) && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.submenu.map((subItem, index) => (
                          <Link
                            key={index}
                            href={subItem.link}
                            className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                              pathname === subItem.link
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                          >
                            <subItem.icon className="h-4 w-4 mr-3" />
                            <span className="flex-1">{subItem.text}</span>
                            <span className={`
                              px-1.5 py-0.5 rounded text-xs font-medium
                              ${subItem.status === "ready" ? "bg-green-500/20 text-green-700 dark:text-green-300" :
                                subItem.status === "new" ? "bg-blue-500/20 text-blue-700 dark:text-blue-300" : 
                                "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"}
                            `}>
                              {statusLabels[subItem.status]}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.link}
                    className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                      pathname === item.link
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-3" />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>
      </div>
      
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-primary-foreground p-2 rounded-md"
      >
        <Package className="h-5 w-5" />
      </button>
    </>
  )
}
