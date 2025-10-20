'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/auth/supabase'
import { useAuth } from '@/lib/auth/hooks'
import { Plus, Trash2, Edit, Check, X, Loader } from 'lucide-react'
import { toolsManifest, getDefaultToolsForNewOutsourcer } from '@/data/tools-manifest'

interface OutsourcerProfile {
  id: string
  email: string
  name?: string
  is_active: boolean
  created_at?: string
}

export default function OutsourcerManagementPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [outsourcers, setOutsourcers] = useState<OutsourcerProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOutsourcer, setSelectedOutsourcer] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 管理者かどうかチェック
  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') {
      window.location.href = '/dashboard'
    }
  }, [user, authLoading])

  // 外注スタッフ一覧を取得
  useEffect(() => {
    const fetchOutsourcers = async () => {
      setIsLoading(true)
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, name, is_active, created_at')
          .eq('role', 'OUTSOURCER')
          .order('created_at', { ascending: false })

        if (profiles) {
          setOutsourcers(profiles as OutsourcerProfile[])
        }
      } catch (err) {
        console.error('Error fetching outsourcers:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOutsourcers()
  }, [])

  // 選択した外注スタッフの権限を取得
  useEffect(() => {
    if (!selectedOutsourcer) return

    const fetchPermissions = async () => {
      try {
        const { data: perms } = await supabase
          .from('outsourcer_tools_permissions')
          .select('tool_id, is_enabled')
          .eq('outsourcer_id', selectedOutsourcer)

        const permMap: Record<string, boolean> = {}
        toolsManifest.forEach(tool => {
          const perm = perms?.find(p => p.tool_id === tool.id)
          permMap[tool.id] = perm?.is_enabled || false
        })
        setPermissions(permMap)
      } catch (err) {
        console.error('Error fetching permissions:', err)
      }
    }

    fetchPermissions()
  }, [selectedOutsourcer])

  // 権限を更新
  const handlePermissionChange = async (toolId: string, enabled: boolean) => {
    if (!selectedOutsourcer) return

    setPermissions(prev => ({ ...prev, [toolId]: enabled }))

    try {
      const { data: existing } = await supabase
        .from('outsourcer_tools_permissions')
        .select('id')
        .eq('outsourcer_id', selectedOutsourcer)
        .eq('tool_id', toolId)
        .single()

      if (existing) {
        await supabase
          .from('outsourcer_tools_permissions')
          .update({ is_enabled: enabled })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('outsourcer_tools_permissions')
          .insert({
            outsourcer_id: selectedOutsourcer,
            tool_id: toolId,
            is_enabled: enabled,
          })
      }
      setSuccess('権限を更新しました')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // 新規外注スタッフを追加
  const handleAddOutsourcer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      // Supabase Auth でユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('ユーザー作成に失敗しました')
        return
      }

      // プロフィールを更新（ロール: OUTSOURCER）
      await supabase
        .from('profiles')
        .update({ role: 'OUTSOURCER', is_active: true })
        .eq('id', authData.user.id)

      // デフォルトツール権限を設定
      const defaultTools = getDefaultToolsForNewOutsourcer()
      for (const toolId of defaultTools) {
        await supabase
          .from('outsourcer_tools_permissions')
          .insert({
            outsourcer_id: authData.user.id,
            tool_id: toolId,
            is_enabled: true,
          })
      }

      setSuccess('外注スタッフを追加しました')
      setNewEmail('')
      setNewPassword('')
      setShowAddForm(false)

      // 一覧を再取得
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name, is_active, created_at')
        .eq('role', 'OUTSOURCER')
        .order('created_at', { ascending: false })

      if (profiles) {
        setOutsourcers(profiles as OutsourcerProfile[])
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  // 外注スタッフを無効化
  const handleDisableOutsourcer = async (id: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', id)

      setSuccess('外注スタッフを無効化しました')
      setOutsourcers(prev => prev.map(o => 
        o.id === id ? { ...o, is_active: false } : o
      ))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (authLoading) {
    return <div className="p-8">ロード中...</div>
  }

  if (user?.role !== 'ADMIN') {
    return <div className="p-8">アクセス権限がありません</div>
  }

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
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}
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
              {isLoading ? (
                <div className="p-4 text-center text-slate-400">
                  <Loader className="animate-spin inline mr-2" size={18} />
                  ロード中...
                </div>
              ) : outsourcers.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  外注スタッフがいません
                </div>
              ) : (
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
              )}
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
                  {toolsManifest.map(tool => (
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
                        {tool.description && (
                          <div className="text-xs text-slate-400 truncate">
                            {tool.description}
                          </div>
                        )}
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
