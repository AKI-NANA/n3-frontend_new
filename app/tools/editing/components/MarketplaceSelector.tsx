// app/tools/editing/components/MarketplaceSelector.tsx
'use client'

import type { MarketplaceSelection } from '../types/product'

interface MarketplaceSelectorProps {
  marketplaces: MarketplaceSelection
  onChange: (marketplaces: MarketplaceSelection) => void
}

export function MarketplaceSelector({ marketplaces, onChange }: MarketplaceSelectorProps) {
  const handleToggleAll = (checked: boolean) => {
    onChange({
      all: checked,
      ebay: checked,
      shopee: checked,
      shopify: checked
    })
  }

  const handleToggle = (key: 'ebay' | 'shopee' | 'shopify', checked: boolean) => {
    const newMarketplaces = { ...marketplaces, [key]: checked }
    newMarketplaces.all = newMarketplaces.ebay && newMarketplaces.shopee && newMarketplaces.shopify
    onChange(newMarketplaces)
  }

  return (
    <div className="bg-card border border-border rounded-lg mb-3 p-3 shadow-sm">
      <div className="flex items-center gap-6 flex-wrap">
        <span className="text-xs font-semibold text-foreground">出品先:</span>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={marketplaces.all}
            onChange={(e) => handleToggleAll(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-xs text-foreground">全て</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={marketplaces.ebay}
            onChange={(e) => handleToggle('ebay', e.target.checked)}
            className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-xs text-foreground">eBay</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={marketplaces.shopee}
            onChange={(e) => handleToggle('shopee', e.target.checked)}
            className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-xs text-foreground">Shopee</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={marketplaces.shopify}
            onChange={(e) => handleToggle('shopify', e.target.checked)}
            className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-xs text-foreground">Shopify</span>
        </label>
      </div>
    </div>
  )
}
