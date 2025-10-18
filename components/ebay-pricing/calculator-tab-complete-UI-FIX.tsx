// components/ebay-pricing/calculator-tab-complete.tsx
// 
// 🔧 修正: 配送ポリシー選択UI（行290あたり）
// 既存の配送ポリシーセクションを以下に置き換え

          {/* 🆕 配送ポリシー選択 */}
          <div className="bg-white p-3 rounded-lg border border-blue-300">
            <label className="text-sm font-semibold text-blue-700 flex items-center gap-1">
              📦 配送ポリシー
              {loadingPolicies && <span className="text-xs text-gray-500">(読込中...)</span>}
            </label>
            
            {/* 自動選択の結果表示 */}
            {policyDebugInfo && (
              <div className="mt-2 text-xs bg-blue-50 p-2 rounded border border-blue-200">
                <div className="font-semibold text-blue-800">自動選択結果</div>
                <div className="text-blue-700">{policyDebugInfo}</div>
                {autoSelectedPolicy && (
                  <div className="mt-1 space-y-0.5 text-gray-600">
                    <div>方式: <span className="font-semibold">{autoSelectedPolicy.pricing_basis}</span></div>
                    {autoSelectedPolicy.price_band && (
                      <div>価格帯: <span className="font-semibold">{autoSelectedPolicy.price_band}</span></div>
                    )}
                    {autoSelectedPolicy.weight_range && (
                      <div>重量: {autoSelectedPolicy.weight_range}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 手動選択（オプション） */}
            <select
              value={selectedPolicyId || ''}
              onChange={(e) => {
                const newId = e.target.value ? parseInt(e.target.value) : null
                setSelectedPolicyId(newId)
                setAutoSelectedPolicy(null) // 手動選択時は自動選択をクリア
              }}
              className="w-full px-2 py-1.5 border rounded text-xs mt-2"
              disabled={loadingPolicies}
            >
              <option value="">手動で選択...</option>
              {shippingPolicies.map((policy: any) => (
                <option key={policy.id} value={policy.id}>
                  {policy.policy_name} ({policy.weight_min_kg}-{policy.weight_max_kg}kg)
                </option>
              ))}
            </select>
            
            {selectedPolicyId && policyZoneRates.length > 0 && (
              <div className="mt-2 text-xs space-y-1">
                <div className="font-semibold text-blue-800 mb-1">送料情報</div>
                {policyZoneRates.filter((r: any) => r.zone_code === 'US').slice(0, 1).map((r: any) => (
                  <div key={r.id} className="bg-blue-50 p-1.5 rounded border border-blue-200">
                    <div className="font-semibold">🇺🇸 USA (DDP)</div>
                    <div className="flex justify-between">
                      <span>1個目:</span>
                      <span className="font-bold">${(r.first_item_shipping_usd || r.display_shipping_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>2個目以降:</span>
                      <span>+${(r.additional_item_shipping_usd || r.actual_cost_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Handling:</span>
                      <span>${r.handling_fee_usd.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {policyZoneRates.filter((r: any) => r.zone_type === 'OTHER' || r.zone_code === 'FA').slice(0, 1).map((r: any) => (
                  <div key={r.id} className="bg-green-50 p-1.5 rounded border border-green-200">
                    <div className="font-semibold">🌍 その他 (DDU)</div>
                    <div className="flex justify-between">
                      <span>1個目:</span>
                      <span className="font-bold">${(r.first_item_shipping_usd || r.display_shipping_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>2個目以降:</span>
                      <span>+${(r.additional_item_shipping_usd || r.actual_cost_usd).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Handling:</span>
                      <span>${r.handling_fee_usd.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!policyDebugInfo && !selectedPolicyId && (
              <div className="text-xs text-gray-600 mt-2">
                💡 重量と原価を入力すると自動選択されます
              </div>
            )}
          </div>
