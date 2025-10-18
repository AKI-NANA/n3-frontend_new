'use client'

export function UsaDdpCostTable() {
  // 商品価格の配列
  const productPrices = [50, 100, 150, 200, 250, 300]
  
  // DDP手数料（商品価格の14.5%）
  const getDdpFee = (price: number) => price * 0.145
  
  // 重量帯の定義（50重量帯）
  const weightBands = [
    { from: 0, to: 0.5, baseShipping: 20.00 },
    { from: 0.5, to: 1.0, baseShipping: 22.00 },
    { from: 1.0, to: 1.5, baseShipping: 24.00 },
    { from: 1.5, to: 2.0, baseShipping: 26.00 },
    { from: 2.0, to: 2.5, baseShipping: 28.00 },
    { from: 2.5, to: 3.0, baseShipping: 30.00 },
    { from: 3.0, to: 3.5, baseShipping: 32.00 },
    { from: 3.5, to: 4.0, baseShipping: 34.00 },
    { from: 4.0, to: 4.5, baseShipping: 36.00 },
    { from: 4.5, to: 5.0, baseShipping: 38.00 },
    // ... 以降は2kg刻みで増加
  ]

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <h2 className="text-xl font-bold">USA DDP総配送コスト表</h2>
        <p className="text-sm opacity-90 mt-1">
          Base Shipping + DDP手数料（商品価格 × 14.5%）
        </p>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-bold border-r">重量帯</th>
              {productPrices.map(price => (
                <th key={price} className="px-4 py-3 text-center border-r">
                  <div className="font-bold text-blue-600">商品価格</div>
                  <div className="text-lg font-bold">${price}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    DDP: ${getDdpFee(price).toFixed(0)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weightBands.map((band, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                {/* 重量帯 */}
                <td className="px-4 py-3 border-r">
                  <div className="font-bold text-gray-700">
                    {band.from}-{band.to}kg
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Base: ${band.baseShipping.toFixed(2)}
                  </div>
                </td>

                {/* 各商品価格の総配送料 */}
                {productPrices.map(price => {
                  const ddpFee = getDdpFee(price)
                  const totalShipping = band.baseShipping + ddpFee
                  
                  return (
                    <td key={price} className="px-4 py-3 text-center border-r">
                      {/* Base Shipping */}
                      <div className="text-xs text-gray-600">
                        ${band.baseShipping.toFixed(2)}
                      </div>
                      
                      {/* 総配送料（太字・大きく） */}
                      <div className="text-lg font-bold text-green-600 my-1">
                        ${totalShipping.toFixed(2)}
                      </div>
                      
                      {/* DDP手数料 */}
                      <div className="text-xs text-blue-600">
                        +${ddpFee.toFixed(2)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 注釈 */}
      <div className="bg-gray-50 p-4 border-t text-xs text-gray-600 space-y-1">
        <div>
          <strong>計算式:</strong> 総配送料 = Base Shipping + DDP手数料
        </div>
        <div>
          <strong>DDP手数料:</strong> 商品価格 × 14.5%（関税・消費税の代行）
        </div>
        <div>
          <strong>重量帯:</strong> 0-50kgまで50重量帯（0.5kg刻み → 2kg刻み）
        </div>
        <div>
          <strong>配送先:</strong> アメリカ国内のみ（DDP方式）
        </div>
      </div>
    </div>
  )
}
