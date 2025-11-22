'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Globe, Share2, Calendar, Send, CheckCircle,
  Clock, AlertCircle, TrendingUp, BarChart3,
  Video, FileText, Image, Music, Eye, Edit,
  Trash2, Plus, Sparkles, Zap, RefreshCw
} from 'lucide-react'

interface ContentItem {
  id: string
  title: string
  type: 'blog' | 'video' | 'social' | 'podcast'
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  platforms: string[]
  scheduledDate?: string
  publishedDate?: string
  views?: number
  engagement?: number
  created_at: string
}

interface Platform {
  id: string
  name: string
  type: 'blog' | 'video' | 'social'
  connected: boolean
  lastSync?: string
  totalPosts: number
  avgViews: number
}

const PLATFORMS: Platform[] = [
  {
    id: 'wordpress-1',
    name: 'WordPress Blog 1',
    type: 'blog',
    connected: true,
    lastSync: new Date().toISOString(),
    totalPosts: 45,
    avgViews: 1250
  },
  {
    id: 'wordpress-2',
    name: 'WordPress Blog 2',
    type: 'blog',
    connected: true,
    lastSync: new Date().toISOString(),
    totalPosts: 32,
    avgViews: 890
  },
  {
    id: 'youtube',
    name: 'YouTube',
    type: 'video',
    connected: true,
    lastSync: new Date().toISOString(),
    totalPosts: 28,
    avgViews: 5420
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    type: 'social',
    connected: false,
    totalPosts: 0,
    avgViews: 0
  },
  {
    id: 'facebook',
    name: 'Facebook',
    type: 'social',
    connected: false,
    totalPosts: 0,
    avgViews: 0
  }
]

const CONTENT_TYPES = [
  { value: 'blog', label: 'ブログ記事', icon: FileText },
  { value: 'video', label: '動画', icon: Video },
  { value: 'social', label: 'SNS投稿', icon: Share2 },
  { value: 'podcast', label: 'ポッドキャスト', icon: Music }
]

