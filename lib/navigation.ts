/**
 * NAGANO-3 ナビゲーション設定
 * 29モジュールの完全定義
 */

export interface SubMenuItem {
  text: string
  link: string
  icon: string
  status: 'ready' | 'new' | 'pending'
  target?: '_blank'
}

export interface MenuItem {
  id: string
  label: string
  icon: string
  link?: string
  submenu?: SubMenuItem[]
  top?: number
}

export const navigationItems: MenuItem[] = [
  { 
    id: 'dashboard', 
    label: 'ダッシュボード', 
    icon: 'home', 
    link: '/dashboard' 
  },
  {
    id: 'products',
    label: '商品管理',
    icon: 'cube',
    top: 135,
    submenu: [
      { text: '商品一覧', link: '/shohin', icon: 'list', status: 'ready' },
      { text: '商品登録', link: '/shohin/add', icon: 'plus', status: 'ready' },
      { text: 'Amazon商品登録', link: '/asin-upload', icon: 'amazon', status: 'pending' },
      { text: 'カテゴリ管理', link: '/shohin/category', icon: 'tags', status: 'pending' }
    ]
  },
  {
    id: 'inventory',
    label: '在庫管理',
    icon: 'warehouse',
    top: 189,
    submenu: [
      { text: '在庫一覧', link: '/zaiko', icon: 'boxes', status: 'ready' },
      { text: 'N3 Advanced Inventory', link: '/inventory', icon: 'database', status: 'new' },
      { text: 'マルチモール在庫', link: '/multi-mall-inventory', icon: 'store', status: 'new' },
      { text: '棚卸システム', link: '/tanaoroshi', icon: 'clipboard-check', status: 'ready' },
      { text: 'PostgreSQL統合棚卸し', link: '/tanaoroshi-inline', icon: 'database', status: 'new' }
    ]
  },
  {
    id: 'orders',
    label: '受注管理',
    icon: 'shopping-cart',
    top: 243,
    submenu: [
      { text: '受注一覧', link: '/juchu', icon: 'list-alt', status: 'ready' },
      { text: 'eBay在庫管理', link: '/ebay-inventory', icon: 'ebay', status: 'ready' },
      { text: 'eBay管理システム', link: '/ebay-kanri', icon: 'shopping-cart', status: 'new' },
      { text: 'eBayデータビューア', link: '/ebay-test-viewer', icon: 'database', status: 'new' }
    ]
  },
  {
    id: 'ai',
    label: 'AI制御システム',
    icon: 'robot',
    top: 297,
    submenu: [
      { text: '商品承認システム', link: '/approval-system', icon: 'check-circle', status: 'new' },
      { text: 'eBay AI統合システム', link: '/ebay-ai-system', icon: 'brain', status: 'ready' },
      { text: 'AI ダッシュボード', link: '/ai-control-deck', icon: 'tachometer-alt', status: 'pending' },
      { text: '予測分析', link: '/ai-predictor', icon: 'crystal-ball', status: 'pending' }
    ]
  },
  {
    id: 'accounting',
    label: '記帳・会計',
    icon: 'calculator',
    top: 351,
    submenu: [
      { text: '記帳メイン', link: '/kicho', icon: 'book', status: 'ready' },
      { text: 'eBay売上記帳', link: '/ebay-kicho', icon: 'ebay', status: 'pending' },
      { text: '会計管理', link: '/kaikei', icon: 'chart-pie', status: 'pending' }
    ]
  },
  {
    id: 'system',
    label: 'システム管理',
    icon: 'cogs',
    top: 405,
    submenu: [
      { text: 'APIキー管理', link: '/apikey', icon: 'key', status: 'ready' },
      { text: 'Universal Data Hub', link: '/universal-data-hub', icon: 'database', status: 'new' },
      { text: 'eBayデータ管理', link: '/ebay-database-manager', icon: 'database', status: 'new' },
      { text: '統合デバッグ', link: '/debug', icon: 'search', status: 'ready' },
      { text: 'システムテスト', link: '/test-tool', icon: 'vial', status: 'ready' }
    ]
  },
  {
    id: 'external',
    label: '外部連携',
    icon: 'external-link-alt',
    top: 459,
    submenu: [
      { text: 'Yahoo Auction Tool', link: '/yahoo-auction', icon: 'gavel', status: 'new' },
      { text: 'メインツール', link: '/yahoo-auction-main', icon: 'rocket', status: 'new' },
      { text: 'ダッシュボード', link: '/yahoo-dashboard', icon: 'chart-line', status: 'new' },
      { text: '商品承認', link: '/yahoo-approval', icon: 'check-circle', status: 'new' },
      { text: '出品管理', link: '/yahoo-listing', icon: 'store', status: 'new' },
      { text: 'APIテスト', link: '/api-test', icon: 'plug', status: 'pending' },
      { text: 'データインポート', link: '/data-import', icon: 'download', status: 'pending' },
      { text: 'バッチ処理', link: '/batch-process', icon: 'tasks', status: 'pending' }
    ]
  },
  {
    id: 'others',
    label: 'その他',
    icon: 'tools',
    top: 513,
    submenu: [
      { text: '統合Webツール', link: '/complete-web-tool', icon: 'tools', status: 'ready' },
      { text: 'maru9商品データ修正', link: '/maru9-tool', icon: 'shopping-cart', status: 'ready' },
      { text: 'Ollama AI管理', link: '/ollama-manager', icon: 'robot', status: 'new' },
      { text: '自動振り分けシステム', link: '/auto-sort-system', icon: 'sort', status: 'new' }
    ]
  }
]

// 全モジュールをフラットリストで取得
export function getAllModules(): Array<{ name: string; path: string; status: string }> {
  const modules: Array<{ name: string; path: string; status: string }> = []
  
  navigationItems.forEach(item => {
    if (item.submenu) {
      item.submenu.forEach(sub => {
        modules.push({
          name: sub.text,
          path: sub.link,
          status: sub.status
        })
      })
    } else if (item.link) {
      modules.push({
        name: item.label,
        path: item.link,
        status: 'ready'
      })
    }
  })
  
  return modules
}

// 総モジュール数を取得
export function getTotalModuleCount(): number {
  return getAllModules().length
}
