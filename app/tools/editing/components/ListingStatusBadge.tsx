// app/tools/editing/components/ListingStatusBadge.tsx
'use client'

import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import type { Product } from '../types/product'

interface ListingStatusBadgeProps {
  product: Product
}

export function ListingStatusBadge({ product }: ListingStatusBadgeProps) {
  const history = product.listing_history || []
  
  if (history.length === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>未出品</span>
      </div>
    )
  }
  
  const latestListing = history[0]
  
  if (latestListing.status === 'success') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="w-3 h-3" />
          <span>出品済</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {latestListing.marketplace} ({latestListing.account})
        </div>
        {latestListing.listing_id && (
          <a
            href={getListingUrl(latestListing.marketplace, latestListing.listing_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {latestListing.listing_id.substring(0, 12)}...
          </a>
        )}
        <div className="text-[10px] text-muted-foreground">
          {new Date(latestListing.listed_at).toLocaleDateString('ja-JP', { 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-xs text-red-600">
        <XCircle className="w-3 h-3" />
        <span>失敗</span>
      </div>
      <div className="text-[10px] text-muted-foreground">
        {latestListing.marketplace} ({latestListing.account})
      </div>
      {latestListing.error_message && (
        <div className="text-[10px] text-red-600 max-w-[200px] truncate" title={latestListing.error_message}>
          {latestListing.error_message}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground">
        {new Date(latestListing.listed_at).toLocaleDateString('ja-JP', { 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  )
}

function getListingUrl(marketplace: string, listingId: string): string {
  if (marketplace === 'ebay') {
    return `https://www.ebay.com/itm/${listingId}`
  }
  if (marketplace === 'shopee') {
    return `https://shopee.com/product/${listingId}`
  }
  if (marketplace === 'amazon_jp') {
    return `https://www.amazon.co.jp/dp/${listingId}`
  }
  return '#'
}
