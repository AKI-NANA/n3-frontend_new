"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Plus, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Variation {
  id: string
  name: string
  description: string
  stock_quantity: number
}

interface GroupingBoxModalProps {
  isOpen: boolean
  parentSKU: string
  onClose: () => void
  onSuccess: () => void
}

export function GroupingBoxModal({ isOpen, parentSKU, onClose, onSuccess }: GroupingBoxModalProps) {
  const [variations, setVariations] = useState<Variation[]>([{ id: "1", name: "", description: "", stock_quantity: 0 }])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policyGroupId, setPolicyGroupId] = useState("")

  const validateVariations = (): string | null => {
    // Check minimum variations
    if (variations.length < 2) {
      return "eBayバリエーションには最低2つの子SKUが必要です"
    }

    // Check for duplicate names
    const names = variations.map((v) => v.name.trim())
    if (new Set(names).size !== names.length) {
      return "バリエーション名が重複しています"
    }

    // Check for empty names
    if (variations.some((v) => !v.name.trim())) {
      return "すべてのバリエーション名を入力してください"
    }

    // Check attribute compatibility
    const hasDescriptions = variations.map((v) => !!v.description.trim())
    if (hasDescriptions.some((h) => h !== hasDescriptions[0])) {
      return "すべてのバリエーションに説明を入力するか、すべて空にしてください"
    }

    return null
  }

  const handleAddVariation = () => {
    setVariations([
      ...variations,
      {
        id: Date.now().toString(),
        name: "",
        description: "",
        stock_quantity: 0,
      },
    ])
  }

  const handleRemoveVariation = (id: string) => {
    if (variations.length > 2) {
      setVariations(variations.filter((v) => v.id !== id))
    }
  }

  const handleVariationChange = (id: string, field: keyof Variation, value: any) => {
    setVariations(variations.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  const handleSubmit = async () => {
    setError(null)

    // Validate before submission
    const validationError = validateVariations()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!policyGroupId.trim()) {
      setError("グループIDを入力してください")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/products/create-variation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_sku: parentSKU,
          variations: variations.map(({ id, ...rest }) => rest),
          policy_group_id: policyGroupId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create variation")
      }

      // Reset form
      setVariations([{ id: "1", name: "", description: "", stock_quantity: 0 }])
      setPolicyGroupId("")
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>バリエーション設定</DialogTitle>
          <DialogDescription>
            親SKU: <span className="font-mono font-semibold">{parentSKU}</span>
            <br />
            複数の子SKUを作成してバリエーションを設定します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="policy-group-id">ポリシーグループID</Label>
            <Input
              id="policy-group-id"
              value={policyGroupId}
              onChange={(e) => setPolicyGroupId(e.target.value)}
              placeholder="例: GROUP-001"
            />
            <p className="text-xs text-muted-foreground">このグループ内のバリエーションはまとめて管理されます</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">バリエーション</Label>
              <span className="text-sm text-muted-foreground">{variations.length}個</span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {variations.map((variation, index) => (
                <Card key={variation.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-semibold">バリエーション {index + 1}</h4>
                    {variations.length > 2 && (
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveVariation(variation.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`name-${variation.id}`} className="text-sm">
                        バリエーション名
                      </Label>
                      <Input
                        id={`name-${variation.id}`}
                        value={variation.name}
                        onChange={(e) => handleVariationChange(variation.id, "name", e.target.value)}
                        placeholder="例: Lサイズ・赤色"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`desc-${variation.id}`} className="text-sm">
                        説明（オプション）
                      </Label>
                      <Input
                        id={`desc-${variation.id}`}
                        value={variation.description}
                        onChange={(e) => handleVariationChange(variation.id, "description", e.target.value)}
                        placeholder="詳細説明"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`stock-${variation.id}`} className="text-sm">
                        在庫数
                      </Label>
                      <Input
                        id={`stock-${variation.id}`}
                        type="number"
                        value={variation.stock_quantity}
                        onChange={(e) =>
                          handleVariationChange(variation.id, "stock_quantity", Number.parseInt(e.target.value) || 0)
                        }
                        min="0"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={handleAddVariation} className="w-full bg-transparent">
              <Plus className="mr-2 h-4 w-4" />
              バリエーションを追加
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>eBayバリエーション規約:</strong>
              <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                <li>最低2つ以上のバリエーション必須</li>
                <li>バリエーション名の重複不可</li>
                <li>同じカテゴリーのアイテムのみ出品可</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  作成中...
                </>
              ) : (
                "バリエーションを作成"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
