#!/bin/bash

echo "=== N3-Development の next.config.ts も修正 ==="
echo ""

N3_DEV_PATH="/Users/aritahiroaki/n3-frontend_new/N3-Development/n3-frontend"

if [ -f "$N3_DEV_PATH/next.config.ts" ]; then
  echo "N3-Development/n3-frontend の next.config.ts を修正中..."
  
  cat > "$N3_DEV_PATH/next.config.ts" << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
EOF
  
  echo "✓ 修正完了"
  
  # キャッシュもクリア
  rm -rf "$N3_DEV_PATH/.next"
  rm -rf "$N3_DEV_PATH/node_modules/.cache"
  echo "✓ キャッシュもクリアしました"
else
  echo "⚠ N3-Development/n3-frontend/next.config.ts が見つかりません"
fi

echo ""
echo "次回から両方のプロジェクトで問題が起きないようになりました。"
