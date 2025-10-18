// components/ebay-pricing/margin-settings-edit.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react'

interface ProfitMarginSetting {
  id: number
  setting_type: 'default' | 'category' | 'country' | 'condition'
  setting_key: string
  default_margin: number
  min_margin: number
  min_amount: number
  max_margin: number
  active: boolean
}

export function MarginSettingsEdit() {
  const [margins, setMargins] = useState<ProfitMarginSetting[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Partial<ProfitMarginSetting>>({})

  useEffect(() => {
    fetchMargins()
  }, [])

  const fetchMargins = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profit_margin_settings')
      .select('*')
      .order('id')
    
    if (!error && data) {
      setMargins(data)
    }
    setLoading(false)
  }

  const handleEdit = (margin: ProfitMarginSetting) => {
    setEditing(margin.id)
    setFormData(margin)
  }

  const handleSave = async () => {
    if (editing) {
      const { error } = await supabase
        .from('profit_margin_settings')
        .update(formData)
        .eq('id', editing)
      
      if (!error) {
        await fetchMargins()
        setEditing(null)
        setFormData({})
      }
    }
  }

  const handleAdd = async () => {
    const { error } = await supabase
      .from('profit_margin_settings')
      .insert({
        setting_type: formData.setting_type || 'category',
        setting_key: formData.setting_key || '',
        default_margin: formData.default_margin || 0.3,
        min_margin: formData.min_margin || 0.2,
        min_amount: formData.min_amount || 10,
        max_margin: formData.max_margin || 0.5,
        active: true,
      })
    
    if (!error) {
      await fetchMargins()
      setAdding(false)
      setFormData({})
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('本当に削除しますか？')) {
      const { error } = await supabase
        .from('profit_margin_settings')
        .delete()
        .eq('id', id)
      
      if (!error) {
        await fetchMargins()
      }
    }
  }

  const handleCancel = () => {
    setEditing(null)
    setAdding(false)
    setFormData({})
  }

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">利益率設定</h2>
        <button
          onClick={() => setAdding(true)}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">キー</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">目標利益率</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最低利益率</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最低利益額</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最大利益率</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adding && (
              <tr className="bg-yellow-50">
                <td className="px-4 py-3">
                  <select
                    value={formData.setting_type || 'category'}
                    onChange={(e) => setFormData({ ...formData, setting_type: e.target.value as any })}
                    className="w-full px-2 py-1 border rounded text-sm"
                  >
                    <option value="default">デフォルト</option>
                    <option value="category">カテゴリ</option>
                    <option value="country">国</option>
                    <option value="condition">コンディション</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={formData.setting_key || ''}
                    onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="キー名"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.default_margin || 0.3}
                    onChange={(e) => setFormData({ ...formData, default_margin: parseFloat(e.target.value) })}
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_margin || 0.2}
                    onChange={(e) => setFormData({ ...formData, min_margin: parseFloat(e.target.value) })}
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="1"
                    value={formData.min_amount || 10}
                    onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) })}
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.max_margin || 0.5}
                    onChange={(e) => setFormData({ ...formData, max_margin: parseFloat(e.target.value) })}
                    className="w-20 px-2 py-1 border rounded text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-green-600 text-sm">有効</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={handleAdd}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {margins.map((margin) => (
              <tr key={margin.id} className={editing === margin.id ? 'bg-blue-50' : ''}>
                <td className="px-4 py-3 text-sm">
                  {editing === margin.id ? (
                    <select
                      value={formData.setting_type || margin.setting_type}
                      onChange={(e) => setFormData({ ...formData, setting_type: e.target.value as any })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="default">デフォルト</option>
                      <option value="category">カテゴリ</option>
                      <option value="country">国</option>
                      <option value="condition">コンディション</option>
                    </select>
                  ) : (
                    <span className="font-medium">{margin.setting_type}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editing === margin.id ? (
                    <input
                      type="text"
                      value={formData.setting_key ?? margin.setting_key}
                      onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    margin.setting_key
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editing === margin.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.default_margin ?? margin.default_margin}
                      onChange={(e) => setFormData({ ...formData, default_margin: parseFloat(e.target.value) })}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    `${(margin.default_margin * 100).toFixed(1)}%`
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editing === margin.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.min_margin ?? margin.min_margin}
                      onChange={(e) => setFormData({ ...formData, min_margin: parseFloat(e.target.value) })}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    `${(margin.min_margin * 100).toFixed(1)}%`
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editing === margin.id ? (
                    <input
                      type="number"
                      step="1"
                      value={formData.min_amount ?? margin.min_amount}
                      onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) })}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    `$${margin.min_amount.toFixed(2)}`
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {editing === margin.id ? (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.max_margin ?? margin.max_margin}
                      onChange={(e) => setFormData({ ...formData, max_margin: parseFloat(e.target.value) })}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  ) : (
                    `${(margin.max_margin * 100).toFixed(1)}%`
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${margin.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {margin.active ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {editing === margin.id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(margin)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(margin.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
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
  )
}
