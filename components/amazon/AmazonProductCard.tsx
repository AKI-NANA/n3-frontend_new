'use client'

import { useState } from 'react'
import { AmazonProduct } from '@/types/amazon'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, TrendingUp, Package, DollarSign, Send, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface AmazonProductCardProps {
  product: AmazonProduct
  onUpdate?: () => void
}

export function AmazonProductCard({ product, onUpdate }: AmazonProductCardProps) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const imageUrl = product.images_primary?.medium || product.images_primary?.small || '/placeholder.png'

  const handleCalculateProfit = async () => {
    try {
      const response = await fetch('/api/amazon/calculate-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      })

      if (response.ok) {
        onUpdate?.()
      }
    } catch (error) {
      console.error('Profit calculation error:', error)
    }
  }

  const handleSendToEditing = async () => {
    try {
      setSending(true)
      const response = await fetch('/api/amazon/send-to-editing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      })

      if (response.ok) {
        setSent(true)
        setTimeout(() => {
          router.push('/tools/editing')
        }, 1000)
      } else {
        const error = await response.json()
        alert(error.error || 'データ編集ページへの送信に失敗しました')
      }
    } catch (error) {
      console.error('Send to editing error:', error)
      alert('エラーが発生しました')
    } finally {
      setSending(false)
    }
  }

  const getProfitScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-500'
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="relative h-48 bg-gray-100">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-contain p-4"
            unoptimized
          />
          {product.is_prime_eligible && (
            <Badge className="absolute top-2 right-2 bg-blue-600">
              Prime
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm line-clamp-2 mb-1">
            {product.title}
          </h3>
          {product.brand && (
            <p className="text-xs text-muted-foreground">{product.brand}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-green-600">
              ${product.current_price?.toFixed(2) || 'N/A'}
            </p>
            {product.savings_amount && product.savings_amount > 0 && (
              <p className="text-xs text-red-500">
                Save ${product.savings_amount.toFixed(2)} ({product.savings_percentage}%)
              </p>
            )}
          </div>

          {product.profit_score !== undefined && product.profit_score > 0 && (
            <div className="text-center">
              <div className={`${getProfitScoreColor(product.profit_score)} text-white rounded-full w-12 h-12 flex items-center justify-center font-bold`}>
                {product.profit_score}
              </div>
              <p className="text-xs text-muted-foreground mt-1">スコア</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span>{product.star_rating?.toFixed(1) || 'N/A'} ({product.review_count || 0})</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span className={product.availability_status === 'In Stock' ? 'text-green-600' : 'text-red-600'}>
              {product.availability_status || 'Unknown'}
            </span>
          </div>
        </div>

        {product.profit_amount !== undefined && product.profit_amount !== null && (
          <div className="bg-green-50 p-2 rounded">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">予想利益:</span>
              <span className="font-bold text-green-600">
                ${product.profit_amount.toFixed(2)}
              </span>
            </div>
            {product.roi_percentage !== undefined && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">ROI:</span>
                <span className="font-bold text-blue-600">
                  {product.roi_percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Button
            onClick={handleCalculateProfit}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            利益計算
          </Button>
          <Button
            size="sm"
            variant="default"
            className="flex-1"
            onClick={() => window.open(`https://www.amazon.com/dp/${product.asin}`, '_blank')}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Amazon
          </Button>
        </div>
        <Button
          onClick={handleSendToEditing}
          disabled={sending || sent}
          size="sm"
          variant={sent ? "default" : "secondary"}
          className="w-full"
        >
          {sent ? (
            <>
              <CheckCircle className="w-4 h-4 mr-1" />
              送信完了
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-1" />
              {sending ? '送信中...' : 'データ編集に送る'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
