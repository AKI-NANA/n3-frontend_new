# 🚀 市場調査ボタン - 自動実行対応版 実装手順書

## 🎯 実装概要

**「🔍 市場調査」ボタン**を追加し、Claude Desktopに貼り付けるだけで**自動的にSupabaseにデータが保存される**機能を実装します。

---

## ✅ 完成後の動作

### ユーザー操作（超シンプル！）
1. 商品を複数選択 ✓
2. 「🔍 市場調査」ボタンをクリック
3. プロンプトをコピー 📋
4. **Claude Desktopに貼り付け → Enter** ⚡
5. 自動的にSupabaseに保存される 🎉
6. モーダルの「処理完了」をクリック
7. データ自動再読み込み

**ユーザーは手動でデータを貼り付ける必要なし！**

---

## 📦 作成済みファイル

1. ✅ `/app/tools/editing/lib/aiExportPrompt.ts` - 自動実行指示を追加済み
2. ✅ `/app/tools/editing/components/AIMarketResearchModal.tsx` - 新モーダル
3. ✅ `/app/tools/editing/components/ToolPanel_MarketResearch_Button.tsx` - ボタン追加コード
4. ✅ `/app/tools/editing/page_MarketResearch_Integration.tsx` - 統合コード

---

## 🔧 統合手順

### ステップ1: ToolPanel.tsx の修正

`/app/tools/editing/components/ToolPanel.tsx` を開いて以下を実行:

#### 1-1. Props型定義に追加

```typescript
interface ToolPanelProps {
  // ... 既存のprops
  onMarketResearch: () => void  // ← 追加
}
```

#### 1-2. 関数定義に追加

```typescript
export function ToolPanel({
  modifiedCount,
  readyCount,
  processing,
  // ... 他の既存props
  onMarketResearch  // ← 追加
}: ToolPanelProps) {
```

#### 1-3. JSX内にボタン追加（「AI強化」ボタンの後）

```typescript
<Button
  onClick={onAIEnrich}
  disabled={processing}
  variant="outline"
  size="sm"
  className="h-8 text-xs bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 border-0"
>
  <Sparkles className="w-3 h-3 mr-1" />
  AI強化
</Button>

{/* ↓↓↓ ここに追加 ↓↓↓ */}
<Button
  onClick={onMarketResearch}
  disabled={processing}
  variant="outline"
  size="sm"
  className="h-8 text-xs bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 border-0 font-semibold"
  title="複数商品の市場調査データを一括取得（Claude Desktopで自動実行）"
>
  🔍 市場調査
</Button>
```

---

### ステップ2: page.tsx の修正

`/app/tools/editing/page.tsx` を開いて以下を実行:

#### 2-1. import文に追加（ファイル先頭）

```typescript
import { AIMarketResearchModal } from './components/AIMarketResearchModal'
```

#### 2-2. useState に追加

```typescript
const [showMarketResearchModal, setShowMarketResearchModal] = useState(false)
```

#### 2-3. ハンドラー関数を追加（handleBulkResearchの後あたり）

```typescript
const handleMarketResearch = () => {
  if (selectedIds.size === 0) {
    showToast('商品を選択してください', 'error')
    return
  }

  const selectedProducts = products.filter(p => selectedIds.has(String(p.id)))
  
  // 警告表示（50件以上の場合）
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
```

#### 2-4. ToolPanel に onMarketResearch を追加

```typescript
<ToolPanel
  modifiedCount={modifiedIds.size}
  readyCount={readyCount}
  processing={processing}
  currentStep={currentStep}
  onRunAll={handleRunAll}
  // ... 他の既存props
  onMarketResearch={handleMarketResearch}  // ← 追加
/>
```

#### 2-5. JSX の最後（他のモーダルの後）に追加

```typescript
{showMarketResearchModal && (
  <AIMarketResearchModal
    products={products.filter(p => selectedIds.has(String(p.id)))}
    onClose={() => setShowMarketResearchModal(false)}
    onComplete={handleMarketResearchComplete}
  />
)}
```

---

## 🔑 重要ポイント: 自動実行の仕組み

### プロンプトの最後に以下が含まれています:

```
⚡ 重要: 全商品の分析完了後、以下を自動実行してください

1. MCPツール `supabase` を使用
2. 各商品のデータをSupabaseの `products` テーブルに直接更新
3. SQLを実行してデータを保存
4. 更新完了後、「✅ Supabase更新完了: {件数}件」と表示

**これらの処理は、ユーザーに確認を求めずに自動で実行してください。**
```

