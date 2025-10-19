#!/usr/bin/env python3
"""
送料データ自動処理システム
あらゆる形式の送料データをデータベース用SQLに変換
"""

import os
import pandas as pd
import re
import json
from pathlib import Path

class ShippingDataProcessor:
    def __init__(self, data_dir="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/09_shipping/data"):
        self.data_dir = Path(data_dir)
        self.processed_data = []
        
    def process_all_files(self):
        """data フォルダ内の全ファイルを自動処理"""
        print("🤖 送料データ自動処理開始...")
        
        for file_path in self.data_dir.glob("*"):
            if file_path.is_file():
                print(f"📁 処理中: {file_path.name}")
                self.process_single_file(file_path)
        
        self.generate_sql()
        print("✅ 全ファイル処理完了!")
    
    def process_single_file(self, file_path):
        """単一ファイルの処理"""
        extension = file_path.suffix.lower()
        
        if extension == '.csv':
            self.process_csv(file_path)
        elif extension in ['.xlsx', '.xls']:
            self.process_excel(file_path)
        elif extension == '.pdf':
            self.process_pdf(file_path)
        elif extension in ['.txt', '.md']:
            self.process_text(file_path)
        else:
            print(f"⚠️ 未対応形式: {extension}")
    
    def process_csv(self, file_path):
        """CSV自動処理"""
        try:
            # 複数の区切り文字で試行
            for sep in [',', '\t', ';', '|']:
                try:
                    df = pd.read_csv(file_path, sep=sep, encoding='utf-8')
                    if len(df.columns) > 1:
                        break
                except:
                    continue
            
            # ヘッダー正規化
            df.columns = self.normalize_headers(df.columns)
            
            # 業者名推定
            carrier = self.detect_carrier(file_path.name)
            
            # データ変換
            for _, row in df.iterrows():
                self.extract_shipping_data(row, carrier)
                
        except Exception as e:
            print(f"❌ CSV処理エラー: {e}")
    
    def process_excel(self, file_path):
        """Excel自動処理"""
        try:
            # 全シート読み込み
            excel_file = pd.ExcelFile(file_path)
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                
                # 業者名推定（シート名 or ファイル名）
                carrier = self.detect_carrier(sheet_name) or self.detect_carrier(file_path.name)
                
                # ヘッダー正規化
                df.columns = self.normalize_headers(df.columns)
                
                # データ変換
                for _, row in df.iterrows():
                    self.extract_shipping_data(row, carrier)
                    
        except Exception as e:
            print(f"❌ Excel処理エラー: {e}")
    
    def process_pdf(self, file_path):
        """PDF自動処理（AI解析）"""
        print(f"🔍 PDF解析中: {file_path.name}")
        
        # PDFテキスト抽出（疑似実装）
        text_content = self.extract_pdf_text(file_path)
        
        # 料金表パターン検出
        rate_patterns = self.detect_rate_patterns(text_content)
        
        # 業者名推定
        carrier = self.detect_carrier(file_path.name)
        
        # 構造化データ変換
        for pattern in rate_patterns:
            self.convert_pattern_to_data(pattern, carrier)
    
    def normalize_headers(self, headers):
        """ヘッダー名正規化"""
        normalized = []
        for header in headers:
            header = str(header).lower().strip()
            
            # 重量関連
            if any(keyword in header for keyword in ['重量', 'weight', 'kg', 'gram']):
                if 'から' in header or 'from' in header:
                    normalized.append('weight_from')
                elif 'まで' in header or 'to' in header:
                    normalized.append('weight_to')
                else:
                    normalized.append('weight')
            
            # 料金関連
            elif any(keyword in header for keyword in ['料金', 'price', '価格', '円', 'yen', 'jpy']):
                normalized.append('price')
            
            # 配送先関連
            elif any(keyword in header for keyword in ['配送先', 'destination', '国', 'country', 'zone']):
                normalized.append('destination')
            
            # サービス関連
            elif any(keyword in header for keyword in ['サービス', 'service', 'method']):
                normalized.append('service')
            
            else:
                normalized.append(header)
        
        return normalized
    
    def detect_carrier(self, text):
        """業者名自動検出"""
        text = text.lower()
        
        if any(keyword in text for keyword in ['emoji', 'エモジ']):
            return 'EMOJI'
        elif any(keyword in text for keyword in ['cpass', 'シーパス']):
            return 'CPASS'
        elif any(keyword in text for keyword in ['jppost', '日本郵便', 'japan post']):
            return 'JPPOST'
        elif any(keyword in text for keyword in ['fedex']):
            return 'FEDEX'
        elif any(keyword in text for keyword in ['ups']):
            return 'UPS'
        elif any(keyword in text for keyword in ['dhl']):
            return 'DHL'
        
        return 'UNKNOWN'
    
    def extract_shipping_data(self, row, carrier):
        """行データから送料情報抽出"""
        try:
            # 重量範囲抽出
            weight_from, weight_to = self.parse_weight_range(row)
            
            # 料金抽出
            price = self.parse_price(row)
            
            # 配送先ゾーン決定
            zone = self.determine_zone(row)
            
            # サービス名特定
            service = self.detect_service(row, carrier)
            
            if all([weight_from, weight_to, price, zone, service]):
                self.processed_data.append({
                    'carrier_code': carrier,
                    'service_code': service,
                    'destination_zone': zone,
                    'weight_from_g': int(weight_from * 1000),  # kg → g
                    'weight_to_g': int(weight_to * 1000),
                    'price_jpy': float(price),
                    'data_source': 'auto_processed_2025'
                })
                
        except Exception as e:
            print(f"⚠️ データ抽出エラー: {e}")
    
    def parse_weight_range(self, row):
        """重量範囲解析"""
        # 実装: 様々な重量表記から数値抽出
        # 例: "0.5kg-1.0kg", "500g以下", "1-2kg" など
        return 0.5, 1.0  # サンプル
    
    def parse_price(self, row):
        """料金解析"""
        # 実装: 様々な価格表記から数値抽出
        # 例: "¥2,800", "2800円", "$28.00" など
        return 2800  # サンプル
    
    def determine_zone(self, row):
        """配送先ゾーン決定"""
        # 実装: 国名・地域名からゾーン判定
        return 'zone1'  # サンプル
    
    def detect_service(self, row, carrier):
        """サービス名特定"""
        # 実装: 業者・サービス名から標準コード生成
        if carrier == 'EMOJI':
            return 'FEDEX_INTL_PRIORITY'
        return 'STANDARD'  # サンプル
    
    def generate_sql(self):
        """SQL生成"""
        if not self.processed_data:
            print("❌ 処理可能なデータが見つかりませんでした")
            return
        
        sql_file = self.data_dir / "auto_generated_shipping_data.sql"
        
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write("-- 自動生成された送料データ投入SQL\n")
            f.write("-- 生成日時: " + pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S') + "\n\n")
            
            f.write("-- 既存の自動生成データ削除\n")
            f.write("DELETE FROM real_shipping_rates WHERE data_source LIKE 'auto_processed_%';\n\n")
            
            f.write("-- 新しい送料データ投入\n")
            f.write("INSERT INTO real_shipping_rates (carrier_code, service_code, destination_zone, weight_from_g, weight_to_g, price_jpy, data_source) VALUES\n")
            
            values = []
            for data in self.processed_data:
                values.append(f"('{data['carrier_code']}', '{data['service_code']}', '{data['destination_zone']}', {data['weight_from_g']}, {data['weight_to_g']}, {data['price_jpy']}, '{data['data_source']}')")
            
            f.write(',\n'.join(values) + ';\n\n')
            
            f.write(f"-- 投入件数: {len(self.processed_data)} 件\n")
            
        print(f"✅ SQL生成完了: {sql_file}")
        print(f"📊 処理件数: {len(self.processed_data)} 件")
        
        return sql_file

# 使用例
if __name__ == "__main__":
    processor = ShippingDataProcessor()
    processor.process_all_files()
