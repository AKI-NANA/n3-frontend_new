/**
 * 認証用 React Hooks
 */

'use client'

import { useState, useEffect, useContext, createContext } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { User, UserRole } from './permissions'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  isLoading: boolean
  isAuthenticated: boolean
  assignedTools: string[]
  logout: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [assignedTools, setAssignedTools] = useState<string[]>([])

  // 初期化時にセッションを確認
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true)
        
        // Supabase セッション確認
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setSupabaseUser(session.user)
          
          // ユーザープロフィール取得
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: profile.name || session.user.user_metadata?.name,
              role: profile.role || 'VIEWER',
              is_active: profile.is_active !== false,
            })
            
            // 外注スタッフの場合、割り当てられたツールを取得
            if (profile.role === 'OUTSOURCER') {
              const { data: tools } = await supabase
                .from('outsourcer_tools_permissions')
                .select('tool_id')
                .eq('outsourcer_id', session.user.id)
                .eq('is_enabled', true)
              
              if (tools) {
                setAssignedTools(tools.map(t => t.tool_id))
              }
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // リスニング設定
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user)
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: profile.name || session.user.user_metadata?.name,
              role: profile.role || 'VIEWER',
              is_active: profile.is_active !== false,
            })
            
            if (profile.role === 'OUTSOURCER') {
              const { data: tools } = await supabase
                .from('outsourcer_tools_permissions')
                .select('tool_id')
                .eq('outsourcer_id', session.user.id)
                .eq('is_enabled', true)
              
              if (tools) {
                setAssignedTools(tools.map(t => t.tool_id))
              }
            }
          }
        } else {
          setUser(null)
          setSupabaseUser(null)
          setAssignedTools([])
        }
      }
    )

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSupabaseUser(null)
    setAssignedTools([])
  }

  const refetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUser({
          id: user.id,
          email: user.email || '',
          name: profile.name || user.user_metadata?.name,
          role: profile.role || 'VIEWER',
          is_active: profile.is_active !== false,
        })
        
        if (profile.role === 'OUTSOURCER') {
          const { data: tools } = await supabase
            .from('outsourcer_tools_permissions')
            .select('tool_id')
            .eq('outsourcer_id', user.id)
            .eq('is_enabled', true)
          
          if (tools) {
            setAssignedTools(tools.map(t => t.tool_id))
          }
        }
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isLoading,
        isAuthenticated: !!user && user.is_active,
        assignedTools,
        logout,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
