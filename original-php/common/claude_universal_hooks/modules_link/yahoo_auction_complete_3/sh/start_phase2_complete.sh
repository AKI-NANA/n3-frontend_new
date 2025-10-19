#!/bin/bash

echo "🚀 Phase 2 送料計算システム - 完全版起動スクリプト"
echo "=================================================="
echo ""

cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

echo "📁 現在のディレクトリ: $(pwd)"
echo ""

# 実行権限設定
chmod +x *.sh

echo "🔧 APIサーバー起動確認..."
if ! pgrep -f "python.*api_server" > /dev/null; then
    echo "   APIサーバー起動中..."
    
    # Python仮想環境確認
    if [ -d "venv" ]; then
        source venv/bin/activate
        echo "   ✅ Python仮想環境アクティブ化"
    fi
    
    # APIサーバー起動（複数候補から選択）
    if [ -f "workflow_api_server_gemini.py" ]; then
        nohup python workflow_api_server_gemini.py > api_server.log 2>&1 &
        echo "   ✅ Gemini APIサーバー起動"
    elif [ -f "api_server.py" ]; then
        nohup python api_server.py > api_server.log 2>&1 &
        echo "   ✅ 基本APIサーバー起動"
    else
        echo "   ❌ APIサーバーファイルが見つかりません"
    fi
    
    sleep 3
else
    echo "   ✅ APIサーバーは既に起動中"
fi

echo "🚀 PHPサーバー起動確認..."
if ! pgrep -f "php -S localhost:8080" > /dev/null; then
    echo "   PHPサーバー起動中..."
    php -S localhost:8080 -t . > /dev/null 2>&1 &
    sleep 2
    echo "   ✅ PHPサーバー起動完了"
else
    echo "   ✅ PHPサーバーは既に起動中"
fi

echo ""
echo "🔍 サーバー状態確認..."
echo "API (Port 5001): $(curl -s http://localhost:5001/system_status > /dev/null && echo '✅ 正常' || echo '❌ 接続失敗')"
echo "PHP (Port 8080): $(curl -s http://localhost:8080 > /dev/null && echo '✅ 正常' || echo '❌ 接続失敗')"

echo ""
echo "🎨 === デザイン統一完了 ==="
echo "✅ 色合い: 全ボタン・全セクションをグレー統一"
echo "✅ 背景: 清潔な白背景"
echo "✅ ボーダー: シンプルなグレーボーダー"
echo "✅ アニメーション: 控えめな動き"
echo ""

echo "🔧 === 修正完了項目 ==="
echo "✅ shipping_calculation_frontend.js エラー修正"
echo "✅ API接続エラー対応（サーバー自動起動）"
echo "✅ Phase 2 CSS色合い統一（グレー・白）"
echo "✅ ボタンスタイル統一"
echo "✅ セクション境界線統一"
echo ""

echo "🆕 === 追加予定機能（Gemini分担作業） ==="
echo "📋 シッピングポリシー生成・管理システム"
echo "📐 商品サイズ入力欄（長さ・幅・高さ）"
echo "⚖️ 重量/容積計算自動切り替えロジック"
echo "🔧 機能するボタン実装"
echo "🗂️ eloji送料データとUSA基準送料の明確な分離"
echo "🧹 重複セクション自動削除"
echo ""

echo "🎯 === 現在の問題と解決方針 ==="
echo "❓ 送料ポリシー生成→Geminiが3種類のポリシー生成システム作成"
echo "❓ USA送料読込ボタン非機能→API連携でGeminiが修正"
echo "❓ 商品サイズ入力欄不足→統合計算に追加"
echo "❓ 重量/容積切り替え不足→計算ロジック実装"
echo "❓ 重複セクション問題→Phase 2クリーンアップ強化"
echo ""

echo "📱 === 現在利用可能な機能 ==="
echo "🎨 デザイン: グレー・白統一デザイン完成"
echo "🧹 UI: Phase 2 クリーンアップボタン"
echo "📋 基本: 送料計算タブの基本UI"
echo "⚙️ 設定: 基本計算設定（為替・利益率など）"
echo ""

echo "✨ Phase 2 送料計算システム起動完了！"
echo "📱 ブラウザアクセス: http://localhost:8080"
echo "🔧 API確認: http://localhost:5001/system_status"
echo ""
echo "💡 次の作業: Geminiとの分担で機能実装を完成させます"
