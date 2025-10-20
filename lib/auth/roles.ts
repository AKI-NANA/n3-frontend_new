/**
 * ロール定義と権限マッピング
 */

export type UserRole = 'ADMIN' | 'OUTSOURCER' | 'VIEWER'

export interface RolePermissions {
  [key: string]: boolean
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  ADMIN: {
    'access:admin-panel': true,
    'users:manage': true,
    'tools:all': true,
    'outsourcer:manage': true,
    'permissions:manage': true,
    'analytics:export': true,
    'settings:write': true,
  },
  OUTSOURCER: {
    'access:admin-panel': false,
    'users:manage': false,
    'tools:assigned-only': true,
    'outsourcer:manage': false,
    'permissions:manage': false,
    'analytics:export': false,
    'settings:write': false,
  },
  VIEWER: {
    'access:admin-panel': false,
    'users:manage': false,
    'tools:read-only': true,
    'outsourcer:manage': false,
    'permissions:manage': false,
    'analytics:export': false,
    'settings:write': false,
  },
}

export const roleLabels: Record<UserRole, string> = {
  ADMIN: '管理者',
  OUTSOURCER: '外注スタッフ',
  VIEWER: '閲覧者',
}

export const roleDescriptions: Record<UserRole, string> = {
  ADMIN: 'すべての機能にアクセス可能。ユーザー・権限管理も可能',
  OUTSOURCER: '割り当てられたツールのみアクセス可能。読み書き機能あり',
  VIEWER: 'すべてのツールを閲覧可能。編集・削除は不可',
}
