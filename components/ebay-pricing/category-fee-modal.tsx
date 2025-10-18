// components/ebay-pricing/category-fee-modal.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CategoryFeeManager } from './category-fee-manager'
import { Tag } from 'lucide-react'

interface CategoryFeeModalProps {
  trigger?: React.ReactNode
}

export function CategoryFeeModal({ trigger }: CategoryFeeModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Tag className="w-4 h-4 mr-2" />
            カテゴリ判定 + 手数料
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>eBayカテゴリ・手数料管理</DialogTitle>
          <DialogDescription>
            eBay APIからカテゴリとFVF手数料情報を取得し、データベースに一括保存します。
          </DialogDescription>
        </DialogHeader>
        <CategoryFeeManager />
      </DialogContent>
    </Dialog>
  )
}
