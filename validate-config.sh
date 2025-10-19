#!/bin/bash

# ========================================
# N3 Frontend 設定ファイル検証
# ========================================

echo "=== 設定ファイルの検証 ==="
echo ""

errors=0

# 1. next.config.ts のチェック
echo "1. next.config.ts をチェック中..."
if grep -q "turbo:" next.config.ts 2>/dev/null; then
  echo "   ❌ 警告: next.config.ts に turbo 設定が含まれています"
  echo "      これは問題を引き起こす可能性があります"
  errors=$((errors + 1))
else
  echo "   ✓ OK"
fi

# 2. package.json のチェック
echo "2. package.json をチェック中..."
if [ -f "package.json" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('package.json'))" 2>/dev/null; then
    echo "   ✓ OK"
  else
    echo "   ❌ エラー: package.json の構文が不正です"
    errors=$((errors + 1))
  fi
else
  echo "   ❌ エラー: package.json が見つかりません"
  errors=$((errors + 1))
fi

# 3. tsconfig.json のチェック
echo "3. tsconfig.json をチェック中..."
if [ -f "tsconfig.json" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('tsconfig.json'))" 2>/dev/null; then
    echo "   ✓ OK"
  else
    echo "   ❌ エラー: tsconfig.json の構文が不正です"
    errors=$((errors + 1))
  fi
else
  echo "   ❌ エラー: tsconfig.json が見つかりません"
  errors=$((errors + 1))
fi

# 4. 必須ディレクトリのチェック
echo "4. 必須ディレクトリをチェック中..."
required_dirs=("app" "components" "lib")
for dir in "${required_dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo "   ✓ $dir/"
  else
    echo "   ❌ エラー: $dir/ が見つかりません"
    errors=$((errors + 1))
  fi
done

# 5. node_modules のチェック
echo "5. node_modules をチェック中..."
if [ -d "node_modules" ]; then
  if [ -d "node_modules/@next" ]; then
    echo "   ✓ OK"
  else
    echo "   ⚠ 警告: @next が見つかりません。npm install を実行してください"
    errors=$((errors + 1))
  fi
else
  echo "   ❌ エラー: node_modules が見つかりません。npm install を実行してください"
  errors=$((errors + 1))
fi

echo ""
if [ $errors -eq 0 ]; then
  echo "✅ すべての検証に合格しました"
  exit 0
else
  echo "❌ $errors 個の問題が見つかりました"
  echo ""
  echo "修復するには、以下を実行してください："
  echo "  ./troubleshoot.sh"
  exit 1
fi
