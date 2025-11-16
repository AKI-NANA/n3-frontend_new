// app/tools/editing/page.tsx への追加・修正コード
// =================================================================
// ステップ1: import文に追加
// =================================================================

import { AIMarketResearchModal } from './components/AIMarketResearchModal'

// =================================================================
// ステップ2: useState に追加
// =================================================================

const [showMarketResearchModal, setShowMarketResearchModal] = useState(false)

// =================================================================
// ステップ3: ハンドラー関数を追加（handleBulkResearchの後に配置）
// =================================================================

const handleMarketResearch = () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
  
  // 警告表示（任意）
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

// =================================================================
// ステップ4: ToolPanelコンポーネントに onMarketResearch を追加
// =================================================================

<ToolPanel
  // ... 既存のprops
  onMarketResearch={handleMarketResearch}  // 追加
/>

// =================================================================
// ステップ5: JSXの最後（他のモーダルの後）に以下を追加
// =================================================================

{showMarketResearchModal && (
  <AIMarketResearchModal
    products={products.filter(p => selectedIds.has(String(p.id)))}
    onClose={() => setShowMarketResearchModal(false)}
    onComplete={handleMarketResearchComplete}
  />
)}

// =================================================================
// 完了！
// =================================================================

// 動作確認:
// 1. 複数商品を選択
// 2. 「🔍 市場調査」ボタンをクリック
// 3. プロンプトをコピー
// 4. Claude Desktopに貼り付け
// 5. Claude が自動でSupabaseに保存
// 6. 「処理完了」をクリック
// 7. データが自動で再読み込みされる
