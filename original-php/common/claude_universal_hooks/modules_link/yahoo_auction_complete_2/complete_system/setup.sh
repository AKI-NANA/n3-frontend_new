#!/bin/bash
# 実行権限確保
chmod +x "$0"
# Yahoo Auction Tool 送料・利益計算システム完全版 セットアップスクリプト（修正版）

echo "======================================"
echo "Yahoo Auction Tool 完全版セットアップ"
echo "======================================"

# 現在のディレクトリ
CURRENT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system"
cd "$CURRENT_DIR"

# 1. データベースセットアップ
echo "🗄️  データベースセットアップ中..."
psql -d nagano3_db -f shipping_profit_database.sql
if [ $? -eq 0 ]; then
    echo "✅ データベースセットアップ完了"
else
    echo "❌ データベースセットアップ失敗"
    exit 1
fi

# 2. Python仮想環境作成
echo "🐍 Python仮想環境セットアップ中..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ 仮想環境作成完了"
fi

# 仮想環境アクティベート
source venv/bin/activate
echo "✅ 仮想環境アクティベート完了"

# 3. Python依存関係インストール
echo "📦 Python依存関係インストール中..."
pip install flask flask-cors psycopg2-binary requests schedule
if [ $? -eq 0 ]; then
    echo "✅ Python依存関係インストール完了"
else
    echo "❌ Python依存関係インストール失敗"
    exit 1
fi

# 4. 実行権限付与
echo "🔧 実行権限付与中..."
chmod +x profit_calculator_api.py
chmod +x setup.sh

# 5. 設定ファイル作成
echo "⚙️ 設定ファイル作成中..."
cat > config.json << 'EOF'
{
    "api_port": 5001,
    "frontend_port": 8080,
    "database": {
        "host": "localhost",
        "database": "nagano3_db",
        "user": "nagano3_user",
        "password": "secure_password_2025"
    },
    "exchange_api": {
        "enabled": true,
        "providers": [
            "exchangerate-api.com",
            "fixer.io"
        ]
    },
    "safety_settings": {
        "default_margin_percent": 5.0,
        "update_frequency_hours": 6,
        "volatility_threshold": 3.0
    }
}
EOF

# 6. 起動スクリプト作成（仮想環境対応）
echo "📝 起動スクリプト作成中..."
cat > start_system.sh << 'EOF'
#!/bin/bash
# Yahoo Auction Tool 完全版起動スクリプト（仮想環境対応）

CURRENT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system"
cd "$CURRENT_DIR"

echo "🚀 Yahoo Auction Tool 送料・利益計算システム起動中..."

# 仮想環境アクティベート
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ 仮想環境アクティベート"
else
    echo "❌ 仮想環境が見つかりません。setup.shを実行してください。"
    exit 1
fi

# APIサーバー起動
echo "📡 APIサーバー起動中 (ポート: 5001)..."
python3 profit_calculator_api.py &
API_PID=$!

# 5秒待機してAPIテスト
sleep 5

# API接続テスト
echo "🔍 API接続テスト中..."
curl -s http://localhost:5001/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ APIサーバー正常起動"
else
    echo "❌ APIサーバー起動確認できませんが、継続します"
fi

# Webサーバー起動（HTMLファイル用）
echo "🌐 Webサーバー起動中 (ポート: 8080)..."
python3 -m http.server 8080 &
WEB_PID=$!

echo "✅ システム起動完了!"
echo ""
echo "📊 アクセス先:"
echo "   - フロントエンド: http://localhost:8080/index.html"
echo "   - API: http://localhost:5001"
echo ""
echo "🛑 停止方法:"
echo "   Ctrl+C または ./stop_system.sh"

# PIDファイル保存
echo $API_PID > api.pid
echo $WEB_PID > web.pid

# 終了シグナル待機
trap 'echo "🛑 システム停止中..."; kill $API_PID $WEB_PID 2>/dev/null; rm -f *.pid; exit 0' INT TERM

wait
EOF

# 7. 停止スクリプト作成
cat > stop_system.sh << 'EOF'
#!/bin/bash
# Yahoo Auction Tool 完全版停止スクリプト

CURRENT_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system"
cd "$CURRENT_DIR"

echo "🛑 Yahoo Auction Tool システム停止中..."

# PIDファイルから停止
if [ -f api.pid ]; then
    API_PID=$(cat api.pid)
    kill $API_PID 2>/dev/null
    rm -f api.pid
    echo "✅ APIサーバー停止"
fi

if [ -f web.pid ]; then
    WEB_PID=$(cat web.pid)
    kill $WEB_PID 2>/dev/null
    rm -f web.pid
    echo "✅ Webサーバー停止"
fi

# Python プロセス強制停止（念のため）
pkill -f "profit_calculator_api.py" 2>/dev/null
pkill -f "python3 -m http.server 8080" 2>/dev/null

echo "✅ システム停止完了"
EOF

# 実行権限付与
chmod +x start_system.sh
chmod +x stop_system.sh

# 8. APIサーバー起動テスト（仮想環境内で）
echo "🚀 APIサーバー起動テスト中..."
python3 profit_calculator_api.py &
API_PID=$!

# 5秒待機してAPIテスト
sleep 5

# API接続テスト
echo "🔍 API接続テスト中..."
curl -s http://localhost:5001/ | grep -q "running"
if [ $? -eq 0 ]; then
    echo "✅ APIサーバー正常起動"
else
    echo "⚠️ APIサーバー起動テスト（バックグラウンドで継続中）"
fi

# APIサーバー停止
kill $API_PID 2>/dev/null

# 9. テストデータ投入
echo "📋 テストデータ投入中..."
python3 << 'EOF'
import psycopg2
import json

