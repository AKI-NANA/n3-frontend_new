export function PackagingCostTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">梱包費用・人件費設定</h2>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-4">
          重量・サイズ別費用設定
        </h3>
        <p className="text-sm mb-4">※この機能は今後実装予定です</p>
        <div className="space-y-3 text-sm">
          <div>• 重量帯別の梱包資材費</div>
          <div>• サイズ別の人件費（梱包時間）</div>
          <div>• 配送準備費用</div>
          <div>• その他経費</div>
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4">実装予定機能</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">→</span>
            <span>重量・サイズに応じた梱包資材の自動選択</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">→</span>
            <span>梱包時間の記録と人件費計算</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">→</span>
            <span>梱包費用マスタの編集機能</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">→</span>
            <span>Supabaseへの保存と履歴管理</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
