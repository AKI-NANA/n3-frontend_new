import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@/lib/supabase/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-do-not-use-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET が設定されていません。.env.local に JWT_SECRET を追加してください');
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: '無効な入力形式です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // ユーザー検索
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.log('ログイン失敗: ユーザーが見つかりません', email);
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      console.log('ログイン失敗: パスワードが一致しません', email);
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 最終ログイン時刻更新
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        last_login_at: new Date().toISOString(),
        login_count: (user.login_count || 0) + 1
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('ログイン情報の更新エラー:', updateError);
    }

    // JWT生成
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ ログイン成功:', user.email, 'Role:', user.role);

    // レスポンス作成
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
      },
    });

    // HTTPOnly Cookieにトークンを設定
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
