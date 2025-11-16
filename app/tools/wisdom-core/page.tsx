'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Search, FolderTree, FileCode, Download, RefreshCw, Copy, Check, Save, ChevronRight, ChevronDown, File, Folder, FileText, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FOLDER_DOC, CODING_DOC } from './docs-data'
import { TECH_STACK_DOC } from './tech-stack-data'

interface CodeMapItem {
  id: number
  path: string
  file_name: string
  tool_type: string
  category: string
  description_simple: string
  main_features: string[]
  tech_stack: string
  file_size: number
  last_modified: string
  last_analyzed: string
  memo?: string
  when_to_modify?: string
  related_tools?: string[]
}

interface Stats {
  total: number
  byCategory: Record<string, number>
  byToolType: Record<string, number>
  byExtension: Record<string, number>
  relatedTools: string[]
  categories: number
  toolTypes: number
  extensions: number
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeNode[]
  file?: CodeMapItem
  description?: string
}

// フォルダ説明
const FOLDER_DESCRIPTIONS: Record<string, string> = {
  'app': 'Next.jsページとAPIルート',
  'components': '再利用可能なReactコンポーネント',
  'lib': 'ユーティリティ関数とヘルパー',
  'types': 'TypeScript型定義',
  'hooks': 'カスタムReactフック',
  'contexts': 'Reactコンテキスト',
  'services': 'ビジネスロジックとAPIクライアント',
  'data': 'マスターデータとJSONファイル',
  'public': '静的アセット（画像等）',
  'styles': 'グローバルCSS',
  'api': 'APIエンドポイント',
  'database': 'DBスキーマとマイグレーション',
  'migrations': 'DBマイグレーション',
  'scripts': 'ビルド・デプロイスクリプト',
  'docs': 'プロジェクトドキュメント',
  'tests': 'テストコード',
  'config': '設定ファイル',
  'original-php': '旧PHPシステム（アーカイブ）',
}

// フォルダ優先度
const FOLDER_PRIORITY: Record<string, number> = {
  'app': 1,
  'components': 2,
  'lib': 3,
  'types': 4,
  'hooks': 5,
  'contexts': 6,
  'services': 7,
  'data': 8,
  'public': 9,
  'styles': 10,
  'api': 11,
  'database': 12,
  'migrations': 13,
  'scripts': 14,
  'docs': 15,
  'tests': 16,
  'config': 17,
  'original-php': 18,
}

