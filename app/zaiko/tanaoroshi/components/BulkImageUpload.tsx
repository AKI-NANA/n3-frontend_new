'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

interface BulkUploadResult {
  id: string
  sku: string
  filename: string
  imageUrl: string
}

export function BulkImageUpload() {
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState('Toys & Hobbies')
  const [condition, setCondition] = useState('Used')
  const [marketplace, setMarketplace] = useState('manual')
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<{
    success: boolean
    registered: number
    failed: number
    products: BulkUploadResult[]
    errors: any[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    )
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('画像を選択してください')
      return
    }

    setUploading(true)
    setResults(null)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('images', file)
      })
      formData.append('category', category)
      formData.append('condition', condition)
      formData.append('marketplace', marketplace)

      console.log(`📦 アップロード開始: ${files.length}枚`)

      const response = await fetch('/api/inventory/bulk-upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ アップロード成功:', data)
        setResults(data)
        if (data.failed === 0) {
          setFiles([]) // 成功したら画像リストをクリア
        }
      } else {
        console.error('❌ アップロードエラー:', data)
        alert(`エラー: ${data.error}`)
      }
    } catch (error: any) {
      console.error('❌ ネットワークエラー:', error)
      alert(`アップロードエラー: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">画像一括登録（棚卸しデータ）</h2>
        <p className="text-muted-foreground mb-6">
          複数の商品画像を一度にアップロードして、棚卸しマスター（inventory_master）に自動登録できます。<br />
          <span className="font-bold text-green-600">1枚の画像 = 1商品として自動的にSKUが付与</span>されます。<br />
          登録後、詳細情報（商品名、価格、在庫数など）は編集画面で入力してください。
        </p>

        {/* 設定エリア */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <Label htmlFor="category">カテゴリー</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Toys & Hobbies">Toys & Hobbies</SelectItem>
                <SelectItem value="Collectibles">Collectibles</SelectItem>
                <SelectItem value="Sports Mem, Cards & Fan Shop">Sports Cards</SelectItem>
                <SelectItem value="Video Games & Consoles">Video Games</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="condition">コンディション</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Used">Used</SelectItem>
                <SelectItem value="Refurbished">Refurbished</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="marketplace">商品タイプ</Label>
            <Select value={marketplace} onValueChange={setMarketplace}>
              <SelectTrigger id="marketplace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">有在庫（stock）</SelectItem>
                <SelectItem value="dropship">無在庫（dropship）</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ファイル選択エリア（ドラッグ&ドロップ対応） */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-blue-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              クリックして画像を選択、またはドラッグ&ドロップ
            </p>
            <p className="text-sm text-muted-foreground">
              PNG, JPG, GIF (最大10MB/枚)
            </p>
            <p className="text-xs text-blue-600 mt-2">
              ✨ 1枚の画像 = 1商品として自動SKU付与（ITEM-000001形式）
            </p>
          </label>
        </div>

        {/* 選択された画像一覧 */}
        {files.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">
              選択された画像 ({files.length}枚)
            </h3>
            <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-32 object-cover rounded border"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-xs mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* アップロードボタン */}
        <Button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Upload className="mr-2 h-5 w-5 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              {files.length}枚の画像を棚卸しマスターに一括登録
            </>
          )}
        </Button>
      </Card>

      {/* 結果表示 */}
      {results && (
        <Card className="p-6">
          <div className="flex items-center mb-4">
            {results.failed === 0 ? (
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
            )}
            <h3 className="text-xl font-bold">
              登録完了: {results.registered}件 / 失敗: {results.failed}件
            </h3>
          </div>

          {results.products.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">登録された商品:</h4>
              <div className="space-y-2">
                {results.products.map(product => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-2 bg-green-50 rounded"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.filename}
                      className="h-12 w-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-green-700">{product.sku}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.filename}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/tools/editing?from=tanaoroshi&sku=${product.sku}`}>
                        出品データ作成
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-red-600">エラー:</h4>
              <div className="space-y-1">
                {results.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600">
                    {err.filename}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
