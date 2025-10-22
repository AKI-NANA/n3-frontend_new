#!/bin/bash

# Supabaseクライアントの初期化エラーを修正するスクリプト

echo "🔧 Supabaseクライアント初期化エラーを修正中..."

# 問題のあるファイルを検索
files=$(grep -rl "const supabase = createClient" app/api --include="*.ts" | grep -v node_modules)

count=0
for file in $files; do
  # すでに @/lib/supabase/client をインポートしているファイルはスキップ
  if grep -q "from '@/lib/supabase/client'" "$file"; then
    echo "⏭️  スキップ: $file (すでに修正済み)"
    continue
  fi

  # @supabase/supabase-js から createClient をインポートしているか確認
  if grep -q "from '@supabase/supabase-js'" "$file"; then
    echo "🔄 修正中: $file"

    # インポート文を置換
    sed -i "s|from '@supabase/supabase-js'|from '@/lib/supabase/client'|g" "$file"

    # トップレベルの const supabase = createClient(...) を削除
    # 複数行にわたる可能性があるため、perlを使用
    perl -i -0pe 's/const supabase = createClient\([^)]*\n?[^)]*\)//g' "$file"

    ((count++))
  fi
done

echo "✅ 完了: ${count}ファイルを修正しました"
