'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bot, Plus, Trash2, Edit, Globe, Sparkles,
  FileText, TrendingUp, Users, Save, RefreshCw,
  Zap, Target, BookOpen, Settings
} from 'lucide-react'

interface Persona {
  id: string
  name: string
  age: number
  expertise: string
  style_prompt: string
  created_at: string
}

interface SiteConfig {
  id: string
  domain: string
  platform: string
  persona_id: string
  api_key?: string
  status: 'active' | 'inactive'
  created_at: string
}

interface IdeaSource {
  id: string
  url: string
  status: 'pending' | 'analyzed' | 'published'
  priority: number
  created_at: string
}

export default function ContentAutomationPage() {
  const [activeTab, setActiveTab] = useState<'personas' | 'sites' | 'ideas' | 'generate'>('personas')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [sites, setSites] = useState<SiteConfig[]>([])
  const [ideas, setIdeas] = useState<IdeaSource[]>([])
  const [loading, setLoading] = useState(false)

  // Persona Form State
  const [personaForm, setPersonaForm] = useState({
    name: '',
    age: 30,
    expertise: '',
    style_prompt: ''
  })

  // Site Form State
  const [siteForm, setSiteForm] = useState({
    domain: '',
    platform: 'WordPress',
    persona_id: '',
    api_key: ''
  })

  // Idea Form State
  const [ideaUrl, setIdeaUrl] = useState('')

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // TODO: APIからデータを読み込む
    // 現在はダミーデータ
    setPersonas([
      {
        id: '1',
        name: '山田太郎',
        age: 35,
        expertise: 'テクノロジー・ガジェット',
        style_prompt: 'フレンドリーで分かりやすい解説スタイル',
        created_at: new Date().toISOString()
      }
    ])

    setSites([
      {
        id: '1',
        domain: 'example-blog.com',
        platform: 'WordPress',
        persona_id: '1',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ])

    setIdeas([
      {
        id: '1',
        url: 'https://example.com/trending-article',
        status: 'pending',
        priority: 1,
        created_at: new Date().toISOString()
      }
    ])
  }

  const handleCreatePersona = async () => {
    if (!personaForm.name || !personaForm.expertise) {
      alert('名前と専門性は必須です')
      return
    }

    // TODO: APIに送信
    const newPersona: Persona = {
      id: String(Date.now()),
      ...personaForm,
      created_at: new Date().toISOString()
    }

    setPersonas([...personas, newPersona])
    setPersonaForm({ name: '', age: 30, expertise: '', style_prompt: '' })
  }

  const handleCreateSite = async () => {
    if (!siteForm.domain || !siteForm.persona_id) {
      alert('ドメインとペルソナは必須です')
      return
    }

    // TODO: APIに送信
    const newSite: SiteConfig = {
      id: String(Date.now()),
      ...siteForm,
      status: 'active',
      created_at: new Date().toISOString()
    }

    setSites([...sites, newSite])
    setSiteForm({ domain: '', platform: 'WordPress', persona_id: '', api_key: '' })
  }

  const handleAddIdea = async () => {
    if (!ideaUrl) {
      alert('URLを入力してください')
      return
    }

    // TODO: APIに送信
    const newIdea: IdeaSource = {
      id: String(Date.now()),
      url: ideaUrl,
      status: 'pending',
      priority: 1,
      created_at: new Date().toISOString()
    }

    setIdeas([...ideas, newIdea])
    setIdeaUrl('')
  }

  const handleGenerateContent = async () => {
    setLoading(true)
    // TODO: コンテンツ生成APIを呼び出す
    setTimeout(() => {
      alert('コンテンツ生成を開始しました！')
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Bot className="h-8 w-8 text-primary" />
            コンテンツ自動生成エンジン
          </h1>
          <p className="text-muted-foreground">
            ペルソナ駆動のAIコンテンツ自動生成・マルチサイト配信システム
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ペルソナ数</p>
                  <p className="text-2xl font-bold">{personas.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">管理サイト数</p>
                  <p className="text-2xl font-bold">{sites.length}</p>
                </div>
                <Globe className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">アイデアソース</p>
                  <p className="text-2xl font-bold">{ideas.length}</p>
                </div>
                <Sparkles className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">生成済み記事</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personas">
              <Users className="h-4 w-4 mr-2" />
              ペルソナ管理
            </TabsTrigger>
            <TabsTrigger value="sites">
              <Globe className="h-4 w-4 mr-2" />
              サイト管理
            </TabsTrigger>
            <TabsTrigger value="ideas">
              <Sparkles className="h-4 w-4 mr-2" />
              アイデアソース
            </TabsTrigger>
            <TabsTrigger value="generate">
              <Zap className="h-4 w-4 mr-2" />
              コンテンツ生成
            </TabsTrigger>
          </TabsList>

          {/* Personas Tab */}
          <TabsContent value="personas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>新しいペルソナを作成</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">名前</label>
                    <Input
                      value={personaForm.name}
                      onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
                      placeholder="山田太郎"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">年齢</label>
                    <Input
                      type="number"
                      value={personaForm.age}
                      onChange={(e) => setPersonaForm({ ...personaForm, age: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">専門性</label>
                  <Input
                    value={personaForm.expertise}
                    onChange={(e) => setPersonaForm({ ...personaForm, expertise: e.target.value })}
                    placeholder="テクノロジー・ガジェット"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">文体プロンプト</label>
                  <Textarea
                    value={personaForm.style_prompt}
                    onChange={(e) => setPersonaForm({ ...personaForm, style_prompt: e.target.value })}
                    placeholder="フレンドリーで分かりやすい解説スタイル"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreatePersona} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  ペルソナを作成
                </Button>
              </CardContent>
            </Card>

            {/* Personas List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personas.map((persona) => (
                <Card key={persona.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{persona.name}</span>
                      <Badge>{persona.age}歳</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>専門性:</strong> {persona.expertise}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>文体:</strong> {persona.style_prompt}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Sites Tab */}
          <TabsContent value="sites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>新しいサイトを登録</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">ドメイン</label>
                    <Input
                      value={siteForm.domain}
                      onChange={(e) => setSiteForm({ ...siteForm, domain: e.target.value })}
                      placeholder="example-blog.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">プラットフォーム</label>
                    <Input
                      value={siteForm.platform}
                      onChange={(e) => setSiteForm({ ...siteForm, platform: e.target.value })}
                      placeholder="WordPress"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">ペルソナ</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={siteForm.persona_id}
                    onChange={(e) => setSiteForm({ ...siteForm, persona_id: e.target.value })}
                  >
                    <option value="">選択してください</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.expertise}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">API Key（オプション）</label>
                  <Input
                    type="password"
                    value={siteForm.api_key}
                    onChange={(e) => setSiteForm({ ...siteForm, api_key: e.target.value })}
                    placeholder="WordPress REST API Key"
                  />
                </div>
                <Button onClick={handleCreateSite} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  サイトを登録
                </Button>
              </CardContent>
            </Card>

            {/* Sites List */}
            <div className="grid grid-cols-1 gap-4">
              {sites.map((site) => (
                <Card key={site.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {site.domain}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          プラットフォーム: {site.platform} | ペルソナID: {site.persona_id}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={site.status === 'active' ? 'default' : 'secondary'}>
                          {site.status}
                        </Badge>
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

          {/* Ideas Tab */}
          <TabsContent value="ideas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>アイデアソースを追加</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={ideaUrl}
                    onChange={(e) => setIdeaUrl(e.target.value)}
                    placeholder="https://example.com/trending-article"
                    className="flex-1"
                  />
                  <Button onClick={handleAddIdea}>
                    <Plus className="h-4 w-4 mr-2" />
                    追加
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Ideas List */}
            <div className="space-y-2">
              {ideas.map((idea) => (
                <Card key={idea.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{idea.url}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          優先度: {idea.priority}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            idea.status === 'published'
                              ? 'default'
                              : idea.status === 'analyzed'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {idea.status}
                        </Badge>
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

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>コンテンツ自動生成</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">生成設定</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    登録済みのペルソナ、サイト、アイデアソースを基にAIがコンテンツを自動生成します
                  </p>
                  <div className="space-y-2 text-sm">
                    <p>✓ ペルソナ: {personas.length}件</p>
                    <p>✓ サイト: {sites.length}件</p>
                    <p>✓ アイデアソース: {ideas.length}件</p>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateContent}
                  disabled={loading || personas.length === 0 || sites.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      コンテンツ生成を開始
                    </>
                  )}
                </Button>

                {(personas.length === 0 || sites.length === 0) && (
                  <p className="text-sm text-destructive text-center">
                    ※ ペルソナとサイトを最低1つずつ登録してください
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
