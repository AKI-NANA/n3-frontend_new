// app/tools/editing/components/ToolPanel.tsx への追加コード
// 「AI強化」ボタンの後に、以下のボタンを追加してください

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

// ToolPanelPropsに以下を追加:
interface ToolPanelProps {
  // ... 既存のprops
  onMarketResearch: () => void  // 追加
}

// 関数定義に追加:
export function ToolPanel({
  // ... 既存のprops
  onMarketResearch  // 追加
}: ToolPanelProps) {
  // ... 既存のコード
}
