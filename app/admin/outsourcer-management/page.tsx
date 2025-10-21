'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit, Check, X, Loader } from 'lucide-react'

interface OutsourcerProfile {
  id: string
  email: string
  name?: string
  is_active: boolean
}

export default function OutsourcerManagementPage() {
  const [outsourcers, setOutsourcers] = useState<OutsourcerProfile[]>([
    {
      id: '1',
      email: 'outsourcer1@example.com',
      name: '外注スタッフ 1',
      is_active: true,
    },
  ])
  const [selectedOutsourcer, setSelectedOutsourcer] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    'data-collection': true,
    'tools-editing': true,
    'filter-management': true,
    'approval': false,
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [success, setSuccess] = useState('')

  const handleAddOutsourcer = (e: React.FormEvent) => {
    e.preventDefault()

    const newOutsourcer: OutsourcerProfile = {
      id: Date.now().toString(),
      email: newEmail,
      name: newEmail.split('@')[0],
      is_active: true,
    }

    setOutsourcers([...outsourcers, newOutsourcer])
    setSuccess('外注スタッフを追加しました')
    setNewEmail('')
    setNewPassword('')
    setShowAddForm(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handlePermissionChange = (toolId: string, enabled: boolean) => {
    setPermissions(prev => ({ ...prev, [toolId]: enabled }))
    setSuccess('権限を更新しました')
    setTimeout(() => setSuccess(''), 2000)
  }

  const handleDisableOutsourcer = (id: string) => {
    setOutsourcers(prev => prev.map(o => 
      o.id === id ? { ...o, is_active: false } : o
    ))
    setSuccess('外注スタッフを無効化しました')
    setTimeout(() => setSuccess(''), 3000)
  }

  const tools = [
    { id: 'data-collection', label: 'データ取得', description: 'Yahoo!オークションからデータを取得' },
    { id: 'tools-editing', label: 'データ編集', description: '商品情報を編集' },
    { id: 'filter-management', label: 'フィルター管理', description: '輸出禁止品フィルター管理' },
    { id: 'approval', label: '商品承認', description: '商品の最終承認' },
    { id: 'inventory', label: '在庫管理', description: '在庫情報を管理' },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">外注スタッフ管理</h1>
            <p className="text-slate-400 mt-2">外注スタッフの追加・編集・権限設定</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg
                     flex items-center gap-2 transition"
          >
            <Plus size={20} />
            スタッフ追加
          </button>
        </div>

        {/* メッセージ */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-4 mb-6 text-emerald-400">
            {success}
          </div>
        )}

        {/* 追加フォーム */}
        {showAddForm && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">新規スタッフを追加</h2>
            <form onSubmit={handleAddOutsourcer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white"
                  required
                />
                <input
                  type="password"
                  placeholder="パスワード"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
                >
                  追加
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded transition"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* メインレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* スタッフ一覧 */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-slate-700 border-b border-slate-600">
                <h2 className="font-semibold text-white">スタッフ一覧</h2>
              </div>
              <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                {outsourcers.map(outsourcer => (
                  <button
                    key={outsourcer.id}
                    onClick={() => setSelectedOutsourcer(outsourcer.id)}
                    className={`w-full p-3 text-left transition ${
                      selectedOutsourcer === outsourcer.id
                        ? 'bg-blue-600/30 border-l-2 border-blue-600'
                        : 'hover:bg-slate-700'
                    } ${!outsourcer.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="font-medium text-white text-sm truncate">
                      {outsourcer.name || outsourcer.email}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {outsourcer.email}
                    </div>
                    {!outsourcer.is_active && (
                      <div className="text-xs text-red-400 mt-1">無効</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 権限設定 */}
          {selectedOutsourcer && (
            <div className="lg:col-span-2">
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 bg-slate-700 border-b border-slate-600 flex items-center justify-between">
                  <h2 className="font-semibold text-white">利用可能なツール</h2>
                  <button
                    onClick={() => handleDisableOutsourcer(selectedOutsourcer)}
                    className="bg-red-600/50 hover:bg-red-600 text-white px-2 py-1 rounded text-sm
                             flex items-center gap-1 transition"
                  >
                    <Trash2 size={14} />
                    無効化
                  </button>
                </div>

                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {tools.map(tool => (
                    <label
                      key={tool.id}
                      className="flex items-center gap-3 p-3 bg-slate-700/50 rounded
                               hover:bg-slate-700 transition cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[tool.id] || false}
                        onChange={(e) =>
                          handlePermissionChange(tool.id, e.target.checked)
                        }
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm">
                          {tool.label}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {tool.description}
                        </div>
                      </div>
                      {permissions[tool.id] ? (
                        <Check className="text-emerald-400 flex-shrink-0" size={18} />
                      ) : (
                        <X className="text-slate-500 flex-shrink-0" size={18} />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
