// app/tools/editing/page.tsx - handleAIExport関数の修正版
// この関数を既存のhandleAIExport関数と置き換えてください

import { generateAIAnalysisPrompt } from './lib/aiExportPrompt'

// AI解析用CSVエクスポート（指示書完全対応版）
const handleAIExport = () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
  
  // 100件以上の警告
  if (selectedProducts.length > 100) {
    const confirmMsg = `${selectedProducts.length}件の商品を処理します。\n\n⚠️ 注意:\n- 処理に10-20分かかる場合があります\n- HTSコード・原産国・市場調査を含む完全分析です\n- トークン使用量が多くなります\n\n続行しますか？`
    if (!confirm(confirmMsg)) {
      return
    }
  }
  
  // プロンプト生成（指示書完全対応）
  const prompt = generateAIAnalysisPrompt(selectedProducts)
  
  // クリップボードにコピー
  navigator.clipboard.writeText(prompt).then(() => {
    showToast(
      `✅ ${selectedProducts.length}件の商品データをコピーしました！\n\n📋 取得データ:\n✅ 英語タイトル（VERO対応2パターン）\n✅ HTSコード・原産国・関税率\n✅ プレミア率・流通量・廃盤状況\n✅ コミュニティスコア\n\n👉 Claude Desktopに貼り付けてください`,
      'success'
    )
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ AI解析用データコピー完了！

📊 対象商品: ${selectedProducts.length}件

📋 取得予定データ:
┌─ 基本情報 ─────────────────────┐
│ ✅ 英語タイトル（80文字、SEO最適化）│
│ ✅ VERO対応（新品用/中古用）       │
│ ✅ HTSコード                      │
│ ✅ 原産国（実データ確認）         │
│ ✅ 関税率                         │
│ ✅ サイズ・重量                   │
└───────────────────────────────┘

┌─ 市場調査（スコアリング用）────┐
│ ① プレミア率（F_Price_Premium）  │
│ ② コミュニティスコア              │
│    (F_Community_Score)           │
│ ③ 類似商品高騰事例               │
│ ④ 国内流通量（C_Supply_Japan）   │
│ ⑤ 廃盤状況（S_Flag_Discontinued）│
│ ⑥ 流通量トレンド                 │
└───────────────────────────────┘

🚀 次のステップ:
1. Claude Desktopを開く
2. Cmd + V (Mac) / Ctrl + V (Win)
3. Enter を押す
4. 処理完了を待つ（進捗は✅で表示）
5. JSONレスポンスを確認
6. Supabase自動更新完了

⚠️ 重要:
- 原産国は実データ確認（推測禁止）
- HTSコード誤りは赤字リスク
- 不明なデータは "UNKNOWN"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  }).catch(err => {
    console.error('コピー失敗:', err)
    showToast('コピーに失敗しました', 'error')
  })
}
