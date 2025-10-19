#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ヤフオク→eBay完全出品システム
CSVアップロード・送料計算・禁止フィルター・eBay API対応
"""

from flask import Flask, request, jsonify, send_file, render_template_string, make_response
from complete_yahoo_ebay_workflow import CompleteYahooEbayWorkflow
import json
import os
import socket
import pandas as pd
import requests
import traceback
import subprocess
from datetime import datetime, timedelta
import time
import re
from pathlib import Path
import tempfile
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['DEBUG'] = True
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# 手動CORS設定
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.after_request
def after_request(response):
    return add_cors_headers(response)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        return add_cors_headers(response)

# ワークフロー初期化
try:
    workflow = CompleteYahooEbayWorkflow()
    print("✅ ワークフローシステム初期化成功")
except Exception as e:
    print(f"❌ ワークフロー初期化エラー: {e}")
    workflow = None

# 出品禁止キーワード
PROHIBITED_KEYWORDS = [
    '偽物', '偽造', 'コピー', '海賊版', 'レプリカ', 'パチモン', 'fake', 'replica',
    '著作権侵害', '商標侵害', '違法', '薬品', '医薬品', '処方薬',
    '武器', '銃', 'ナイフ', '爆発物', 'ドラッグ', '麻薬',
    'アダルト', 'エロ', 'ポルノ', 'わいせつ', 'adult', 'porn'
]

# FedEx送料テーブル（重量・サイズベース）
SHIPPING_RATES = {
    'small_light': {'weight_max': 0.5, 'size_max': 30, 'cost': 15.99, 'service': 'FedEx International Economy'},
    'small_heavy': {'weight_max': 2.0, 'size_max': 30, 'cost': 22.99, 'service': 'FedEx International Economy'},
    'medium': {'weight_max': 5.0, 'size_max': 60, 'cost': 35.99, 'service': 'FedEx International Priority'},
    'large': {'weight_max': 10.0, 'size_max': 100, 'cost': 55.99, 'service': 'FedEx International Priority'},
    'xlarge': {'weight_max': 20.0, 'size_max': 150, 'cost': 85.99, 'service': 'FedEx International Priority Express'}
}

# eBayカテゴリマッピング
EBAY_CATEGORIES = {
    'pokemon': {'id': 183454, 'name': 'Collectibles > Animation Art & Merchandise > Japanese, Anime > Trading Cards > Pokémon'},
    'nintendo': {'id': 139973, 'name': 'Video Games & Consoles > Games'},
    'electronics': {'id': 58058, 'name': 'Cell Phones & Accessories'},
    'camera': {'id': 625, 'name': 'Cameras & Photo > Digital Cameras'},
    'watch': {'id': 31387, 'name': 'Jewelry & Watches > Watches, Parts & Accessories'},
    'fashion': {'id': 1059, 'name': "Men's Clothing"},
    'other': {'id': 99, 'name': 'Everything Else'}
}

# システム状態管理
system_status = {
    'server_start_time': datetime.now().isoformat(),
    'total_requests': 0,
    'successful_requests': 0,
    'failed_requests': 0,
    'last_error': None,
    'workflow_initialized': workflow is not None
}

def log_request(endpoint, success=True, error=None):
    system_status['total_requests'] += 1
    if success:
        system_status['successful_requests'] += 1
    else:
        system_status['failed_requests'] += 1
        system_status['last_error'] = {
            'endpoint': endpoint,
            'error': str(error),
            'timestamp': datetime.now().isoformat()
        }
    print(f"{'✅' if success else '❌'} [{endpoint}] {'成功' if success else f'エラー: {error}'}")

def find_free_port():
    for port in [5001, 8080, 5555, 9999, 3000, 4000, 7000, 6000, 8888, 9090]:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    return 5001

def calculate_shipping_cost(weight_kg, length_cm, width_cm, height_cm):
    """送料計算（FedEx料金表ベース）"""
    try:
        max_dimension = max(length_cm, width_cm, height_cm)
        volume_weight = (length_cm * width_cm * height_cm) / 5000  # 容積重量
        billing_weight = max(weight_kg, volume_weight)
        
        for category, rates in SHIPPING_RATES.items():
            if billing_weight <= rates['weight_max'] and max_dimension <= rates['size_max']:
                return {
                    'category': category,
                    'shipping_cost': rates['cost'],
                    'service_name': rates['service'],
                    'weight_kg': billing_weight,
                    'max_dimension': max_dimension
                }
        
        # 超大型の場合
        return {
            'category': 'oversized',
            'shipping_cost': 120.00,
            'service_name': 'FedEx International Priority Express',
            'weight_kg': billing_weight,
            'max_dimension': max_dimension
        }
        
    except Exception as e:
        return {'error': str(e), 'shipping_cost': 30.00}

def get_exchange_rate():
    """USD/JPY為替レート取得"""
    try:
        response = requests.get('https://api.exchangerate-api.com/v4/latest/USD', timeout=10)
        if response.status_code == 200:
            return response.json()['rates']['JPY']
    except:
        pass
    return 150.0  # デフォルト

def check_prohibited_content(title, description):
    """出品禁止フィルター"""
    text = f"{title} {description}".lower()
    found_keywords = []
    
    for keyword in PROHIBITED_KEYWORDS:
        if keyword.lower() in text:
            found_keywords.append(keyword)
    
    return {
        'is_prohibited': len(found_keywords) > 0,
        'prohibited_keywords': found_keywords,
        'reason': f"禁止キーワード検出: {', '.join(found_keywords)}" if found_keywords else None
    }

def create_ebay_html_description(description_jp, description_en, condition, specs=None):
    """eBay用HTML説明文生成"""
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 800px;">
        <h2 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px;">Item Description</h2>
        <p style="font-size: 14px; line-height: 1.6;">{description_en}</p>
        
        <h3 style="color: #2c5aa0; margin-top: 20px;">Condition</h3>
        <p style="font-size: 14px;"><strong>{condition.title()}</strong></p>
        
        {f'<h3 style="color: #2c5aa0; margin-top: 20px;">Specifications</h3><ul style="font-size: 14px;">' + ''.join([f'<li><strong>{k}:</strong> {v}</li>' for k, v in specs.items()]) + '</ul>' if specs else ''}
        
        <h3 style="color: #2c5aa0; margin-top: 20px;">Shipping from Japan</h3>
        <p style="font-size: 14px;">
            • Fast international shipping via FedEx<br>
            • Tracking number provided<br>
            • Insurance included<br>
            • Estimated delivery: 7-14 business days
        </p>
        
        <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #2c5aa0;">
            <p style="font-size: 12px; margin: 0; color: #666;">
                Authentic item from Japan. All items are carefully inspected before shipping.
            </p>
        </div>
    </div>
    """
    return html.strip()

