'use client'

import { useState, useCallback } from 'react'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'

interface BatchUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBatchCreated?: (batchId: string, batchName: string) => void
}

export function BatchUploadModal({
  open,
  onOpenChange,
  onBatchCreated,
}: BatchUploadModalProps) {
  const [batchName, setBatchName] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlCount, setUrlCount] = useState(0)

  // URLリストから有効なURLを抽出
  const parseUrls = useCallback((text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')))
  }, [])

  // CSVファイルからURLを抽出
  const parseCsvFile = useCallback(async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const urls: string[] = []

          // CSV行を解析（改行で分割）
          const lines = text.split('\n')

          for (const line of lines) {
            // カンマで分割して各セルをチェック
            const cells = line.split(',').map(cell => cell.trim().replace(/"/g, ''))

            for (const cell of cells) {
              if (cell.startsWith('http://') || cell.startsWith('https://')) {
                urls.push(cell)
              }
            }
          }

          resolve(urls)
        } catch (err) {
          reject(new Error('CSVファイルの解析に失敗しました'))
        }
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }

      reader.readAsText(file)
    })
  }, [])

  // URLカウントを更新
  const updateUrlCount = useCallback(() => {
    if (csvFile) {
      parseCsvFile(csvFile).then(urls => {
        setUrlCount(urls.length)
      }).catch(() => {
        setUrlCount(0)
      })
    } else {
      const urls = parseUrls(urlInput)
      setUrlCount(urls.length)
    }
  }, [urlInput, csvFile, parseUrls, parseCsvFile])

  // 入力変更時にURLカウントを更新
  const handleUrlInputChange = useCallback((value: string) => {
    setUrlInput(value)
    setError(null)
  }, [])

  const handleCsvFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCsvFile(file)
      setUrlInput('') // CSV選択時はURL入力をクリア
      setError(null)
    }
  }, [])

  // URLカウント更新（入力変更時）
  useState(() => {
    updateUrlCount()
  })

  // バッチ投入処理
  const handleSubmit = useCallback(async () => {
    try {
      setError(null)
      setIsSubmitting(true)

      // バリデーション
      if (!batchName.trim()) {
        setError('バッチ名を入力してください')
        setIsSubmitting(false)
        return
      }

      // URLリストを取得
      let urls: string[] = []

      if (csvFile) {
        urls = await parseCsvFile(csvFile)
      } else {
        urls = parseUrls(urlInput)
      }

      if (urls.length === 0) {
        setError('有効なURLが見つかりません。URLを入力するかCSVファイルをアップロードしてください')
        setIsSubmitting(false)
        return
      }

      // API呼び出し
      console.log(`[BatchUploadModal] ${urls.length}件のURLを投入します...`)

      const response = await fetch('/api/scraping/batch/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch_name: batchName.trim(),
          urls,
          platform: 'yahoo',
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'バッチの投入に失敗しました')
      }

      console.log(`[BatchUploadModal] ✅ バッチ投入成功: ${result.data.batch_id}`)

      // 成功時のコールバック
      if (onBatchCreated) {
        onBatchCreated(result.data.batch_id, result.data.batch_name)
      }

      // フォームをリセット
      setBatchName('')
      setUrlInput('')
      setCsvFile(null)
      setUrlCount(0)

      // モーダルを閉じる
      onOpenChange(false)
    } catch (err) {
      console.error('[BatchUploadModal] エラー:', err)
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }, [batchName, urlInput, csvFile, parseUrls, parseCsvFile, onBatchCreated, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>バッチスクレイピング投入</DialogTitle>
          <DialogDescription>
            Yahoo!オークションのURLをバッチ登録してスクレイピングキューに追加します
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* バッチ名入力 */}
          <div className="space-y-2">
            <Label htmlFor="batch-name">
              バッチ名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="batch-name"
              placeholder="例: 2025年1月_商品リサーチ"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* URL入力 */}
          <div className="space-y-2">
            <Label htmlFor="url-input">
              URLリスト（1行1URL）
            </Label>
            <textarea
              id="url-input"
              className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-offset-2"
              placeholder={'https://page.auctions.yahoo.co.jp/jp/auction/...\nhttps://page.auctions.yahoo.co.jp/jp/auction/...'}
              value={urlInput}
              onChange={(e) => handleUrlInputChange(e.target.value)}
              onBlur={updateUrlCount}
              disabled={isSubmitting || !!csvFile}
            />
            {!csvFile && urlCount > 0 && (
              <p className="text-sm text-muted-foreground">
                検出されたURL: <Badge variant="secondary">{urlCount}件</Badge>
              </p>
            )}
          </div>

          {/* 区切り線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">または</span>
            </div>
          </div>

          {/* CSVアップロード */}
          <div className="space-y-2">
            <Label htmlFor="csv-upload">
              CSVファイルアップロード
            </Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvFileChange}
              disabled={isSubmitting || !!urlInput}
            />
            {csvFile && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  ファイル: {csvFile.name}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCsvFile(null)
                    setUrlCount(0)
                  }}
                  disabled={isSubmitting}
                >
                  削除
                </Button>
              </div>
            )}
            {csvFile && urlCount > 0 && (
              <p className="text-sm text-muted-foreground">
                検出されたURL: <Badge variant="secondary">{urlCount}件</Badge>
              </p>
            )}
          </div>

          {/* エラー表示 */}
          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (!urlInput && !csvFile) || !batchName}
          >
            {isSubmitting ? '投入中...' : `バッチ投入 (${urlCount}件)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
