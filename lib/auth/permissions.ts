/**
 * 権限チェックユーティリティ
 */

import { UserRole, rolePermissions } from './roles'

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  is_active: boolean
}

export interface AuthContext {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

/**
 * ユーザーが特定の権限を持っているか確認
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = rolePermissions[userRole]
  if (!permissions) return false
  return permissions[permission] === true
}

/**
 * ユーザーが複数の権限のいずれかを持っているか確認
 */
export function hasAnyPermission(userRole: UserRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

/**
 * ユーザーが複数の権限をすべて持っているか確認
 */
export function hasAllPermissions(userRole: UserRole, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

/**
 * 管理者権限の確認
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'ADMIN'
}

/**
 * 外注スタッフ権限の確認
 */
export function isOutsourcer(userRole: UserRole): boolean {
  return userRole === 'OUTSOURCER'
}

/**
 * ツールアクセス可能かチェック
 */
export function canAccessTool(userRole: UserRole, assignedTools?: string[]): boolean {
  if (userRole === 'ADMIN') return true
  if (userRole === 'VIEWER') return true
  if (userRole === 'OUTSOURCER' && assignedTools && assignedTools.length > 0) return true
  return false
}

/**
 * 特定ツールへのアクセス可能かチェック
 */
export function canAccessSpecificTool(
  userRole: UserRole,
  toolId: string,
  assignedTools?: string[]
): boolean {
  if (userRole === 'ADMIN') return true
  if (userRole === 'VIEWER') return true
  if (userRole === 'OUTSOURCER' && assignedTools?.includes(toolId)) return true
  return false
}
