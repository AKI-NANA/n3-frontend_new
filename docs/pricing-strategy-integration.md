# 編集ツール - 価格戦略統合 実装ガイド

## 実装完了

### 1. PricingStrategyPanel コンポーネント
**ファイル**: `/app/tools/editing/components/PricingStrategyPanel.tsx`

**機能**:
- デフォルト設定の使用/カスタム設定の切り替え
- 選択商品への一括適用
- 個別の価格戦略設定

### 2. 統合方法

#### `/app/tools/editing/page.tsx` に追加:

```typescript
// import追加
import { PricingStrategyPanel } from './components/PricingStrategyPanel'

// state追加
const [showPricingPanel, setShowPricingPanel] = useState(false)

// ToolPanel に価格戦略ボタン追加（既存のボタンの近くに）
<Button onClick={() => setShowPricingPanel(true)}>
  価格戦略
</Button>

// モーダル追加（ProductModalの近くに）
{showPricingPanel && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
      <PricingStrategyPanel
        selectedProducts={products.filter(p => selectedIds.has(String(p.id)))}
        onClose={() => setShowPricingPanel(false)}
      />
    </div>
  </div>
)}
```

### 3. データベーススキーマ

`products_master` テーブルに `pricing_strategy` カラムが必要:

```sql
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS pricing_strategy JSONB;

COMMENT ON COLUMN products_master.pricing_strategy 
IS '個別の価格戦略設定（nullの場合はデフォルト設定を使用）';
```

### 4. 使い方

1. 編集ツールで商品を選択
2. 「価格戦略」ボタンをクリック
3. デフォルト使用 or カスタム設定を選択
4. 保存

### 5. デフォルト設定との連携

- チェックON: `global_pricing_strategy` の設定を使用
- チェックOFF: 商品ごとのカスタム設定を使用

## 次回セッション

文字数制限のため、以下は次回実装:
- ToolPanelへのボタン追加
- モーダルUI統合
- データベースマイグレーション実行
