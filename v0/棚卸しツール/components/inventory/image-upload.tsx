"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

interface ImageUploadProps {
  onImageUrl: (url: string) => void
  defaultValue?: string
}

export function ImageUpload({ onImageUrl, defaultValue }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(defaultValue || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
      onImageUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onImageUrl("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-8">
        {preview ? (
          <div className="relative h-48 w-48">
            <Image src={preview || "/placeholder.svg"} alt="Preview" fill className="object-contain" />
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">画像をドラッグ&ドロップまたはクリック</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
          <Upload className="mr-2 h-4 w-4" />
          画像を選択
        </Button>

        {preview && (
          <Button type="button" variant="destructive" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
