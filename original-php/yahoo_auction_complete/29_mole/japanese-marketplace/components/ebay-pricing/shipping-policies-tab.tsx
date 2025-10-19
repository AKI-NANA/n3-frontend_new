interface ShippingPoliciesTabProps {
  policies: any[]
}

export function ShippingPoliciesTab({ policies }: ShippingPoliciesTabProps) {
  const SettingsCard = ({ title, children }: any) => (
    <div className="border-2 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">配送ポリシー（DDP/DDU別Handling）</h2>

      {policies.map((policy) => (
        <SettingsCard
          key={policy.id}
          title={`${policy.policy_name} (${policy.ebay_policy_id || 'N/A'})`}
        >
          <div className="mb-4 grid grid-cols-3 gap-4 text-sm bg-gray-50 p-3 rounded">
            <div>
              重量: <strong>{policy.weight_min}-{policy.weight_max}kg</strong>
            </div>
            <div>
              サイズ: <strong>{policy.size_min}-{policy.size_max}cm</strong>
            </div>
            <div>
              価格帯: <strong>${policy.price_min}-${policy.price_max === Infinity ? '∞' : policy.price_max}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {policy.zones?.map((zone: any) => (
              <div key={zone.country_code} className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="font-bold mb-2">{zone.country_code}</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>表示送料:</span>
                    <strong className="text-blue-600">${zone.display_shipping}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>実費:</span>
                    <strong className="text-red-600">${zone.actual_cost}</strong>
                  </div>
                  <div className="border-t my-1"></div>
                  {zone.handling_ddp !== undefined && zone.handling_ddp !== null && (
                    <div className="flex justify-between">
                      <span>Handling (DDP):</span>
                      <strong className="text-green-600">${zone.handling_ddp}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Handling (DDU):</span>
                    <strong className="text-green-600">${zone.handling_ddu}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      ))}
    </div>
  )
}
