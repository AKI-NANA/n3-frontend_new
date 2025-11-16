"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Copy } from "lucide-react"
import { useState } from "react"

interface RegistrationSuccessModalProps {
  isOpen: boolean
  sku: string
  productName: string
  onClose: () => void
}

export function RegistrationSuccessModal({ isOpen, sku, productName, onClose }: RegistrationSuccessModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopySKU = () => {
    navigator.clipboard.writeText(sku)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <DialogTitle className="text-center">登録完了</DialogTitle>
          <DialogDescription className="text-center">商品が正常に登録されました</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-2">商品名</p>
            <p className="font-semibold text-foreground">{productName}</p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground mb-2">自動生成SKU</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono font-semibold text-foreground">{sku}</p>
              <Button size="sm" variant="ghost" onClick={handleCopySKU}>
                <Copy className="h-4 w-4" />
                {copied ? "コピーしました" : "コピー"}
              </Button>
            </div>
          </div>

          <Button onClick={onClose} className="w-full">
            続行
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
