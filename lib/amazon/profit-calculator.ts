import { AmazonProduct } from '@/types/amazon'

interface EbayFeeStructure {
  insertionFee: number
  finalValueFeePercentage: number
  internationalFeePercentage: number
}

interface ShippingCost {
  usToJapan: number
  japanToUs: number
}

export class ProfitCalculator {
  private ebayFees: EbayFeeStructure = {
    insertionFee: 0.35,
    finalValueFeePercentage: 12.9,
    internationalFeePercentage: 1.65
  }

  private shipping: ShippingCost = {
    usToJapan: 15.00,
    japanToUs: 20.00
  }

  calculateProfit(product: AmazonProduct, ebaySellingPrice: number): {
    purchasePrice: number
    amazonShipping: number
    ebayListingFee: number
    ebayFinalValueFee: number
    ebayInternationalFee: number
    ebayShippingCost: number
    totalCost: number
    revenue: number
    profit: number
    profitMargin: number
    roi: number
  } {
    const purchasePrice = product.current_price || 0
    const amazonShipping = product.is_free_shipping_eligible
      ? 0
      : (product.shipping_charges || this.shipping.usToJapan)

    const ebayListingFee = this.ebayFees.insertionFee
    const ebayFinalValueFee = ebaySellingPrice * (this.ebayFees.finalValueFeePercentage / 100)
    const ebayInternationalFee = ebaySellingPrice * (this.ebayFees.internationalFeePercentage / 100)
    const ebayShippingCost = this.shipping.japanToUs

    const totalCost = purchasePrice + amazonShipping + ebayListingFee +
                      ebayFinalValueFee + ebayInternationalFee + ebayShippingCost

    const revenue = ebaySellingPrice
    const profit = revenue - totalCost
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

    return {
      purchasePrice,
      amazonShipping,
      ebayListingFee,
      ebayFinalValueFee,
      ebayInternationalFee,
      ebayShippingCost,
      totalCost,
      revenue,
      profit,
      profitMargin,
      roi
    }
  }

  calculateProfitScore(product: AmazonProduct, ebayCompetitivePrice: number): number {
    const profitCalc = this.calculateProfit(product, ebayCompetitivePrice)

    // スコアリング基準
    let score = 0

    // 1. 利益額（50点満点）
    if (profitCalc.profit >= 50) score += 50
    else if (profitCalc.profit >= 30) score += 40
    else if (profitCalc.profit >= 20) score += 30
    else if (profitCalc.profit >= 10) score += 20
    else if (profitCalc.profit >= 5) score += 10

    // 2. ROI（30点満点）
    if (profitCalc.roi >= 100) score += 30
    else if (profitCalc.roi >= 50) score += 25
    else if (profitCalc.roi >= 30) score += 20
    else if (profitCalc.roi >= 20) score += 15
    else if (profitCalc.roi >= 10) score += 10

    // 3. Amazon評価・レビュー（10点満点）
    if (product.star_rating && product.star_rating >= 4.5) score += 10
    else if (product.star_rating && product.star_rating >= 4.0) score += 7
    else if (product.star_rating && product.star_rating >= 3.5) score += 5

    // 4. プライム対象（5点加点）
    if (product.is_prime_eligible) score += 5

    // 5. 在庫状況（5点満点）
    if (product.availability_status === 'In Stock') score += 5
    else if (product.availability_status === 'Limited Stock') score += 3

    return Math.min(score, 100)
  }

  async fetchEbayCompetitivePrice(
    title: string,
    category?: string
  ): Promise<{ competitive: number; lowest: number }> {
    try {
      // eBay API呼び出し（既存のeBay統合を活用）
      const response = await fetch('/api/ebay/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category })
      })

      if (!response.ok) {
        throw new Error('eBay search failed')
      }

      const data = await response.json()

      // 競合価格の中央値と最低価格を計算
      const prices = data.items
        ?.map((item: any) => parseFloat(item.price))
        .filter((price: number) => !isNaN(price))
        .sort((a: number, b: number) => a - b)

      if (!prices || prices.length === 0) {
        return { competitive: 0, lowest: 0 }
      }

      const competitive = prices[Math.floor(prices.length / 2)] // 中央値
      const lowest = prices[0]

      return { competitive, lowest }
    } catch (error) {
      console.error('eBay price fetch error:', error)
      return { competitive: 0, lowest: 0 }
    }
  }
}
