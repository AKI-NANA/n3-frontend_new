# 🔧 page.tsx への追加コード（完全版）

## 手動で以下のコードを追加してください

### 1. handleAIEnrich関数の後に以下を追加:

\`\`\`typescript
  // 🔍 市場調査モーダル処理
  const handleMarketResearch = () => {
    if (selectedIds.size === 0) {
      showToast('商品を選択してください', 'error')
      return
    }

    const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
    
    // 50件以上の警告
    if (selectedProducts.length > 50) {
      const confirmMsg = `${selectedProducts.length}件の商品を処理します。\n\n⚠️ 注意:\n- 処理に15-30分かかる場合があります\n- Claude Desktopが自動でSupabaseに保存します\n\n続行しますか？`
      if (!confirm(confirmMsg)) {
        return
      }
    }

    setShowMarketResearchModal(true)
  }

  const handleMarketResearchComplete = async () => {
    showToast('✅ 市場調査データをSupabaseに保存しました。データを再読み込みしています...', 'success')
    await loadProducts()
  }
\`\`\`

### 2. <ToolPanel> コンポーネントに onMarketResearch を追加:

\`\`\`typescript
<ToolPanel
  modifiedCount={modifiedIds.size}
  readyCount={readyCount}
  processing={processing}
  currentStep={currentStep}
  onRunAll={handleRunAll}
  onPaste={() => setShowPasteModal(true)}
  onCategory={async () => { /* ... */ }}
  onShipping={async () => { /* ... */ }}
  onProfit={async () => { /* ... */ }}
  onHTML={() => setShowHTMLPanel(true)}
  onSellerMirror={async () => { /* ... */ }}
  onScores={() => runBatchScores(products)}
  onSave={handleSaveAll}
  onDelete={handleDelete}
  onExport={handleExportCSV}
  onExportEbay={handleExportEbayCSV}
  onExportYahoo={handleExportYahooCSV}
  onExportMercari={handleExportMercariCSV}
  onAIExport={handleAIExport}
  onList={handleListToMarketplace}
  onLoadData={loadProducts}
  onCSVUpload={() => setShowCSVModal(true)}
  onBulkResearch={handleBulkResearch}
  onBatchFetchDetails={handleBatchFetchDetails}
  selectedMirrorCount={selectedMirrorCount}
  onAIEnrich={handleAIEnrich}
  onFilterCheck={handleFilterCheck}
  onPricingStrategy={() => setShowPricingPanel(true)}
  onMarketResearch={handleMarketResearch}  // ← この行を追加
/>
\`\`\`

### 3. JSXの最後（他のモーダルの後）に追加:

\`\`\`typescript
      {showMarketResearchModal && (
        <AIMarketResearchModal
          products={products.filter(p => selectedIds.has(String(p.id)))}
          onClose={() => setShowMarketResearchModal(false)}
          onComplete={handleMarketResearchComplete}
        />
      )}
\`\`\`

## 完了！

これで以下が動作するようになります:
1. 商品を選択
2. 「🔍 市場調査」ボタンをクリック
3. プロンプトをコピー
4. Claude Desktopに貼り付け → 自動実行
5. 完了！