export default function WisdomCorePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [allData, setAllData] = useState<CodeMapItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedToolType, setSelectedToolType] = useState<string | null>(null)
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null)
  const [selectedRelatedTool, setSelectedRelatedTool] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<CodeMapItem | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [memo, setMemo] = useState('')
  const [whenToModify, setWhenToModify] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tree, setTree] = useState<TreeNode[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [isFileModalOpen, setIsFileModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'files' | 'docs' | 'tech'>('files')
  
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)

  // フォルダツリー構築
  const buildTree = (files: CodeMapItem[]): TreeNode[] => {
    const root: TreeNode[] = []
    
    files.forEach(file => {
      const parts = file.path.split('/')
      let currentLevel = root
      let currentPath = ''
      
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        const isFile = index === parts.length - 1
        
        let node = currentLevel.find(n => n.name === part)
        
        if (!node) {
          node = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            file: isFile ? file : undefined,
            description: !isFile ? FOLDER_DESCRIPTIONS[part] : undefined,
          }
          currentLevel.push(node)
        }
        
        if (!isFile && node.children) {
          currentLevel = node.children
        }
      })
    })
    
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1
        if (a.type === 'file' && b.type === 'folder') return 1
        
        if (a.type === 'folder' && b.type === 'folder') {
          const priorityA = FOLDER_PRIORITY[a.name] || 999
          const priorityB = FOLDER_PRIORITY[b.name] || 999
          if (priorityA !== priorityB) return priorityA - priorityB
        }
        
        return a.name.localeCompare(b.name)
      }).map(node => {
        if (node.children) {
          node.children = sortNodes(node.children)
        }
        return node
      })
    }
    
    return sortNodes(root)
  }

  const loadData = async () => {
    if (hasLoadedRef.current || isLoadingRef.current) return
    
    isLoadingRef.current = true
    setLoading(true)
    
    try {
      const statsRes = await fetch('/api/wisdom-core/stats')
      const statsJson = await statsRes.json()
      
      if (statsJson.success) {
        setStats(statsJson.stats)
        if (statsJson.stats.total === 0) {
          hasLoadedRef.current = true
          return
        }
      }
      
      await loadAllData()
      hasLoadedRef.current = true
      
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const loadAllData = async () => {
    try {
      const allFiles: CodeMapItem[] = []
      let currentPage = 1
      let totalPages = 1
      
      while (currentPage <= totalPages && currentPage <= 250) {
        const res = await fetch(`/api/wisdom-core/scan?page=${currentPage}&limit=500`)
        if (!res.ok) break
        
        const json = await res.json()
        if (!json.success || !json.data || json.data.length === 0) break
        
        allFiles.push(...json.data)
        
        if (json.pagination) {
          totalPages = json.pagination.totalPages
          if (currentPage >= totalPages) break
        }
        
        currentPage++
      }
      
      setAllData(allFiles)
      setTree(buildTree(allFiles))
      
    } catch (error) {
      console.error('全データ読み込みエラー:', error)
    }
  }

  const handleScan = async () => {
    setIsScanning(true)
    try {
      const res = await fetch('/api/wisdom-core/scan', { method: 'POST' })
      const json = await res.json()
      
      if (json.success) {
        alert(`✅ スキャン完了！\n${json.total}ファイルを分析しました`)
        hasLoadedRef.current = false
        isLoadingRef.current = false
        await loadData()
      } else {
        alert('❌ エラー: ' + json.error)
      }
    } catch (error) {
      alert('❌ スキャンエラー: ' + error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleSelectFile = async (file: CodeMapItem) => {
    setSelectedFile(file)
    setMemo(file.memo || '')
    setWhenToModify(file.when_to_modify || '')
    setIsFileModalOpen(true)
    
    try {
      const res = await fetch(`/api/wisdom-core/file?path=${encodeURIComponent(file.path)}`)
      const json = await res.json()
      
      if (json.success) {
        setFileContent(json.content)
        setEditedContent(json.content)
      }
    } catch (error) {
      console.error('ファイル読み込みエラー:', error)
    }
  }

  const handleToolClick = (toolName: string) => {
    // ツールでフィルタ（モーダルは開かない）
    setSelectedToolType(toolName === selectedToolType ? null : toolName)
  }

  const getToolFiles = (toolName: string) => {
    return allData.filter(item => 
      item.tool_type === toolName || 
      (item.related_tools && item.related_tools.includes(toolName))
    )
  }

  const generateStandardCopy = () => {
    if (!selectedToolType) return ''
    
    const toolFiles = getToolFiles(selectedToolType)
    
    // 主要ファイルを抽出
    const mainFiles = toolFiles.filter(f => 
      f.file_name.includes('page.tsx') ||
      f.file_name.includes('route.ts') ||
      f.file_name.includes('Modal') ||
      f.file_name.includes('Form') ||
      f.file_name.includes('Table') ||
      f.path.includes('/api/')
    ).slice(0, 30)
    
    return `# ${selectedToolType} - 標準版（主要ファイルのみ）

## 📊 概要
- ツール名: ${selectedToolType}
- 総ファイル数: ${toolFiles.length}件
- 主要ファイル: ${mainFiles.length}件

## 📁 主要ファイル

${mainFiles.map((f, idx) => `### ${idx + 1}. ${f.file_name}
📂 ${f.path}
🏷️ ${f.tech_stack} | ${f.category}
⚙️ ${f.main_features.join(', ')}
${f.related_tools && f.related_tools.length > 0 ? `🔗 関連: ${f.related_tools.slice(0, 3).join(', ')}` : ''}
`).join('\n')}

---

## 💡 Geminiへの質問例

このツール（${selectedToolType}）で以下を実行したい場合、どのファイルを修正すればいいですか？

1. 新しい機能を追加する
2. UIデザインを変更する
3. APIエンドポイントを追加する
4. バグを修正する

**注**: 全${toolFiles.length}件のファイルリストが必要な場合はお知らせください。
`
  }

  const handleCopyStandard = () => {
    const text = generateStandardCopy()
    navigator.clipboard.writeText(text)
    
    const notification = document.createElement('div')
    notification.textContent = `✅ 標準版（主要ファイル）をコピーしました！`
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50'
    document.body.appendChild(notification)
    
    setTimeout(() => notification.remove(), 3000)
  }

  const handleCopyDoc = (doc: 'folder' | 'coding' | 'tech') => {
    const text = doc === 'folder' ? FOLDER_DOC : doc === 'coding' ? CODING_DOC : TECH_STACK_DOC
    navigator.clipboard.writeText(text)
    
    const notification = document.createElement('div')
    notification.textContent = `✅ ${doc === 'folder' ? 'フォルダ構造' : doc === 'coding' ? 'コーディング規約' : '技術スタック'}をコピーしました！`
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50'
    document.body.appendChild(notification)
    
    setTimeout(() => notification.remove(), 3000)
  }

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        {node.type === 'folder' ? (
          <div>
            <div
              className="flex items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer text-sm group"
              onClick={() => toggleFolder(node.path)}
            >
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="font-medium flex-shrink-0">{node.name}</span>
              {node.description && (
                <span className="text-xs text-muted-foreground truncate ml-2">
                  - {node.description}
                </span>
              )}
            </div>
            {expandedFolders.has(node.path) && node.children && (
              <div style={{ marginLeft: '16px' }}>{renderTree(node.children, level + 1)}</div>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center gap-1 py-1 px-2 hover:bg-accent rounded cursor-pointer text-sm ml-4 ${
              selectedFile?.id === node.file?.id ? 'bg-accent' : ''
            }`}
            onClick={() => node.file && handleSelectFile(node.file)}
          >
            <File className="h-4 w-4 text-gray-500" />
            <span className="truncate">{node.name}</span>
          </div>
        )}
      </div>
    ))
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredData = allData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || item.category === selectedCategory
    const matchesToolType = !selectedToolType || item.tool_type === selectedToolType
    const matchesExtension = !selectedExtension || item.tech_stack === selectedExtension
    const matchesRelatedTool = !selectedRelatedTool || (item.related_tools && item.related_tools.includes(selectedRelatedTool))
    
    return matchesSearch && matchesCategory && matchesToolType && matchesExtension && matchesRelatedTool
  })

  const extensions = Object.keys(stats?.byExtension || {}).sort()
  const extensionTotal = Object.values(stats?.byExtension || {}).reduce((sum, count) => sum + count, 0)

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              開発ナレッジ事典 (Wisdom Core)
            </h1>
            <p className="text-sm text-muted-foreground">
              n3-frontendプロジェクト - {stats?.total || 0}ファイル分析済み
              {selectedToolType && (
                <span className="text-blue-600 font-medium"> | {selectedToolType}でフィルタ中 ({filteredData.length}件)</span>
              )}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            {selectedToolType && (
              <Button 
                size="sm"
                onClick={handleCopyStandard}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                📄 標準版コピー
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setActiveTab(activeTab === 'files' ? 'docs' : 'files')}
            >
              <FileText className="h-4 w-4 mr-2" />
              {activeTab === 'files' ? 'ドキュメント' : 'ファイル'}
            </Button>
            <Button size="sm" onClick={handleScan} disabled={isScanning} className="bg-green-600 hover:bg-green-700">
              {isScanning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {isScanning ? 'スキャン中...' : '再スキャン'}
            </Button>
          </div>
        </div>

        {/* タブ */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'files' | 'docs' | 'tech')}>
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="files">📁 ファイル</TabsTrigger>
            <TabsTrigger value="docs">📚 ドキュメント</TabsTrigger>
            <TabsTrigger value="tech">🏗️ 技術スタック</TabsTrigger>
          </TabsList>

          {/* ファイルタブ */}
          <TabsContent value="files" className="space-y-4 mt-4">
            {/* 統計 */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">総ファイル数</div>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">ツール数</div>
                  <div className="text-2xl font-bold">{stats?.toolTypes || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">カテゴリ数</div>
                  <div className="text-2xl font-bold">{stats?.categories || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">関連ツール</div>
                  <div className="text-2xl font-bold">{stats?.relatedTools?.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* フィルター */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ファイル名、パスで検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {stats && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">ツール:</span>
                  <Badge 
                    variant={selectedToolType === null ? "default" : "outline"}
                    className={`cursor-pointer ${selectedToolType === null ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    onClick={() => setSelectedToolType(null)}
                  >
                    すべて ({stats.total})
                  </Badge>
                  {Object.entries(stats.byToolType).sort((a, b) => b[1] - a[1]).map(([tool, count]) => (
                    <Badge
                      key={tool}
                      variant={selectedToolType === tool ? "default" : "outline"}
                      className={`cursor-pointer flex items-center gap-1 ${
                        selectedToolType === tool 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'hover:bg-blue-50'
                      }`}
                      onClick={() => handleToolClick(tool)}
                      title="クリックでフィルタ"
                    >
                      {tool} ({count})
                      <Sparkles className="h-3 w-3" />
                    </Badge>
                  ))}
                  {selectedToolType && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedToolType(null)}
                      className="h-6 px-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}

              {extensions.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm font-medium">拡張子:</span>
                  <Badge 
                    variant={selectedExtension === null ? "default" : "outline"}
                    className={`cursor-pointer ${selectedExtension === null ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    onClick={() => setSelectedExtension(null)}
                  >
                    すべて ({extensionTotal})
                  </Badge>
                  {extensions.map(ext => (
                    <Badge
                      key={ext}
                      variant={selectedExtension === ext ? "default" : "outline"}
                      className={`cursor-pointer ${selectedExtension === ext ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      onClick={() => setSelectedExtension(ext)}
                    >
                      .{ext} ({stats.byExtension[ext]})
                    </Badge>
                  ))}
                  {extensionTotal !== stats?.total && (
                    <span className="text-xs text-amber-600 ml-2">
                      ⚠️ 合計{extensionTotal}件 (総数{stats?.total}件と不一致)
                    </span>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ドキュメントタブ */}
          <TabsContent value="docs" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCopyDoc('folder')}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <FolderTree className="h-8 w-8 text-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">📁 フォルダ構造ガイド</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        各フォルダの役割、修正タイミング、開発ワークフロー
                      </p>
                      <Button size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        コピー
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleCopyDoc('coding')}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <FileCode className="h-8 w-8 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">💻 コーディング規約</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Tailwind CSS、TypeScript、命名規則、ベストプラクティス
                      </p>
                      <Button size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        コピー
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-blue-50">
              <CardContent className="pt-4">
                <h4 className="font-bold mb-2">💡 使い方</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>上記のドキュメントをコピー</li>
                  <li>「ファイル」タブで修正したいツールをクリック</li>
                  <li>ヘッダーの「📄 標準版コピー」をクリック</li>
                  <li>Geminiに全て貼り付けて質問</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 技術スタックタブ */}
          <TabsContent value="tech" className="space-y-4 mt-4">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <BookOpen className="h-10 w-10 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2">🏗️ システム技術スタック & 開発ガイド</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      使用技術、ファイル配置ルール、開発手順、よくある問題の解決法
                    </p>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleCopyDoc('tech')}>
                      <Copy className="h-4 w-4 mr-2" />
                      技術スタックをコピー
                    </Button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border shadow-sm">
                  <ScrollArea className="h-96">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{TECH_STACK_DOC}</pre>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  💡 Gemini開発時の使い方
                </h4>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>上の「技術スタックをコピー」ボタンをクリック</li>
                  <li>Geminiチャットに貼り付け</li>
                  <li>「このドキュメントを読んでから、[機能名]を実装してください」と指示</li>
                  <li>Geminiが正しいディレクトリ構造とファイル配置で開発します</li>
                </ol>
                
                <div className="mt-4 p-3 bg-white rounded border">
                  <p className="text-xs font-mono text-gray-700">
                    例: 「このドキュメントを読んでから、BUYMA仕入れシミュレーターを実装してください。<br />
                    関連ファイル: app/tools/buyma-simulator/page.tsx, lib/supabase.ts, types/buyma.ts, components/layout/SidebarConfig.ts」
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* メインコンテンツ */}
      {activeTab === 'files' && (
        <div className="flex-1 flex overflow-hidden">
          {/* 左サイドバー: フォルダ階層 */}
          <div className="w-96 border-r flex flex-col">
            <div className="p-2 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                フォルダ構造 ({allData.length}件)
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">読み込み中...</p>
                ) : tree.length > 0 ? (
                  renderTree(tree)
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    スキャンしてください
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 中央: ファイルリスト */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b">
              <h3 className="text-sm font-semibold">
                ファイル一覧 ({filteredData.length}件)
                {selectedToolType && ` - ${selectedToolType}`}
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredData.slice(0, 200).map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 border rounded cursor-pointer hover:bg-accent transition-colors ${
                      selectedFile?.id === item.id ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => handleSelectFile(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{item.file_name}</span>
                          <Badge variant="outline" className="text-xs">{item.tech_stack}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1">{item.path}</p>
                        {item.related_tools && item.related_tools.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.related_tools.slice(0, 3).map((tool, idx) => (
                              <Badge key={idx} className="text-xs bg-gray-200 text-gray-800 hover:bg-gray-300">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {item.tool_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* ファイル詳細モーダル */}
      <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {selectedFile?.file_name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedFile?.path}</p>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">ファイルの役割・メモ</label>
                    <Textarea
                      placeholder="このファイルの役割や重要な情報..."
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={5}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">いつ修正するか</label>
                    <Textarea
                      placeholder="例: 新しいツール追加時..."
                      value={whenToModify}
                      onChange={(e) => setWhenToModify(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <Button size="sm" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    メモを保存
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">💻 コード内容</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(editedContent)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={28}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
