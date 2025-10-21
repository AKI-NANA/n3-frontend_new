// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting用のマップ（本番環境ではRedisを推奨）
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function middleware(request: NextRequest) {
  // ログインAPIへのRate Limiting
  if (request.nextUrl.pathname === '/api/auth/login') {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    
    const attempts = loginAttempts.get(ip)
    
    if (attempts) {
      // 1時間経過したらリセット
      if (now > attempts.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + 3600000 })
      } else {
        // 1時間以内に10回以上のログイン試行はブロック
        if (attempts.count >= 10) {
          return NextResponse.json(
            { error: 'ログイン試行回数が上限に達しました。1時間後に再度お試しください。' },
            { status: 429 }
          )
        }
        attempts.count++
      }
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + 3600000 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/auth/:path*',
}