export default function IntegratedContentPage() {
  const [activeTab, setActiveTab] = useState<'content' | 'platforms' | 'analytics' | 'schedule'>('content')
  const [contents, setContents] = useState<ContentItem[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS)
  const [showNewContentForm, setShowNewContentForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // New Content Form State
  const [newContent, setNewContent] = useState({
    title: '',
    type: 'blog' as ContentItem['type'],
    platforms: [] as string[],
    scheduledDate: ''
  })

  useEffect(() => {
    loadContents()
  }, [])

  const loadContents = async () => {
    // TODO: APIからデータを読み込む
    const dummyContents: ContentItem[] = [
      {
        id: '1',
        title: '【2024年最新】AIコンテンツ生成ツール徹底比較',
        type: 'blog',
        status: 'published',
        platforms: ['wordpress-1', 'wordpress-2'],
        publishedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        views: 3450,
        engagement: 8.5,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        title: 'YouTube自動化の始め方【初心者向け完全ガイド】',
        type: 'video',
        status: 'scheduled',
        platforms: ['youtube'],
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        title: 'マルチプラットフォーム戦略で収益10倍に',
        type: 'social',
        status: 'draft',
        platforms: [],
        created_at: new Date().toISOString()
      }
    ]
    setContents(dummyContents)
  }

  const handleCreateContent = async () => {
    if (!newContent.title || newContent.platforms.length === 0) {
      alert('タイトルと配信先プラットフォームを選択してください')
      return
    }

    const content: ContentItem = {
      id: String(Date.now()),
      title: newContent.title,
      type: newContent.type,
      status: newContent.scheduledDate ? 'scheduled' : 'draft',
      platforms: newContent.platforms,
      scheduledDate: newContent.scheduledDate || undefined,
      created_at: new Date().toISOString()
    }

    setContents([content, ...contents])
    setNewContent({
      title: '',
      type: 'blog',
      platforms: [],
      scheduledDate: ''
    })
    setShowNewContentForm(false)
  }

  const handlePublishContent = async (id: string) => {
    setLoading(true)
    // TODO: 公開APIを呼び出す
    setTimeout(() => {
      setContents(
        contents.map((c) =>
          c.id === id
            ? { ...c, status: 'published', publishedDate: new Date().toISOString() }
            : c
        )
      )
      setLoading(false)
      alert('コンテンツを公開しました！')
    }, 1500)
  }

  const handleAutoGenerate = async () => {
    alert('AI一括生成機能は近日公開予定です')
  }

  const getStatusIcon = (status: ContentItem['status']) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Edit className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: ContentItem['status']) => {
    const variants = {
      published: 'default',
      scheduled: 'secondary',
      draft: 'outline',
      failed: 'destructive'
    }
    return <Badge variant={variants[status] as any}>{status}</Badge>
  }

  const getTypeIcon = (type: ContentItem['type']) => {
    const Icon = CONTENT_TYPES.find((t) => t.value === type)?.icon || FileText
    return <Icon className="h-4 w-4" />
  }

  const totalPublished = contents.filter((c) => c.status === 'published').length
  const totalScheduled = contents.filter((c) => c.status === 'scheduled').length
  const totalDrafts = contents.filter((c) => c.status === 'draft').length
  const totalViews = contents.reduce((sum, c) => sum + (c.views || 0), 0)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Globe className="h-8 w-8 text-primary" />
            統合コンテンツ管理
          </h1>
          <p className="text-muted-foreground">
            複数プラットフォームへのコンテンツ配信・スケジュール管理
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">公開済み</p>
                  <p className="text-2xl font-bold">{totalPublished}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">予約投稿</p>
                  <p className="text-2xl font-bold">{totalScheduled}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">下書き</p>
                  <p className="text-2xl font-bold">{totalDrafts}</p>
                </div>
                <Edit className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">総閲覧数</p>
                  <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-2" />
              コンテンツ
            </TabsTrigger>
            <TabsTrigger value="platforms">
              <Globe className="h-4 w-4 mr-2" />
              プラットフォーム
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              スケジュール
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              分析
            </TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="flex justify-between items-center">
              <Button onClick={() => setShowNewContentForm(!showNewContentForm)}>
                <Plus className="h-4 w-4 mr-2" />
                新規コンテンツ
              </Button>
              <Button variant="outline" onClick={handleAutoGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI一括生成
              </Button>
            </div>

            {showNewContentForm && (
              <Card>
                <CardHeader>
                  <CardTitle>新規コンテンツ作成</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">タイトル</label>
                    <Input
                      value={newContent.title}
                      onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                      placeholder="コンテンツのタイトル"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">コンテンツタイプ</label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {CONTENT_TYPES.map((type) => (
                        <Button
                          key={type.value}
                          variant={newContent.type === type.value ? 'default' : 'outline'}
                          onClick={() =>
                            setNewContent({ ...newContent, type: type.value as any })
                          }
                          className="flex flex-col h-auto py-3"
                        >
                          <type.icon className="h-5 w-5 mb-1" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">配信先プラットフォーム</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {platforms
                        .filter((p) => p.connected)
                        .map((platform) => (
                          <Button
                            key={platform.id}
                            variant={
                              newContent.platforms.includes(platform.id) ? 'default' : 'outline'
                            }
                            onClick={() => {
                              const updated = newContent.platforms.includes(platform.id)
                                ? newContent.platforms.filter((p) => p !== platform.id)
                                : [...newContent.platforms, platform.id]
                              setNewContent({ ...newContent, platforms: updated })
                            }}
                          >
                            {platform.name}
                          </Button>
                        ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">公開日時（オプション）</label>
                    <Input
                      type="datetime-local"
                      value={newContent.scheduledDate}
                      onChange={(e) =>
                        setNewContent({ ...newContent, scheduledDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateContent} className="flex-1">
                      作成
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewContentForm(false)}>
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content List */}
            <div className="space-y-2">
              {contents.map((content) => (
                <Card key={content.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(content.status)}
                          {getTypeIcon(content.type)}
                          <h3 className="font-semibold">{content.title}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {getStatusBadge(content.status)}
                          {content.platforms.map((platformId) => {
                            const platform = platforms.find((p) => p.id === platformId)
                            return (
                              <Badge key={platformId} variant="outline">
                                {platform?.name}
                              </Badge>
                            )
                          })}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          {content.views && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {content.views.toLocaleString()}
                            </span>
                          )}
                          {content.engagement && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {content.engagement}%
                            </span>
                          )}
                          {content.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(content.scheduledDate).toLocaleString('ja-JP')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {content.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handlePublishContent(content.id)}
                            disabled={loading}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            公開
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platforms.map((platform) => (
                <Card key={platform.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{platform.name}</span>
                      <Badge variant={platform.connected ? 'default' : 'secondary'}>
                        {platform.connected ? '接続済み' : '未接続'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">投稿数</p>
                        <p className="font-bold">{platform.totalPosts}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">平均閲覧数</p>
                        <p className="font-bold">{platform.avgViews.toLocaleString()}</p>
                      </div>
                    </div>
                    {platform.lastSync && (
                      <p className="text-xs text-muted-foreground">
                        最終同期: {new Date(platform.lastSync).toLocaleString('ja-JP')}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {platform.connected ? (
                        <>
                          <Button size="sm" variant="outline" className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-1" />
                            同期
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1">
                            切断
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="w-full">
                          接続
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>公開スケジュール</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contents
                    .filter((c) => c.status === 'scheduled')
                    .sort(
                      (a, b) =>
                        new Date(a.scheduledDate!).getTime() -
                        new Date(b.scheduledDate!).getTime()
                    )
                    .map((content) => (
                      <div
                        key={content.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{content.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(content.scheduledDate!).toLocaleString('ja-JP')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {getTypeIcon(content.type)}
                          <Badge variant="secondary">予約済み</Badge>
                        </div>
                      </div>
                    ))}
                  {contents.filter((c) => c.status === 'scheduled').length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      予約投稿はありません
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">総閲覧数</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4" />
                    +12.5% vs 先週
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">平均エンゲージメント率</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">7.2%</p>
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4" />
                    +2.1% vs 先週
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">公開頻度</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">3.2</p>
                  <p className="text-sm text-muted-foreground mt-2">記事/日</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>プラットフォーム別パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {platforms
                    .filter((p) => p.connected)
                    .map((platform) => (
                      <div key={platform.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{platform.name}</span>
                          <span className="text-sm text-muted-foreground">
                            平均 {platform.avgViews.toLocaleString()} 閲覧
                          </span>
                        </div>
                        <div className="bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                (platform.avgViews / Math.max(...platforms.map((p) => p.avgViews))) *
                                  100,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
