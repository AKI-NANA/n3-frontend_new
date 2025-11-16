interface Product {
  id: number
  sku: string
  title: string
  title_en: string
  images: string[]
  yahoo_price: number
  ebay_price: number
  profit_jpy: number
  profit_rate: number
  final_score: number
  category_name: string
  hts_code: string
  hts_duty_rate: number
  origin_country: string
  approval_status: string
  ai_confidence_score: number
  data_completeness: number
}

interface ApprovalProductCardProps {
  product: Product
  isSelected: boolean
  onSelect: () => void
}

export function ApprovalProductCard({ product, isSelected, onSelect }: ApprovalProductCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getProfitColor = (rate: number) => {
    if (rate >= 15) return 'text-emerald-600'
    if (rate >= 10) return 'text-green-600'
    return 'text-yellow-600'
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border-2 transition-all cursor-pointer hover:shadow-xl ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 dark:border-gray-700'
      }`}
      onClick={onSelect}
    >
      {/* チェックボックスと完全性バッジ */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
            isSelected
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white border-gray-300'
          }`}
        >
          {isSelected && <i className="fas fa-check text-white text-xs"></i>}
        </div>
        
        {product.data_completeness === 100 ? (
          <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
            完全
          </span>
        ) : (
          <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded">
            {product.data_completeness}%
          </span>
        )}
      </div>

      {/* スコアバッジ */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`px-3 py-1 rounded-full font-bold text-sm ${getScoreColor(product.final_score)}`}>
          <i className="fas fa-star mr-1"></i>
          {product.final_score}点
        </div>
      </div>

      {/* 商品画像 */}
      <div className="relative h-56 bg-gray-100 dark:bg-gray-700">
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 商品情報 */}
      <div className="p-4">
        {/* SKU */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">
          {product.sku}
        </div>

        {/* 日本語タイトル */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 h-10">
          {product.title}
        </h3>

        {/* 英語タイトル */}
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 h-8">
          {product.title_en}
        </p>

        {/* 価格情報 */}
        <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">仕入価格</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              ¥{product.yahoo_price.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">出品価格</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              ${product.ebay_price}
            </div>
          </div>
        </div>

        {/* 利益情報 */}
        <div className="mb-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">純利益</span>
            <span className={`text-lg font-bold ${getProfitColor(product.profit_rate)}`}>
              ¥{product.profit_jpy.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">利益率</span>
            <span className={`text-sm font-bold ${getProfitColor(product.profit_rate)}`}>
              {product.profit_rate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* カテゴリー・HTS・原産国 */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <i className="fas fa-folder text-gray-400 w-4"></i>
            <span className="text-gray-600 dark:text-gray-400">カテゴリー:</span>
            <span className="text-gray-900 dark:text-white font-medium">{product.category_name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <i className="fas fa-file-invoice text-gray-400 w-4"></i>
            <span className="text-gray-600 dark:text-gray-400">HTS:</span>
            <span className="text-gray-900 dark:text-white font-mono">{product.hts_code}</span>
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-semibold">
              {product.hts_duty_rate}%
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <i className="fas fa-globe text-gray-400 w-4"></i>
            <span className="text-gray-600 dark:text-gray-400">原産国:</span>
            <span className="text-gray-900 dark:text-white font-medium">{product.origin_country}</span>
          </div>
        </div>

        {/* AIスコア */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <i className="fas fa-robot mr-1"></i>
              AI信頼度
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${product.ai_confidence_score}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {product.ai_confidence_score}%
              </span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold">
            <i className="fas fa-check"></i>
          </button>
          <button className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold">
            <i className="fas fa-times"></i>
          </button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold">
            <i className="fas fa-eye"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
