#!/bin/bash

# ========================================
# N3 Frontend 標準トラブルシューティング
# ========================================

echo "問題の種類を選択してください："
echo "1. サーバーが起動しない（SWC警告あり）"
echo "2. 接続拒否エラー（ERR_CONNECTION_REFUSED）"
echo "3. 表示が崩れている"
echo "4. 完全リセット"
echo ""
read -p "番号を入力してください (1-4): " choice

case $choice in
  1)
    echo ""
    echo "=== SWC依存関係の修復 ==="
    pkill -9 -f "next" 2>/dev/null
    rm -rf node_modules package-lock.json .next
    npm install
    echo "✓ 完了。npm run dev で起動してください。"
    ;;
    
  2)
    echo ""
    echo "=== 設定ファイルとキャッシュの修復 ==="
    pkill -9 -f "next" 2>/dev/null
    
    # next.config.ts を安全な設定に戻す
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
EOF
    
    rm -rf .next node_modules/.cache
    echo "✓ 完了。npm run dev で起動してください。"
    ;;
    
  3)
    echo ""
    echo "=== レイアウトの修復 ==="
    pkill -9 -f "next" 2>/dev/null
    
    # MainContent.tsxのマージンを修正
    if [ -f "components/layout/MainContent.tsx" ]; then
      sed -i.bak 's/setLeftMargin(220)/setLeftMargin(170)/g' components/layout/MainContent.tsx
      echo "✓ MainContent.tsxを修正しました"
    fi
    
    rm -rf .next node_modules/.cache
    echo "✓ 完了。npm run dev で起動してください。"
    ;;
    
  4)
    echo ""
    echo "=== 完全リセット（時間がかかります） ==="
    echo "本当に実行しますか？ (y/N)"
    read -p "> " confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      pkill -9 -f "next" 2>/dev/null
      rm -rf node_modules package-lock.json .next .turbo node_modules/.cache
      npm install
      echo "✓ 完了。npm run dev で起動してください。"
    else
      echo "キャンセルしました。"
    fi
    ;;
    
  *)
    echo "無効な選択です。"
    exit 1
    ;;
esac
