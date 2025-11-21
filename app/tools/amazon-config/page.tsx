'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle, Save, Trash2, Zap } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface AmazonConfig {
  id?: number
  config_name: string
  search_keywords?: string
  target_category_id?: string
  min_rating: number
  max_bsr_rank: number
  min_image_count: number
  min_title_length: number
  is_active: boolean
}

const initialConfig: AmazonConfig = {
  config_name: '新規設定',
  search_keywords: '',
  target_category_id: '',
  min_rating: 4.0,
  max_bsr_rank: 10000,
  min_image_count: 3,
  min_title_length: 30,
  is_active: true
}

export default function AmazonConfigPage() {
  const [configs, setConfigs] = useState<AmazonConfig[]>([])
  const [newConfig, setNewConfig] = useState<AmazonConfig>(initialConfig)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/amazon/config')
      const data = await res.json()
      if (Array.isArray(data)) {
        setConfigs(data)
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error)
      toast({
        title: 'エラー',
        description: '設定の取得に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleSave = async (configData: AmazonConfig) => {
    try {
      setLoading(true)
      const res = await fetch('/api/amazon/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
      })

      if (!res.ok) {
        throw new Error('Failed to save config')
      }

      toast({
        title: '成功',
        description: '設定を保存しました',
      })

      setNewConfig(initialConfig)
      await fetchConfigs()
    } catch (error) {
      console.error('Failed to save config:', error)
      toast({
        title: 'エラー',
        description: '設定の保存に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('この設定を削除してもよろしいですか？')) {
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`/api/amazon/config?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete config')
      }

      toast({
        title: '成功',
        description: '設定を削除しました',
      })

      await fetchConfigs()
    } catch (error) {
      console.error('Failed to delete config:', error)
      toast({
        title: 'エラー',
        description: '設定の削除に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (config: AmazonConfig) => {
    await handleSave({ ...config, is_active: !config.is_active })
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Amazon 自動取得設定</h1>

      {/* 新規設定セクション */}
      <Card className="mb-8 border-blue-500 border-2">
        <CardHeader className="bg-blue-50/50">
          <CardTitle className="flex items-center">
            <PlusCircle className="mr-2 h-5 w-5" /> 新規設定作成
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          <div className="md:col-span-1">
            <Label htmlFor="name">設定名</Label>
            <Input
              id="name"
              value={newConfig.config_name}
              onChange={e => setNewConfig({ ...newConfig, config_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="category">ターゲットカテゴリID</Label>
            <Input
              id="category"
              placeholder="例: 2280165011 (おもちゃ)"
              value={newConfig.target_category_id || ''}
              onChange={e => setNewConfig({ ...newConfig, target_category_id: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="keywords">検索キーワード/URL</Label>
            <Input
              id="keywords"
              placeholder="例: New Release Toys"
              value={newConfig.search_keywords || ''}
              onChange={e => setNewConfig({ ...newConfig, search_keywords: e.target.value })}
            />
          </div>

          <h3 className="col-span-full text-lg font-semibold border-t pt-4 mt-2">
            ✨ フィルタリング / スコアリング閾値
          </h3>

          <div className="space-y-1">
            <Label htmlFor="bsr">最大BSR (1位に近いほど良い)</Label>
            <Input
              id="bsr"
              type="number"
              value={newConfig.max_bsr_rank}
              onChange={e => setNewConfig({ ...newConfig, max_bsr_rank: parseInt(e.target.value) || 0 })}
            />
            <p className="text-sm text-gray-500">この順位以下の商品は取得対象外</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="rating">最小平均評価</Label>
            <Input
              id="rating"
              type="number"
              step="0.1"
              value={newConfig.min_rating}
              onChange={e => setNewConfig({ ...newConfig, min_rating: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-sm text-gray-500">この評価点未満の商品は取得対象外</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="images">最小画像枚数 (売れないカタログ排除)</Label>
            <Input
              id="images"
              type="number"
              value={newConfig.min_image_count}
              onChange={e => setNewConfig({ ...newConfig, min_image_count: parseInt(e.target.value) || 0 })}
            />
            <p className="text-sm text-gray-500">情報不足のカタログを排除</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="title">最小タイトル文字数</Label>
            <Input
              id="title"
              type="number"
              value={newConfig.min_title_length}
              onChange={e => setNewConfig({ ...newConfig, min_title_length: parseInt(e.target.value) || 0 })}
            />
            <p className="text-sm text-gray-500">情報不足のカタログを排除</p>
          </div>

          <div className="col-span-full mt-4 flex justify-end">
            <Button
              onClick={() => handleSave(newConfig)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" /> 設定を保存
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 既存の設定リストセクション */}
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        既存の設定リスト ({configs.length} 件)
      </h2>

      {loading && configs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          設定がありません。新規設定を作成してください。
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map(config => (
            <Card key={config.id} className="p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{config.config_name}</h3>
                <div className="flex items-center space-x-4">
                  <Label htmlFor={`active-${config.id}`}>有効/無効</Label>
                  <Switch
                    id={`active-${config.id}`}
                    checked={config.is_active}
                    onCheckedChange={() => handleToggleActive(config)}
                    disabled={loading}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    disabled={loading}
                  >
                    <Zap className="h-4 w-4 mr-2" /> 手動実行
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => config.id && handleDelete(config.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                <p>カテゴリ: {config.target_category_id || '未設定'}</p>
                <p>最小画像: {config.min_image_count}枚</p>
                <p>最大BSR: {config.max_bsr_rank}位</p>
                <p>最小評価: {config.min_rating}点</p>
              </div>
              {config.search_keywords && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>キーワード: {config.search_keywords}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
