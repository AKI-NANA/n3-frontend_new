import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@/lib/supabase/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-production';

/**
 * GET /api/auth/me
 * 現在のログインユーザーの情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '認証されていません' },
        { status: 401 }
      );
    }

    // JWT検証
    let decoded: { userId: string; email: string; role: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };
    } catch (err) {
      console.error('JWT検証エラー:', err);
      return NextResponse.json(
        { error: '無効な認証トークンです' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // ユーザー情報取得
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, is_active')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.error('ユーザー情報取得エラー:', error);
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('❌ Auth check error:', error);
    return NextResponse.json(
      { error: '認証エラー' },
      { status: 401 }
    );
  }
}
