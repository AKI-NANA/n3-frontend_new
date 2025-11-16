/**
 * eBay出品ボタンコンポーネント
 * products_master承認画面から直接eBayに出品
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Loader2, Upload, CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EbayListingButtonProps {
  productId: number
  sku: string
  title: string
  onSuccess?: (listingId: string) => void
}

export function EbayListingButton({
  productId,
  sku,
  title,
  onSuccess
}: EbayListingButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [account, setAccount] = useState<'account1' | 'account2'>('account1')
  const [isListing, setIsListing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    listingId?: string
    url?: string
    error?: string
  } | null>(null)
  
  const { toast } = useToast()

  const handleList = async () => {
    setIsListing(true)
    setResult(null)

    try {
      const response = await fetch('/api/ebay/listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          account
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to list on eBay')
      }

      setResult({
        success: true,
        listingId: data.listingId,
        url: data.url
      })

      toast({
        title: '✅ eBay出品成功',
        description: `${sku} を eBay に出品しました`
      })

      if (onSuccess && data.listingId) {
        onSuccess(data.listingId)
      }

    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      })

      toast({
        title: '❌ 出品失敗',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsListing(false)
    }
  }

  const resetAndClose = () => {
    setResult(null)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2"
        variant="default"
      >
        <Upload className="h-4 w-4" />
        eBay出品
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>eBayに出品</DialogTitle>
            <DialogDescription>
              {title}
              <div className="mt-2 text-xs text-muted-foreground">
                SKU: {sku}
              </div>
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    出品アカウント
                  </label>
                  <Select
                    value={account}
                    onValueChange={(value: 'account1' | 'account2') => setAccount(value)}
                    disabled={isListing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account1">Account 1 (メイン)</SelectItem>
                      <SelectItem value="account2">Account 2 (サブ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-medium mb-2">出品前の確認事項:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>✓ listing_dataが設定済み</li>
                    <li>✓ eBayカテゴリーが選択済み</li>
                    <li>✓ 商品画像が登録済み</li>
                    <li>✓ 英語タイトル・説明文が生成済み</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isListing}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleList}
                  disabled={isListing}
                >
                  {isListing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isListing ? '出品中...' : '出品する'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-6">
                {result.success ? (
                  <div className="space-y-4 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                    <div>
                      <p className="font-medium text-lg">出品成功!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        eBayに正常に出品されました
                      </p>
                    </div>
                    {result.listingId && (
                      <div className="bg-muted rounded-lg p-3 text-sm">
                        <p className="font-mono">{result.listingId}</p>
                      </div>
                    )}
                    {result.url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(result.url, '_blank')}
                        className="w-full"
                      >
                        eBayで確認
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <XCircle className="h-12 w-12 text-destructive mx-auto" />
                    <div>
                      <p className="font-medium text-lg">出品失敗</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.error}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={resetAndClose}
                  variant={result.success ? 'default' : 'outline'}
                  className="w-full"
                >
                  {result.success ? '閉じる' : '再試行'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
