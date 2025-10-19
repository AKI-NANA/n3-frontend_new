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
