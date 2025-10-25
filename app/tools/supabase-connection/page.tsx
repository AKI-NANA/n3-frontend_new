'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, 
  Check, 
  X, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle,
  Table as TableIcon,
  ChevronRight,
  Search
} from 'lucide-react'

interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
}

interface TableInfo {
  name: string
  columns: number
  rows: number
  isCandidate: boolean
  category: string
  description: string
}

interface TableDetail {
  name: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
  }>
  sampleData: any[]
  rowCount: number
}

export default function SupabaseConnectionPage() {
  const [envConfig, setEnvConfig] = useState<EnvConfig>({})
  const [showSecrets, setShowSecrets] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableDetail, setTableDetail] = useState<TableDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadEnvConfig()
  }, [])

  const loadEnvConfig = () => {
    const config: EnvConfig = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
    setEnvConfig(config)
  }

  const testConnection = async () => {
    setConnectionStatus('testing')
    setLoading(true)

    try {
      const response = await fetch('/api/supabase/test-connection', {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        setConnectionStatus('success')
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const fetchTables = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/supabase/list-tables')
      const result = await response.json()

      if (result.success && result.tables) {
        setTables(result.tables)
      }
    } catch (error) {
      console.error('Failed to fetch tables:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTableDetail = async (tableName: string) => {
    setLoading(true)
    setSelectedTable(tableName)

    try {
      const response = await fetch(`/api/supabase/table-detail?table=${tableName}`)
      const result = await response.json()

      if (result.success) {
        setTableDetail(result.detail)
      }
    } catch (error) {
      console.error('Failed to fetch table detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const categorizeTable = (tableName: string): string => {
    if (tableName.includes('ebay') || tableName.includes('fulfillment') || tableName.includes('policy')) {
      return 'eBay関連'
    }
    if (tableName.includes('shipping') || tableName.includes('ddp') || tableName.includes('rate')) {
      return '配送・料金'
    }
    if (tableName.includes('product') || tableName.includes('item') || tableName.includes('inventory')) {
      return '商品・在庫'
    }
    if (tableName.includes('user') || tableName.includes('auth') || tableName.includes('account')) {
      return 'ユーザー・認証'
    }
    if (tableName.includes('log') || tableName.includes('audit') || tableName.includes('history')) {
      return 'ログ・履歴'
    }
    return 'その他'
  }

  const getTableDescription = (tableName: string): string => {
    const descriptions: Record<string, string> = {
      'ebay_ddp_surcharge_matrix': 'eBay USA DDP配送料金マトリックス（重量・価格帯別）',
      'ebay_fulfillment_policies': 'eBay配送ポリシー設定',
      'rate_tables': 'eBay料金テーブル',
      'usa_ddp_shipping_costs': 'USA DDP配送コスト詳細',
      'products': '商品マスタ',
      'inventory': '在庫管理',
      'users': 'ユーザー情報',
      'orders': '注文データ',
    }
    return descriptions[tableName] || 'データテーブル'
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const maskSecret = (value?: string) => {
    if (!value) return '未設定'
    if (showSecrets) return value
    return `${value.substring(0, 8)}...${value.substring(value.length - 8)}`
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'testing': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'success': return <CheckCircle className="w-5 h-5" />
      case 'error': return <X className="w-5 h-5" />
      case 'testing': return <RefreshCw className="w-5 h-5 animate-spin" />
      default: return <AlertCircle className="w-5 h-5" />
    }
  }

  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedTables = filteredTables.reduce((acc, table) => {
    const category = categorizeTable(table.name)
    if (!acc[category]) acc[category] = []
    acc[category].push(table)
    return acc
  }, {} as Record<string, TableInfo[]>)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Supabase データベース管理</h1>
        </div>
        <p className="text-muted-foreground">
          全データベーステーブルの構造と内容を可視化
        </p>
      </div>

      {/* 接続ステータス */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <CardTitle>接続ステータス</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={loading}
              >
                {getStatusIcon()}
                <span className="ml-2">接続テスト</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">プロジェクトURL:</span>
              <span className="text-sm text-muted-foreground">
                {envConfig.NEXT_PUBLIC_SUPABASE_URL || '未設定'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">接続状態:</span>
              <Badge variant={connectionStatus === 'success' ? 'default' : 'secondary'}>
                {connectionStatus === 'success' ? '接続済み' : '未接続'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブコンテンツ */}
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="database">データベース全体</TabsTrigger>
          <TabsTrigger value="tables">テーブル一覧</TabsTrigger>
          <TabsTrigger value="env">環境変数</TabsTrigger>
          <TabsTrigger value="code">接続コード</TabsTrigger>
        </TabsList>

        {/* データベース全体タブ */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>データベース構造マップ</CardTitle>
                  <CardDescription>カテゴリ別テーブル一覧と詳細情報</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTables}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="ml-2">更新</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 検索バー */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="テーブル名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {tables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TableIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>「更新」ボタンをクリックしてテーブルを取得</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTables).map(([category, categoryTables]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                        {category} ({categoryTables.length})
                      </h3>
                      <div className="grid gap-2">
                        {categoryTables.map((table) => (
                          <div
                            key={table.name}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              selectedTable === table.name ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
                            } ${table.isCandidate ? 'bg-yellow-50 border-yellow-300' : ''}`}
                            onClick={() => fetchTableDetail(table.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <TableIcon className="w-5 h-5 text-gray-600" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{table.name}</span>
                                    {table.isCandidate && (
                                      <Badge variant="outline" className="bg-yellow-100">
                                        USA DDP候補
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {getTableDescription(table.name)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {table.columns} カラム · {table.rows.toLocaleString()} レコード
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>

                            {/* テーブル詳細（選択時） */}
                            {selectedTable === table.name && tableDetail && (
                              <div className="mt-4 pt-4 border-t space-y-3">
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">カラム構造</h4>
                                  <div className="space-y-1">
                                    {tableDetail.columns.map((col, idx) => (
                                      <div key={idx} className="text-xs flex items-center gap-2 p-2 bg-gray-50 rounded">
                                        <span className="font-mono font-medium">{col.name}</span>
                                        <Badge variant="outline" className="text-xs">{col.type}</Badge>
                                        {col.nullable && <span className="text-gray-500">NULL可</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {tableDetail.sampleData.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">サンプルデータ（最初の3件）</h4>
                                    <div className="overflow-x-auto">
                                      <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded">
                                        {JSON.stringify(tableDetail.sampleData, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* テーブル一覧タブ（シンプル版） */}
        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>テーブル一覧（シンプル表示）</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTables}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="ml-2">更新</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TableIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>テーブル情報を取得するには「更新」ボタンをクリック</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tables.map((table) => (
                    <div
                      key={table.name}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        table.isCandidate ? 'bg-yellow-50 border-yellow-300' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <TableIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <div className="font-medium">{table.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {table.columns} カラム · {table.rows.toLocaleString()} レコード
                          </div>
                        </div>
                      </div>
                      {table.isCandidate && (
                        <Badge variant="outline" className="bg-yellow-100">
                          USA DDP候補
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 環境変数タブ */}
        <TabsContent value="env" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>環境変数設定</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="ml-2">{showSecrets ? '非表示' : '表示'}</span>
                </Button>
              </div>
              <CardDescription>
                .env.local ファイルの設定値
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SUPABASE_URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_URL</label>
                  {envConfig.NEXT_PUBLIC_SUPABASE_URL ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={envConfig.NEXT_PUBLIC_SUPABASE_URL || '未設定'}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(envConfig.NEXT_PUBLIC_SUPABASE_URL || '', 'url')}
                  >
                    {copied === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* ANON_KEY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
                  {envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={maskSecret(envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', 'anon')}
                  >
                    {copied === 'anon' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  環境変数は .env.local ファイルで管理されています。
                  変更後は Next.js を再起動してください。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 接続コードタブ */}
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Python 接続コード</CardTitle>
              <CardDescription>psycopg2 を使用した接続例</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                <code>{`import psycopg2

conn = psycopg2.connect(
    host='db.zdzfpucdyxdlavkgrvil.supabase.co',
    port=5432,
    database='postgres',
    user='postgres',
    password='YOUR_PASSWORD'
)

cursor = conn.cursor()
cursor.execute('SELECT * FROM your_table LIMIT 10')
results = cursor.fetchall()

cursor.close()
conn.close()`}</code>
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TypeScript 接続コード</CardTitle>
              <CardDescription>@supabase/supabase-js を使用した接続例</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                <code>{`import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const { data, error } = await supabase
  .from('your_table')
  .select('*')
  .limit(10)

if (error) console.error(error)
else console.log(data)`}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
