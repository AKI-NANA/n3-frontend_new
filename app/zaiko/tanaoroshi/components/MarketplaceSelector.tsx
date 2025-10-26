'use client'

import { Badge } from '@/components/ui/badge'
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
  selectedAccount: string
  onMarketplaceChange: (marketplace: string) => void
  onAccountChange: (account: string) => void
}

export function MarketplaceSelector({
  selectedMarketplace,
  selectedAccount,
  onMarketplaceChange,
  onAccountChange
}: MarketplaceSelectorProps) {
  const marketplaces = [
    { id: 'all', name: '全モール', color: 'bg-gray-500', enabled: true },
    { id: 'ebay', name: 'eBay', color: 'bg-blue-600', enabled: true },
    { id: 'shopee', name: 'Shopee', color: 'bg-orange-500', enabled: false },
    { id: 'amazon-global', name: 'Amazon海外', color: 'bg-yellow-600', enabled: false },
    { id: 'amazon-jp', name: 'Amazon日本', color: 'bg-yellow-500', enabled: false },
    { id: 'coupang', name: 'Coupang', color: 'bg-purple-600', enabled: false },
    { id: 'shopify', name: 'Shopify', color: 'bg-green-600', enabled: false },
    { id: 'q10', name: 'Q10', color: 'bg-pink-600', enabled: false },
  ]

  const ebayAccounts = [
    { id: 'all', name: '全アカウント' },
    { id: 'green', name: 'Green' },
    { id: 'mjt', name: 'MJT' },
  ]

  return (
    <div className="space-y-4">
      {/* モール選択 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">モール選択</label>
        <div className="flex flex-wrap gap-2">
          {marketplaces.map((marketplace) => (
            <Button
              key={marketplace.id}
              variant={selectedMarketplace === marketplace.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => marketplace.enabled && onMarketplaceChange(marketplace.id)}
              disabled={!marketplace.enabled}
              className={`relative ${
                selectedMarketplace === marketplace.id
                  ? marketplace.color
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

      {/* eBayアカウント選択（eBay選択時のみ） */}
      {(selectedMarketplace === 'ebay' || selectedMarketplace === 'all') && (
        <div className="space-y-2">
          <label className="text-sm font-medium">eBayアカウント</label>
          <Select value={selectedAccount} onValueChange={onAccountChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="アカウント選択" />
            </SelectTrigger>
            <SelectContent>
              {ebayAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
