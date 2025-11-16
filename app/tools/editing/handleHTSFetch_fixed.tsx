// app/tools/editing/page.tsx の handleHTSFetch を置き換え

// ✅ HTS取得ハンドラー - AIでHTSコードを推定
const handleHTSFetch = async () => {
  console.log('🔍 HTS取得開始')
  console.log('選択商品数:', selectedIds.size)
  
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
  console.log('対象商品:', selectedProducts.map(p => ({ id: p.id, title: p.title })))
  
  showToast(`${selectedProducts.length}件のHTSコードを推定中...`, 'success')

  try {
    let updatedCount = 0
    let uncertainCount = 0
    let failedCount = 0

    for (const product of selectedProducts) {
      console.log(`\n━━━ 商品処理開始: ${product.id} ━━━`)
      console.log('商品情報:', {
        title: product.title,
        english_title: product.english_title,
        category_name: product.category_name,
        ebay_category: product.ebay_api_data?.category_name
      })

      try {
        // 商品情報からHTSコードを推定
        const requestBody = {
          productId: product.id,
          title: product.title,
          englishTitle: product.english_title || product.title_en,
          categoryName: product.category_name || product.ebay_api_data?.category_name,
          categoryId: product.category_id || product.ebay_api_data?.category_id,
          material: product.material,
          description: product.description,
          ebayApiData: product.ebay_api_data
        }

        console.log('📤 API Request:', requestBody)

        const response = await fetch('/api/hts/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        console.log('📥 API Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ API Error (${response.status}):`, errorText)
          failedCount++
          
          // 失敗時は「取得失敗」と記録
          await updateLocalProduct(product.id, {
            hts_code: '取得失敗',
            hts_confidence: 'uncertain'
          })
          continue
        }

        const data = await response.json()
        console.log('✅ API Response data:', data)

        if (data.success && data.htsCode && data.htsCode !== '要確認') {
          await updateLocalProduct(product.id, {
            hts_code: data.htsCode,
            hts_duty_rate: data.dutyRate || null,
            hts_confidence: data.confidence || 'uncertain',
            origin_country: data.originCountry || product.origin_country
          })
          
          console.log(`✅ 更新成功: ${data.htsCode} (信頼度: ${data.confidence})`)
          
          if (data.confidence === 'uncertain' || data.confidence === 'low') {
            uncertainCount++
          }
          updatedCount++
        } else {
          // 推定できない場合は「要確認」と記録
          console.warn('⚠️ HTSコード推定失敗 - 要確認に設定')
          await updateLocalProduct(product.id, {
            hts_code: '要確認',
            hts_confidence: 'uncertain'
          })
          uncertainCount++
          updatedCount++ // カウントはする
        }
      } catch (productError: any) {
        console.error(`❌ 商品 ${product.id} の処理エラー:`, productError)
        failedCount++
        
        // エラー時も「取得失敗」と記録
        await updateLocalProduct(product.id, {
          hts_code: '取得失敗',
          hts_confidence: 'uncertain'
        })
      }
    }

    console.log('\n━━━ HTS取得完了 ━━━')
    console.log('成功:', updatedCount)
    console.log('要確認:', uncertainCount)
    console.log('失敗:', failedCount)

    // 結果メッセージ
    if (updatedCount > 0) {
      const messages = []
      messages.push(`✅ ${updatedCount}件更新`)
      if (uncertainCount > 0) {
        messages.push(`⚠️ ${uncertainCount}件は要確認（Geminiで判定推奨）`)
      }
      if (failedCount > 0) {
        messages.push(`❌ ${failedCount}件失敗`)
      }
      showToast(messages.join(' / '), uncertainCount > 0 || failedCount > 0 ? 'error' : 'success')
      await loadProducts()
    } else {
      showToast('HTSコードを推定できませんでした', 'error')
    }
  } catch (error: any) {
    console.error('❌ HTS fetch error:', error)
    showToast(error.message || 'HTS取得中にエラーが発生しました', 'error')
  }
}
