'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Package, 
  Filter,
  Upload,
  Calculator,
  FolderTree,
  Database,
  ChevronDown,
  ChevronRight,
  Home,
  BarChart3,
  Settings,
  FileText,
  Globe,
  ShoppingCart,
  Truck,
  Tag,
  Shield,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidebarItem {
  id: string
  label: string
  href?: string
  icon: React.ElementType
  description?: string
  children?: SidebarItem[]
  badge?: string
  status?: 'active' | 'beta' | 'development'
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'ダッシュボード',
    href: '/dashboard',
    icon: Home,
    description: '全体概要'
  },
  {
    id: 'data-collection',
    label: 'データ取得',
    href: '/data-collection',
    icon: Database,
    description: '60+ プラットフォーム対応',
    status: 'active'
  },
  {
    id: 'management',
    label: '管理ツール',
    icon: Package,
    description: '出品・在庫管理',
    children: [
      {
        id: 'filters',
        label: 'フィルター管理',
        href: '/management/filters',
        icon: Filter,
        description: '5段階フィルタリング',
        status: 'active'
      },
      {
        id: 'listing',
        label: '出品管理',
        href: '/management/listing',
        icon: Upload,
        description: 'eBay/多販路出品',
        status: 'active'
      },
      {
        id: 'shipping',
        label: '送料計算',
        href: '/management/shipping',
        icon: Truck,
        description: '多層料金マトリックス',
        status: 'beta'
      },
      {
        id: 'category',
        label: 'カテゴリ管理',
        href: '/management/category',
        icon: FolderTree,
        description: 'AI自動判定',
        status: 'beta'
      }
    ]
  },
  {
    id: 'listing-tools',
    label: '出品ツール',
    icon: ShoppingCart,
    description: '各プラットフォーム出品',
    children: [
      {
        id: 'yahoo',
        label: 'Yahoo!オークション',
        href: '/listing/yahoo',
        icon: Globe,
        description: 'ヤフオク出品'
      },
      {
        id: 'mercari',
        label: 'メルカリ',
        href: '/listing/mercari',
        icon: ShoppingCart,
        description: 'メルカリ出品'
      },
      {
        id: 'ebay',
        label: 'eBay',
        href: '/listing/ebay',
        icon: Globe,
        description: 'eBay出品'
      },
      {
        id: 'bulk',
        label: '一括出品',
        href: '/listing/bulk',
        icon: List,
        description: '複数プラットフォーム'
      }
    ]
  },
  {
    id: 'analytics',
    label: '分析',
    href: '/analytics',
    icon: BarChart3,
    description: '売上・利益分析'
  },
  {
    id: 'settings',
    label: '設定',
    href: '/settings',
    icon: Settings,
    description: 'システム設定'
  }
]

export function ManagementSidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['management', 'listing-tools']))

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const isActive = (href?: string) => {
    if (!href) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const expanded = expandedItems.has(item.id)
    const active = isActive(item.href)
    const Icon = item.icon

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              level > 0 && 'ml-4'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                  {item.badge}
                </span>
              )}
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {expanded && (
            <div className="mt-1">
              {item.children.map(child => renderSidebarItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.id}
        href={item.href || '#'}
        className={cn(
          'flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          active && 'bg-accent text-accent-foreground font-medium',
          level > 0 && 'ml-6'
        )}
      >
        <Icon className="h-4 w-4" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span>{item.label}</span>
            {item.status === 'beta' && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-600 rounded">
                Beta
              </span>
            )}
            {item.status === 'development' && (
              <span className="px-1.5 py-0.5 text-xs bg-red-500/10 text-red-600 rounded">
                開発中
              </span>
            )}
          </div>
          {item.description && level === 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div className={cn('w-64 border-r bg-card h-full overflow-y-auto', className)}>
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-bold">NAGANO-3</h2>
          <p className="text-xs text-muted-foreground">統合管理システム</p>
        </div>

        <nav className="space-y-1">
          {sidebarItems.map(item => renderSidebarItem(item))}
        </nav>

        {/* フッター情報 */}
        <div className="mt-8 pt-4 border-t">
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">
              v2.0.0 - Production
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              © 2024 NAGANO-3
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
