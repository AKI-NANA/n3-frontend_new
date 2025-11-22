'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Video, CheckCircle2, Circle, Plus, Trash2,
  Upload, Edit, Download, Play, Mic, Camera,
  FileText, Image, Music, Settings, Sparkles, Zap
} from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  category: 'pre' | 'production' | 'post' | 'publish'
}

interface VideoProject {
  id: string
  title: string
  description: string
  targetLength: number
  status: 'planning' | 'recording' | 'editing' | 'ready' | 'published'
  checklist: ChecklistItem[]
  created_at: string
  published_at?: string
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'id'>[] = [
  // Pre-Production
  { label: '企画・テーマ決定', completed: false, category: 'pre' },
  { label: '台本作成', completed: false, category: 'pre' },
  { label: 'サムネイルデザイン案', completed: false, category: 'pre' },
  { label: 'キーワードリサーチ', completed: false, category: 'pre' },
  { label: '競合分析', completed: false, category: 'pre' },

  // Production
  { label: '撮影機材準備', completed: false, category: 'production' },
  { label: 'ライティング設定', completed: false, category: 'production' },
  { label: '音声収録', completed: false, category: 'production' },
  { label: '映像撮影', completed: false, category: 'production' },
  { label: 'B-roll素材撮影', completed: false, category: 'production' },

  // Post-Production
  { label: '動画編集（カット・つなぎ）', completed: false, category: 'post' },
  { label: 'BGM・効果音追加', completed: false, category: 'post' },
  { label: 'テロップ・字幕追加', completed: false, category: 'post' },
  { label: 'カラーグレーディング', completed: false, category: 'post' },
  { label: 'サムネイル最終版作成', completed: false, category: 'post' },

  // Publishing
  { label: 'タイトル最適化', completed: false, category: 'publish' },
  { label: '説明文作成（SEO対策）', completed: false, category: 'publish' },
  { label: 'タグ設定', completed: false, category: 'publish' },
  { label: 'プレイリスト追加', completed: false, category: 'publish' },
  { label: 'エンドスクリーン設定', completed: false, category: 'publish' },
  { label: '公開日時予約', completed: false, category: 'publish' },
]

const CATEGORY_LABELS = {
  pre: '企画・準備',
  production: '撮影',
  post: '編集',
  publish: '公開準備'
}

const CATEGORY_COLORS = {
  pre: 'bg-blue-500',
  production: 'bg-purple-500',
  post: 'bg-orange-500',
  publish: 'bg-green-500'
}

export default function YouTubeChecklistPage() {
  const [projects, setProjects] = useState<VideoProject[]>([])
  const [selectedProject, setSelectedProject] = useState<VideoProject | null>(null)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    // TODO: APIからデータを読み込む
    // 現在はダミーデータ
    const dummyProjects: VideoProject[] = [
      {
        id: '1',
        title: '【完全ガイド】初心者のためのYouTube始め方',
        description: 'YouTubeチャンネルの開設から収益化まで徹底解説',
        targetLength: 15,
        status: 'recording',
        checklist: DEFAULT_CHECKLIST.map((item, idx) => ({
          ...item,
          id: String(idx),
          completed: idx < 3
        })),
        created_at: new Date().toISOString()
      }
    ]
    setProjects(dummyProjects)
    if (dummyProjects.length > 0) {
      setSelectedProject(dummyProjects[0])
    }
  }

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) {
      alert('タイトルを入力してください')
      return
    }

    const newProject: VideoProject = {
      id: String(Date.now()),
      title: newProjectTitle,
      description: '',
      targetLength: 10,
      status: 'planning',
      checklist: DEFAULT_CHECKLIST.map((item, idx) => ({
        ...item,
        id: String(idx)
      })),
      created_at: new Date().toISOString()
    }

    setProjects([...projects, newProject])
    setSelectedProject(newProject)
    setNewProjectTitle('')
    setShowNewProjectForm(false)
  }

  const handleToggleChecklistItem = (itemId: string) => {
    if (!selectedProject) return

    const updatedChecklist = selectedProject.checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )

    const updatedProject = { ...selectedProject, checklist: updatedChecklist }
    setSelectedProject(updatedProject)
    setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)))
  }

  const getProgressPercentage = (project: VideoProject) => {
    const completed = project.checklist.filter((item) => item.completed).length
    const total = project.checklist.length
    return Math.round((completed / total) * 100)
  }

  const getCategoryProgress = (project: VideoProject, category: string) => {
    const categoryItems = project.checklist.filter((item) => item.category === category)
    const completed = categoryItems.filter((item) => item.completed).length
    return {
      completed,
      total: categoryItems.length,
      percentage: Math.round((completed / categoryItems.length) * 100)
    }
  }

  const handleGenerateScript = async () => {
    if (!selectedProject) return
    alert('AI台本生成機能は近日公開予定です')
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Video className="h-8 w-8 text-primary" />
            YouTube制作チェックリスト
          </h1>
          <p className="text-muted-foreground">
            動画制作のタスク管理・進捗可視化ツール
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">総プロジェクト</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
                <Video className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">制作中</p>
                  <p className="text-2xl font-bold">
                    {projects.filter((p) => p.status === 'recording' || p.status === 'editing').length}
                  </p>
                </div>
                <Camera className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">公開準備完了</p>
                  <p className="text-2xl font-bold">
                    {projects.filter((p) => p.status === 'ready').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">公開済み</p>
                  <p className="text-2xl font-bold">
                    {projects.filter((p) => p.status === 'published').length}
                  </p>
                </div>
                <Play className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar: Project List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>プロジェクト一覧</span>
                  <Button
                    size="sm"
                    onClick={() => setShowNewProjectForm(!showNewProjectForm)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {showNewProjectForm && (
                  <div className="p-3 border rounded-lg space-y-2 bg-muted">
                    <Input
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="新しい動画のタイトル"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateProject} className="flex-1">
                        作成
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowNewProjectForm(false)}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                )}

                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProject?.id === project.id
                        ? 'border-primary bg-accent'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <h4 className="font-medium text-sm mb-2">{project.title}</h4>
                    <div className="flex items-center justify-between">
                      <Badge variant={project.status === 'published' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getProgressPercentage(project)}%
                      </span>
                    </div>
                    <div className="mt-2 bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(project)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content: Checklist */}
          <div className="lg:col-span-2 space-y-4">
            {selectedProject ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedProject.title}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleGenerateScript}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI台本生成
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground">
                        目標時間: {selectedProject.targetLength}分
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">作成日</p>
                          <p className="text-sm">
                            {new Date(selectedProject.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">全体進捗</p>
                          <p className="text-sm font-bold">
                            {getProgressPercentage(selectedProject)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Progress */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                    const progress = getCategoryProgress(
                      selectedProject,
                      category as keyof typeof CATEGORY_LABELS
                    )
                    return (
                      <Card key={category}>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className="text-lg font-bold">
                            {progress.completed}/{progress.total}
                          </p>
                          <div className="mt-2 bg-muted rounded-full h-1">
                            <div
                              className={`${
                                CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
                              } h-1 rounded-full transition-all`}
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Checklist by Category */}
                {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
                  const categoryItems = selectedProject.checklist.filter(
                    (item) => item.category === category
                  )
                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
                            }`}
                          />
                          {label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {categoryItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                              onClick={() => handleToggleChecklistItem(item.id)}
                            >
                              {item.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <span
                                className={`flex-1 ${
                                  item.completed ? 'line-through text-muted-foreground' : ''
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    左側から編集するプロジェクトを選択してください
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
