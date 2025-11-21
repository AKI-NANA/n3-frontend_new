'use client'

/**
 * バイヤー報告フォーム
 * 参加者が問題のあるバイヤーを報告するためのフォーム
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface ReportBuyerFormProps {
  userId: string
  onSuccess?: () => void
}

export function ReportBuyerForm({ userId, onSuccess }: ReportBuyerFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    buyer_username: '',
    reason: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    evidence: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.buyer_username || !formData.reason) {
      toast.error('バイヤー名と理由は必須です')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/ebay/blocklist/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report')
      }

      toast.success('バイヤー報告を送信しました')

      // フォームをリセット
      setFormData({
        buyer_username: '',
        reason: '',
        severity: 'medium',
        evidence: '',
      })

      onSuccess?.()
    } catch (error) {
      console.error('Report submission error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit report'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="buyer_username">バイヤーユーザー名 *</Label>
        <Input
          id="buyer_username"
          type="text"
          placeholder="例: problem_buyer123"
          value={formData.buyer_username}
          onChange={(e) =>
            setFormData({ ...formData, buyer_username: e.target.value })
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="severity">深刻度</Label>
        <Select
          value={formData.severity}
          onValueChange={(value: any) =>
            setFormData({ ...formData, severity: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">低 - Low</SelectItem>
            <SelectItem value="medium">中 - Medium</SelectItem>
            <SelectItem value="high">高 - High</SelectItem>
            <SelectItem value="critical">重大 - Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reason">ブロック理由 *</Label>
        <Textarea
          id="reason"
          placeholder="このバイヤーをブロックすべき理由を詳しく説明してください"
          value={formData.reason}
          onChange={(e) =>
            setFormData({ ...formData, reason: e.target.value })
          }
          rows={4}
          required
        />
      </div>

      <div>
        <Label htmlFor="evidence">証拠（オプション）</Label>
        <Textarea
          id="evidence"
          placeholder="URLやスクリーンショットへのリンク、その他の証拠"
          value={formData.evidence}
          onChange={(e) =>
            setFormData({ ...formData, evidence: e.target.value })
          }
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? '送信中...' : 'バイヤーを報告'}
      </Button>
    </form>
  )
}
