// app/tools/editing/page.tsx - handleAIEnrich関数の修正版
// 既存のhandleAIEnrich関数をこのコードで置き換えてください

// ファイル先頭のimportセクションに追加
import { AIMarketResearchModal } from './components/AIMarketResearchModal'

// useState に追加
const [showAIMarketModal, setShowAIMarketModal] = useState(false)

// handleAIEnrich関数を以下で置き換え
const handleAIEnrich = () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  // 新しいモーダルを開く（複数商品対応）
  setShowAIMarketModal(true)
}

// 完了時の処理
const handleAIMarketComplete = async () => {
  showToast('✅ AI強化データを取得しました。データを再読み込みしています...', 'success')
  await loadProducts() // データ再読み込み
}

// JSXのreturn内、既存のモーダル群の後に追加
{showAIMarketModal && (
  <AIMarketResearchModal
    products={products.filter(p => selectedIds.has(String(p.id)))}
    onClose={() => setShowAIMarketModal(false)}
    onComplete={handleAIMarketComplete}
  />
)}

// 注意: 既存の以下のコードは削除または非表示にしてください
// {showAIEnrichModal && enrichTargetProduct && (
//   <AIDataEnrichmentModal
//     product={enrichTargetProduct}
//     onClose={() => {
//       setShowAIEnrichModal(false)
//       setEnrichTargetProduct(null)
//     }}
//     onSave={handleSaveEnrichedData}
//   />
// )}
