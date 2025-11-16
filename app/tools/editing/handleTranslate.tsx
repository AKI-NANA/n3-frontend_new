  // 🌍 翻訳ハンドラー
  const handleTranslate = async () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedArray = Array.from(selectedIds)
    showToast(`${selectedArray.length}件の商品を翻訳中...`, 'success')

    try {
      let translatedCount = 0

      for (const productId of selectedArray) {
        const product = products.find(p => String(p.id) === productId)
        if (!product) continue

        // 既に翻訳済みの場合はスキップ
        if (product.english_title && product.english_description) {
          console.log(`  ⏭️ ${productId}: 既に翻訳済み`)
          continue
        }

        // 翻訳API呼び出し
        const response = await fetch('/api/tools/translate-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            title: product.title,
            description: product.description,
            condition: product.condition_name
          })
        })

        const result = await response.json()

        if (result.success) {
          console.log(`  ✅ ${productId}: 翻訳完了`)
          translatedCount++
          
          // ローカル状態を更新
          updateLocalProduct(productId, {
            english_title: result.translations.title,
            english_description: result.translations.description,
            english_condition: result.translations.condition
          })
        } else {
          console.error(`  ❌ ${productId}: 翻訳失敗`)
        }
      }

      if (translatedCount > 0) {
        showToast(`✅ ${translatedCount}件の翻訳が完了しました`, 'success')
        await loadProducts()
      } else {
        showToast('翻訳する商品がありませんでした', 'error')
      }
    } catch (error: any) {
      console.error('Translation error:', error)
      showToast(error.message || '翻訳中にエラーが発生しました', 'error')
    }
  }
