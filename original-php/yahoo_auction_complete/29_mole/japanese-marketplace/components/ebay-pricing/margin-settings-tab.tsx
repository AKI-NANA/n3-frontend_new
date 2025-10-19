interface MarginSettingsTabProps {
  margins: any
}

export function MarginSettingsTab({ margins }: MarginSettingsTabProps) {
  const MarginEditRow = ({ label, data }: any) => (
    <div className="grid grid-cols-4 gap-4 py-3 border-b items-center text-sm">
      <span className="font-medium">{label}</span>
      <div>
        デフォルト: <strong>{(data.default_margin * 100).toFixed(1)}%</strong>
      </div>
      <div>
        最低率: <strong>{(data.min_margin * 100).toFixed(1)}%</strong>
      </div>
      <div>
        最低額: <strong className="text-green-600">${data.min_amount}</strong>
      </div>
    </div>
  )

  const SettingsCard = ({ title, children }: any) => (
    <div className="border-2 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">利益率設定</h2>

      <div className="space-y-6">
        <SettingsCard title="デフォルト">
          <MarginEditRow label="全商品" data={margins.default} />
        </SettingsCard>

        <SettingsCard title="コンディション別">
          {Object.entries(margins.condition).map(([key, data]) => (
            <MarginEditRow key={key} label={key === 'new' ? '新品' : '中古'} data={data} />
          ))}
        </SettingsCard>

        <SettingsCard title="国別">
          {Object.entries(margins.country).map(([key, data]) => (
            <MarginEditRow key={key} label={key} data={data} />
          ))}
        </SettingsCard>

        <SettingsCard title="カテゴリ別">
          {Object.entries(margins.category).map(([key, data]) => (
            <MarginEditRow key={key} label={key} data={data} />
          ))}
        </SettingsCard>
      </div>
    </div>
  )
}
