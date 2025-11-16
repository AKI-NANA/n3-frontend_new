import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  const sql = `UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@test.com';

SELECT id, email, username, role, is_active FROM users WHERE email = 'admin@test.com';`;

  return NextResponse.json({
    password,
    hash,
    sql,
    instructions: [
      '1. 上記のSQLをコピー',
      '2. Supabase SQL Editorを開く',
      '3. SQLを貼り付けて実行',
      '4. ログインを再試行: admin@test.com / admin123'
    ]
  });
}
