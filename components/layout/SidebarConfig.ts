// ==============================================
// サイドバー自動管理システム（完全日本語版）
// ==============================================
// ファイル: components/layout/SidebarConfig.ts

export type MenuStatus = "ready" | "new" | "pending"

export interface SubMenuItem {
  text: string
  link: string
  icon: string
  status: MenuStatus
  priority?: number // 🔧 この数字で順番変更（小さいほど上）
  database?: string // 接続DB
}

export interface NavigationItem {
  id: string
  label: string
  icon: string
  link?: string
  priority?: number // 🔧 この数字で順番変更（小さいほど上）
  submenu?: SubMenuItem[]
}

// ==============================================
// 📊 統合されたメニュー構成（完全日本語版）
// ==============================================

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "ダッシュボード",
    icon: "home",
    link: "/",
    priority: 1
  },
  
  // ==============================================
  // ✅ products_master 対応ツール（17個）
  // ==============================================
  {
    id: "integrated-tools",
    label: "統合ツール",
    icon: "database",
    priority: 2,
    submenu: [
      { 
        text: "01_ダッシュボード", 
        link: "/dashboard", 
        icon: "home", 
        status: "ready",
        priority: 1,
        database: "products_master"
      },
      { 
        text: "02_データ取得", 
        link: "/data-collection", 
        icon: "database", 
        status: "ready",
        priority: 2,
        database: "products_master"
      },
      { 
        text: "03_商品承認", 
        link: "/approval", 
        icon: "check-circle", 
        status: "ready",
        priority: 3,
        database: "products_master"
      },
      { 
        text: "04_データ分析", 
        link: "/analytics/sales", 
        icon: "bar-chart", 
        status: "ready",
        priority: 4,
        database: "products_master"
      },
      { 
        text: "05_利益計算", 
        link: "/ebay-pricing", 
        icon: "dollar-sign", 
        status: "ready",
        priority: 5,
        database: "products_master"
      },
      { 
        text: "06_フィルター管理", 
        link: "/management/filter", 
        icon: "shield", 
        status: "ready",
        priority: 6,
        database: "products_master"
      },
      { 
        text: "07_データ編集", 
        link: "/tools/editing", 
        icon: "edit", 
        status: "ready",
        priority: 7,
        database: "products_master"
      },
      { 
        text: "08_出品管理", 
        link: "/management/listing", 
        icon: "upload", 
        status: "ready",
        priority: 8,
        database: "products_master"
      },
      { 
        text: "09_送料計算", 
        link: "/shipping-calculator", 
        icon: "truck", 
        status: "ready",
        priority: 9,
        database: "products_master"
      },
      { 
        text: "10_在庫管理", 
        link: "/inventory", 
        icon: "warehouse", 
        status: "ready",
        priority: 10,
        database: "products_master"
      },
      { 
        text: "11_カテゴリ管理", 
        link: "/category-management", 
        icon: "tags", 
        status: "ready",
        priority: 11,
        database: "products_master"
      },
      { 
        text: "12_HTMLエディタ", 
        link: "/tools/html-editor", 
        icon: "code", 
        status: "ready",
        priority: 12,
        database: "products_master"
      },
      { 
        text: "13_統合分析", 
        link: "/analytics/inventory", 
        icon: "trending-up", 
        status: "ready",
        priority: 13,
        database: "products_master"
      },
      { 
        text: "14_API連携", 
        link: "/api", 
        icon: "zap", 
        status: "ready",
        priority: 14,
        database: "products_master"
      },
      { 
        text: "15_HTS分類自動化", 
        link: "/tools/hts-classification", 
        icon: "package", 
        status: "ready",
        priority: 15,
        database: "products_master"
      },
      { 
        text: "16_HTS階層構造ツール", 
        link: "/tools/hts-hierarchy", 
        icon: "layers", 
        status: "ready",
        priority: 16,
        database: "products_master"
      },
      { 
        text: "17_開発ナレッジ事典", 
        link: "/tools/wisdom-core", 
        icon: "file-text", 
        status: "ready",
        priority: 17,
        database: "products_master"
      },
    ]
  },

  // ==============================================
  // 🔧 出品ツール
  // ==============================================
  {
    id: "listing-tools",
    label: "出品ツール",
    icon: "upload",
    priority: 3,
    submenu: [
      { text: "出品スケジューラー", link: "/listing-management", icon: "calendar", status: "ready", priority: 1 },
      { text: "一括出品", link: "/bulk-listing", icon: "list", status: "ready", priority: 2 },
      { text: "出品ツール", link: "/listing-tool", icon: "shopping-cart", status: "ready", priority: 3 },
      { text: "配送ポリシー管理", link: "/shipping-policy-manager", icon: "settings", status: "ready", priority: 4 },
      { text: "eBay価格計算", link: "/ebay-pricing", icon: "calculator", status: "ready", priority: 5 },
      { text: "スコア評価", link: "/score-management", icon: "target", status: "ready", priority: 6 },
      { text: "バリエーション作成", link: "/tools/variation-creator", icon: "layers", status: "ready", priority: 7 },
    ]
  },

  // ==============================================
  // 📦 商品管理
  // ==============================================
  {
    id: "products",
    label: "商品管理",
    icon: "cube",
    priority: 4,
    submenu: [
      { text: "商品一覧", link: "/shohin", icon: "list", status: "pending", priority: 1 },
      { text: "商品登録", link: "/shohin/add", icon: "plus", status: "pending", priority: 2 },
      { text: "Amazon商品登録", link: "/asin-upload", icon: "globe", status: "pending", priority: 3 },
      { text: "カテゴリ管理", link: "/shohin/category", icon: "tags", status: "pending", priority: 4 },
    ]
  },

  // ==============================================
  // 📊 在庫管理
  // ==============================================
  {
    id: "inventory",
    label: "在庫管理",
    icon: "warehouse",
    priority: 5,
    submenu: [
      { text: "在庫監視システム", link: "/inventory-monitoring", icon: "bar-chart", status: "ready", priority: 1 },
      { text: "在庫一覧", link: "/zaiko", icon: "bar-chart", status: "pending", priority: 2 },
      { text: "入庫管理", link: "/zaiko/nyuko", icon: "trending-up", status: "pending", priority: 3 },
      { text: "出庫管理", link: "/zaiko/shukko", icon: "archive", status: "pending", priority: 4 },
      { text: "棚卸しツール", link: "/zaiko/tanaoroshi", icon: "package-check", status: "ready", priority: 5 },
      { text: "在庫調整", link: "/zaiko/chosei", icon: "settings", status: "pending", priority: 6 },
      { text: "在庫価格設定", link: "/inventory-pricing", icon: "dollar-sign", status: "ready", priority: 7 },
    ]
  },

  // ==============================================
  // 🛒 受注管理
  // ==============================================
  {
    id: "orders",
    label: "受注管理",
    icon: "shopping-cart",
    priority: 6,
    submenu: [
      { text: "受注一覧", link: "/juchu", icon: "list", status: "pending", priority: 1 },
      { text: "出荷管理", link: "/shukka", icon: "truck", status: "pending", priority: 2 },
      { text: "返品管理", link: "/henpin", icon: "alert-circle", status: "pending", priority: 3 },
      { text: "配送追跡", link: "/haisou", icon: "truck", status: "pending", priority: 4 },
      { text: "注文管理システムV2", link: "/tools/order-management-v2", icon: "shopping-cart", status: "ready", priority: 5 },
      { text: "注文管理", link: "/order-management", icon: "package", status: "ready", priority: 6 },
      { text: "配送管理", link: "/shipping-management", icon: "truck", status: "ready", priority: 7 },
      { text: "問い合わせ管理", link: "/inquiry-management", icon: "message-circle", status: "ready", priority: 8 },
      { text: "受注管理（統合版）", link: "/management/orders/v2", icon: "shopping-cart", status: "ready", priority: 9 },
      { text: "出荷管理システム", link: "/management/shipping", icon: "truck", status: "ready", priority: 10 },
      { text: "統合ダッシュボード", link: "/management/dashboard", icon: "layout-dashboard", status: "ready", priority: 11 },
    ]
  },

  // ==============================================
  // 🔍 リサーチ
  // ==============================================
  {
    id: "research",
    label: "リサーチ",
    icon: "target",
    priority: 7,
    submenu: [
      { text: "eBay リサーチ", link: "/research/ebay-research", icon: "globe", status: "ready", priority: 1 },
      { text: "市場リサーチ", link: "/research/market-research", icon: "trending-up", status: "ready", priority: 2 },
      { text: "スコアリング", link: "/research/scoring", icon: "bar-chart", status: "ready", priority: 3 },
      { text: "Amazon リサーチ", link: "/tools/amazon-research", icon: "shopping-cart", status: "ready", priority: 4 },
      { text: "Amazon 刈り取り", link: "/tools/amazon-arbitrage", icon: "zap", status: "ready", priority: 5 },
    ]
  },

  // ==============================================
  // 📈 分析
  // ==============================================
  {
    id: "analytics",
    label: "分析",
    icon: "bar-chart",
    priority: 8,
    submenu: [
      { text: "売上分析", link: "/analytics/sales", icon: "dollar-sign", status: "ready", priority: 1 },
      { text: "在庫回転率", link: "/analytics/inventory", icon: "trending-up", status: "ready", priority: 2 },
      { text: "価格トレンド", link: "/analytics/price-trends", icon: "bar-chart", status: "pending", priority: 3 },
      { text: "顧客分析", link: "/analytics/customers", icon: "users", status: "pending", priority: 4 },
      { text: "プレミアム価格分析", link: "/tools/premium-price-analysis", icon: "trending-up", status: "ready", priority: 5 },
      { text: "リサーチ分析", link: "/tools/research-analytics", icon: "bar-chart", status: "ready", priority: 6 },
      { text: "ポリシー分析", link: "/analyze-policies", icon: "shield", status: "ready", priority: 7 },
    ]
  },

  // ==============================================
  // 🤖 AI制御
  // ==============================================
  {
    id: "ai",
    label: "AI制御",
    icon: "robot",
    priority: 9,
    submenu: [
      { text: "AI分析", link: "/ai/analysis", icon: "zap", status: "pending", priority: 1 },
      { text: "需要予測", link: "/ai/demand", icon: "target", status: "pending", priority: 2 },
      { text: "価格最適化", link: "/ai/pricing", icon: "dollar-sign", status: "pending", priority: 3 },
      { text: "レコメンド", link: "/ai/recommend", icon: "robot", status: "pending", priority: 4 },
    ]
  },

  // ==============================================
  // 💰 記帳会計
  // ==============================================
  {
    id: "accounting",
    label: "記帳会計",
    icon: "calculator",
    priority: 10,
    submenu: [
      { text: "売上管理", link: "/uriage", icon: "dollar-sign", status: "pending", priority: 1 },
      { text: "仕入管理", link: "/shiire", icon: "file-text", status: "pending", priority: 2 },
      { text: "財務レポート", link: "/zaimu", icon: "bar-chart", status: "pending", priority: 3 },
      { text: "経費分類管理", link: "/tools/expense-classification", icon: "file-text", status: "ready", priority: 4 },
    ]
  },

  // ==============================================
  // 📦 仕入れ・買取管理
  // ==============================================
  {
    id: "sourcing",
    label: "仕入れ・買取",
    icon: "package",
    priority: 11,
    submenu: [
      { text: "BUYMA仕入れシミュレーター", link: "/tools/buyma-simulator", icon: "globe", status: "ready", priority: 1 },
      { text: "古物買取管理", link: "/tools/kobutsu-management", icon: "archive", status: "ready", priority: 2 },
      { text: "古物買取査定ツール", link: "/tools/kobutsu-assessment", icon: "clipboard", status: "ready", priority: 3 },
      { text: "古物台帳", link: "/kobutsu-ledger", icon: "book", status: "ready", priority: 4 },
      { text: "刈り取り自動選定", link: "/tools/arbitrage-selector", icon: "zap", status: "ready", priority: 5 },
      { text: "製品主導型仕入れ", link: "/tools/product-sourcing", icon: "package", status: "ready", priority: 6 },
      { text: "楽天せどりツール", link: "/tools/rakuten-arbitrage", icon: "shopping-cart", status: "ready", priority: 7 },
    ]
  },

  // ==============================================
  // 🔗 外部連携
  // ==============================================
  {
    id: "external",
    label: "外部連携",
    icon: "link",
    priority: 12,
    submenu: [
      { text: "Yahoo!オークション", link: "/yahoo-auction-dashboard", icon: "shopping-cart", status: "ready", priority: 1 },
      { text: "eBay", link: "/ebay", icon: "globe", status: "ready", priority: 2 },
      { text: "eBay SEO管理", link: "/tools/ebay-seo", icon: "search", status: "ready", priority: 3 },
      { text: "メルカリ", link: "/mercari", icon: "shopping-cart", status: "ready", priority: 4 },
      { text: "Amazon連携", link: "/amazon", icon: "globe", status: "pending", priority: 5 },
      { text: "楽天連携", link: "/rakuten", icon: "globe", status: "pending", priority: 6 },
      { text: "Yahoo連携", link: "/yahoo", icon: "globe", status: "pending", priority: 7 },
      { text: "API管理", link: "/api", icon: "database", status: "ready", priority: 8 },
    ]
  },

  // ==============================================
  // 📱 コンテンツ制作
  // ==============================================
  {
    id: "content",
    label: "コンテンツ制作",
    icon: "file-text",
    priority: 13,
    submenu: [
      { text: "AIラジオ生成", link: "/tools/ai-radio-generator", icon: "radio", status: "ready", priority: 1 },
      { text: "統合コンテンツ生成", link: "/tools/integrated-content", icon: "file-text", status: "ready", priority: 2 },
      { text: "翻訳・翻案モジュール", link: "/tools/translation-module", icon: "globe", status: "ready", priority: 3 },
      { text: "コンテンツ自動化パネル", link: "/tools/content-automation", icon: "cog", status: "ready", priority: 4 },
      { text: "YouTubeチェックリスト", link: "/tools/youtube-checklist", icon: "video", status: "ready", priority: 5 },
      { text: "トークン効率化", link: "/tools/token-optimizer", icon: "zap", status: "ready", priority: 6 },
    ]
  },

  // ==============================================
  // 🏥 健康・ライフ管理
  // ==============================================
  {
    id: "health",
    label: "健康・ライフ",
    icon: "heart",
    priority: 14,
    submenu: [
      { text: "パーソナル予防医療", link: "/tools/preventive-health", icon: "heart", status: "ready", priority: 1 },
      { text: "予防医療プラットフォーム", link: "/tools/preventive-health-platform", icon: "activity", status: "ready", priority: 2 },
      { text: "健康生活サポート", link: "/tools/health-support", icon: "activity", status: "ready", priority: 3 },
      { text: "健康管理システム", link: "/tools/health-management", icon: "clipboard", status: "ready", priority: 4 },
      { text: "精神と睡眠管理", link: "/tools/mental-sleep", icon: "moon", status: "ready", priority: 5 },
      { text: "栄養・献立管理", link: "/tools/nutrition-menu", icon: "utensils", status: "ready", priority: 6 },
      { text: "統合パーソナル管理", link: "/tools/personal-management", icon: "user", status: "ready", priority: 7 },
    ]
  },

  // ==============================================
  // ⚙️ システム管理
  // ==============================================
  {
    id: "system",
    label: "システム管理",
    icon: "settings",
    priority: 15,
    submenu: [
      { text: "🏥 システムヘルスチェック", link: "/system-health", icon: "check-circle", status: "ready", priority: 0 },
      { text: "Git & デプロイ", link: "/tools/git-deploy", icon: "git-branch", status: "ready", priority: 1 },
      { text: "Supabase接続", link: "/tools/supabase-connection", icon: "database", status: "ready", priority: 2 },
      { text: "API テストツール", link: "/tools/api-test", icon: "zap", status: "ready", priority: 3 },
      { text: "eBay Token取得", link: "/api/ebay/auth/authorize", icon: "cog", status: "ready", priority: 4 },
      { text: "外注管理", link: "/admin/outsourcer-management", icon: "users", status: "ready", priority: 5 },
      { text: "データ収集補助", link: "/data-collection-helper", icon: "database", status: "ready", priority: 6 },
      { text: "HSキーワード生成", link: "/admin/hs-keyword-generator", icon: "tag", status: "new", priority: 6.5, database: "hs_keywords" },
      { text: "マスター一覧表示", link: "/master-view", icon: "table", status: "ready", priority: 7 },
      { text: "ユーザー管理", link: "/users", icon: "users", status: "pending", priority: 8 },
      { text: "権限設定", link: "/permissions", icon: "shield", status: "pending", priority: 9 },
      { text: "バックアップ", link: "/backup", icon: "database", status: "pending", priority: 10 },
      { text: "ログ管理", link: "/logs", icon: "file-text", status: "pending", priority: 11 },
    ]
  },

  // ==============================================
  // 🔧 その他ツール
  // ==============================================
  {
    id: "other-tools",
    label: "その他ツール",
    icon: "tool",
    priority: 16,
    submenu: [
      { text: "出品ツールハブ", link: "/tools", icon: "upload", status: "ready", priority: 1 },
      { text: "スクレイピング", link: "/tools/scraping", icon: "database", status: "ready", priority: 2 },
      { text: "商品承認", link: "/tools/approval", icon: "check-circle", status: "ready", priority: 3 },
      { text: "利益計算ツール", link: "/tools/profit-calculator", icon: "calculator", status: "ready", priority: 4 },
      { text: "ワークフローエンジン", link: "/tools/workflow-engine", icon: "cog", status: "ready", priority: 5 },
      { text: "キャッシュフロー予測", link: "/tools/cash-flow-forecast", icon: "trending-up", status: "ready", priority: 6 },
      { text: "出品最適化", link: "/tools/listing-optimization", icon: "target", status: "ready", priority: 7 },
      { text: "タスク管理V4", link: "/management/tasks", icon: "check-square", status: "ready", priority: 8 },
      { text: "製品主導型仕入れ", link: "/management/product-sourcing", icon: "package", status: "ready", priority: 9 },
    ]
  },

  // ==============================================
  // ⚙️ 設定
  // ==============================================
  {
    id: "settings",
    label: "設定",
    icon: "cog",
    priority: 17,
    submenu: [
      { text: "ユーザー管理", link: "/settings/users", icon: "users", status: "pending", priority: 1 },
      { text: "API設定", link: "/settings/api", icon: "database", status: "pending", priority: 2 },
      { text: "通知設定", link: "/settings/notifications", icon: "alert-circle", status: "pending", priority: 3 },
      { text: "バックアップ", link: "/settings/backup", icon: "database", status: "pending", priority: 4 },
    ]
  },

  // ==============================================
  // 📚 開発ガイド
  // ==============================================
  {
    id: "development",
    label: "開発ガイド",
    icon: "git-branch",
    priority: 18,
    submenu: [
      { text: "📝 開発指示書管理", link: "/dev-instructions", icon: "file-text", status: "ready", priority: 0 },
      { text: "🚀 リアルタイム開発ダッシュボード", link: "/dev-guide", icon: "zap", status: "ready", priority: 1, database: "products_master" },
      { text: "📋 システム開発ガイド (旧)", link: "/docs/index.html", icon: "file-text", status: "ready", priority: 2 },
      { text: "🔧 全14ツール構成", link: "/docs/index.html#tools", icon: "cog", status: "ready", priority: 3 },
      { text: "🗄️ データベース設計", link: "/docs/index.html#database", icon: "database", status: "ready", priority: 4 },
      { text: "🔄 ワークフロー説明", link: "/docs/index.html#workflow", icon: "trending-up", status: "ready", priority: 5 },
      { text: "💻 開発方針・修正方法", link: "/docs/index.html#development", icon: "code", status: "ready", priority: 6 },
    ]
  },
]

// ==============================================
// 🛠️ ユーティリティ関数
// ==============================================

/**
 * メニューアイテムをpriorityでソート
 */
export function sortByPriority<T extends { priority?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.priority || 999) - (b.priority || 999))
}

/**
 * ソート済みメニューを取得
 */
export function getSortedNavigationItems(): NavigationItem[] {
  const sorted = sortByPriority(navigationItems)
  return sorted.map(item => ({
    ...item,
    submenu: item.submenu ? sortByPriority(item.submenu) : undefined
  }))
}

/**
 * products_master対応ツールのみ取得
 */
export function getProductsMasterTools(): SubMenuItem[] {
  const integratedTools = navigationItems.find(item => item.id === "integrated-tools")
  return integratedTools?.submenu || []
}
