# AI強化ボタン - 既存モーダル改良プラン

## 📊 現状分析

### 既存モーダル (`AIDataEnrichmentModal.tsx`)
- ✅ 動作している
- ✅ Gemini/Claude Web対応
- ✅ 4ステップウィザード
- ❌ **1商品のみ対応**
- ❌ **市場調査データなし**

---

## 🎯 改良方針

### オプション1: 最小限の修正（推奨）
既存モーダルはそのまま維持し、**新しい「市場調査ボタン」を追加**

```
[AI強化] ← 既存（1商品、基本情報のみ）
[市場調査] ← 新規（複数商品、完全版プロンプト）
```

### オプション2: 完全置き換え
既存モーダルを複数商品対応に改造

---

## 🚀 推奨実装: オプション1

### 理由:
1. ✅ 既存機能を壊さない
2. ✅ 段階的な移行が可能
3. ✅ ユーザーが用途に応じて選択できる

### 実装:
1. ToolPanel.tsxに新ボタン「🔍 市場調査」を追加
2. 新モーダル`AIMarketResearchModal`を使用
3. 既存の「AI強化」ボタンはそのまま

---

## 📝 実装コード

### 1. ToolPanel.tsx に新ボタン追加

```typescript
// ... 既存のボタンの後に追加

<Button
  onClick={onMarketResearch}
  disabled={processing}
  variant="outline"
  size="sm"
  className="h-8 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 text-white border-0 hover:from-blue-600 hover:to-cyan-700 font-semibold"
>
  🔍 市場調査
</Button>
```

### 2. page.tsx に状態とハンドラー追加

```typescript
// State追加
const [showMarketResearchModal, setShowMarketResearchModal] = useState(false)

// ハンドラー追加
const handleMarketResearch = () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }
  setShowMarketResearchModal(true)
}

const handleMarketResearchComplete = async () => {
  showToast('✅ 市場調査データを取得しました', 'success')
  await loadProducts()
}

// JSX追加
{showMarketResearchModal && (
  <AIMarketResearchModal
    products={products.filter(p => selectedIds.has(String(p.id)))}
    onClose={() => setShowMarketResearchModal(false)}
    onComplete={handleMarketResearchComplete}
  />
)}
```

---

## 📱 ユーザー体験

### 「AI強化」ボタン（既存）
- 1商品のみ選択可能
- 基本情報（HTSコード、サイズ、英語タイトル）
- 高速（2-3分）

### 「市場調査」ボタン（新規）
- 複数商品対応
- 完全な市場調査データ
- 時間がかかる（10-20分）
- スコアリング精度向上

---

この方針でよろしいですか？

それとも、既存の「AI強化」ボタンを完全に置き換えますか？
