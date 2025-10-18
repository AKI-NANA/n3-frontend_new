  // 実際のeBay API呼び出し
  const searchEbayProducts = async (keyword: string, count: number): Promise<ScoredProduct[]> => {
    try {
      console.log('🔍 検索開始:', { keyword, count })
      
      const response = await fetch('/api/ebay/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keyword,
          categoryId: productFormData.category || undefined,
          condition: productFormData.condition || undefined,
          minPrice: productFormData.minPrice || undefined,
          maxPrice: productFormData.maxPrice || undefined,
          entriesPerPage: count,
          sortOrder: 'BestMatch'
        })
      })

      console.log('📡 APIレスポンス:', response.status)

      const data = await response.json()
      console.log('📦 APIデータ:', data)

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.details || 'eBay API検索失敗'
        console.error('❌ エラー:', errorMsg)
        throw new Error(errorMsg)
      }

      if (!data.items || data.items.length === 0) {
        console.warn('⚠️ 検索結果が0件です')
        return []
      }

      console.log('✅ 取得成功:', data.items.length, '件')

      // 取得したデータをスコアリング
      const scoredProducts: ScoredProduct[] = data.items.map((item: any, index: number) => {
        const price = item.price.value
        const japanPrice = price * 150 // 仮の日本価格（USD * 150 JPY）
        const profitRate = ((price - japanPrice) / japanPrice) * 100
        
        // スコア計算（簡易版）
        const soldScore = Math.min((item.soldCount / 50) * 100, 100)
        const priceScore = price > 50 && price < 1000 ? 80 : 60
        const sellerScore = item.seller.positiveFeedbackPercent || 70
        const totalScore = (soldScore * 0.4 + priceScore * 0.3 + sellerScore * 0.3)
        
        // リスクレベル計算
        let riskLevel: 'low' | 'medium' | 'high' = 'medium'
        if (item.seller.positiveFeedbackPercent > 95 && item.soldCount > 30) {
          riskLevel = 'low'
        } else if (item.seller.positiveFeedbackPercent < 90 || item.soldCount < 10) {
          riskLevel = 'high'
        }

        return {
          id: `ebay-${item.itemId}`,
          ebayItemId: item.itemId,
          title: item.title,
          titleJP: `${item.title}`,
          price: price,
          japanPrice: japanPrice,
          soldCount: item.soldCount,
          competitorCount: Math.floor(Math.random() * 50) + 1,
          totalScore: totalScore,
          profitCalculation: {
            isBlackInk: profitRate > 0,
            profitRate: Math.abs(profitRate),
            netProfit: price - japanPrice
          },
          riskLevel: riskLevel,
          category: item.category.name,
          condition: item.condition.name,
          image: item.image,
          seller: item.seller.username,
          sellerCountry: item.location.country,
          viewItemURL: item.viewItemURL
        }
      })

      return scoredProducts.sort((a, b) => b.totalScore - a.totalScore)
    } catch (error) {
      console.error('❌ searchEbayProducts エラー:', error)
      throw error
    }
  }
