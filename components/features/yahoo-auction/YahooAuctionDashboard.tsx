'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

// 29ツールの定義（HTMLファイル名も含む）
const allTools = [
  {
    id: '00',
    name: 'ワークフローエンジン',
    icon: '⚙️',
    description: '全システム統合管理の高度ワークフローエンジン',
    status: 'premium',
    folder: '00_workflow_engine',
    files: ['dashboard_v2.html', 'index.php']
  },
  {
    id: '01',
    name: 'システムダッシュボード',
    icon: '📊',
    description: '統計データ・商品検索機能統合表示',
    status: 'ready',
    folder: '01_dashboard',
    files: ['index.php', 'dashboard_complete.php']
  },
  {
    id: '02',
    name: 'スクレイピング',
    icon: '🕷️',
    description: 'Yahoo Auction商品データ自動取得システム',
    status: 'ready',
    folder: '02_scraping',
    files: ['scraping.php', 'index.php', 'scraping_main.php']
  },
  {
    id: '03',
    name: '商品承認システム',
    icon: '✅',
    description: 'AI推奨承認システム・高機能版',
    status: 'ready',
    folder: '03_approval',
    files: ['index.php', 'approval.php']
  },
  {
    id: '04',
    name: 'データ分析・レポート',
    icon: '📈',
    description: '包括的データ分析・レポート生成機能',
    status: 'waiting',
    folder: '04_analysis',
    files: ['index.php']
  },
  {
    id: '05',
    name: '利益計算システム',
    icon: '💰',
    description: 'ROI分析・マージン管理・利益最適化ツール',
    status: 'ready',
    folder: '05_rieki',
    files: ['rieki.php', 'index.php']
  },
  {
    id: '06',
    name: 'eBayカテゴリーシステム',
    icon: '🗂️',
    description: 'カテゴリー管理・マッピング・最適化システム',
    status: 'waiting',
    folder: '06_ebay_category_system',
    files: ['index.php']
  },
  {
    id: '07',
    name: 'データ編集システム',
    icon: '✏️',
    description: '商品データ編集・検証・CSV出力機能',
    status: 'waiting',
    folder: '07_editing',
    files: ['index.php']
  },
  {
    id: '07F',
    name: 'フィルター管理システム',
    icon: '🔍',
    description: '5段階フィルター・ページネーション対応版',
    status: 'ready',
    folder: '07_filters',
    files: ['filters.php']
  },
  {
    id: '08',
    name: '出品管理システム',
    icon: '🏪',
    description: 'eBay一括出品・進行状況管理・エラー処理',
    status: 'ready',
    folder: '08_listing',
    files: ['listing.php', 'index.php']
  },
  {
    id: '09',
    name: '送料計算システム',
    icon: '🚚',
    description: '4層UIシステム・タブ式マトリックス・完成版',
    status: 'ready',
    folder: '09_shipping',
    files: [
      'complete_4layer_shipping_ui_php.php',
      'enhanced_calculation_php_complete.php',
      'advanced_tariff_calculator.php'
    ]
  },
  {
    id: '10',
    name: '在庫管理システム',
    icon: '📦',
    description: '在庫分析・価格監視・統計ダッシュボード',
    status: 'ready',
    folder: '10_zaiko',
    files: ['inventory.php', 'manager_main.php', 'index.php']
  },
  {
    id: '11',
    name: 'カテゴリー自動判定',
    icon: '🤖',
    description: 'eBayカテゴリー自動判定・完全修正版',
    status: 'ready',
    folder: '11_category',
    files: ['unified_api_fixed.php', 'frontend/category_manager_fixed.php', 'frontend/sell_mirror_tool_fixed.php']
  },
  {
    id: '12',
    name: 'HTML編集システム',
    icon: '💻',
    description: '商品説明HTMLテンプレート作成・編集',
    status: 'waiting',
    folder: '12_html_editor',
    files: ['index.php']
  },
  {
    id: '13',
    name: 'データ分析・機械学習',
    icon: '🧠',
    description: 'AI・機械学習による高度データ分析',
    status: 'waiting',
    folder: '13_bunseki',
    files: ['index.php']
  },
  {
    id: '14',
    name: 'API連携システム',
    icon: '🔌',
    description: '外部API統合・データ同期・Webhook管理',
    status: 'waiting',
    folder: '14_api_renkei',
    files: ['index.php']
  },
  {
    id: '15',
    name: '統合モーダルシステム',
    icon: '🪟',
    description: '操作用モーダル・ダイアログ統合管理',
    status: 'waiting',
    folder: '15_integrated_modal',
    files: ['index.php']
  },
  {
    id: '16',
    name: 'Amazon統合システム',
    icon: '📦',
    description: 'Amazon出品・価格監視・在庫管理統合',
    status: 'waiting',
    folder: '16_amazon_integration',
    files: ['index.php']
  },
  {
    id: '17',
    name: 'Amazon統合システム詳細版',
    icon: '🛒',
    description: 'Amazon MWS/SP-API完全統合システム',
    status: 'waiting',
    folder: '17_amazon_integration_system',
    files: ['index.php']
  },
  {
    id: '18',
    name: 'Amazon在庫・出品システム',
    icon: '📦',
    description: 'Amazon専用在庫管理・一括出品システム',
    status: 'waiting',
    folder: '18_amazon_inventory_listing',
    files: ['index.php']
  },
  {
    id: '19',
    name: 'Shopee配送システム',
    icon: '🚛',
    description: '東南アジア向けShopee配送・料金計算',
    status: 'waiting',
    folder: '19_shopee_shipping',
    files: ['index.php']
  },
  {
    id: '20',
    name: 'ポケモン専用ツール',
    icon: '🎮',
    description: 'ポケカ・グッズ専用分析・価格予測',
    status: 'waiting',
    folder: '20_pokemon_tools',
    files: ['index.php']
  },
  {
    id: '21',
    name: 'メール管理システム',
    icon: '✉️',
    description: '顧客対応・自動返信・テンプレート管理',
    status: 'waiting',
    folder: '21_email_management',
    files: ['index.php']
  },
  {
    id: '22',
    name: '市場調査強化システム',
    icon: '🔎',
    description: '競合分析・市場調査・トレンド予測',
    status: 'waiting',
    folder: '22_research_enhancement',
    files: ['index.php']
  },
  {
    id: '23',
    name: '出品ツール統合',
    icon: '📤',
    description: '複数プラットフォーム一括出品・進捗管理',
    status: 'waiting',
    folder: '23_listing_tools',
    files: ['index.php']
  },
  {
    id: '24',
    name: '多販路統合システム',
    icon: '🌐',
    description: 'eBay・Amazon・Shopee・Yahoo完全統合',
    status: 'waiting',
    folder: '24_multi_channel_integration',
    files: ['index.php']
  },
  {
    id: '25',
    name: 'Shopeeシステム',
    icon: '🛍️',
    description: 'Shopee専用システム・東南アジア展開',
    status: 'waiting',
    folder: '25_shopee',
    files: ['index.php']
  },
  {
    id: '26',
    name: '棚卸しシステム',
    icon: '📋',
    description: '在庫棚卸し・監査・レポート生成',
    status: 'waiting',
    folder: '26_tanaoroshi',
    files: ['index.php']
  },
  {
    id: '27',
    name: 'eBayシステム',
    icon: '🔵',
    description: 'eBay専用システム・API完全統合',
    status: 'waiting',
    folder: '27_ebay',
    files: ['index.php']
  },
  {
    id: '28',
    name: '認証システム',
    icon: '🔒',
    description: 'ユーザー認証・権限管理・セキュリティ',
    status: 'waiting',
    folder: '28_auth',
    files: ['index.php']
  },
  {
    id: '29',
    name: 'モールシステム',
    icon: '🏢',
    description: '複数モール統合管理システム',
    status: 'waiting',
    folder: '29_mole',
    files: ['index.php']
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'premium':
      return 'bg-gradient-to-r from-primary to-secondary'
    case 'ready':
      return 'bg-green-500'
    case 'waiting':
      return 'bg-yellow-500'
    default:
      return 'bg-gray-500'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'premium':
      return 'プレミアム'
    case 'ready':
      return '利用可能'
    case 'waiting':
      return '準備中'
    default:
      return '不明'
  }
}

