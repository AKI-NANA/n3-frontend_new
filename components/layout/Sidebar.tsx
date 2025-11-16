"use client"

import { useState, useEffect, useRef } from "react"
import {
  Home, Package, Warehouse, ShoppingCart, Bot, Calculator, Settings,
  Link, List, Plus, Tags, BarChart3,
  TrendingUp, Archive, Truck, AlertCircle, Zap, Target, Database,
  FileText, DollarSign, Users, Shield, Globe,
  Pin, ChevronRight, Upload, Cog, CheckCircle, Edit, Calendar, Code, LogOut, GitBranch
} from "lucide-react"
import { getSortedNavigationItems } from "./SidebarConfig"

type SidebarState = "hidden" | "expanded" | "icon-only"

const iconMap: any = {
  home: Home, cube: Package, package: Package, warehouse: Warehouse, "shopping-cart": ShoppingCart,
  robot: Bot, calculator: Calculator, settings: Settings, link: Link,
  list: List, plus: Plus, tags: Tags,
  "bar-chart": BarChart3, "trending-up": TrendingUp, archive: Archive,
  truck: Truck, "alert-circle": AlertCircle, zap: Zap, target: Target,
  database: Database, "file-text": FileText, "dollar-sign": DollarSign,
  users: Users, shield: Shield, globe: Globe, upload: Upload,
  cog: Cog, "check-circle": CheckCircle, edit: Edit, calendar: Calendar,
  code: Code, logout: LogOut, "git-branch": GitBranch, tool: Cog
}

const statusLabels = {
  ready: "稼働中",
  new: "新規",
  pending: "準備中"
}

export default function Sidebar() {
  const [mounted, setMounted] = useState(false)
  const [sidebarState, setSidebarState] = useState<SidebarState>("icon-only")
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ソート済みメニューを取得
  const navigationItems = getSortedNavigationItems()

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
            className="px-3 flex items-center text-white/70 hover:text-white 
                     border-b border-white/10 transition-colors cursor-pointer"
            style={{ height: '42px' }}
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
              className="px-3 flex items-center text-white/70 hover:text-white 
                       border-b border-white/10 transition-colors cursor-pointer group"
              style={{ height: '42px' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover, rgba(52, 152, 219, 0.3))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="w-5 flex-shrink-0">
                {renderIcon(item.icon, 20)}
              </div>
              {sidebarState === "expanded" && (
                <>
                  <span className="ml-3 text-xs font-medium truncate">{item.label}</span>
                  {item.submenu && <ChevronRight className="ml-auto" size={14} />}
                </>
              )}
            </a>

            {/* サブメニュー（第二階層）- 元の高さを維持 */}
            {item.submenu && (sidebarState === "expanded" || sidebarState === "icon-only") && (
              <div
                ref={submenuRef}
                className={`fixed w-[240px] rounded-r-xl shadow-2xl 
                          overflow-y-auto z-[99999] transition-opacity duration-150
                          ${activeSubmenu === item.id ? "opacity-100 visible" : 
                            "opacity-0 invisible pointer-events-none"}`}
                style={{ 
                  top: '64px',
                  bottom: '0px',
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
