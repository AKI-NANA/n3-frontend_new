'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MarketplaceSelectorProps {
  selectedMarketplace: string
  onMarketplaceChange: (marketplace: string) => void
}

export function MarketplaceSelector({
  selectedMarketplace,
  onMarketplaceChange
}: MarketplaceSelectorProps) {
  const marketplaces = [
    { id: 'all', name: '全モール', color: 'bg-gray-500', enabled: true },
    { id: 'ebay', name: 'eBay', color: 'bg-blue-600', enabled: true },
    { id: 'manual', name: '手動登録', color: 'bg-green-600', enabled: true },
    { id: 'shopee', name: 'Shopee', color: 'bg-orange-500', enabled: false },
    { id: 'amazon-global', name: 'Amazon海外', color: 'bg-yellow-600', enabled: false },
    { id: 'amazon-jp', name: 'Amazon日本', color: 'bg-yellow-500', enabled: false },
    { id: 'coupang', name: 'Coupang', color: 'bg-purple-600', enabled: false },
    { id: 'shopify', name: 'Shopify', color: 'bg-green-600', enabled: false },
    { id: 'q10', name: 'Q10', color: 'bg-pink-600', enabled: false },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-3">
        <i className="fas fa-globe mr-2"></i>
        モール選択
      </label>
      <div className="flex flex-wrap gap-2">
        {marketplaces.map((marketplace) => (
          <Button
            key={marketplace.id}
            variant={selectedMarketplace === marketplace.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => marketplace.enabled && onMarketplaceChange(marketplace.id)}
            disabled={!marketplace.enabled}
            className={`${
              selectedMarketplace === marketplace.id && marketplace.enabled
                ? marketplace.color + ' text-white'
                : ''
            }`}
          >
            {marketplace.name}
            {!marketplace.enabled && (
              <span className="ml-2 text-xs opacity-50">(未対応)</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
