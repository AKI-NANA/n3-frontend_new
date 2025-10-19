interface TariffSettingsTabProps {
  countries: any[]
}

export function TariffSettingsTab({ countries }: TariffSettingsTabProps) {
  const SettingsCard = ({ title, children }: any) => (
    <div className="border-2 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">原産国・関税設定</h2>

      <SettingsCard title="原産国マスタ">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {countries.map((country) => (
            <div key={country.code} className="bg-gray-50 p-3 rounded border text-sm">
              <div className="font-semibold">{country.name_ja || country.name}</div>
              <div className="text-gray-600">{country.code}</div>
              {country.fta_agreements && country.fta_agreements.length > 0 && (
                <div className="text-xs text-blue-600 mt-1">
                  {country.fta_agreements.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">関税率について</h3>
        <div className="text-sm space-y-1">
          <p>• 関税率はHSコード（10桁）で決定されます</p>
          <p>• 中国原産品でSection 301対象の場合、追加25%</p>
          <p>• HSコード管理タブで具体的な税率を確認できます</p>
          <p>• FTA/EPA協定による関税削減は今後実装予定です</p>
        </div>
      </div>
    </div>
  )
}
