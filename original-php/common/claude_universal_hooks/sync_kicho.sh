#!/bin/bash
echo "🔄 kichoフォルダ同期中..."

# コピー実行
cp -r /Users/aritahiroaki/NAGANO-3/N3-Development/modules/kicho /Users/aritahiroaki/NAGANO-3/N3-Development/common/claude_universal_hooks/kicho_temp

echo "✅ 同期完了: kicho_temp/"
ls -la /Users/aritahiroaki/NAGANO-3/N3-Development/common/claude_universal_hooks/kicho_temp/
