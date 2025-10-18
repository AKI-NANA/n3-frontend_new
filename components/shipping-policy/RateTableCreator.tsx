'use client'

import { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'

// 地域データ
const US_REGIONS = {
  'Midwest': ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'South Dakota', 'Wisconsin'],
  'Northeast': ['Connecticut', 'District of Columbia', 'Massachusetts', 'Maine', 'New Hampshire', 'New Jersey', 'New York', 'Pennsylvania', 'Rhode Island', 'Vermont'],
  'South': ['Alabama', 'Arkansas', 'Delaware', 'Florida', 'Georgia', 'Kentucky', 'Louisiana', 'Maryland', 'Mississippi', 'North Carolina', 'Oklahoma', 'South Carolina', 'Tennessee', 'Texas', 'Virginia', 'West Virginia'],
  'West': ['Alaska', 'Arizona', 'California', 'Colorado', 'Hawaii', 'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Oregon', 'Utah', 'Washington', 'Wyoming'],
  'Other': ['APO/FPO', 'US Protectorates and Territories']
}

interface RegionRate {
  region: string
  states?: string[]
  cost: number
}

interface RateTableData {
  title: string
  packageType: string
  rateBy: 'item' | 'weight'
  overnight: RegionRate[]
  expedited: RegionRate[]
  standard: RegionRate[]
  economy: RegionRate[]
}

