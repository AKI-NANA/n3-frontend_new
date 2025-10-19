#!/bin/bash

# 実際のPDF分析実行スクリプト
echo "🔍 実際のPDF詳細分析実行"
echo "=================================================="

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/data/

echo "📂 現在のディレクトリ: $(pwd)"
echo "📋 利用可能なPDFファイル:"
ls -la *.pdf

echo ""
echo "🚀 詳細分析スクリプト実行中..."
python3 detailed_pdf_analyzer.py

echo ""
echo "📊 生成されたファイル確認:"
ls -la extracted_detailed/

echo ""
echo "✅ 分析完了 - 正確なデータを投入します"