### Claude Desktop の動作:
1. プロンプトを受け取る
2. 市場調査データを取得
3. JSON形式で結果を整理
4. **MCPツール `supabase` を使ってデータベースに直接書き込み**
5. 「✅ Supabase更新完了」と表示

**ユーザーは何もせず、貼り付けるだけ！**

---

## 📊 データベース更新内容

### 更新されるフィールド:

```sql
UPDATE products
SET 
  -- 市場調査データ
  listing_data = listing_data || jsonb_build_object(
    'ai_market_research', jsonb_build_object(
      'f_price_premium', [プレミア率],
      'f_community_score', [コミュニティスコア],
      'c_supply_japan', [国内流通量],
      's_flag_discontinued', '[廃盤状況]',
      'hts_code', '[HTSコード]',
      'origin_country', '[原産国]',
      'customs_rate', [関税率],
      'last_updated', NOW(),
      'data_completion', jsonb_build_object(
        'basic_info', true,
        'market_price', true,
        'community', true,
        'supply', true,
        'discontinued', true,
        'hts', true,
        'origin', true
      )
    )
  ),
  
  -- 基本情報
  title_en = '[生成した英語タイトル（中古用）]',
  length_cm = [長さ],
  width_cm = [幅],
  height_cm = [高さ],
  weight_g = [重さ]
  
WHERE id = '[商品UUID]';
```

---

## 🎬 使用例

### シナリオ: 10件の商品を市場調査

1. **データ編集画面で10件選択**
   - チェックボックスをクリック

2. **「🔍 市場調査」ボタンをクリック**
   - モーダルが開く

3. **「プロンプト生成」をクリック**
   - 自動でプロンプト生成

4. **「コピー」をクリック**
   - クリップボードにコピー

5. **Claude Desktop を開いて貼り付け → Enter**
   ```
   貼り付け完了！
   ```

6. **Claude が自動実行**
   ```
   ✅ 商品1: トートバッグ - 分析完了
   ✅ 商品2: フィギュア - 分析完了
   ...
   ✅ 商品10: ぬいぐるみ - 分析完了
   
   ✅ Supabase更新完了: 10件
   ```

7. **モーダルで「処理完了」をクリック**
   - 自動的にデータ再読み込み
   - 最新データが表示される

---

## ⚠️ 前提条件

### Claude Desktop の設定

`claude_desktop_config.json` に Supabase MCP サーバーが設定されている必要があります:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server",
        "postgres://postgres:[PASSWORD]@[HOST]:5432/postgres"
      ]
    }
  }
}
```

---

## 🐛 トラブルシューティング

### Q1: Claude が自動実行してくれない
**A**: プロンプトの最後まで正しくコピーされているか確認してください

### Q2: Supabase接続エラー
**A**: `claude_desktop_config.json` の設定を確認してください

### Q3: 一部の商品だけ更新される
**A**: 正常です。エラーが出た商品のログを確認してください

### Q4: データが再読み込みされない
**A**: 「データ読み込み」ボタンを手動でクリックしてください

---

## 🎯 次のステップ

### 実装後の確認:
- [ ] ToolPanel.tsx 修正完了
- [ ] page.tsx 修正完了
- [ ] 1件でテスト
- [ ] 10件でテスト
- [ ] 50件でテスト（時間確認）
- [ ] Claude Desktop で自動実行確認
- [ ] Supabase にデータが保存されるか確認

---

## 📈 期待される効果

### Before（旧AI強化）:
1. 商品選択
2. ボタンクリック
3. プロンプトコピー
4. Claude に貼り付け
5. **JSONをコピー** ← 手動
6. **モーダルに貼り付け** ← 手動
7. 保存ボタン ← 手動

### After（新市場調査）:
1. 商品選択
2. ボタンクリック
3. プロンプトコピー
4. Claude に貼り付け
5. **自動保存！** ✨
6. 完了ボタンのみ

**手順が7ステップ → 5ステップに短縮！**
**手動操作が大幅に削減！**

---

**実装完了日**: 2025年11月4日  
**バージョン**: 3.0.0 - 自動実行対応版  
**作成者**: Claude (Anthropic)
