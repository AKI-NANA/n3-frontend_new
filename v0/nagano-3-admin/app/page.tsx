import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />

      <main className="main-content expanded">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">NAGANO-3 eコマース管理システム</h1>
          <p className="text-gray-600 mb-8">
            29モジュールを持つ統合eコマース管理システムへようこそ。 左側のサイドバーから各機能にアクセスできます。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">商品管理</h3>
              <p className="text-blue-600 text-sm">商品の登録・編集・カテゴリ管理</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">在庫管理</h3>
              <p className="text-green-600 text-sm">在庫の入出庫・棚卸し・調整</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">受注管理</h3>
              <p className="text-purple-600 text-sm">注文処理・出荷・返品管理</p>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">AI制御</h3>
              <p className="text-orange-600 text-sm">AI分析・需要予測・価格最適化</p>
            </div>

            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-800 mb-2">記帳会計</h3>
              <p className="text-red-600 text-sm">売上・仕入・財務レポート</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">外部連携</h3>
              <p className="text-gray-600 text-sm">Amazon・楽天・API連携</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
