import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * ログアウト処理（auth_token Cookieを削除）
 */
export async function POST(request: NextRequest) {
  try {
    console.log('✅ ログアウト処理を実行');
    
    const response = NextResponse.json({
      success: true,
      message: 'ログアウトしました',
    });

    // Cookieを削除
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('❌ Logout error:', error);
    return NextResponse.json(
      { error: 'ログアウト処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
