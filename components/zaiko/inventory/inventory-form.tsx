"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ImageUpload } from "./image-upload"
import { RegistrationSuccessModal } from "./registration-success-modal"

export function InventoryForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [registeredSKU, setRegisteredSKU] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    purchase_price: "",
    image_url: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/products/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to register")

      const result = await response.json()
      setRegisteredSKU(result.sku)
      setSuccessModalOpen(true)

      // フォームをリセット
      setFormData({
        name: "",
        description: "",
        category: "",
        purchase_price: "",
        image_url: "",
      })
    } catch (error) {
      alert("登録に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="p-6 w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">商品名</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="商品名を入力"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="商品の説明を入力"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリー</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="カテゴリー"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_price">仕入原価</Label>
              <Input
                id="purchase_price"
                name="purchase_price"
                type="number"
                value={formData.purchase_price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>商品画像</Label>
            <ImageUpload onImageUrl={(url) => setFormData((prev) => ({ ...prev, image_url: url }))} />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                登録中...
              </>
            ) : (
              "商品を登録"
            )}
          </Button>
        </form>
      </Card>

      <RegistrationSuccessModal
        isOpen={successModalOpen}
        sku={registeredSKU}
        productName={formData.name}
        onClose={() => setSuccessModalOpen(false)}
      />
    </>
  )
}