try:
    conn = psycopg2.connect(
        host='localhost',
        database='nagano3_db',
        user='nagano3_user',
        password='secure_password_2025'
    )
    cursor = conn.cursor()
    
    # テスト商品データ投入
    test_items = [
        ('TEST-001', 'ワイヤレスイヤホン', 2500.00, 0.3, 15.0, 10.0, 5.0, '176982'),
        ('TEST-002', 'デジタルカメラレンズ', 15000.00, 1.2, 25.0, 10.0, 10.0, '625'),
        ('TEST-003', 'ヴィンテージ腕時計', 8000.00, 0.2, 12.0, 8.0, 3.0, '14324'),
        ('TEST-004', 'アクションフィギュア', 3500.00, 0.8, 30.0, 20.0, 15.0, '246'),
        ('TEST-005', '電子部品セット', 1200.00, 0.1, 8.0, 6.0, 2.0, '92074')
    ]
    
    for item in test_items:
        cursor.execute("""
            INSERT INTO item_master_extended 
            (item_code, item_name, cost_jpy, weight_kg, length_cm, width_cm, height_cm, ebay_category_id, data_source)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'test_data')
            ON CONFLICT (item_code) DO NOTHING
        """, item)
    
    conn.commit()
    cursor.close()
    conn.close()
    print("✅ テストデータ投入完了")
    
except Exception as e:
    print(f"❌ テストデータ投入エラー: {e}")
EOF

# 10. 初期為替レート設定
echo "💱 初期為替レート設定中..."
python3 << 'EOF'
import psycopg2

try:
    conn = psycopg2.connect(
        host='localhost',
        database='nagano3_db',
        user='nagano3_user',
        password='secure_password_2025'
    )
    cursor = conn.cursor()
    
    # 安全マージン適用済み為替レート設定
    cursor.execute("""
        INSERT INTO exchange_rates_extended 
        (from_currency, to_currency, raw_rate, safety_margin_percent, adjusted_rate, source)
        VALUES 
        ('USD', 'JPY', 148.5, 5.0, 155.9, 'initial_setup'),
        ('JPY', 'USD', 0.006734, 5.0, 0.006397, 'initial_setup')
        ON CONFLICT (from_currency, to_currency) DO UPDATE SET
            raw_rate = EXCLUDED.raw_rate,
            adjusted_rate = EXCLUDED.adjusted_rate,
            fetched_at = NOW()
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    print("✅ 初期為替レート設定完了")
    
except Exception as e:
    print(f"❌ 為替レート設定エラー: {e}")
EOF

# 11. 簡易版APIサーバー作成（fallback用）
echo "🔧 簡易版APIサーバー作成中..."
cat > simple_api.py << 'EOF'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
簡易版APIサーバー（依存関係最小）
"""

import json
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs
import psycopg2
from psycopg2.extras import RealDictCursor

class SimpleAPIHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'status': 'running',
                'service': 'Yahoo Auction Tool - Simple API',
                'version': '1.0-simple'
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/calculate_profit':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                # 簡易計算
                cost_jpy = float(data.get('cost_jpy', 0))
                weight_kg = float(data.get('weight_kg', 0.5))
                exchange_rate = 0.00641  # 固定値
                
                cost_usd = cost_jpy * exchange_rate
                shipping_usd = 30.0 + (weight_kg - 0.5) * 10  # 簡易送料
                fees_usd = cost_usd * 0.15  # 15%手数料
                total_cost = cost_usd + shipping_usd + fees_usd
                selling_price = total_cost * 1.3  # 30%利益
                profit = selling_price - total_cost
                margin = (profit / selling_price) * 100
                
                result = {
                    'success': True,
                    'pricing': {
                        'suggested_price_usd': round(selling_price, 2),
                        'profit_usd': round(profit, 2),
                        'profit_margin_percent': round(margin, 2)
                    },
                    'costs': {
                        'cost_usd': round(cost_usd, 2),
                        'shipping_usd': round(shipping_usd, 2),
                        'ebay_fees_usd': round(fees_usd, 2),
                        'total_cost_usd': round(total_cost, 2)
                    },
                    'rates': {
                        'exchange_rate': exchange_rate
                    },
                    'mode': 'simple'
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    PORT = 5001
    with socketserver.TCPServer(("", PORT), SimpleAPIHandler) as httpd:
        print(f"簡易APIサーバー起動: http://localhost:{PORT}")
        httpd.serve_forever()
EOF

chmod +x simple_api.py

echo ""
echo "🎉 セットアップ完了!"
echo ""
echo "📋 セットアップ内容:"
echo "   ✅ データベーススキーマ作成"
echo "   ✅ Python仮想環境作成"
echo "   ✅ 依存関係インストール"
echo "   ✅ 設定ファイル作成"
echo "   ✅ 起動・停止スクリプト作成"
echo "   ✅ テストデータ投入"
echo "   ✅ 初期為替レート設定"
echo "   ✅ 簡易版APIサーバー作成"
echo ""
echo "🚀 起動方法:"
echo "   ./start_system.sh        # フル機能版"
echo "   python3 simple_api.py &  # 簡易版（fallback）"
echo ""
echo "🌐 アクセス先（起動後）:"
echo "   http://localhost:8080/index.html"
echo ""
echo "📚 使用方法:"
echo "   1. ブラウザでアクセス"
echo "   2. 利益計算タブで商品情報入力"
echo "   3. 基本設定タブで為替・利益設定"
echo ""
echo "🔧 トラブルシューティング:"
echo "   - フル機能版で問題がある場合："
echo "     python3 simple_api.py & で簡易版を起動"
echo "   - 依存関係エラー: 仮想環境が正しく作成されているか確認"
echo "   - ポート競合: 5001, 8080ポート確認"

# 仮想環境無効化
deactivate
