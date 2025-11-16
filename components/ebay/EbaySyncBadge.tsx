/**
 * eBay同期ステータスバッジ
 * 商品のeBay出品状態を視覚的に表示
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { ExternalLink, Clock, CheckCircle2, XCircle } from 'lucide-react'

interface EbaySyncBadgeProps {
  ebayListed?: boolean
  ebayListingId?: string | null
  ebayApiData?: any
  className?: string
}

export function EbaySyncBadge({
  ebayListed,
  ebayListingId,
  ebayApiData,
  className
}: EbaySyncBadgeProps) {
  
  const getStatus = () => {
    if (!ebayListed) {
      return {
        label: '未出品',
        variant: 'secondary' as const,
        icon: null
      }
    }

    if (ebayListingId) {
      const status = ebayApiData?.status
      
      if (status === 'PUBLISHED' || status === 'active') {
        return {
          label: 'eBay出品中',
          variant: 'default' as const,
          icon: <CheckCircle2 className="h-3 w-3" />
        }
      }
      
      return {
        label: 'eBay処理中',
        variant: 'secondary' as const,
        icon: <Clock className="h-3 w-3" />
      }
    }

    return {
      label: 'eBay準備中',
      variant: 'outline' as const,
      icon: <Clock className="h-3 w-3" />
    }
  }

  const status = getStatus()

  const handleClick = () => {
    if (ebayListingId) {
      window.open(`https://www.ebay.com/itm/${ebayListingId}`, '_blank')
    }
  }

  return (
    <Badge
      variant={status.variant}
      className={`gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}
      onClick={handleClick}
    >
      {status.icon}
      {status.label}
      {ebayListingId && <ExternalLink className="h-3 w-3" />}
    </Badge>
  )
}


/**
 * eBay同期詳細情報カード
 */

interface EbaySyncDetailsProps {
  product: {
    sku: string
    ebay_listed?: boolean
    ebay_listing_id?: string | null
    ebay_offer_id?: string | null
    ebay_api_data?: any
    current_stock?: number
  }
}

export function EbaySyncDetails({ product }: EbaySyncDetailsProps) {
  if (!product.ebay_listed) {
    return (
      <div className="text-sm text-muted-foreground">
        eBayに未出品です
      </div>
    )
  }

  const ebayData = product.ebay_api_data || {}
  const lastSynced = ebayData.last_synced_at || ebayData.listed_at

  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-muted-foreground">Listing ID:</span>
          <p className="font-mono text-xs">
            {product.ebay_listing_id || '-'}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Offer ID:</span>
          <p className="font-mono text-xs">
            {product.ebay_offer_id || '-'}
          </p>
        </div>
      </div>

      {ebayData.account && (
        <div>
          <span className="text-muted-foreground">アカウント:</span>
          <span className="ml-2">{ebayData.account}</span>
        </div>
      )}

      {ebayData.status && (
        <div>
          <span className="text-muted-foreground">ステータス:</span>
          <span className="ml-2">{ebayData.status}</span>
        </div>
      )}

      {product.current_stock !== undefined && (
        <div>
          <span className="text-muted-foreground">在庫数:</span>
          <span className="ml-2">{product.current_stock}</span>
        </div>
      )}

      {lastSynced && (
        <div className="text-xs text-muted-foreground">
          最終同期: {new Date(lastSynced).toLocaleString('ja-JP')}
        </div>
      )}

      {product.ebay_listing_id && (
        <a
          href={`https://www.ebay.com/itm/${product.ebay_listing_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          eBayで確認
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
