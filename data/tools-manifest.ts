/**
 * ツール定義マニフェスト
 * サイドバーのナビゲーションとアイコンを定義
 * 外注管理画面で「どのツールを割り当てるか」の基盤
 */

export interface ToolDefinition {
  id: string
  label: string
  icon: string
  category: string
  description?: string
  defaultEnabledForNewOutsourcers?: boolean
}

export const toolsManifest: ToolDefinition[] = [
  // 出品ツール
  {
    id: 'data-collection',
    label: 'データ取得',
    icon: 'database',
    category: 'listing-tools',
    description: 'Yahoo!オークションからデータを取得',
    defaultEnabledForNewOutsourcers: true,
  },
  {
    id: 'tools-editing',
    label: 'データ編集',
    icon: 'edit',
    category: 'listing-tools',
    description: '商品情報を編集',
    defaultEnabledForNewOutsourcers: true,
  },
  {
    id: 'html-editor',
    label: 'HTMLエディタ',
    icon: 'code',
    category: 'listing-tools',
    description: 'HTML コードを直接編集',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'filter-management',
    label: 'フィルター管理',
    icon: 'shield',
    category: 'listing-tools',
    description: '輸出禁止品フィルター管理',
    defaultEnabledForNewOutsourcers: true,
  },
  {
    id: 'approval',
    label: '商品承認',
    icon: 'check-circle',
    category: 'listing-tools',
    description: '商品の最終承認',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'inventory',
    label: '在庫管理',
    icon: 'warehouse',
    category: 'listing-tools',
    description: '在庫情報を管理',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'inventory-monitoring',
    label: '在庫監視',
    icon: 'bar-chart',
    category: 'listing-tools',
    description: '在庫の状態を監視',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'management',
    label: '管理ツール',
    icon: 'settings',
    category: 'listing-tools',
    description: '各種管理機能',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'listing-management',
    label: '出品スケジューラー',
    icon: 'calendar',
    category: 'listing-tools',
    description: '出品予定を管理',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'shipping-calculator',
    label: '送料計算',
    icon: 'truck',
    category: 'listing-tools',
    description: '送料を自動計算',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'ebay-pricing',
    label: 'eBay価格計算',
    icon: 'calculator',
    category: 'listing-tools',
    description: 'eBay 出品価格を計算',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'category-management',
    label: 'カテゴリ管理',
    icon: 'tags',
    category: 'listing-tools',
    description: 'カテゴリ情報を管理',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'listing-tool',
    label: '出品ツール',
    icon: 'shopping-cart',
    category: 'listing-tools',
    description: 'eBay 出品ツール',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'yahoo-auction-dashboard',
    label: 'Yahoo!オークション',
    icon: 'globe',
    category: 'listing-tools',
    description: 'Yahoo!オークション連携',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'mercari',
    label: 'メルカリ',
    icon: 'shopping-cart',
    category: 'listing-tools',
    description: 'メルカリ連携',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'ebay',
    label: 'eBay',
    icon: 'globe',
    category: 'listing-tools',
    description: 'eBay連携',
    defaultEnabledForNewOutsourcers: false,
  },
  {
    id: 'bulk-listing',
    label: '一括出品',
    icon: 'list',
    category: 'listing-tools',
    description: '複数商品を一括出品',
    defaultEnabledForNewOutsourcers: false,
  },
  
  // 商品管理
  {
    id: 'products-list',
    label: '商品一覧',
    icon: 'list',
    category: 'products',
    description: '登録済み商品を表示',
    defaultEnabledForNewOutsourcers: false,
  },
  
  // 在庫管理
  {
    id: 'zaiko',
    label: '在庫管理',
    icon: 'bar-chart',
    category: 'inventory',
    description: '在庫情報管理',
    defaultEnabledForNewOutsourcers: false,
  },
  
  // 受注管理
  {
    id: 'juchu',
    label: '受注管理',
    icon: 'list',
    category: 'orders',
    description: '受注情報を管理',
    defaultEnabledForNewOutsourcers: false,
  },
  
  // AI 制御
  {
    id: 'ai-analysis',
    label: 'AI分析',
    icon: 'zap',
    category: 'ai',
    description: 'AI による分析',
    defaultEnabledForNewOutsourcers: false,
  },
  
  // 記帳会計
  {
    id: 'uriage',
    label: '売上管理',
    icon: 'dollar-sign',
    category: 'accounting',
    description: '売上情報を管理',
    defaultEnabledForNewOutsourcers: false,
  },
  
  // 分析
  {
    id: 'analytics-sales',
    label: '売上分析',
    icon: 'dollar-sign',
    category: 'analytics',
    description: '売上データを分析',
    defaultEnabledForNewOutsourcers: false,
  },
]

/**
 * ツール ID からツール定義を取得
 */
export function getToolDefinition(toolId: string): ToolDefinition | undefined {
  return toolsManifest.find(tool => tool.id === toolId)
}

/**
 * カテゴリからツール一覧を取得
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  return toolsManifest.filter(tool => tool.category === category)
}

/**
 * 新規外注スタッフのデフォルト割り当てツール
 */
export function getDefaultToolsForNewOutsourcer(): string[] {
  return toolsManifest
    .filter(tool => tool.defaultEnabledForNewOutsourcers)
    .map(tool => tool.id)
}