export function RateTableCreator({ onSave, onCancel }: { onSave: (data: RateTableData) => void, onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [packageType, setPackageType] = useState('Small package item')
  const [rateBy, setRateBy] = useState<'item' | 'weight'>('item')
  
  const [overnight, setOvernight] = useState<RegionRate[]>([])
  const [expedited, setExpedited] = useState<RegionRate[]>([])
  const [standard, setStandard] = useState<RegionRate[]>([])
  const [economy, setEconomy] = useState<RegionRate[]>([])
  
  const [showRegionSelector, setShowRegionSelector] = useState(false)
  const [editingCategory, setEditingCategory] = useState<'overnight' | 'expedited' | 'standard' | 'economy' | null>(null)
  
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(['South']))
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set())
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set())
  
  function toggleRegion(regionName: string) {
    const newExpanded = new Set(expandedRegions)
    if (newExpanded.has(regionName)) {
      newExpanded.delete(regionName)
    } else {
      newExpanded.add(regionName)
    }
    setExpandedRegions(newExpanded)
  }
  
  function toggleRegionSelection(regionName: string) {
    const newSelected = new Set(selectedRegions)
    if (newSelected.has(regionName)) {
      newSelected.delete(regionName)
      // その地域の全州も解除
      const states = US_REGIONS[regionName as keyof typeof US_REGIONS]
      const newStates = new Set(selectedStates)
      states.forEach(state => newStates.delete(state))
      setSelectedStates(newStates)
    } else {
      newSelected.add(regionName)
      // その地域の全州も選択
      const states = US_REGIONS[regionName as keyof typeof US_REGIONS]
      const newStates = new Set(selectedStates)
      states.forEach(state => newStates.add(state))
      setSelectedStates(newStates)
    }
    setSelectedRegions(newSelected)
  }
  
  function toggleState(state: string, regionName: string) {
    const newStates = new Set(selectedStates)
    if (newStates.has(state)) {
      newStates.delete(state)
    } else {
      newStates.add(state)
    }
    setSelectedStates(newStates)
    
    // 全州が選択されているかチェック
    const regionStates = US_REGIONS[regionName as keyof typeof US_REGIONS]
    const allSelected = regionStates.every(s => newStates.has(s))
    
    const newRegions = new Set(selectedRegions)
    if (allSelected) {
      newRegions.add(regionName)
    } else {
      newRegions.delete(regionName)
    }
    setSelectedRegions(newRegions)
  }
  
  function openRegionSelector(category: 'overnight' | 'expedited' | 'standard' | 'economy') {
    setEditingCategory(category)
    setSelectedRegions(new Set())
    setSelectedStates(new Set())
    setShowRegionSelector(true)
  }
  
  function saveSelectedRegions() {
    if (!editingCategory) return
    
    const newRates: RegionRate[] = []
    
    // 選択された州をリージョンごとにグループ化
    const statesByRegion: { [key: string]: string[] } = {}
    selectedStates.forEach(state => {
      for (const [region, states] of Object.entries(US_REGIONS)) {
        if (states.includes(state)) {
          if (!statesByRegion[region]) statesByRegion[region] = []
          statesByRegion[region].push(state)
        }
      }
    })
    
    // RegionRate配列を作成
    Object.entries(statesByRegion).forEach(([region, states]) => {
      newRates.push({
        region,
        states,
        cost: 0
      })
    })
    
    // カテゴリに応じて保存
    switch (editingCategory) {
      case 'overnight':
        setOvernight(newRates)
        break
      case 'expedited':
        setExpedited(newRates)
        break
      case 'standard':
        setStandard(newRates)
        break
      case 'economy':
        setEconomy(newRates)
        break
    }
    
    setShowRegionSelector(false)
    setEditingCategory(null)
  }
  
  function updateCost(category: 'overnight' | 'expedited' | 'standard' | 'economy', index: number, cost: number) {
    const setter = {
      overnight: setOvernight,
      expedited: setExpedited,
      standard: setStandard,
      economy: setEconomy
    }[category]
    
    const current = {
      overnight,
      expedited,
      standard,
      economy
    }[category]
    
    setter(current.map((item, i) => i === index ? { ...item, cost } : item))
  }
  
  function deleteRegion(category: 'overnight' | 'expedited' | 'standard' | 'economy', index: number) {
    const setter = {
      overnight: setOvernight,
      expedited: setExpedited,
      standard: setStandard,
      economy: setEconomy
    }[category]
    
    const current = {
      overnight,
      expedited,
      standard,
      economy
    }[category]
    
    setter(current.filter((_, i) => i !== index))
  }
  
  function handleSave() {
    if (!title) {
      alert('Rate table titleを入力してください')
      return
    }
    
    onSave({
      title,
      packageType,
      rateBy,
      overnight,
      expedited,
      standard,
      economy
    })
  }
  
  const CategorySection = ({ 
    title, 
    subtitle, 
    category, 
    rates 
  }: { 
    title: string
    subtitle: string
    category: 'overnight' | 'expedited' | 'standard' | 'economy'
    rates: RegionRate[]
  }) => (
    <div className="mb-6">
      <h3 className="font-bold mb-1">
        {title}
        <span className="text-sm font-normal text-gray-600 ml-2">
          {category === 'overnight' && '(翌日配送)'}
          {category === 'expedited' && '(速達配送)'}
          {category === 'standard' && '(標準配送)'}
          {category === 'economy' && '(エコノミー配送)'}
        </span>
      </h3>
      <p className="text-sm text-gray-600 mb-3">({subtitle})</p>
      
      <table className="w-full border">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left p-3 border-b font-semibold">
              Region（地域）
            </th>
            <th className="text-left p-3 border-b font-semibold">
              Cost（料金）
            </th>
            <th className="text-left p-3 border-b font-semibold">
              Delete（削除）
            </th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate, index) => (
            <tr key={index} className="border-b">
              <td className="p-3">
                <div className="font-medium">{rate.region}</div>
                {rate.states && (
                  <div className="text-xs text-gray-600">{rate.states.join(', ')}</div>
                )}
              </td>
              <td className="p-3">
                <input
                  type="number"
                  step="0.01"
                  value={rate.cost}
                  onChange={(e) => updateCost(category, index, parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 border rounded"
                  placeholder="0.00"
                />
              </td>
              <td className="p-3">
                <button
                  onClick={() => deleteRegion(category, index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="p-3">
              <button
                onClick={() => openRegionSelector(category)}
                className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
              >
                <Plus className="w-4 h-4" />
                Add regions / states（地域・州を追加）
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
  
  return (
    <div className="max-w-6xl mx-auto bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shipping rate tables（配送料金表）</h1>
          <p className="text-sm text-gray-600 mt-1">地域ごとに異なる配送料金を設定できます</p>
        </div>
        <a href="#" className="text-blue-600 text-sm">Help</a>
      </div>
      
      {/* 基本設定 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Rate Table
          </label>
          <p className="text-xs text-gray-600 mb-2">
            料金表を選択（新規作成時は選択不要）
          </p>
          <input
            type="text"
            value="Select ..."
            disabled
            className="w-full px-3 py-2 border rounded bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-2">
            Set shipping rate by（料金設定基準）
            <span className="ml-1 text-gray-400">ⓘ</span>
          </label>
          <p className="text-xs text-gray-600 mb-2">
            Item: 商品数で計算 / Weight: 重量で計算
          </p>
          <select
            value={rateBy}
            onChange={(e) => setRateBy(e.target.value as 'item' | 'weight')}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="item">Item（商品数）</option>
            <option value="weight">Weight（重量）</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-2">
            Create new（新規作成）
          </label>
          <p className="text-xs text-gray-600 mb-2">
            国内配送用の料金表を作成
          </p>
          <button className="w-full px-3 py-2 border rounded bg-gray-50 text-left">
            Domestic rate table
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2">
            Rate table title（料金表タイトル）
          </label>
          <p className="text-xs text-gray-600 mb-2">
            この料金表を識別するための名前（例：アメリカ国内配送用、西海岸専用等）
          </p>
          <input
            type="text"
            placeholder="Name ..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold mb-2">
            Package type（包装タイプ）
          </label>
          <p className="text-xs text-gray-600 mb-2">
            商品の包装サイズや種類（例：Small package、Large package等）
          </p>
          <input
            type="text"
            value={packageType}
            onChange={(e) => setPackageType(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>
      
      {/* カテゴリセクション */}
      <CategorySection
        title="Overnight"
        subtitle="FedEx Priority Overnight, One-day Shipping, etc."
        category="overnight"
        rates={overnight}
      />
      
      <CategorySection
        title="Expedited"
        subtitle="FedEx 2Day, USPS Priority Mail, etc."
        category="expedited"
        rates={expedited}
      />
      
      <CategorySection
        title="Standard"
        subtitle="FedEx Ground, USPS First Class Package, etc."
        category="standard"
        rates={standard}
      />
      
      <CategorySection
        title="Economy"
        subtitle="UPS Surepost, USPS Retail Ground, etc."
        category="economy"
        rates={economy}
      />
      
      {/* 注意書き */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6 flex items-start gap-2">
        <span className="text-blue-600">ⓘ</span>
        <div>
          <p className="text-sm text-gray-700 font-semibold mb-1">
            保存時の注意事項
          </p>
          <p className="text-sm text-gray-700">
            On save, these changes will be applied to all new and existing listings associated with this rate table.
          </p>
          <p className="text-xs text-gray-600 mt-1">
            保存すると、この料金表に関連付けられたすべての新規・既存出品に変更が適用されます。
          </p>
        </div>
      </div>
      
      {/* ボタン */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save（保存）
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2 border rounded hover:bg-gray-50"
        >
          Cancel（キャンセル）
        </button>
      </div>
      
      {/* 地域選択ダイアログ */}
      {showRegionSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">
                Select the regions and states you can deliver to {editingCategory}
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                {editingCategory}配送で対応可能な地域と州を選択してください
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {Object.entries(US_REGIONS).map(([regionName, states]) => {
                  // 地域名の日本語訳
                  const regionNameJP = {
                    'Midwest': '中西部',
                    'Northeast': '北東部',
                    'South': '南部',
                    'West': '西部',
                    'Other': 'その他'
                  }[regionName] || regionName
                  
                  return (
                    <div key={regionName} className="border-b pb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRegions.has(regionName)}
                          onChange={() => toggleRegionSelection(regionName)}
                          className="w-5 h-5"
                        />
                        <button
                          onClick={() => toggleRegion(regionName)}
                          className="flex items-center gap-2 text-blue-600 font-semibold"
                        >
                          {regionName}
                          <span className="text-sm text-gray-600">（{regionNameJP}）</span>
                          {expandedRegions.has(regionName) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      
                      {expandedRegions.has(regionName) && (
                        <div className="ml-8 mt-3 grid grid-cols-3 gap-2">
                          {states.map(state => (
                            <label key={state} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedStates.has(state)}
                                onChange={() => toggleState(state, regionName)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{state}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowRegionSelector(false)}
                className="px-6 py-2 border rounded hover:bg-gray-50"
              >
                Cancel（キャンセル）
              </button>
              <button
                onClick={saveSelectedRegions}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save（保存）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
