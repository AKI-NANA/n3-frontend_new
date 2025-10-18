'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { ShippingCalculationResult } from '@/types/shipping'

interface FiveTierPricingDisplayProps {
  result: ShippingCalculationResult
  index: number
  formatPrice: (price: number) => string
  showRestrictions?: boolean
}

export function FiveTierPricingDisplay({
  result,
  index,
  formatPrice,
  showRestrictions = false
}: FiveTierPricingDisplayProps) {
  
  const [showDetails, setShowDetails] = useState(false)
  
  // 5段階の料金計算
  const shippingOnly = result.base_price_jpy + result.fuel_surcharge_jpy
  const withMandatory = shippingOnly + (result.customs_clearance_jpy || 0)
  
  // 🔧 修正: マスターデータの推奨価格を使用（マージン適用済み）
  // result.recommended_price_jpy は (base + fuel + MPF) × マージン率 で計算済み
  const recommendedPrice = result.recommended_price_jpy || withMandatory
  
  // オプション（保険・署名）の追加料金を計算
  const optionsCost = result.insurance_fee_jpy + result.signature_fee_jpy
  const withOptions = recommendedPrice + optionsCost
  
  // ピーク・住宅配送サーチャージ（マージン適用後の価格に対して追加）
  const peakCost = (result.peak_surcharge_jpy || 0) + (result.residential_surcharge_jpy || 0)
  const withPeak = withOptions + peakCost
  
  // 遠隔地サーチャージ
  const remoteCost = result.remote_area_surcharge_jpy || 0
  const withRemote = withPeak + remoteCost

  // 配送会社（文字色）を決定
  const getCompanyTextColor = () => {
    const carrier = result.carrier_name.toUpperCase()
    
    if (carrier.includes('CPASS') || carrier.includes('SPEEDPAK')) return 'text-orange-600'
    if (carrier.includes('ELOJI') || carrier.includes('E-LOGI')) return 'text-cyan-600'
    if (carrier.includes('日本郵便') || carrier.includes('JPPOST')) return 'text-red-600'
    
    return 'text-gray-900 dark:text-gray-100'
  }

  // 実際の配送業者（枠色）を決定
  const getCarrierBorderColor = () => {
    const service = result.service_name.toUpperCase()
    
    if (service.includes('FEDEX')) return 'border-purple-400'
    if (service.includes('DHL')) return 'border-yellow-400'
    if (service.includes('UPS')) return 'border-amber-600'
    if (service.includes('日本郵便') || service.includes('郵便')) return 'border-red-400'
    
    return 'border-gray-300'
  }

  // MPFの詳細説明
  const getMPFDetails = () => {
    const mpfAmount = result.customs_clearance_jpy || 0
    const shippingUsd = shippingOnly / 154.32
    
    if (shippingUsd < 2500) {
      return {
        calculation: `$2.62 × 154.32 = ¥${formatPrice(mpfAmount)}`,
        note: '小口貨物固定料金'
      }
    } else {
      const calculatedUsd = shippingUsd * 0.003464
      const appliedUsd = Math.max(32.71, Math.min(634.62, calculatedUsd))
      return {
        calculation: `$${shippingUsd.toFixed(2)} × 0.3464% → $${appliedUsd.toFixed(2)} = ¥${formatPrice(mpfAmount)}`,
        note: '送料の0.3464%'
      }
    }
  }

  // マージン率を計算（デバッグ用）
  const marginRate = withMandatory > 0 ? ((recommendedPrice - withMandatory) / withMandatory * 100).toFixed(1) : '0.0'

  return (
    <Card className={`border-2 ${getCarrierBorderColor()}`}>
      <CardContent className="p-3">
        {/* ヘッダー（高さ抑える） */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded font-bold text-sm ${
              index === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {index + 1}
            </div>
            <div>
              <div className={`font-bold text-sm ${getCompanyTextColor()}`}>
                {result.carrier_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {result.service_name}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {index === 0 && (
              <Badge variant="default" className="text-xs bg-green-500">最安</Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {result.delivery_days_text}
            </Badge>
          </div>
        </div>

        {/* 5列の料金表示 */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          {/* 1. 送料のみ */}
          <div className="text-center py-2 px-1 rounded border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">送料のみ</div>
            <div className="text-lg font-bold">¥{formatPrice(shippingOnly)}</div>
            <div className="text-xs text-muted-foreground mt-1">基本+燃油</div>
          </div>

          {/* 2. 必須費用込み */}
          <div className="text-center py-2 px-1 rounded border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">必須込み</div>
            <div className="text-lg font-bold">¥{formatPrice(withMandatory)}</div>
            <div className="text-xs text-orange-600 mt-1">+MPF</div>
          </div>

          {/* 3. 推奨価格（マージン適用済み） */}
          <div className="text-center py-2 px-1 rounded border-2 border-primary bg-primary/5">
            <div className="text-xs text-primary font-semibold mb-1">推奨</div>
            <div className="text-lg font-bold text-primary">¥{formatPrice(recommendedPrice)}</div>
            <div className="text-xs text-green-600 mt-1">+保険署名</div>
          </div>

          {/* 4. 繁忙期想定 */}
          <div className="text-center py-2 px-1 rounded border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">繁忙期</div>
            <div className="text-lg font-bold">¥{formatPrice(withPeak)}</div>
            <div className="text-xs text-yellow-600 mt-1">+ピーク</div>
          </div>

          {/* 5. 遠隔地想定 */}
          <div className="text-center py-2 px-1 rounded border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">遠隔地</div>
            <div className="text-lg font-bold">¥{formatPrice(withRemote)}</div>
            <div className="text-xs text-purple-600 mt-1">+遠隔</div>
          </div>
        </div>

        {/* 詳細表示ボタン */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground border-t"
        >
          {showDetails ? (
            <>
              <ChevronUp className="h-3 w-3" />
              閉じる
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              計算式
            </>
          )}
        </button>

        {/* 詳細計算式 */}
        {showDetails && (
          <div className="mt-2 pt-2 border-t space-y-1 text-xs">
            {/* 基本送料 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">基本送料:</span>
              <span className="font-mono">¥{formatPrice(result.base_price_jpy)}</span>
            </div>
            
            {/* 燃油 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">燃油:</span>
              <span className="font-mono">¥{formatPrice(result.fuel_surcharge_jpy)}</span>
            </div>
            
            <div className="flex justify-between font-medium border-t pt-1">
              <span>= 送料小計</span>
              <span className="font-mono">¥{formatPrice(shippingOnly)}</span>
            </div>
            
            {/* MPF */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded mt-1">
              <div className="flex justify-between mb-1">
                <span className="text-orange-600">MPF:</span>
                <span className="font-mono text-orange-600">¥{formatPrice(result.customs_clearance_jpy || 0)}</span>
              </div>
              <div className="text-xs text-muted-foreground">{getMPFDetails().calculation}</div>
            </div>
            
            <div className="flex justify-between font-medium border-t pt-1">
              <span>= 必須込み</span>
              <span className="font-mono">¥{formatPrice(withMandatory)}</span>
            </div>
            
            {/* マージン適用 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded mt-1">
              <div className="flex justify-between mb-1">
                <span className="text-blue-600">マージン適用 ({marginRate}%):</span>
                <span className="font-mono text-blue-600">+¥{formatPrice(recommendedPrice - withMandatory)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                必須込み × マージン率 = 推奨販売価格
              </div>
            </div>
            
            <div className="flex justify-between font-bold text-base border-t-2 pt-1 text-primary">
              <span>= 推奨販売価格</span>
              <span className="font-mono">¥{formatPrice(recommendedPrice)}</span>
            </div>

            {/* オプション追加 */}
            <div className="mt-2 pt-2 border-t text-xs">
              <div className="font-semibold mb-1">オプション追加料金</div>
              
              {/* 保険 */}
              <div className="flex justify-between text-green-600">
                <span>保険 ({(result.declared_value_jpy || 10000).toLocaleString()}円×0.5%):</span>
                <span className="font-mono">¥{formatPrice(result.insurance_fee_jpy)}</span>
              </div>
              
              {/* 署名 */}
              <div className="flex justify-between text-green-600">
                <span>署名 (固定):</span>
                <span className="font-mono">¥{formatPrice(result.signature_fee_jpy)}</span>
              </div>
              
              <div className="flex justify-between font-medium pt-1">
                <span>= 推奨+オプション</span>
                <span className="font-mono">¥{formatPrice(withOptions)}</span>
              </div>
            </div>
            
            {/* サーチャージ */}
            <div className="mt-2 pt-2 border-t text-xs">
              <div className="font-semibold mb-1">想定サーチャージ</div>
              
              {/* ピーク */}
              <div className="flex justify-between text-yellow-600">
                <span>ピーク (12%):</span>
                <span className="font-mono">¥{formatPrice(result.peak_surcharge_jpy || 0)}</span>
              </div>
              
              {/* 住宅配送 */}
              <div className="flex justify-between text-yellow-600">
                <span>住宅配送:</span>
                <span className="font-mono">¥{formatPrice(result.residential_surcharge_jpy || 0)}</span>
              </div>
              
              <div className="flex justify-between font-medium pt-1">
                <span>= 繁忙期</span>
                <span className="font-mono">¥{formatPrice(withPeak)}</span>
              </div>
              
              {/* 遠隔地 */}
              <div className="flex justify-between text-purple-600 mt-1">
                <span>遠隔地:</span>
                <span className="font-mono">¥{formatPrice(result.remote_area_surcharge_jpy || 0)}</span>
              </div>
              
              <div className="flex justify-between font-bold text-base border-t-2 pt-1 mt-1">
                <span>= 最大合計</span>
                <span className="font-mono">¥{formatPrice(withRemote)}</span>
              </div>
            </div>

            {/* 重量情報 */}
            <div className="mt-2 pt-2 border-t">
              <div className="font-semibold mb-1">重量</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">実重量:</span>
                <span className="font-mono">{(result.weight_used_g / 1000).toFixed(2)}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">容積:</span>
                <span className="font-mono">{(result.volumetric_weight_g / 1000).toFixed(2)}kg</span>
              </div>
              <div className="flex justify-between text-primary font-medium">
                <span>請求:</span>
                <span className="font-mono">{(result.chargeable_weight_g / 1000).toFixed(2)}kg</span>
              </div>
            </div>
          </div>
        )}

        {/* 制限事項 */}
        {showRestrictions && result.restrictions.length > 0 && (
          <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs border border-yellow-200">
            <div className="font-semibold mb-1 text-yellow-700">制限事項</div>
            <ul className="list-disc list-inside space-y-0.5">
              {result.restrictions.map((restriction, idx) => (
                <li key={idx}>{restriction}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
