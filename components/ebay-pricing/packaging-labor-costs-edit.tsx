// components/ebay-pricing/packaging-labor-costs-edit.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Check, X, Package, Clock } from 'lucide-react'

interface PackagingCost {
  id: number
  size_category: string
  material_name: string
  material_cost_jpy: number
  labor_minutes: number
  notes: string | null
  active: boolean
}

interface LaborCost {
  id: number
  task_type: string
  hourly_rate_jpy: number
  notes: string | null
  active: boolean
}

export function PackagingLaborCostsEdit() {
  const [packagingCosts, setPackagingCosts] = useState<PackagingCost[]>([])
  const [laborCosts, setLaborCosts] = useState<LaborCost[]>([])
  const [editingPackaging, setEditingPackaging] = useState<number | null>(null)
  const [editingLabor, setEditingLabor] = useState<number | null>(null)
  const [addingPackaging, setAddingPackaging] = useState(false)
  const [addingLabor, setAddingLabor] = useState(false)
  const [packagingFormData, setPackagingFormData] = useState<Partial<PackagingCost>>({})
  const [laborFormData, setLaborFormData] = useState<Partial<LaborCost>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [packaging, labor] = await Promise.all([
      supabase.from('packaging_costs').select('*').order('id'),
      supabase.from('labor_costs').select('*').order('id'),
    ])

    if (packaging.data) setPackagingCosts(packaging.data)
    if (labor.data) setLaborCosts(labor.data)
  }

  // 梱包費用の操作
  const handleEditPackaging = (cost: PackagingCost) => {
    setEditingPackaging(cost.id)
    setPackagingFormData(cost)
  }

  const handleSavePackaging = async () => {
    if (editingPackaging) {
      await supabase
        .from('packaging_costs')
        .update(packagingFormData)
        .eq('id', editingPackaging)
      
      await fetchData()
      setEditingPackaging(null)
      setPackagingFormData({})
    }
  }

  const handleAddPackaging = async () => {
    await supabase.from('packaging_costs').insert({
      size_category: packagingFormData.size_category || '小型',
      material_name: packagingFormData.material_name || '',
      material_cost_jpy: packagingFormData.material_cost_jpy || 0,
      labor_minutes: packagingFormData.labor_minutes || 0,
      notes: packagingFormData.notes || '',
      active: true,
    })
    
    await fetchData()
    setAddingPackaging(false)
    setPackagingFormData({})
  }

  const handleDeletePackaging = async (id: number) => {
    if (confirm('本当に削除しますか？')) {
      await supabase.from('packaging_costs').delete().eq('id', id)
      await fetchData()
    }
  }

  // 人件費の操作
  const handleEditLabor = (cost: LaborCost) => {
    setEditingLabor(cost.id)
    setLaborFormData(cost)
  }

  const handleSaveLabor = async () => {
    if (editingLabor) {
      await supabase
        .from('labor_costs')
        .update(laborFormData)
        .eq('id', editingLabor)
      
      await fetchData()
      setEditingLabor(null)
      setLaborFormData({})
    }
  }

  const handleAddLabor = async () => {
    await supabase.from('labor_costs').insert({
      task_type: laborFormData.task_type || '',
      hourly_rate_jpy: laborFormData.hourly_rate_jpy || 0,
      notes: laborFormData.notes || '',
      active: true,
    })
    
    await fetchData()
    setAddingLabor(false)
    setLaborFormData({})
  }

  const handleDeleteLabor = async (id: number) => {
    if (confirm('本当に削除しますか？')) {
      await supabase.from('labor_costs').delete().eq('id', id)
      await fetchData()
    }
  }

  return (
    <div className="space-y-8">
      {/* 梱包費用設定 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6" />
            梱包費用設定
          </h2>
          <button
            onClick={() => setAddingPackaging(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            新規追加
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">サイズ区分</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">材料名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">材料費（円）</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">作業時間（分）</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備考</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {addingPackaging && (
                <tr className="bg-yellow-50">
                  <td className="px-4 py-3">
                    <select
                      value={packagingFormData.size_category || '小型'}
                      onChange={(e) => setPackagingFormData({ ...packagingFormData, size_category: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="小型">小型</option>
                      <option value="中型">中型</option>
                      <option value="大型">大型</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={packagingFormData.material_name || ''}
                      onChange={(e) => setPackagingFormData({ ...packagingFormData, material_name: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="材料名"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={packagingFormData.material_cost_jpy || 0}
                      onChange={(e) => setPackagingFormData({ ...packagingFormData, material_cost_jpy: parseFloat(e.target.value) })}
                      className="w-24 px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={packagingFormData.labor_minutes || 0}
                      onChange={(e) => setPackagingFormData({ ...packagingFormData, labor_minutes: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={packagingFormData.notes || ''}
                      onChange={(e) => setPackagingFormData({ ...packagingFormData, notes: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="備考"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={handleAddPackaging} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setAddingPackaging(false); setPackagingFormData({}); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {packagingCosts.map((cost) => (
                <tr key={cost.id} className={editingPackaging === cost.id ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3 text-sm">
                    {editingPackaging === cost.id ? (
                      <select
                        value={packagingFormData.size_category ?? cost.size_category}
                        onChange={(e) => setPackagingFormData({ ...packagingFormData, size_category: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      >
                        <option value="小型">小型</option>
                        <option value="中型">中型</option>
                        <option value="大型">大型</option>
                      </select>
                    ) : (
                      <span className="font-medium">{cost.size_category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingPackaging === cost.id ? (
                      <input
                        type="text"
                        value={packagingFormData.material_name ?? cost.material_name}
                        onChange={(e) => setPackagingFormData({ ...packagingFormData, material_name: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      cost.material_name
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingPackaging === cost.id ? (
                      <input
                        type="number"
                        value={packagingFormData.material_cost_jpy ?? cost.material_cost_jpy}
                        onChange={(e) => setPackagingFormData({ ...packagingFormData, material_cost_jpy: parseFloat(e.target.value) })}
                        className="w-24 px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      `¥${cost.material_cost_jpy.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingPackaging === cost.id ? (
                      <input
                        type="number"
                        value={packagingFormData.labor_minutes ?? cost.labor_minutes}
                        onChange={(e) => setPackagingFormData({ ...packagingFormData, labor_minutes: parseInt(e.target.value) })}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      `${cost.labor_minutes}分`
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cost.notes}</td>
                  <td className="px-4 py-3">
                    {editingPackaging === cost.id ? (
                      <div className="flex gap-2">
                        <button onClick={handleSavePackaging} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingPackaging(null); setPackagingFormData({}); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleEditPackaging(cost)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePackaging(cost.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 人件費設定 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            人件費設定
          </h2>
          <button
            onClick={() => setAddingLabor(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            新規追加
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">作業タイプ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時給（円）</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">備考</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {addingLabor && (
                <tr className="bg-yellow-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={laborFormData.task_type || ''}
                      onChange={(e) => setLaborFormData({ ...laborFormData, task_type: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="作業タイプ"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={laborFormData.hourly_rate_jpy || 0}
                      onChange={(e) => setLaborFormData({ ...laborFormData, hourly_rate_jpy: parseFloat(e.target.value) })}
                      className="w-32 px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={laborFormData.notes || ''}
                      onChange={(e) => setLaborFormData({ ...laborFormData, notes: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      placeholder="備考"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={handleAddLabor} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setAddingLabor(false); setLaborFormData({}); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {laborCosts.map((cost) => (
                <tr key={cost.id} className={editingLabor === cost.id ? 'bg-blue-50' : ''}>
                  <td className="px-4 py-3 text-sm">
                    {editingLabor === cost.id ? (
                      <input
                        type="text"
                        value={laborFormData.task_type ?? cost.task_type}
                        onChange={(e) => setLaborFormData({ ...laborFormData, task_type: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <span className="font-medium">{cost.task_type}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingLabor === cost.id ? (
                      <input
                        type="number"
                        value={laborFormData.hourly_rate_jpy ?? cost.hourly_rate_jpy}
                        onChange={(e) => setLaborFormData({ ...laborFormData, hourly_rate_jpy: parseFloat(e.target.value) })}
                        className="w-32 px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      `¥${cost.hourly_rate_jpy.toLocaleString()}/時`
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cost.notes}</td>
                  <td className="px-4 py-3">
                    {editingLabor === cost.id ? (
                      <div className="flex gap-2">
                        <button onClick={handleSaveLabor} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingLabor(null); setLaborFormData({}); }} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleEditLabor(cost)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteLabor(cost.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
