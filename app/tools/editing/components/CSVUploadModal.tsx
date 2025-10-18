// app/tools/editing/components/CSVUploadModal.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import Papa from 'papaparse'

interface CSVUploadModalProps {
  onClose: () => void
  onUpload: (data: any[], options: UploadOptions) => Promise<void>
}

interface UploadOptions {
  clearExisting: boolean
  runAllProcesses: boolean
  skipDuplicates: boolean
}

interface PreviewData {
  headers: string[]
  rows: any[]
  totalRows: number
}

export function CSVUploadModal({ onClose, onUpload }: CSVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [options, setOptions] = useState<UploadOptions>({
    clearExisting: false,
    runAllProcesses: true,
    skipDuplicates: true
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('CSVファイルを選択してください')
      return
    }

    setFile(selectedFile)
    setError(null)

    // プレビュー生成
    Papa.parse(selectedFile, {
      header: true,
      preview: 5, // 最初の5行のみプレビュー
      skipEmptyLines: true,
      complete: (results) => {
        setPreview({
          headers: results.meta.fields || [],
          rows: results.data,
          totalRows: results.data.length
        })
      },
      error: (err) => {
        setError(`CSVパースエラー: ${err.message}`)
      }
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    processFile(selectedFile)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (uploading) return

    const droppedFile = e.dataTransfer?.files?.[0]
    if (droppedFile) {
      console.log('📁 ファイルドロップ:', droppedFile.name)
      processFile(droppedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // 完全なCSVパース
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: async (results) => {
          try {
            await onUpload(results.data, options)
            onClose()
          } catch (err: any) {
            setError(err.message || 'アップロードに失敗しました')
          } finally {
            setUploading(false)
          }
        },
        error: (err) => {
          setError(`CSVパースエラー: ${err.message}`)
          setUploading(false)
        }
      })
    } catch (err: any) {
      setError(err.message || 'アップロードに失敗しました')
      setUploading(false)
    }
  }

  const requiredColumns = [
    'title', 'description', 'price', 'quantity', 
    'condition', 'sku', 'upc', 'brand'
  ]

  const missingColumns = preview 
    ? requiredColumns.filter(col => !preview.headers.includes(col))
    : []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">CSV一括アップロード</h2>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* ファイル選択 / ドラッグ&ドロップ */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground">
              CSVファイル
            </label>
            
            {/* ドラッグ&ドロップエリア */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/30 hover:bg-muted/50'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-primary" />
                  <div className="font-medium text-foreground">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                      setPreview(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    disabled={uploading}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    クリア
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div className="text-sm font-medium text-foreground">
                    CSVファイルをドラッグ&ドロップ
                  </div>
                  <div className="text-xs text-muted-foreground">
                    または クリックしてファイルを選択
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">{error}</div>
            </div>
          )}

          {/* 必須カラムチェック */}
          {preview && missingColumns.length > 0 && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm font-medium text-amber-600">
                  不足している必須カラム
                </div>
              </div>
              <div className="text-xs text-amber-600 ml-7">
                {missingColumns.join(', ')}
              </div>
            </div>
          )}

          {/* プレビュー */}
          {preview && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">
                  プレビュー (最初の5行)
                </h3>
                <div className="text-xs text-muted-foreground">
                  総行数: {preview.totalRows}行
                </div>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        {preview.headers.map((header, i) => (
                          <th
                            key={i}
                            className="px-2 py-1.5 text-left font-medium text-foreground border-b border-border"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border">
                          {preview.headers.map((header, j) => (
                            <td
                              key={j}
                              className="px-2 py-1.5 text-muted-foreground"
                            >
                              {String(row[header] || '').substring(0, 50)}
                              {String(row[header] || '').length > 50 && '...'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* オプション */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground mb-3">
              アップロードオプション
            </h3>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.clearExisting}
                onChange={(e) => setOptions({ ...options, clearExisting: e.target.checked })}
                disabled={uploading}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm text-foreground">既存データをクリア</div>
                <div className="text-xs text-muted-foreground">
                  アップロード前に既存の商品データを全て削除します
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.runAllProcesses}
                onChange={(e) => setOptions({ ...options, runAllProcesses: e.target.checked })}
                disabled={uploading}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm text-foreground">自動で全処理を実行</div>
                <div className="text-xs text-muted-foreground">
                  アップロード後、カテゴリ・送料・利益・HTMLを自動計算します
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={options.skipDuplicates}
                onChange={(e) => setOptions({ ...options, skipDuplicates: e.target.checked })}
                disabled={uploading}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm text-foreground">重複をスキップ</div>
                <div className="text-xs text-muted-foreground">
                  SKUが既に存在する商品はスキップします
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <div className="text-xs text-muted-foreground">
            {preview && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>{preview.totalRows}行のデータが読み込まれました</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              disabled={uploading}
              variant="outline"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading || missingColumns.length > 0}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  アップロード開始
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
