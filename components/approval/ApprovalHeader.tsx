export function ApprovalHeader() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl p-8 mb-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <i className="fas fa-check-circle"></i>
            商品承認システム
          </h1>
          <p className="text-blue-100 text-lg">
            出品前の最終確認 - データ完全性とリスク評価
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-blue-100 mb-1">最終更新</div>
          <div className="text-xl font-semibold">
            {new Date().toLocaleDateString('ja-JP')} {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}
