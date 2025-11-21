'use client'

import React, { useState, useEffect } from 'react'
import { ListingEditData, Variation, ItemSpecifics } from '@/lib/types/listing'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Upload, Save } from 'lucide-react'
import { toast } from 'sonner'

interface ListingEditModalProps {
  isOpen: boolean
  onClose: () => void
  sku: string
  onSave: (data: ListingEditData) => Promise<void>
}

export function ListingEditModal({ isOpen, onClose, sku, onSave }: ListingEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [data, setData] = useState<ListingEditData | null>(null)

  useEffect(() => {
    if (isOpen && sku) {
      fetchListingData()
    }
  }, [isOpen, sku])

  const fetchListingData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/listing/edit?sku=${sku}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast.error('データの取得に失敗しました')
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
      toast.error('データの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!data) return

    setIsSaving(true)
    try {
      await onSave(data)
      toast.success('出品データを更新しました')
      onClose()
    } catch (error) {
      console.error('保存エラー:', error)
      toast.error('保存中にエラーが発生しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddVariation = () => {
    if (!data) return

    const newVariation: Variation = {
      child_sku: `${sku}-${String(data.variations.length + 1).padStart(3, '0')}`,
      attributes: {},
      images: [],
      stock_count: 0
    }

    setData({
      ...data,
      variations: [...data.variations, newVariation]
    })
  }

  const handleRemoveVariation = (index: number) => {
    if (!data) return

    setData({
      ...data,
      variations: data.variations.filter((_, i) => i !== index)
    })
  }

  const handleVariationChange = (index: number, field: keyof Variation, value: any) => {
    if (!data) return

    const updatedVariations = [...data.variations]
    updatedVariations[index] = {
      ...updatedVariations[index],
      [field]: value
    }

    setData({
      ...data,
      variations: updatedVariations
    })
  }

  if (!data) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>出品データ編集</DialogTitle>
          <DialogDescription>
            SKU: <span className="font-mono font-semibold">{sku}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="specifics">Item Specifics</TabsTrigger>
              <TabsTrigger value="variations">バリエーション</TabsTrigger>
            </TabsList>

            {/* 基本情報タブ */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label>タイトル</Label>
                <Input
                  value={data.title}
                  onChange={(e) => setData({ ...data, title: e.target.value })}
                  placeholder="商品タイトルを入力"
                />
              </div>

              <div className="space-y-2">
                <Label>商品説明</Label>
                <Textarea
                  value={data.description}
                  onChange={(e) => setData({ ...data, description: e.target.value })}
                  placeholder="商品説明を入力"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>出品モード</Label>
                <Select
                  value={data.listing_mode}
                  onValueChange={(value: any) => setData({ ...data, listing_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="中古優先">中古優先</SelectItem>
                    <SelectItem value="新品優先">新品優先</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  モード切替と同時に、タイトルと価格ロジックが自動で切り替わります
                </p>
              </div>
            </TabsContent>

            {/* Item Specifics タブ */}
            <TabsContent value="specifics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ブランド名</Label>
                  <Input
                    value={data.item_specifics.brand_name}
                    onChange={(e) =>
                      setData({
                        ...data,
                        item_specifics: {
                          ...data.item_specifics,
                          brand_name: e.target.value
                        }
                      })
                    }
                    placeholder="ブランド名"
                  />
                  <p className="text-xs text-blue-600">
                    ✓ VERO対策: 保存時に正式名が自動補完されます
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>省略ブランド名</Label>
                  <Input
                    value={data.item_specifics.省略ブランド名 || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        item_specifics: {
                          ...data.item_specifics,
                          省略ブランド名: e.target.value
                        }
                      })
                    }
                    placeholder="省略名"
                  />
                </div>

                <div className="space-y-2">
                  <Label>型番 (MPN)</Label>
                  <Input
                    value={data.item_specifics.mpn}
                    onChange={(e) =>
                      setData({
                        ...data,
                        item_specifics: {
                          ...data.item_specifics,
                          mpn: e.target.value
                        }
                      })
                    }
                    placeholder="型番"
                  />
                </div>

                <div className="space-y-2">
                  <Label>コンディション</Label>
                  <Select
                    value={data.item_specifics.condition}
                    onValueChange={(value: any) =>
                      setData({
                        ...data,
                        item_specifics: {
                          ...data.item_specifics,
                          condition: value
                        }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Used">Used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* バリエーションタブ */}
            <TabsContent value="variations" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  バリエーション数: {data.variations.length}
                  {data.variations.reduce((sum, v) => sum + v.images.length, 0) > 0 && (
                    <span className="ml-2">
                      (画像: {data.variations.reduce((sum, v) => sum + v.images.length, 0)}/24)
                    </span>
                  )}
                </div>
                <Button onClick={handleAddVariation} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  バリエーション追加
                </Button>
              </div>

              {data.variations.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  バリエーションがありません
                </div>
              ) : (
                <div className="space-y-4">
                  {data.variations.map((variation, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">{variation.child_sku}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariation(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">属性 (JSON)</Label>
                          <Textarea
                            value={JSON.stringify(variation.attributes, null, 2)}
                            onChange={(e) => {
                              try {
                                const attrs = JSON.parse(e.target.value)
                                handleVariationChange(index, 'attributes', attrs)
                              } catch {}
                            }}
                            rows={3}
                            className="font-mono text-xs"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">
                            画像 ({variation.images.length}枚)
                          </Label>
                          <Button variant="outline" size="sm" className="w-full">
                            <Upload className="w-4 h-4 mr-1" />
                            画像アップロード
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              '保存中...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                保存
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
