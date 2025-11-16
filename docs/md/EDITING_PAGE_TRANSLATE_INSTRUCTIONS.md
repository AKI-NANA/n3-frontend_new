# Editing Page 翻訳機能追加 - 修正手順

## 📋 修正内容

### 1. handleTranslate関数を追加

**場所:** handleMaterialFetch関数の後（約600行目付近）

```typescript
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
```

### 2. ToolPanelに翻訳ハンドラーを追加

**場所:** ToolPanel コンポーネントの呼び出し部分（約800行目付近）

```typescript
        <ToolPanel
          modifiedCount={modifiedIds.size}
          readyCount={readyCount}
          processing={processing}
          currentStep={currentStep}
          onRunAll={handleRunAll}
          // ... 他のハンドラー ...
          onMarketResearch={handleMarketResearch}
          onTranslate={handleTranslate}  // 🔥 これを追加
        />
```

---

## 🛠️ 実装手順

### Step 1: handleTranslate関数を追加

page.tsxの約600行目（handleMaterialFetchの後）に上記の関数を追加

### Step 2: ToolPanelにハンドラーを渡す

page.tsxの約800行目のToolPanel呼び出し部分に `onTranslate={handleTranslate}` を追加

### Step 3: ブラウザをリロード

`Ctrl+R` または `Cmd+R`

### Step 4: 確認

- ツールパネルに「🌍 翻訳」ボタンが表示される
- 商品を選択してボタンをクリック
- 翻訳が実行される

---

## 📝 完了後の動作

1. 商品を選択
2. 「🌍 翻訳」ボタンをクリック
3. 「5件の商品を翻訳中...」と表示
4. 翻訳完了後、「✅ 5件の翻訳が完了しました」と表示
5. データが自動的にリロードされる