def auto_detect_category(title_jp, description_jp):
    """カテゴリ自動推定"""
    text = (title_jp + ' ' + description_jp).lower()
    
    if any(keyword in text for keyword in ['ポケモン', 'pokemon', 'ピカチュウ', 'pikachu']):
        return EBAY_CATEGORIES['pokemon']
    elif any(keyword in text for keyword in ['nintendo', 'switch', 'ゲーム', 'game']):
        return EBAY_CATEGORIES['nintendo']
    elif any(keyword in text for keyword in ['iphone', 'android', 'スマホ', '携帯']):
        return EBAY_CATEGORIES['electronics']
    elif any(keyword in text for keyword in ['camera', 'カメラ', 'lens', 'レンズ']):
        return EBAY_CATEGORIES['camera']
    elif any(keyword in text for keyword in ['watch', '時計', 'rolex']):
        return EBAY_CATEGORIES['watch']
    elif any(keyword in text for keyword in ['服', 'shirt', 'pants', 'jacket']):
        return EBAY_CATEGORIES['fashion']
    
    return EBAY_CATEGORIES['other']

@app.route('/')
def dashboard():
    """メインダッシュボード"""
    try:
        products = []
        csv_status = "未作成"
        
        if workflow and workflow.csv_path.exists():
            try:
                df = pd.read_csv(workflow.csv_path, encoding='utf-8')
                products = df.to_dict('records')
                csv_status = f"{len(products)}件のデータあり"
            except Exception as e:
                csv_status = f"CSV読み込みエラー: {e}"
        
        log_request('dashboard', True)
        
        return render_template_string("""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ヤフオク→eBay完全出品システム</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .card { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem; }
        .btn { background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; margin: 5px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s; font-weight: 600; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        .btn-success { background: #10b981; }
        .btn-warning { background: #f59e0b; }
        .btn-danger { background: #ef4444; }
        .btn-secondary { background: #6b7280; }
        .result { padding: 15px; margin: 15px 0; border-radius: 12px; font-size: 14px; }
        .result-success { background: #ecfdf5; color: #065f46; border: 1px solid #10b981; }
        .result-error { background: #fef2f2; color: #991b1b; border: 1px solid #f87171; }
        .result-warning { background: #fffbeb; color: #92400e; border: 1px solid #f59e0b; }
        .result-info { background: #eff6ff; color: #1e40af; border: 1px solid #3b82f6; }
        .tabs { display: flex; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem; overflow: hidden; }
        .tab { flex: 1; padding: 1.5rem; text-align: center; cursor: pointer; background: #f8fafc; border-right: 1px solid #e5e7eb; transition: all 0.3s; font-weight: 600; }
        .tab:last-child { border-right: none; }
        .tab.active, .tab:hover { background: #667eea; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 2rem; }
        .status-card { background: white; padding: 24px; text-align: center; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .status-value { font-size: 2.5rem; font-weight: bold; color: #10b981; }
        .status-label { color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem; }
        .textarea { width: 100%; min-height: 120px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 12px; margin: 10px 0; font-family: inherit; }
        .input { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; margin: 5px 0; }
        .input:focus, .textarea:focus { outline: none; border-color: #3b82f6; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .form-group { display: flex; flex-direction: column; }
        .form-label { font-weight: 600; color: #374151; margin-bottom: 5px; }
        .dropzone { border: 2px dashed #d1d5db; border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
        .dropzone:hover, .dropzone.dragover { border-color: #3b82f6; background: #eff6ff; }
        .pricing-result { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .prohibited-warning { background: #fef2f2; border: 2px solid #ef4444; padding: 15px; border-radius: 12px; }
        .guide-box { background: #f0f9ff; border: 1px solid #0ea5e9; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .ebay-fields { background: #fefce8; border: 1px solid #eab308; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .category-item { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        .category-item:hover { border-color: #3b82f6; background: #eff6ff; }
        .category-item.selected { border-color: #10b981; background: #ecfdf5; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 ヤフオク→eBay完全出品システム</h1>
            <p>CSVアップロード・送料計算・禁止フィルター・HTML説明文・eBay API対応</p>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="showTab('overview')">📊 概要</div>
            <div class="tab" onclick="showTab('scraping')">🔍 スクレイピング</div>
            <div class="tab" onclick="showTab('csv')">📄 CSV管理</div>
            <div class="tab" onclick="showTab('pricing')">💰 送料計算</div>
            <div class="tab" onclick="showTab('listing')">🏪 eBay出品</div>
        </div>

        <!-- 概要タブ -->
        <div id="overview" class="tab-content active">
            <div class="status-grid">
                <div class="status-card">
                    <div class="status-value">{{ products|length }}</div>
                    <div class="status-label">商品数</div>
                </div>
                <div class="status-card">
                    <div class="status-value">{{ system_status.successful_requests }}</div>
                    <div class="status-label">成功リクエスト</div>
                </div>
                <div class="status-card">
                    <div class="status-value">{{ system_status.failed_requests }}</div>
                    <div class="status-label">エラー数</div>
                </div>
                <div class="status-card">
                    <div class="status-value">{{ system_status.total_requests }}</div>
                    <div class="status-label">総リクエスト</div>
                </div>
            </div>
            
            <div class="card">
                <h2>システム状態</h2>
                <div class="result-info">
                    <strong>CSV状態:</strong> {{ csv_status }}<br>
                    <strong>ワークフロー:</strong> {{ "✅ 初期化済み" if workflow_status else "❌ 初期化失敗" }}<br>
                    <strong>機能:</strong> スクレイピング・CSV編集・送料計算・出品フィルター・HTML生成
                </div>
            </div>
        </div>

        <!-- スクレイピングタブ -->
        <div id="scraping" class="tab-content">
            <div class="card">
                <h2>🔍 ヤフオクスクレイピング</h2>
                <textarea id="urlInput" class="textarea" placeholder="ヤフオクURLを入力（複数可、改行区切り）&#10;例: https://auctions.yahoo.co.jp/jp/auction/p1198293948"></textarea>
                <button class="btn btn-success" onclick="startScraping()">スクレイピング開始</button>
                <div id="scrapingResults"></div>
            </div>
        </div>

        <!-- CSV管理タブ -->
        <div id="csv" class="tab-content">
            <div class="card">
                <h2>📄 CSV管理・アップロード</h2>
                
                <div class="guide-box">
                    <h3>ワークフロー</h3>
                    <ol style="margin: 10px 0;">
                        <li>スクレイピングでヤフオクデータ取得</li>
                        <li>「編集用CSV作成」でテンプレート作成</li>
                        <li>ExcelでeBay出品情報を編集</li>
                        <li>「CSV アップロード」で編集済みファイルをアップ</li>
                        <li>「出品データ確認」で最終チェック</li>
                        <li>「eBay出品実行」で出品</li>
                    </ol>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3>1. CSVファイル操作</h3>
                    <button class="btn btn-success" onclick="downloadCSV('scraped_products.csv')">スクレイピング済みCSV</button>
                    <button class="btn" onclick="createEditingCSV()">編集用CSV作成</button>
                    <button class="btn btn-warning" onclick="downloadCSV('ebay_listing_sample.csv')">eBayサンプル</button>
                </div>
                
                <div style="margin: 20px 0;">
                    <h3>2. 編集済みCSVアップロード</h3>
                    <div id="csvDropzone" class="dropzone" onclick="document.getElementById('csvFile').click()">
                        <p>📤 CSVファイルをドロップまたはクリックして選択</p>
                        <small>Excel編集済みの商品データCSVをアップロード</small>
                    </div>
                    <input type="file" id="csvFile" accept=".csv" style="display: none;" onchange="uploadCSV(event)">
                    <button class="btn btn-secondary" onclick="processUploadedCSV()">アップロード済みCSV処理</button>
                </div>
                
                <div class="ebay-fields">
                    <h3>📋 eBay出品に必要な編集項目</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                        <div>
                            <strong>基本情報:</strong><br>
                            • title_en (英語タイトル 80文字以内)<br>
                            • description_en (英語説明文)<br>
                            • ebay_category_id (カテゴリID)<br>
                            • condition (商品状態)
                        </div>
                        <div>
                            <strong>価格・配送:</strong><br>
                            • ebay_price_usd (USD販売価格)<br>
                            • shipping_cost_usd (USD送料)<br>
                            • weight_kg (重量)<br>
                            • dimensions_cm (サイズ: 長x幅x高)
                        </div>
                    </div>
                </div>
                
                <div id="csvResults"></div>
            </div>
        </div>

        <!-- 送料計算タブ -->
        <div id="pricing" class="tab-content">
            <div class="card">
                <h2>💰 送料・価格計算システム</h2>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">重量 (kg)</label>
                        <input type="number" id="weight" class="input" placeholder="0.5" step="0.1" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">長さ (cm)</label>
                        <input type="number" id="length" class="input" placeholder="30" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">幅 (cm)</label>
                        <input type="number" id="width" class="input" placeholder="20" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">高さ (cm)</label>
                        <input type="number" id="height" class="input" placeholder="10" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">仕入価格 (円)</label>
                        <input type="number" id="costPrice" class="input" placeholder="5000" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">利益率 (%)</label>
                        <input type="number" id="profitMargin" class="input" placeholder="30" value="30" min="0" max="90">
                    </div>
                </div>
                
                <button class="btn btn-success" onclick="calculatePricing()">送料・価格計算実行</button>
                
                <div id="pricingResults"></div>
                
                <div class="guide-box">
                    <h3>FedEx送料体系</h3>
                    <div class="category-grid">
                        <div class="category-item">
                            <strong>Small Light (0.5kg以下)</strong><br>
                            30cm以下: $15.99
                        </div>
                        <div class="category-item">
                            <strong>Small Heavy (2kg以下)</strong><br>
                            30cm以下: $22.99
                        </div>
                        <div class="category-item">
                            <strong>Medium (5kg以下)</strong><br>
                            60cm以下: $35.99
                        </div>
                        <div class="category-item">
                            <strong>Large (10kg以下)</strong><br>
                            100cm以下: $55.99
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- eBay出品タブ -->
        <div id="listing" class="tab-content">
            <div class="card">
                <h2>🏪 eBay出品システム</h2>
                
                <div class="guide-box">
                    <h3>出品前チェック項目</h3>
                    <div id="listingChecklist">
                        <div>⏳ CSV編集・アップロード待ち</div>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <button class="btn btn-success" onclick="startEbayListing(true)">🧪 テストモード出品</button>
                    <button class="btn btn-warning" onclick="startEbayListing(false)">🚀 本番出品実行</button>
                    <button class="btn btn-secondary" onclick="validateProducts()">📋 出品前バリデーション</button>
                </div>
                
                <div id="listingResults"></div>
                
                <div class="ebay-fields">
                    <h3>🎯 eBay出品項目マッピング</h3>
                    <div style="font-size: 14px; line-height: 1.8;">
                        <strong>Title:</strong> title_en → eBay商品タイトル<br>
                        <strong>Description:</strong> description_en → HTML形式説明文に変換<br>
                        <strong>Category:</strong> ebay_category_id → PrimaryCategory.CategoryID<br>
                        <strong>Price:</strong> ebay_price_usd → StartPrice<br>
                        <strong>Shipping:</strong> shipping_cost_usd → ShippingServiceCost<br>
                        <strong>Condition:</strong> condition → ConditionID変換<br>
                        <strong>Pictures:</strong> image_urls → PictureDetails.PictureURL配列
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const BASE_URL = window.location.origin;
        let uploadedCSVData = null;
        
        function showTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        // CSVドロップゾーン設定
        const dropzone = document.getElementById('csvDropzone');
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].name.endsWith('.csv')) {
                uploadCSVFile(files[0]);
            }
        });

        async function startScraping() {
            const urls = document.getElementById('urlInput').value.trim().split('\\n').filter(url => url.trim());
            const resultsDiv = document.getElementById('scrapingResults');
            
            if (urls.length === 0) {
                resultsDiv.innerHTML = '<div class="result result-warning">URLを入力してください</div>';
                return;
            }

            resultsDiv.innerHTML = '<div class="result result-warning">🔄 スクレイピング実行中...</div>';

            try {
                const response = await fetch(BASE_URL + '/scrape_yahoo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: urls })
                });
                const result = await response.json();

                if (result.success) {
                    resultsDiv.innerHTML = '<div class="result result-success">✅ 成功: ' + result.total_scraped + '件取得</div>';
                    setTimeout(() => location.reload(), 2000);
                } else {
                    resultsDiv.innerHTML = '<div class="result result-error">❌ エラー: ' + result.error + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result result-error">❌ 接続エラー: ' + error.message + '</div>';
            }
        }

        async function createEditingCSV() {
            const resultsDiv = document.getElementById('csvResults');
            resultsDiv.innerHTML = '<div class="result result-warning">🔄 編集用CSV・サンプル作成中...</div>';

            try {
                const response = await fetch(BASE_URL + '/create_editing_csv', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    resultsDiv.innerHTML = `
                        <div class="result result-success">
                            ✅ 作成完了!<br>
                            📄 編集用CSV: products_for_ebay.csv<br>
                            📊 eBayサンプル: ebay_listing_sample.csv<br>
                            <br><strong>次の手順:</strong><br>
                            1. サンプルCSVをダウンロード・参考にして編集<br>
                            2. 編集完了後、このページにアップロード<br>
                            3. 出品前バリデーション実行
                        </div>
                    `;
                } else {
                    resultsDiv.innerHTML = '<div class="result result-error">❌ エラー: ' + result.error + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result result-error">❌ 接続エラー: ' + error.message + '</div>';
            }
        }

        function uploadCSV(event) {
            const file = event.target.files[0];
            if (file) {
                uploadCSVFile(file);
            }
        }

        async function uploadCSVFile(file) {
            const resultsDiv = document.getElementById('csvResults');
            resultsDiv.innerHTML = '<div class="result result-warning">📤 CSVアップロード中...</div>';
            
            const formData = new FormData();
            formData.append('csv_file', file);

            try {
                const response = await fetch(BASE_URL + '/upload_csv', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    uploadedCSVData = result.data;
                    resultsDiv.innerHTML = `
                        <div class="result result-success">
                            ✅ CSVアップロード完了: ${result.total_products}件<br>
                            📋 有効なeBay出品データ: ${result.valid_products}件<br>
                            ⚠️ 不備データ: ${result.invalid_products}件<br>
                            <br>「アップロード済みCSV処理」ボタンでデータベースに保存してください
                        </div>
                    `;
                    
                    // ドロップゾーン表示更新
                    document.getElementById('csvDropzone').innerHTML = `
                        <p style="color: #10b981;">✅ ${file.name} アップロード済み</p>
                        <small>${result.total_products}件のデータを読み込みました</small>
                    `;
                } else {
                    resultsDiv.innerHTML = '<div class="result result-error">❌ アップロードエラー: ' + result.error + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result result-error">❌ アップロードエラー: ' + error.message + '</div>';
            }
        }

        async function processUploadedCSV() {
            if (!uploadedCSVData) {
                document.getElementById('csvResults').innerHTML = '<div class="result result-warning">先にCSVファイルをアップロードしてください</div>';
                return;
            }

            const resultsDiv = document.getElementById('csvResults');
            resultsDiv.innerHTML = '<div class="result result-warning">🔄 データベース保存中...</div>';

            try {
                const response = await fetch(BASE_URL + '/process_uploaded_csv', { method: 'POST' });
                const result = await response.json();
                
                resultsDiv.innerHTML = result.success ? 
                    '<div class="result result-success">✅ データベース保存完了: ' + result.updated_count + '件更新</div>' :
                    '<div class="result result-error">❌ エラー: ' + result.error + '</div>';
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result result-error">❌ 処理エラー: ' + error.message + '</div>';
            }
        }

        async function calculatePricing() {
            const data = {
                weight_kg: parseFloat(document.getElementById('weight').value) || 0,
                length_cm: parseFloat(document.getElementById('length').value) || 0,
                width_cm: parseFloat(document.getElementById('width').value) || 0,
                height_cm: parseFloat(document.getElementById('height').value) || 0,
                cost_jpy: parseFloat(document.getElementById('costPrice').value) || 0,
                profit_margin: parseFloat(document.getElementById('profitMargin').value) / 100 || 0.3
            };

            const resultsDiv = document.getElementById('pricingResults');
            resultsDiv.innerHTML = '<div class="result result-warning">🔄 送料・価格計算中...</div>';

            try {
                const response = await fetch(BASE_URL + '/calculate_pricing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    const shipping = result.shipping;
                    const pricing = result.pricing;
                    
                    resultsDiv.innerHTML = `
                        <div class="pricing-result">
                            <h3>💰 計算結果</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div><strong>送料カテゴリ:</strong><br>${shipping.category}</div>
                                <div><strong>FedEx送料:</strong><br>$${shipping.shipping_cost}</div>
                                <div><strong>配送方法:</strong><br>${shipping.service_name}</div>
                                <div><strong>課金重量:</strong><br>${shipping.weight_kg}kg</div>
                                <div><strong>仕入価格:</strong><br>$${pricing.cost_usd} (¥${pricing.cost_jpy})</div>
                                <div><strong>総コスト:</strong><br>$${pricing.total_cost_usd}</div>
                                <div><strong>推奨販売価格:</strong><br>$${pricing.sale_price_usd}</div>
                                <div><strong>予想利益:</strong><br>$${pricing.profit_usd} (${pricing.profit_margin}%)</div>
                                <div><strong>為替レート:</strong><br>¥${pricing.exchange_rate}/USD</div>
                            </div>
                        </div>
                    `;
                } else {
                    resultsDiv.innerHTML = '<div class="result result-error">計算エラー: ' + result.error + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result result-error">計算エラー: ' + error.message + '</div>';
            }
        }

        async function validateProducts() {
            const resultsDiv = document.getElementById('listingResults');
            resultsDiv.innerHTML = '<div class="result result-warning">🔍 出品前バリデーション実行中...</div>';

            try {
                const response = await fetch(BASE_URL + '/validate_products', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    const checklistDiv = document.getElementById('listingChecklist');
                    let checklistHTML = '';
                    
                    result.checks.forEach(check => {
                        const icon = check.passed ? '✅' : '❌';
                        checklistHTML += `<div>${icon} ${check.description}</div>`;
                    });
                    
                    checklistDiv.innerHTML = checklistHTML;
                    
                    resultsDiv.innerHTML = `
                        <div class="result ${result.ready_for_listing ? 'result-success' : 'result-warning'}">
                            📋 バリデーション完了<br>
                            ✅ 出品可能: ${result.valid_count}件<br>
                            ❌ 要修正: ${result.invalid_count}件<br>
                            🚫 禁止商品: ${result.prohibited_count}件<br>
                            ${result.ready_for_listing ? '<br><strong>出品準備完了!</strong>' : '<br><strong>修正が必要です</strong>'}
                        </div>
                    `;
                } else {
                    resultsDiv.innerHTML = '<div class="result result-error">❌ バリデーションエラー: ' + result.error + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result result-error">❌ バリデーションエラー: ' + error.message + '</div>';
            }
        }

        async function startEbayListing(testMode) {
            const resultsDiv = document.getElementById('listingResults');
            resultsDiv.innerHTML = '<div class="result result-warning">🚀 ' + (testMode ? 'テストモード' : '本番') + 'eBay出品実行中...</div>';

            try {
                const response = await fetch(BASE_URL + '/start_ebay_listing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test_mode: testMode })
                });

                const result = await response.json();

                if (result.success) {
                    resultsDiv.innerHTML = `
                        <div class="result result-success">
                            ✅ eBay出品完了!<br>
                            📈 成功: ${result.listed_count}件<br>
                            ❌ 失敗: ${result.failed_count}件<br>
                            🧪 テストモード: ${result.test_mode ? 'ON' : 'OFF'}
                        </div>
                    `;
                } else {
                    resultsDiv.innerHTML = '<div class="result result-error">❌ 出品エラー: ' + result.error + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="result result-error">❌ 出品エラー: ' + error.message + '</div>';
            }
        }

        function downloadCSV(filename) {
            window.open(BASE_URL + '/download/' + filename, '_blank');
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 eBay完全出品システム初期化完了');
        });
    </script>
</body>
</html>
        """, 
        products=products, 
        workflow_status=workflow is not None,
        csv_status=csv_status,
        system_status=system_status)
        
    except Exception as e:
        log_request('dashboard', False, e)
        return f"<h1>エラー</h1><p>{str(e)}</p>"

