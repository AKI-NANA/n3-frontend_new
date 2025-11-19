#!/bin/bash

echo "========================================="
echo "📊 TypeScriptエラー残存確認"
echo "========================================="
echo ""

cd /Users/aritahiroaki/n3-frontend_new

echo "TypeScript型チェックを実行中..."
echo ""

npx tsc --noEmit > typescript_errors_remaining.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ TypeScriptエラーなし！"
    echo "型エラーは完全に解消されました。" > typescript_errors_remaining.log
else
    ERROR_COUNT=$(grep -c "error TS" typescript_errors_remaining.log || echo "0")
    echo "⚠️  残存エラー: ${ERROR_COUNT}件"
    echo ""
    echo "📄 ログファイル: typescript_errors_remaining.log"
    echo ""
    echo "最初の20行を表示:"
    echo "========================================="
    head -20 typescript_errors_remaining.log
    echo "========================================="
    echo ""
    echo "詳細は typescript_errors_remaining.log を確認してください"
fi

echo ""
echo "✅ エラーログの保存完了"
