/**
 * eBay VeRO違反履歴の手動登録フォーム
 * フィルター管理画面に追加するコンポーネント
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { createClient } from '@supabase/supabase-js'

export function ManualVeROEntryDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    itemId: '',
    title: '',
    violationDate: '',
    violationType: 'VeRO: Parallel Import',
    rightsOwner: '',
    removalReason: '',
    brandDetected: '',
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // VeRO違反データを挿入
      const { error: insertError } = await supabase
        .from('vero_scraped_violations')
        .insert({
          item_id: formData.itemId,
          title: formData.title,
          violation_date: formData.violationDate,
          violation_type: formData.violationType,
          rights_owner: formData.rightsOwner,
          removal_reason: formData.removalReason,
          brand_detected: formData.brandDetected,
          raw_data: { source: 'manual_entry', added_at: new Date().toISOString() }
        })

      if (insertError) throw insertError

      // ブランドの違反カウントを更新
      if (formData.brandDetected) {
        const { error: updateError } = await supabase.rpc('increment_brand_violation', {
          brand_name: formData.brandDetected
        })

        if (updateError) {
          console.error('違反カウント更新エラー:', updateError)
        }
      }

      alert('VeRO違反データを登録しました')
      setOpen(false)
      setFormData({
        itemId: '',
        title: '',
        violationDate: '',
        violationType: 'VeRO: Parallel Import',
        rightsOwner: '',
        removalReason: '',
        brandDetected: '',
      })

      // ページをリロードして最新データを表示
      window.location.reload()

    } catch (error) {
      console.error('登録エラー:', error)
      alert('エラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          VeRO違反を手動登録
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>VeRO違反データを手動登録</DialogTitle>
          <DialogDescription>
            eBayのVeRO履歴ページから情報をコピーして登録してください
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemId">eBayアイテムID *</Label>
              <Input
                id="itemId"
                placeholder="123456789012"
                value={formData.itemId}
                onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="violationDate">違反日時 *</Label>
              <Input
                id="violationDate"
                type="datetime-local"
                value={formData.violationDate}
                onChange={(e) => setFormData({ ...formData, violationDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">商品タイトル *</Label>
            <Input
              id="title"
              placeholder="例: Tamron 24-70mm F2.8 Lens"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="violationType">違反タイプ *</Label>
              <select
                id="violationType"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.violationType}
                onChange={(e) => setFormData({ ...formData, violationType: e.target.value })}
                required
              >
                <option value="VeRO: Parallel Import">VeRO: Parallel Import</option>
                <option value="VeRO: Replica">VeRO: Replica</option>
                <option value="VeRO: Unauthorized">VeRO: Unauthorized</option>
                <option value="VeRO: Trademark">VeRO: Trademark</option>
                <option value="Search Manipulation">Search Manipulation</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandDetected">ブランド名 *</Label>
              <Input
                id="brandDetected"
                placeholder="例: Tamron"
                value={formData.brandDetected}
                onChange={(e) => setFormData({ ...formData, brandDetected: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rightsOwner">権利所有者</Label>
            <Input
              id="rightsOwner"
              placeholder="例: Tamron Co., Ltd."
              value={formData.rightsOwner}
              onChange={(e) => setFormData({ ...formData, rightsOwner: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="removalReason">削除理由</Label>
            <Textarea
              id="removalReason"
              placeholder="例: Unauthorized sale in restricted region"
              value={formData.removalReason}
              onChange={(e) => setFormData({ ...formData, removalReason: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登録中...
                </>
              ) : (
                '登録'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