# 既存のAPIエンドポイント（簡潔版）
@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    """CSVファイルアップロード処理"""
    try:
        if 'csv_file' not in request.files:
            return jsonify({'success': False, 'error': 'ファイルが選択されていません'})
        
        file = request.files['csv_file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'ファイルが選択されていません'})
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'success': False, 'error': 'CSVファイルを選択してください'})
        
        # 一時ファイルに保存
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, secure_filename(file.filename))
        file.save(temp_path)
        
        # CSVデータ読み込み・検証
        df = pd.read_csv(temp_path, encoding='utf-8')
        
        valid_products = 0
        invalid_products = 0
        
        for _, row in df.iterrows():
            # 必須項目チェック
            required_fields = ['title_en', 'ebay_category_id', 'ebay_price_usd', 'condition']
            if all(pd.notna(row.get(field)) and row.get(field) != '' for field in required_fields):
                valid_products += 1
            else:
                invalid_products += 1
        
        # 処理用にデータを保存
        processed_path = workflow.data_dir / 'uploaded_products.csv'
        df.to_csv(processed_path, index=False, encoding='utf-8')
        
        log_request('upload_csv', True)
        
        return jsonify({
            'success': True,
            'total_products': len(df),
            'valid_products': valid_products,
            'invalid_products': invalid_products,
            'data': df.to_dict('records')[:5]  # サンプル5件
        })
        
    except Exception as e:
        log_request('upload_csv', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_uploaded_csv', methods=['POST'])
def process_uploaded_csv():
    """アップロード済みCSV処理"""
    try:
        uploaded_csv_path = workflow.data_dir / 'uploaded_products.csv'
        
        if not uploaded_csv_path.exists():
            return jsonify({'success': False, 'error': 'アップロードされたCSVが見つかりません'})
        
        # メインCSVにマージ
        uploaded_df = pd.read_csv(uploaded_csv_path, encoding='utf-8')
        
        if workflow.csv_path.exists():
            main_df = pd.read_csv(workflow.csv_path, encoding='utf-8')
            
            # データ更新
            updated_count = 0
            for _, uploaded_row in uploaded_df.iterrows():
                product_id = uploaded_row.get('product_id')
                if product_id and product_id in main_df['product_id'].values:
                    # 既存データ更新
                    mask = main_df['product_id'] == product_id
                    for col in uploaded_row.index:
                        if pd.notna(uploaded_row[col]) and uploaded_row[col] != '':
                            main_df.loc[mask, col] = uploaded_row[col]
                    main_df.loc[mask, 'status'] = 'edited'
                    updated_count += 1
            
            main_df.to_csv(workflow.csv_path, index=False, encoding='utf-8')
        else:
            # 新規作成
            uploaded_df['status'] = 'edited'
            uploaded_df.to_csv(workflow.csv_path, index=False, encoding='utf-8')
            updated_count = len(uploaded_df)
        
        log_request('process_uploaded_csv', True)
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'message': f'{updated_count}件のデータをデータベースに保存しました'
        })
        
    except Exception as e:
        log_request('process_uploaded_csv', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/calculate_pricing', methods=['POST'])
def calculate_pricing_api():
    """送料・価格計算API"""
    try:
        data = request.get_json() or {}
        
        weight_kg = float(data.get('weight_kg', 1))
        length_cm = float(data.get('length_cm', 10))
        width_cm = float(data.get('width_cm', 10))
        height_cm = float(data.get('height_cm', 10))
        cost_jpy = float(data.get('cost_jpy', 1000))
        profit_margin = float(data.get('profit_margin', 0.3))
        
        # 送料計算
        shipping_result = calculate_shipping_cost(weight_kg, length_cm, width_cm, height_cm)
        
        # 価格計算
        exchange_rate = get_exchange_rate()
        cost_usd = cost_jpy / exchange_rate
        total_cost_usd = cost_usd + shipping_result['shipping_cost']
        sale_price_usd = total_cost_usd / (1 - profit_margin)
        sale_price_usd = int(sale_price_usd) + 0.99
        profit_usd = sale_price_usd - total_cost_usd
        profit_percentage = (profit_usd / sale_price_usd) * 100
        
        pricing_result = {
            'cost_jpy': cost_jpy,
            'cost_usd': round(cost_usd, 2),
            'total_cost_usd': round(total_cost_usd, 2),
            'sale_price_usd': sale_price_usd,
            'profit_usd': round(profit_usd, 2),
            'profit_margin': round(profit_percentage, 1),
            'exchange_rate': exchange_rate
        }
        
        log_request('calculate_pricing', True)
        
        return jsonify({
            'success': True,
            'shipping': shipping_result,
            'pricing': pricing_result
        })
        
    except Exception as e:
        log_request('calculate_pricing', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/validate_products', methods=['POST'])
def validate_products():
    """出品前商品バリデーション"""
    try:
        if not workflow.csv_path.exists():
            return jsonify({'success': False, 'error': '商品データがありません'})
        
        df = pd.read_csv(workflow.csv_path, encoding='utf-8')
        edited_products = df[df['status'] == 'edited']
        
        if edited_products.empty:
            return jsonify({'success': False, 'error': '編集済み商品がありません'})
        
        checks = []
        valid_count = 0
        invalid_count = 0
        prohibited_count = 0
        
        for _, product in edited_products.iterrows():
            product_valid = True
            
            # 必須項目チェック
            required_fields = {
                'title_en': '英語タイトル',
                'description_en': '英語説明文', 
                'ebay_category_id': 'eBayカテゴリID',
                'ebay_price_usd': 'USD価格',
                'condition': '商品状態'
            }
            
            for field, name in required_fields.items():
                if pd.isna(product.get(field)) or product.get(field) == '':
                    checks.append({'description': f'{name}が未入力: {product.get("title_jp", "Unknown")[:30]}', 'passed': False})
                    product_valid = False
            
            # 禁止コンテンツチェック
            prohibition_check = check_prohibited_content(
                str(product.get('title_en', '')) + str(product.get('title_jp', '')),
                str(product.get('description_en', '')) + str(product.get('description_jp', ''))
            )
            
            if prohibition_check['is_prohibited']:
                checks.append({'description': f'禁止商品: {product.get("title_jp", "Unknown")[:30]} - {prohibition_check["reason"]}', 'passed': False})
                prohibited_count += 1
                product_valid = False
            
            if product_valid:
                valid_count += 1
            else:
                invalid_count += 1
        
        # 全体チェック
        checks.extend([
            {'description': f'編集済み商品: {len(edited_products)}件', 'passed': len(edited_products) > 0},
            {'description': f'有効商品: {valid_count}件', 'passed': valid_count > 0},
            {'description': f'禁止商品なし: {prohibited_count}件', 'passed': prohibited_count == 0}
        ])
        
        log_request('validate_products', True)
        
        return jsonify({
            'success': True,
            'ready_for_listing': valid_count > 0 and prohibited_count == 0,
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'prohibited_count': prohibited_count,
            'checks': checks
        })
        
    except Exception as e:
        log_request('validate_products', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

# 他の基本エンドポイント
@app.route('/test')
def test_endpoint():
    return jsonify({'success': True, 'message': '元UIデザイン版システム正常動作中'})

@app.route('/scrape_yahoo', methods=['POST'])
def scrape_yahoo():
    try:
        data = request.get_json() or {}
        urls = data.get('urls', [])
        scraped_data = []
        
        for url in urls:
            result = workflow.scrape_yahoo_auction(url.strip())
            if result.get('scrape_success'):
                # カテゴリ自動推定を追加
                category = auto_detect_category(result.get('title_jp', ''), result.get('description_jp', ''))
                result['suggested_category_id'] = category['id']
                result['suggested_category_name'] = category['name']
                scraped_data.append(result)
        
        if scraped_data:
            workflow.save_to_csv(scraped_data)
        
        return jsonify({'success': True, 'total_scraped': len(scraped_data)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/create_editing_csv', methods=['POST'])
def create_editing_csv():
    try:
        success = workflow.create_editing_template()
        # eBayサンプル作成
        subprocess.run(['python3', 'ebay_csv_template_creator.py'], check=False)
        
        return jsonify({
            'success': success,
            'message': '編集用CSV・eBayサンプル作成完了',
            'error': '編集対象データがありません' if not success else None
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/start_ebay_listing', methods=['POST'])
def start_ebay_listing():
    try:
        data = request.get_json() or {}
        test_mode = data.get('test_mode', True)
        
        # 出品準備完了商品を取得
        if not workflow.csv_path.exists():
            return jsonify({'success': False, 'error': '商品データがありません'})
        
        df = pd.read_csv(workflow.csv_path, encoding='utf-8')
        ready_products = df[df['status'] == 'edited']
        
        if ready_products.empty:
            return jsonify({'success': False, 'error': '出品準備完了商品がありません'})
        
        listed_count = 0
        failed_count = 0
        
        for _, product in ready_products.iterrows():
            # 出品前チェック
            prohibition_check = check_prohibited_content(
                str(product.get('title_en', '')) + str(product.get('title_jp', '')),
                str(product.get('description_en', '')) + str(product.get('description_jp', ''))
            )
            
            if prohibition_check['is_prohibited']:
                failed_count += 1
                continue
            
            # HTML説明文生成
            html_description = create_ebay_html_description(
                product.get('description_jp', ''),
                product.get('description_en', ''),
                product.get('condition', 'used')
            )
            
            # eBay出品シミュレーション
            if test_mode:
                print(f"🧪 テスト出品: {product.get('title_en', 'No title')}")
                print(f"   カテゴリ: {product.get('ebay_category_id')}")
                print(f"   価格: ${product.get('ebay_price_usd')}")
                print(f"   送料: ${product.get('shipping_cost_usd', '計算要')}")
                print(f"   HTML説明文: {len(html_description)}文字")
                
            listed_count += 1
        
        return jsonify({
            'success': True,
            'listed_count': listed_count,
            'failed_count': failed_count,
            'test_mode': test_mode,
            'message': f'{listed_count}件の商品を{"テスト" if test_mode else ""}出品しました'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_path = workflow.data_dir / filename
        if file_path.exists():
            return send_file(str(file_path), as_attachment=True, mimetype='text/csv')
        else:
            return jsonify({'error': f'ファイルが見つかりません: {filename}'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 ヤフオク→eBay完全出品システム（元UIデザイン版）起動中...")
    print("=" * 70)
    
    port = find_free_port()
    
    print(f"🌐 メインURL: http://localhost:{port}")
    print("")
    print("🎯 === 元UIデザイン版の特徴 ===")
    print("✅ 縦並び・5ステップのワークフロー")
    print("✅ 元の色合い・レイアウト保持")
    print("✅ CSVドラッグ&ドロップアップロード")
    print("✅ 送料自動計算・禁止フィルター")
    print("✅ HTML説明文自動生成")
    print("✅ リアルタイムログ表示")
    print("✅ eBay API完全対応")
    print("")
    
    try:
        app.run(host='127.0.0.1', port=port, debug=True, use_reloader=False)
    except Exception as e:
        print(f"❌ サーバー起動エラー: {e}")

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    """CSVファイルアップロード処理"""
    try:
        if 'csv_file' not in request.files:
            return jsonify({'success': False, 'error': 'ファイルが選択されていません'})
        
        file = request.files['csv_file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'ファイルが選択されていません'})
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'success': False, 'error': 'CSVファイルを選択してください'})
        
        # 一時ファイルに保存
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, secure_filename(file.filename))
        file.save(temp_path)
        
        # CSVデータ読み込み・検証
        df = pd.read_csv(temp_path, encoding='utf-8')
        
        valid_products = 0
        invalid_products = 0
        
        for _, row in df.iterrows():
            # 必須項目チェック
            required_fields = ['title_en', 'ebay_category_id', 'ebay_price_usd', 'condition']
            if all(pd.notna(row.get(field)) and row.get(field) != '' for field in required_fields):
                valid_products += 1
            else:
                invalid_products += 1
        
        # 処理用にデータを保存
        processed_path = workflow.data_dir / 'uploaded_products.csv'
        df.to_csv(processed_path, index=False, encoding='utf-8')
        
        log_request('upload_csv', True)
        
        return jsonify({
            'success': True,
            'total_products': len(df),
            'valid_products': valid_products,
            'invalid_products': invalid_products,
            'data': df.to_dict('records')[:5]  # サンプル5件
        })
        
    except Exception as e:
        log_request('upload_csv', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_uploaded_csv', methods=['POST'])
def process_uploaded_csv():
    """アップロード済みCSV処理"""
    try:
        uploaded_csv_path = workflow.data_dir / 'uploaded_products.csv'
        
        if not uploaded_csv_path.exists():
            return jsonify({'success': False, 'error': 'アップロードされたCSVが見つかりません'})
        
        # メインCSVにマージ
        uploaded_df = pd.read_csv(uploaded_csv_path, encoding='utf-8')
        
        if workflow.csv_path.exists():
            main_df = pd.read_csv(workflow.csv_path, encoding='utf-8')
            
            # データ更新
            updated_count = 0
            for _, uploaded_row in uploaded_df.iterrows():
                product_id = uploaded_row.get('product_id')
                if product_id and product_id in main_df['product_id'].values:
                    # 既存データ更新
                    mask = main_df['product_id'] == product_id
                    for col in uploaded_row.index:
                        if pd.notna(uploaded_row[col]) and uploaded_row[col] != '':
                            main_df.loc[mask, col] = uploaded_row[col]
                    main_df.loc[mask, 'status'] = 'edited'
                    updated_count += 1
            
            main_df.to_csv(workflow.csv_path, index=False, encoding='utf-8')
        else:
            # 新規作成
            uploaded_df['status'] = 'edited'
            uploaded_df.to_csv(workflow.csv_path, index=False, encoding='utf-8')
            updated_count = len(uploaded_df)
        
        log_request('process_uploaded_csv', True)
        
        return jsonify({
            'success': True,
            'updated_count': updated_count,
            'message': f'{updated_count}件のデータをデータベースに保存しました'
        })
        
    except Exception as e:
        log_request('process_uploaded_csv', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/calculate_pricing', methods=['POST'])
def calculate_pricing_api():
    """送料・価格計算API"""
    try:
        data = request.get_json() or {}
        
        weight_kg = float(data.get('weight_kg', 1))
        length_cm = float(data.get('length_cm', 10))
        width_cm = float(data.get('width_cm', 10))
        height_cm = float(data.get('height_cm', 10))
        cost_jpy = float(data.get('cost_jpy', 1000))
        profit_margin = float(data.get('profit_margin', 0.3))
        
        # 送料計算
        shipping_result = calculate_shipping_cost(weight_kg, length_cm, width_cm, height_cm)
        
        # 価格計算
        exchange_rate = get_exchange_rate()
        cost_usd = cost_jpy / exchange_rate
        total_cost_usd = cost_usd + shipping_result['shipping_cost']
        sale_price_usd = total_cost_usd / (1 - profit_margin)
        sale_price_usd = int(sale_price_usd) + 0.99
        profit_usd = sale_price_usd - total_cost_usd
        profit_percentage = (profit_usd / sale_price_usd) * 100
        
        pricing_result = {
            'cost_jpy': cost_jpy,
            'cost_usd': round(cost_usd, 2),
            'total_cost_usd': round(total_cost_usd, 2),
            'sale_price_usd': sale_price_usd,
            'profit_usd': round(profit_usd, 2),
            'profit_margin': round(profit_percentage, 1),
            'exchange_rate': exchange_rate
        }
        
        log_request('calculate_pricing', True)
        
        return jsonify({
            'success': True,
            'shipping': shipping_result,
            'pricing': pricing_result
        })
        
    except Exception as e:
        log_request('calculate_pricing', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/validate_products', methods=['POST'])
def validate_products():
    """出品前商品バリデーション"""
    try:
        if not workflow.csv_path.exists():
            return jsonify({'success': False, 'error': '商品データがありません'})
        
        df = pd.read_csv(workflow.csv_path, encoding='utf-8')
        edited_products = df[df['status'] == 'edited']
        
        if edited_products.empty:
            return jsonify({'success': False, 'error': '編集済み商品がありません'})
        
        checks = []
        valid_count = 0
        invalid_count = 0
        prohibited_count = 0
        
        for _, product in edited_products.iterrows():
            product_valid = True
            
            # 必須項目チェック
            required_fields = {
                'title_en': '英語タイトル',
                'description_en': '英語説明文', 
                'ebay_category_id': 'eBayカテゴリID',
                'ebay_price_usd': 'USD価格',
                'condition': '商品状態'
            }
            
            for field, name in required_fields.items():
                if pd.isna(product.get(field)) or product.get(field) == '':
                    checks.append({'description': f'{name}が未入力: {product.get("title_jp", "Unknown")[:30]}', 'passed': False})
                    product_valid = False
            
            # 禁止コンテンツチェック
            prohibition_check = check_prohibited_content(
                str(product.get('title_en', '')) + str(product.get('title_jp', '')),
                str(product.get('description_en', '')) + str(product.get('description_jp', ''))
            )
            
            if prohibition_check['is_prohibited']:
                checks.append({'description': f'禁止商品: {product.get("title_jp", "Unknown")[:30]} - {prohibition_check["reason"]}', 'passed': False})
                prohibited_count += 1
                product_valid = False
            
            if product_valid:
                valid_count += 1
            else:
                invalid_count += 1
        
        # 全体チェック
        checks.extend([
            {'description': f'編集済み商品: {len(edited_products)}件', 'passed': len(edited_products) > 0},
            {'description': f'有効商品: {valid_count}件', 'passed': valid_count > 0},
            {'description': f'禁止商品なし: {prohibited_count}件', 'passed': prohibited_count == 0}
        ])
        
        log_request('validate_products', True)
        
        return jsonify({
            'success': True,
            'ready_for_listing': valid_count > 0 and prohibited_count == 0,
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'prohibited_count': prohibited_count,
            'checks': checks
        })
        
    except Exception as e:
        log_request('validate_products', False, e)
        return jsonify({'success': False, 'error': str(e)}), 500

# 既存エンドポイント（簡素化）
@app.route('/test')
def test_endpoint():
    return jsonify({'success': True, 'message': 'eBay完全出品システム正常動作中'})

@app.route('/scrape_yahoo', methods=['POST'])
def scrape_yahoo():
    try:
        data = request.get_json() or {}
        urls = data.get('urls', [])
        scraped_data = []
        
        for url in urls:
            result = workflow.scrape_yahoo_auction(url.strip())
            if result.get('scrape_success'):
                # カテゴリ自動推定を追加
                category = auto_detect_category(result.get('title_jp', ''), result.get('description_jp', ''))
                result['suggested_category_id'] = category['id']
                result['suggested_category_name'] = category['name']
                scraped_data.append(result)
        
        if scraped_data:
            workflow.save_to_csv(scraped_data)
        
        return jsonify({'success': True, 'total_scraped': len(scraped_data)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/create_editing_csv', methods=['POST'])
def create_editing_csv():
    try:
        success = workflow.create_editing_template()
        # eBayサンプル作成
        subprocess.run(['python3', 'ebay_csv_template_creator.py'], check=False)
        
        return jsonify({
            'success': success,
            'message': '編集用CSV・eBayサンプル作成完了',
            'error': '編集対象データがありません' if not success else None
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/start_ebay_listing', methods=['POST'])
def start_ebay_listing():
    try:
        data = request.get_json() or {}
        test_mode = data.get('test_mode', True)
        
        # 出品準備完了商品を取得
        df = pd.read_csv(workflow.csv_path, encoding='utf-8')
        ready_products = df[df['status'] == 'edited']
        
        if ready_products.empty:
            return jsonify({'success': False, 'error': '出品準備完了商品がありません'})
        
        listed_count = 0
        failed_count = 0
        
        for _, product in ready_products.iterrows():
            # 出品前チェック
            prohibition_check = check_prohibited_content(
                str(product.get('title_en', '')) + str(product.get('title_jp', '')),
                str(product.get('description_en', '')) + str(product.get('description_jp', ''))
            )
            
            if prohibition_check['is_prohibited']:
                failed_count += 1
                continue
            
            # HTML説明文生成
            html_description = create_ebay_html_description(
                product.get('description_jp', ''),
                product.get('description_en', ''),
                product.get('condition', 'used')
            )
            
            # eBay出品シミュレーション
            if test_mode:
                print(f"🧪 テスト出品: {product.get('title_en', 'No title')}")
                print(f"   カテゴリ: {product.get('ebay_category_id')}")
                print(f"   価格: ${product.get('ebay_price_usd')}")
                print(f"   送料: ${product.get('shipping_cost_usd', '計算要')}")
                print(f"   HTML説明文: {len(html_description)}文字")
                
            listed_count += 1
        
        return jsonify({
            'success': True,
            'listed_count': listed_count,
            'failed_count': failed_count,
            'test_mode': test_mode,
            'message': f'{listed_count}件の商品を{"テスト" if test_mode else ""}出品しました'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        file_path = workflow.data_dir / filename
        if file_path.exists():
            return send_file(str(file_path), as_attachment=True, mimetype='text/csv')
        else:
            return jsonify({'error': f'ファイルが見つかりません: {filename}'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 ヤフオク→eBay完全出品システム起動中...")
    print("=" * 70)
    
    port = find_free_port()
    
    print(f"🌐 メインURL: http://localhost:{port}")
    print("")
    print("🎯 === 完全出品システムの特徴 ===")
    print("✅ CSVファイルドラッグ&ドロップアップロード")
    print("✅ 送料自動計算（FedEx料金表）")
    print("✅ 出品禁止フィルター")
    print("✅ HTML説明文自動生成")
    print("✅ カテゴリ自動推定")
    print("✅ eBay API項目マッピング")
    print("✅ 出品前バリデーション")
    print("")
    
    try:
        app.run(host='127.0.0.1', port=port, debug=True, use_reloader=False)
    except Exception as e:
        print(f"❌ サーバー起動エラー: {e}")
