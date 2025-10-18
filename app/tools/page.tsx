import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Cog, 
  Database, 
  CheckCircle, 
  Calculator,
  ArrowRight
} from 'lucide-react'

const listingTools = [
  {
    id: 'workflow-engine',
    title: 'ワークフローエンジン',
    description: '出品プロセス全体を管理・自動化するメインエンジン',
    href: '/tools/workflow-engine',
    icon: Cog,
    status: 'ready',
    features: ['自動処理', 'スケジュール管理', 'エラー監視']
  },
  {
    id: 'scraping',
    title: 'スクレイピング',
    description: 'Yahoo!オークションから商品情報を自動取得',
    href: '/tools/scraping',
    icon: Database,
    status: 'ready',
    features: ['高速取得', 'データ正規化', 'API統合']
  },
  {
    id: 'approval',
    title: '商品承認',
    description: '取得した商品の審査・承認処理',
    href: '/tools/approval',
    icon: CheckCircle,
    status: 'ready',
    features: ['一括承認', '条件フィルタ', '履歴管理']
  },
  {
    id: 'profit-calculator',
    title: '利益計算',
    description: '高精度な多国籍プラットフォーム利益計算・最適化',
    href: '/tools/profit-calculator',
    icon: Calculator,
    status: 'new',
    features: ['段階手数料', 'DDP/DDU', 'Shopee7カ国']
  }
]

const statusConfig = {
  ready: { label: '稼働中', className: 'bg-green-500/80 text-white' },
  new: { label: '新機能', className: 'bg-blue-500/80 text-white' },
  pending: { label: '準備中', className: 'bg-yellow-500/80 text-white' }
}

export default function ListingToolsPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">出品ツール</h1>
        <p className="text-gray-600">
          Yahoo!オークションからeBay/Shopeeへの出品を自動化する統合ツール群
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {listingTools.map((tool) => {
          const Icon = tool.icon
          const status = statusConfig[tool.status as keyof typeof statusConfig]
          
          return (
            <Card key={tool.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-6 w-6 text-gray-700" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{tool.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {tool.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={status.className}>
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {tool.features.map((feature) => (
                      <span
                        key={feature}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={tool.href}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ツールを開く
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">ワークフローの流れ</h2>
        <ol className="space-y-2 text-gray-700">
          <li className="flex items-center gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">1</span>
            <span>スクレイピング: Yahoo!オークションから商品情報を自動取得</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">2</span>
            <span>商品承認: 取得データの確認と承認処理</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">3</span>
            <span>利益計算: 各プラットフォームでの利益を計算・最適化</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">4</span>
            <span>ワークフローエンジン: 全プロセスを統合管理・自動実行</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
