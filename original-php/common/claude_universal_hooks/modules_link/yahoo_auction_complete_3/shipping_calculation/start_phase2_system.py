#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 送料計算システム Phase 2 統合APIサーバー（簡略版）
Gemini AI アドバイスに基づく完全版システム起動
"""

import sys
from pathlib import Path
from flask import Flask, jsonify
import socket

# 現在のディレクトリをパスに追加
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))
sys.path.append(str(current_dir.parent))

# DATA_DIR定義
DATA_DIR = current_dir.parent / "yahoo_ebay_data"

# 直接インポート（モジュール名なし）
from phase2_api_integration import integrate_phase2_with_existing_app

def find_free_port():
    """空いているポートを検索"""
    for port in [5001, 5000, 5002, 5003]:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return 5004

def create_phase2_integrated_app():
    """Phase 2 統合アプリケーション作成—簡略版"""
    
    print("🚀 送料計算システム Phase 2 統合版起動中...")
    
    # Flaskアプリケーション作成
    app = Flask(__name__)
    
    # データディレクトリ確認・作成
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "shipping_calculation").mkdir(exist_ok=True)
    (DATA_DIR / "csv_uploads").mkdir(exist_ok=True)
    
    # Phase 2 機能を既存アプリに統合
    integrate_phase2_with_existing_app(app, DATA_DIR)
    
    # 追加の基本エンドポイント（重複回避）
    @app.route('/phase2_status')
    def phase2_status():
        """Phase 2 統合システム状態（重複回避版）"""
        return jsonify({
            'success': True,
            'phase': 2,
            'system': 'integrated',
            'status': 'operational',
            'features': [
                'USA基準送料内包戦略',
                'eloji CSV管理',
                '為替リスク安全マージン',
                '統合価格計算',
                'データベース自動管理'
            ]
        })
    
    return app

def start_phase2_system():
    """Phase 2 統合システム開始"""
    print("🌟 ===== 送料計算システム Phase 2 統合版 =====")
    print("📋 Gemini AI アドバイス実装完了機能:")
    print("   🇺🇸 USA基準送料内包戦略")
    print("   🚛 eloji送料データCSV管理")  
    print("   🛡️ 為替リスク安全マージン")
    print("   📦 統合価格計算システム")
    print("   📊 自動データベース管理")
    
    # 統合アプリ作成
    integrated_app = create_phase2_integrated_app()
    
    # ポート検出
    port = find_free_port()
    
    print(f"🌐 メインURL: http://localhost:{port}")
    print("📱 フロントエンド: http://localhost:8080 (PHP)")
    print("")
    print("🎯 === Phase 2 新APIエンドポイント ===")
    print("• USA基準送料: /api/shipping/usa/base_rates")
    print("• eloji CSV: /api/shipping/eloji/upload")
    print("• 為替マージン: /api/exchange/rate_with_margin")
    print("• 統合計算: /api/shipping/integrated_calculation")
    print("• ポリシー生成: /api/shipping/policies/generate")
    print("")
    print("🔧 === 利用手順（Phase 2） ===")
    print("1. http://localhost:8080 にアクセス")
    print("2. 「送料計算」タブをクリック")
    print("3. USA基準送料設定を確認")
    print("4. eloji CSVファイルをアップロード")
    print("5. 為替リスクマージンを設定")
    print("6. 統合計算テストを実行")
    print("7. 全データに適用して運用開始")
    print("")
    
    # サーバー起動
    try:
        integrated_app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False)
    except KeyboardInterrupt:
        print("\n🛑 Phase 2 システム停止")
    except Exception as e:
        print(f"❌ システム起動エラー: {e}")

if __name__ == '__main__':
    start_phase2_system()
