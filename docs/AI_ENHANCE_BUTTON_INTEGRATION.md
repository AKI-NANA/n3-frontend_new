# 🚀 AI強化ボタン統合 - 実装手順書

## 📋 概要

「AI強化」ボタンを新しい市場調査機能に完全統合しました。
1つのボタンで複数商品の一括処理が可能になります。

---

## ✅ 変更内容

### 1. **新しいモーダルコンポーネント作成**
📍 `/app/tools/editing/components/AIMarketResearchModal.tsx`

#### 特徴:
- ✅ 4ステップウィザード形式（分かりやすい）
- ✅ 複数商品対応
- ✅ プロンプト自動生成
- ✅ ワンクリックコピー
- ✅ Claude Web直接起動
- ✅ 進捗確認ガイド

#### ステップ:
1. **データ確認** - 選択商品の確認、処理時間の目安表示
2. **プロンプト** - 生成されたプロンプトをコピー
3. **処理実行** - Claude で実行、進捗ガイド表示
4. **完了** - 次のステップ案内

---

## 🔧 統合手順

### ステップ1: 新モーダルのインポート

`/app/tools/editing/page.tsx` のファイル先頭に追加:

```typescript
import { AIMarketResearchModal } from './components/AIMarketResearchModal'
```

### ステップ2: State追加

`page.tsx` の useState セクションに追加:

```typescript
const [showAIMarketModal, setShowAIMarketModal] = useState(false)
```

### ステップ3: handleAIEnrich関数の置き換え

既存の `handleAIEnrich` 関数を削除して、以下で置き換え:

```typescript
const handleAIEnrich = () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  // 新しいモーダルを開く（複数商品対応）
  setShowAIMarketModal(true)
}

const handleAIMarketComplete = async () => {
  showToast('✅ AI強化データを取得しました。データを再読み込みしています...', 'success')
  await loadProducts() // データ再読み込み
}
```

### ステップ4: 既存モーダルの削除

以下のコードをコメントアウトまたは削除:

```typescript
// ❌ 削除または非表示
// const [showAIEnrichModal, setShowAIEnrichModal] = useState(false)
// const [enrichTargetProduct, setEnrichTargetProduct] = useState<Product | null>(null)

// const handleSaveEnrichedData = async (success: boolean) => {
//   if (success) {
//     showToast('AI強化データを保存しました')
//     await loadProducts()
//   }
// }

// JSX内のモーダルも削除
// {showAIEnrichModal && enrichTargetProduct && (
//   <AIDataEnrichmentModal ... />
// )}
```

### ステップ5: 新モーダルのJSX追加

`page.tsx` の return 内、他のモーダルの後に追加:

```typescript
{showAIMarketModal && (
  <AIMarketResearchModal
    products={products.filter(p => selectedIds.has(String(p.id)))}
    onClose={() => setShowAIMarketModal(false)}
    onComplete={handleAIMarketComplete}
  />
)}
```

---

## 📱 使用方法

### ユーザー操作フロー:

1. **商品を選択**
   - テーブルでチェックボックスをクリック（1件以上）

2. **「AI強化」ボタンをクリック**
   - 紫色のグラデーションボタン

3. **モーダルが開く - ステップ1: データ確認**
   - 選択された商品一覧を確認
   - 処理時間の目安を確認
   - 取得されるデータの一覧を確認
   - 「プロンプト生成」ボタンをクリック

4. **ステップ2: プロンプト表示**
   - 自動生成されたプロンプトが表示される
   - 「コピー」ボタンをクリック → クリップボードにコピー
   - 「Claude Web を開く」ボタンをクリック → 新しいタブでClaude Web起動

5. **ステップ3: 処理実行**
   - Claude Desktop/Web にプロンプトを貼り付け
   - Enter キーを押す
   - 各ステップで ✅ が表示される
   - 完了したら「処理完了」ボタンをクリック

6. **ステップ4: 完了**
   - 完了メッセージを確認
   - 「閉じる」ボタンをクリック
   - 自動的にデータが再読み込みされる

---

## 🎨 デザイン特徴

### カラーリング:
- **ヘッダー**: 紫→インディゴのグラデーション
- **ステップインジケーター**: 紫色（現在のステップを明確に）
- **アクションボタン**: 各ステップに最適な色
  - ステップ1: 紫グラデーション
  - ステップ2: オレンジ→赤グラデーション（Claude Web起動）
  - ステップ3: 緑グラデーション（完了）

### レスポンシブ:
- ✅ モバイル対応
- ✅ タブレット対応
- ✅ デスクトップ最適化

### アクセシビリティ:
- ✅ ダークモード対応
- ✅ アイコンと色の組み合わせ
- ✅ 明確なラベルとヘルプテキスト

---

## 🔍 技術詳細

### 依存関係:
```typescript
import { generateAIAnalysisPrompt } from '../lib/aiExportPrompt'
```
- 市場調査プロンプト生成ロジック
- 指示書完全対応

### Props:
```typescript
interface AIMarketResearchModalProps {
  products: Product[]        // 選択された商品配列
  onClose: () => void        // モーダルを閉じる
  onComplete?: () => void    // 完了時のコールバック
}
```

### State管理:
```typescript
const [step, setStep] = useState<1 | 2 | 3 | 4>(1)  // 現在のステップ
const [copied, setCopied] = useState(false)          // コピー状態
const [prompt, setPrompt] = useState('')             // 生成されたプロンプト
```

---

## 📊 処理時間の目安

| 商品数 | 処理時間 |
|--------|----------|
| 1-10件 | 約2-5分 |
| 11-50件 | 約5-15分 |
| 51-100件 | 約15-30分 |
| 100件以上 | 30分以上 |

※ Claude Desktop/Web の処理速度に依存

---

## ⚠️ 注意事項

### 1. **処理中は画面を閉じない**
- Claude の処理が完了するまで待つ
- 各ステップの ✅ を確認

### 2. **Supabase接続確認**
- Claude Desktop で MCP Supabase サーバーが有効か確認
- `claude_desktop_config.json` で設定済みか確認

### 3. **トークン消費**
- 大量商品（100件以上）は要注意
- Claude Pro推奨

---

## 🐛 トラブルシューティング

### Q1: モーダルが開かない
**A**: 商品を1件以上選択してください

### Q2: プロンプトがコピーできない
**A**: ブラウザのクリップボード権限を確認してください

### Q3: Claude Web が開かない
**A**: ポップアップブロッカーを無効にしてください

### Q4: データが更新されない
**A**: 「データ読み込み」ボタンを手動でクリックしてください

---

## 🎯 今後の改善予定

### 短期:
- [ ] リアルタイム進捗表示（WebSocket）
- [ ] エラーハンドリング強化
- [ ] 処理中断機能

### 中期:
- [ ] バッチ処理の最適化
- [ ] 処理履歴の保存
- [ ] 自動再試行機能

---

## ✅ テストチェックリスト

実装後の確認項目:
- [ ] 1件選択でモーダルが開く
- [ ] 複数件選択でモーダルが開く
- [ ] プロンプトが正しく生成される
- [ ] コピーボタンが機能する
- [ ] Claude Web が開く
- [ ] ステップ間の遷移がスムーズ
- [ ] 完了後にデータが再読み込みされる
- [ ] モバイルで正常に表示される
- [ ] ダークモードで正常に表示される

---

**実装完了日**: 2025年11月4日  
**バージョン**: 2.0.0  
**作成者**: Claude (Anthropic)
