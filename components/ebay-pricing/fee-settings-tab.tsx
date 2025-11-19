import { STORE_FEES } from '@/lib/constants/ebay'

interface FeeSettingsTabProps {
  categoryFees: any[]
}

export function FeeSettingsTab({ categoryFees }: FeeSettingsTabProps) {
  const SettingsCard = ({ title, children }: any) => (
    <div className="border-2 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">手数料設定</h2>

      <SettingsCard title="eBayカテゴリ別FVF">
        <div className="space-y-2">
          {categoryFees.map((fees) => (
            <div key={fees.category_key} className="grid grid-cols-4 gap-4 py-2 border-b text-sm">
              <div className="font-medium">{fees.category_name}</div>
              <div>
                FVF: <strong>{(fees.fvf_rate * 100).toFixed(2)}%</strong>
              </div>
              <div>
                Cap: <strong>{fees.fvf_cap ? `${fees.fvf_cap}` : 'なし'}</strong>
              </div>
              <div>
                出品料: <strong>${fees.insertion_fee.toFixed(2)}</strong>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="ストアタイプ別FVF割引">
        <div className="space-y-2">
          {Object.entries(STORE_FEES).map(([type, store]) => (
            <div key={type} className="flex justify-between py-2 border-b">
              <span className="font-medium">{store.name}</span>
              <strong className="text-green-600">
                -{(store.fvf_discount * 100).toFixed(2)}%
              </strong>
            </div>
          ))}
        </div>
      </SettingsCard>
    </div>
  )
}
