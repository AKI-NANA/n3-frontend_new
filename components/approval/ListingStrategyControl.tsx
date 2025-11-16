import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Store, Zap, Clock, CheckCircle2 } from 'lucide-react'

interface MarketplaceOption {
  id: string
  name: string
  icon?: string
  accounts: AccountOption[]
}

interface AccountOption {
  id: string
  name: string
  enabled: boolean
}

interface ListingStrategyControlProps {
  selectedProductCount: number
  onConfirm: (strategy: ListingStrategy) => Promise<void>
  onCancel: () => void
}

export interface ListingStrategy {
  marketplaces: Array<{
    marketplace: string
    accountId: string
  }>
  mode: 'immediate' | 'scheduled'
  scheduleSettings?: {
    startDate: string
    intervalHours: number
    sessionsPerDay: number
    randomization: boolean
  }
}

// 利用可能なマーケットプレイスとアカウント
const AVAILABLE_MARKETPLACES: MarketplaceOption[] = [
  {
    id: 'ebay',
    name: 'eBay',
    accounts: [
      { id: 'mjt', name: 'eBay (mjt)', enabled: true },
      { id: 'green', name: 'eBay (green)', enabled: true },
    ]
  },
  {
    id: 'shopee',
    name: 'Shopee',
    accounts: [
      { id: 'main', name: 'Shopee (main)', enabled: true },
    ]
  },
  {
    id: 'qoo10',
    name: 'Qoo10',
    accounts: [
      { id: 'main', name: 'Qoo10 (main)', enabled: true },
    ]
  },
  {
    id: 'amazon_jp',
    name: 'Amazon JP',
    accounts: [
      { id: 'main', name: 'Amazon JP (main)', enabled: true },
    ]
  },
  {
    id: 'shopify',
    name: 'Shopify',
    accounts: [
      { id: 'main', name: 'Shopify (main)', enabled: true },
    ]
  }
]

export function ListingStrategyControl({ 
  selectedProductCount, 
  onConfirm, 
  onCancel 
}: ListingStrategyControlProps) {
  // 選択されたマーケットプレイス（トップレベル）
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<string>>(new Set(['ebay']))
  
  // 選択されたアカウント（マーケットプレイスごと）
  const [selectedAccounts, setSelectedAccounts] = useState<Map<string, Set<string>>>(
    new Map([['ebay', new Set(['mjt'])]])
  )

  // マーケットプレイスの選択切り替え
  const toggleMarketplace = (marketplaceId: string) => {
    const newSelected = new Set(selectedMarketplaces)
    if (newSelected.has(marketplaceId)) {
      newSelected.delete(marketplaceId)
      // マーケットプレイスを削除する際、そのアカウントも削除
      selectedAccounts.delete(marketplaceId)
      setSelectedAccounts(new Map(selectedAccounts))
    } else {
      newSelected.add(marketplaceId)
      // デフォルトで最初のアカウントを選択
      const marketplace = AVAILABLE_MARKETPLACES.find(m => m.id === marketplaceId)
      if (marketplace && marketplace.accounts.length > 0) {
        selectedAccounts.set(marketplaceId, new Set([marketplace.accounts[0].id]))
        setSelectedAccounts(new Map(selectedAccounts))
      }
    }
    setSelectedMarketplaces(newSelected)
  }

  // アカウントの選択切り替え
  const toggleAccount = (marketplaceId: string, accountId: string) => {
    const marketplaceAccounts = selectedAccounts.get(marketplaceId) || new Set()
    const newAccounts = new Set(marketplaceAccounts)
    
    if (newAccounts.has(accountId)) {
      newAccounts.delete(accountId)
    } else {
      newAccounts.add(accountId)
    }
    
    selectedAccounts.set(marketplaceId, newAccounts)
    setSelectedAccounts(new Map(selectedAccounts))
  }

  // 承認・出品予約の実行
  const handleConfirm = async () => {
    // 選択されたマーケットプレイスとアカウントの組み合わせを構築
    const marketplaceAccountPairs: Array<{ marketplace: string; accountId: string }> = []
    
    selectedMarketplaces.forEach(marketplaceId => {
      const accounts = selectedAccounts.get(marketplaceId)
      if (accounts && accounts.size > 0) {
        accounts.forEach(accountId => {
          marketplaceAccountPairs.push({
            marketplace: marketplaceId,
            accountId: accountId
          })
        })
      }
    })

    if (marketplaceAccountPairs.length === 0) {
      alert('少なくとも1つのマーケットプレイスとアカウントを選択してください')
      return
    }

    const strategy: ListingStrategy = {
      marketplaces: marketplaceAccountPairs,
      mode: 'scheduled' // 常にスケジュールモード（自動スケジューリング）
    }

    await onConfirm(strategy)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-6 h-6" />
              出品戦略の設定
            </CardTitle>
            <CardDescription>
              {selectedProductCount}件の商品をどのマーケットプレイスに出品するか設定してください
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* マーケットプレイス・アカウント選択 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Store className="w-5 h-5" />
                出品先マーケットプレイスとアカウントを選択
              </h3>
              <p className="text-sm text-muted-foreground">
                選択したマーケットプレイスに商品を登録します。出品タイミングはカテゴリーやモール別の設定に基づいて自動的にスケジューリングされます。
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {AVAILABLE_MARKETPLACES.map(marketplace => {
                  const isSelected = selectedMarketplaces.has(marketplace.id)
                  const selectedAccountsForMarketplace = selectedAccounts.get(marketplace.id) || new Set()
                  
                  return (
                    <div key={marketplace.id} className={`p-3 border rounded-lg ${ isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      {/* マーケットプレイス選択 */}
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`marketplace-${marketplace.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleMarketplace(marketplace.id)}
                        />
                        <Label 
                          htmlFor={`marketplace-${marketplace.id}`}
                          className="text-sm font-semibold cursor-pointer"
                        >
                          {marketplace.name}
                        </Label>
                      </div>
                      
                      {/* アカウント選択 */}
                      {isSelected && (
                        <div className="ml-6 space-y-1.5 mt-2">
                          {marketplace.accounts.map(account => (
                            <div key={account.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`account-${marketplace.id}-${account.id}`}
                                checked={selectedAccountsForMarketplace.has(account.id)}
                                onCheckedChange={() => toggleAccount(marketplace.id, account.id)}
                                disabled={!account.enabled}
                              />
                              <Label 
                                htmlFor={`account-${marketplace.id}-${account.id}`}
                                className="text-xs cursor-pointer"
                              >
                                {account.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              キャンセル
            </Button>
            <Button onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              承認・出品予約
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