export default function YahooAuctionDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Yahoo Auction Complete</h1>
          <p className="text-muted-foreground mt-1">全29ツール統合システム</p>
        </div>
        <Badge variant="outline" className="text-sm">
          システム稼働中
        </Badge>
      </div>

      {/* ツールグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allTools.map((tool) => (
          <Card
            key={tool.id}
            className="group hover:shadow-lg transition-all duration-200 border-t-4"
            style={{ borderTopColor: 'var(--primary)' }}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{tool.icon}</div>
                <Badge
                  className={`${getStatusColor(tool.status)} text-white text-xs`}
                >
                  {getStatusLabel(tool.status)}
                </Badge>
              </div>

              <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors">
                {tool.id}. {tool.name}
              </h3>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {tool.description}
              </p>

              {/* ファイルリンク */}
              <div className="space-y-2">
                {tool.files.map((file, index) => (
                  <Link
                    key={index}
                    href={`http://localhost:8080/modules/yahoo_auction_complete/new_structure/${tool.folder}/${file}`}
                    target="_blank"
                    className="block"
                  >
                    <button
                      className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = 'brightness(110%)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'brightness(100%)'
                      }}
                    >
                      {tool.id}-{index + 1} {file.replace(/\.(php|html)$/, '')}
                    </button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
