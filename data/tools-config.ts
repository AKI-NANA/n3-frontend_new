export const toolsConfig = [
  {
    id: '00_workflow_engine',
    slug: 'workflow-engine',
    name: 'ワークフローエンジン',
    category: 'core',
    phpPath: '/original-php/yahoo_auction_complete/new_structure/00_workflow_engine/workflow_engine.php',
    icon: 'Cog'
  },
  {
    id: '02_scraping',
    slug: 'scraping', 
    name: 'スクレイピング',
    category: 'data',
    phpPath: '/original-php/yahoo_auction_complete/new_structure/02_scraping/scraping.php',
    icon: 'Database'
  },
  {
    id: '03_approval',
    slug: 'approval',
    name: '商品承認',
    category: 'workflow',
    phpPath: '/original-php/yahoo_auction_complete/new_structure/03_approval/approval.php',
    icon: 'CheckCircle'
  },
  {
    id: '05_rieki',
    slug: 'profit-calculator',
    name: '利益計算',
    category: 'financial',
    isReact: true,
    reactPath: '/tools/profit-calculator',
    icon: 'Calculator',
    description: '高精度な多国籍プラットフォーム利益計算・最適化システム'
  },
  {
    id: '09_shipping',
    slug: 'shipping-calculator',
    name: '送料計算',
    category: 'financial',
    isReact: true,
    reactPath: '/shipping-calculator',
    icon: 'Truck',
    description: '国際送料計算・複数配送業者対応・保険/サイン料金込み'
  }
] as const

export type ToolConfig = typeof toolsConfig[number]
