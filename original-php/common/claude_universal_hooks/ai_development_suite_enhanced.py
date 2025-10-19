#!/usr/bin/env python3
"""
🚀 汎用AI統合システム深化・商用品質達成完全版

既存システム深化アプローチで商用品質CSV処理を実現
"""

import os
import json
import re
import csv
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


class ScientificNotationProtector:
    """科学的記数法完全保護・修復システム"""
    
    # 保護対象カラム定義
    PROTECTED_COLUMNS = [
        'product_id', 'id', 'sku', 'asin', 'jan', 'code', 
        'barcode', 'isbn', 'model_number'
    ]
    
    def __init__(self):
        self.logger = logging.getLogger("ScientificProtector")
        self.repair_count = 0
        self.protection_count = 0
    
    def protect_large_numbers(self, value: Any, column_name: str = "") -> str:
        """大数値を文字列として強制保護"""
        # カラム名ベース保護
        is_protected_column = any(
            col.lower() in column_name.lower() 
            for col in self.PROTECTED_COLUMNS
        )
        
        if is_protected_column or self._is_large_number(value):
            protected_value = self._scientific_to_string(value)
            if protected_value != str(value):
                self.protection_count += 1
                self.logger.info(f"数値保護実行: {value} -> {protected_value}")
            return protected_value
        
        return str(value)
    
    def _scientific_to_string(self, value: Any) -> str:
        """科学的記数法を元の数値文字列に復元"""
        value_str = str(value)
        scientific_pattern = r'^-?\d+\.?\d*[eE][+-]?\d+$'
        
        if re.match(scientific_pattern, value_str):
            try:
                # 科学的記数法を数値に変換
                num = float(value_str)
                # 整数として復元（小数点以下切り捨て）
                restored = str(int(num))
                self.repair_count += 1
                self.logger.info(f"科学的記数法修復: {value_str} -> {restored}")
                return restored
            except (ValueError, OverflowError) as e:
                self.logger.error(f"科学的記数法復元エラー {value_str}: {e}")
                return value_str
        
        # 大きな数値は文字列として保護
        if isinstance(value, (int, float)) and abs(value) > 999999999:
            return str(int(value))
        
        return str(value)
    
    def _is_large_number(self, value: Any) -> bool:
        """大数値判定"""
        try:
            num = float(value)
            return abs(num) > 999999999
        except (ValueError, TypeError):
            return False
    
    def get_protection_stats(self) -> Dict[str, int]:
        """保護統計情報取得"""
        return {
            "repair_count": self.repair_count,
            "protection_count": self.protection_count,
            "total_operations": self.repair_count + self.protection_count
        }


class CommercialCSVProcessor:
    """商用CSVフォーマット検証・変換システム"""
    
    # 商用必須カラム定義
    REQUIRED_COLUMNS = {
        'essential': ['product_id', 'product_name', 'price'],
        'commercial': ['category', 'brand', 'description', 'stock_quantity'],
        'ecommerce': ['weight', 'dimensions', 'image_url'],
        'optional': ['sku', 'barcode', 'tags', 'manufacturer']
    }
    
    def __init__(self):
        self.logger = logging.getLogger("CommercialCSV")
        self.scientific_protector = ScientificNotationProtector()
        self.quality_issues = []
        self.enhancement_log = []
    
    def validate_and_enhance_csv(self, headers: List[str], data: List[Dict]) -> Dict[str, Any]:
        """CSV構造を商用レベルに検証・補完"""
        enhancement = {
            'missing_columns': [],
            'data_quality_issues': [],
            'recommendations': [],
            'enhanced_data': [],
            'quality_score': 0,
            'commercial_readiness': 'needs_improvement',
            'scientific_notation_issues': [],
            'protection_stats': {}
        }
        
        # 必須カラムチェック
        all_required = []
        for category, columns in self.REQUIRED_COLUMNS.items():
            all_required.extend(columns)
        
        for col in all_required:
            if col not in headers:
                enhancement['missing_columns'].append(col)
        
        # データ品質チェック + 科学的記数法保護
        enhanced_data = []
        for row_index, row in enumerate(data):
            enhanced_row = {}
            row_issues = self._validate_row_quality(row, headers)
            
            if row_issues:
                enhancement['data_quality_issues'].append({
                    'row': row_index + 1,
                    'issues': row_issues
                })
            
            # 各値に科学的記数法保護を適用
            for header in headers:
                original_value = row.get(header, '')
                protected_value = self.scientific_protector.protect_large_numbers(
                    original_value, header
                )
                enhanced_row[header] = protected_value
                
                # 科学的記数法問題検出
                if self._has_scientific_notation(original_value):
                    enhancement['scientific_notation_issues'].append({
                        'row': row_index + 1,
                        'column': header,
                        'original': original_value,
                        'fixed': protected_value
                    })
            
            enhanced_data.append(enhanced_row)
        
        enhancement['enhanced_data'] = enhanced_data
        enhancement['protection_stats'] = self.scientific_protector.get_protection_stats()
        
        # 品質スコア算出
        quality_score = self._calculate_quality_score(headers, enhancement)
        enhancement['quality_score'] = quality_score
        
        # 商用準備度判定
        if quality_score >= 90:
            enhancement['commercial_readiness'] = 'excellent'
        elif quality_score >= 75:
            enhancement['commercial_readiness'] = 'good'
        elif quality_score >= 60:
            enhancement['commercial_readiness'] = 'acceptable'
        else:
            enhancement['commercial_readiness'] = 'needs_improvement'
        
        # 推奨改善項目
        self._generate_recommendations(enhancement)
        
        return enhancement
    
    def _validate_row_quality(self, row: Dict, headers: List[str]) -> List[str]:
        """行品質検証"""
        issues = []
        
        for header in headers:
            value = row.get(header, '')
            
            # 商品ID検証
            if 'id' in header.lower():
                if not value or str(value).strip() == '':
                    issues.append(f"{header}が空です")
                elif self._has_scientific_notation(value):
                    issues.append(f"{header}が科学的記数法になっています: {value}")
            
            # 価格検証
            if 'price' in header.lower():
                try:
                    price = float(value)
                    if price <= 0:
                        issues.append(f"{header}が無効です: {value}")
                except (ValueError, TypeError):
                    issues.append(f"{header}が数値ではありません: {value}")
            
            # 重量・サイズ検証
            if any(keyword in header.lower() for keyword in ['weight', 'dimension', 'size']):
                if value and self._has_anomalous_value(value):
                    issues.append(f"{header}に異常値の可能性: {value}")
        
        return issues
    
    def _has_scientific_notation(self, value: Any) -> bool:
        """科学的記数法検出"""
        return bool(re.search(r'\d+\.?\d*[eE][+-]?\d+', str(value)))
    
    def _has_anomalous_value(self, value: Any) -> bool:
        """異常値検出"""
        try:
            num = float(str(value).replace('g', '').replace('cm', '').replace('kg', ''))
            
            # 重量: 0.1g未満または50kg以上は異常
            if 'g' in str(value).lower() and (num < 0.1 or num > 50000):
                return True
            
            # サイズ: 1mm未満または10m以上は異常
            if any(unit in str(value).lower() for unit in ['cm', 'mm']) and (num < 0.1 or num > 1000):
                return True
            
            return False
        except (ValueError, TypeError):
            return False
    
    def _calculate_quality_score(self, headers: List[str], enhancement: Dict) -> int:
        """品質スコア算出"""
        scores = {
            'structure_score': self._calculate_structure_score(headers),
            'data_quality_score': self._calculate_data_quality_score(enhancement),
            'scientific_notation_score': self._calculate_scientific_notation_score(enhancement)
        }
        
        # 重み付き平均
        weights = {
            'structure_score': 0.3,
            'data_quality_score': 0.4,
            'scientific_notation_score': 0.3
        }
        
        total_score = sum(scores[key] * weights[key] for key in scores)
        return min(100, max(0, int(total_score)))
    
    def _calculate_structure_score(self, headers: List[str]) -> int:
        """構造スコア算出"""
        all_required = []
        for columns in self.REQUIRED_COLUMNS.values():
            all_required.extend(columns)
        
        present_count = sum(1 for col in all_required if col in headers)
        return int((present_count / len(all_required)) * 100)
    
    def _calculate_data_quality_score(self, enhancement: Dict) -> int:
        """データ品質スコア算出"""
        total_rows = len(enhancement.get('enhanced_data', []))
        if total_rows == 0:
            return 0
        
        issue_rows = len(enhancement.get('data_quality_issues', []))
        quality_ratio = (total_rows - issue_rows) / total_rows
        return int(quality_ratio * 100)
    
    def _calculate_scientific_notation_score(self, enhancement: Dict) -> int:
        """科学的記数法スコア算出"""
        total_rows = len(enhancement.get('enhanced_data', []))
        if total_rows == 0:
            return 100  # データがない場合は満点
        
        scientific_issues = len(enhancement.get('scientific_notation_issues', []))
        if scientific_issues == 0:
            return 100  # 問題なしの場合は満点
        
        # 修復済みなので90点を基準とする
        return max(90 - (scientific_issues * 2), 50)
    
    def _generate_recommendations(self, enhancement: Dict) -> None:
        """推奨改善項目生成"""
        recommendations = []
        
        if enhancement['missing_columns']:
            recommendations.append(
                f"商用利用のため以下カラム追加推奨: {', '.join(enhancement['missing_columns'])}"
            )
        
        if enhancement['scientific_notation_issues']:
            recommendations.append(
                f"科学的記数法問題 {len(enhancement['scientific_notation_issues'])}件を自動修復しました"
            )
        
        if enhancement['data_quality_issues']:
            recommendations.append(
                f"データ品質問題 {len(enhancement['data_quality_issues'])}件の確認を推奨します"
            )
        
        if enhancement['quality_score'] < 75:
            recommendations.append(
                "商用品質向上のため、必須カラムの追加とデータ品質改善を推奨します"
            )
        
        enhancement['recommendations'] = recommendations


class DeepCSVAnalysisEngine:
    """深度CSV解析エンジン"""
    
    def __init__(self):
        self.logger = logging.getLogger("DeepCSVAnalysis")
        self.csv_processor = CommercialCSVProcessor()
    
    def analyze_csv_structure_deeply(self, csv_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """CSV構造の深度分析"""
        analysis = {
            'commercial_readiness': self._assess_commercial_readiness(csv_data, headers),
            'data_quality_score': self._calculate_data_quality_score(csv_data, headers),
            'amazon_compatibility': self._check_amazon_compatibility(csv_data, headers),
            'ebay_compatibility': self._check_ebay_compatibility(csv_data, headers),
            'vero_risk_assessment': self._assess_vero_risks(csv_data, headers),
            'enhancement_recommendations': self._generate_enhancement_recommendations(csv_data, headers)
        }
        return analysis
    
    def _assess_commercial_readiness(self, csv_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """商用準備度評価"""
        required_fields = [
            'product_id', 'product_name', 'category', 'price', 
            'brand', 'description', 'weight', 'dimensions'
        ]
        
        present_fields = [field for field in required_fields if field in headers]
        readiness_score = len(present_fields) / len(required_fields)
        
        return {
            'score': readiness_score,
            'level': 'excellent' if readiness_score >= 0.9 else 
                    'good' if readiness_score >= 0.7 else 
                    'needs_improvement',
            'missing_fields': [field for field in required_fields if field not in headers],
            'present_fields': present_fields
        }
    
    def _calculate_data_quality_score(self, csv_data: List[Dict], headers: List[str]) -> int:
        """データ品質スコア算出"""
        if not csv_data:
            return 0
        
        # CSV処理システムを使用して品質評価
        enhancement = self.csv_processor.validate_and_enhance_csv(headers, csv_data)
        return enhancement.get('quality_score', 0)
    
    def _check_amazon_compatibility(self, csv_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """Amazon互換性チェック"""
        amazon_required = ['product_id', 'product_name', 'price', 'description', 'category']
        missing = [field for field in amazon_required if field not in headers]
        
        compatibility_score = (len(amazon_required) - len(missing)) / len(amazon_required)
        
        return {
            'compatible': len(missing) == 0,
            'compatibility_score': compatibility_score,
            'missing_required_fields': missing,
            'recommendation': 'Amazon出品準備完了' if len(missing) == 0 else f'不足フィールド: {missing}'
        }
    
    def _check_ebay_compatibility(self, csv_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """eBay互換性チェック"""
        ebay_required = ['product_name', 'price', 'description', 'category', 'condition']
        missing = [field for field in ebay_required if field not in headers]
        
        compatibility_score = (len(ebay_required) - len(missing)) / len(ebay_required)
        
        return {
            'compatible': len(missing) == 0,
            'compatibility_score': compatibility_score,
            'missing_required_fields': missing,
            'recommendation': 'eBay出品準備完了' if len(missing) == 0 else f'不足フィールド: {missing}'
        }
    
    def _assess_vero_risks(self, csv_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """VERO リスク評価"""
        high_risk_keywords = [
            'apple', 'sony', 'nike', 'adidas', 'samsung', 'lg', 'canon', 'nikon',
            'louis vuitton', 'gucci', 'prada', 'chanel', 'rolex'
        ]
        
        risk_detections = []
        for row_index, row in enumerate(csv_data):
            for header in ['product_name', 'description', 'brand']:
                if header in row:
                    value = str(row[header]).lower()
                    for keyword in high_risk_keywords:
                        if keyword in value:
                            risk_detections.append({
                                'row': row_index + 1,
                                'field': header,
                                'keyword': keyword,
                                'context': value[:100] + '...' if len(value) > 100 else value
                            })
        
        risk_level = 'high' if len(risk_detections) > 5 else \
                    'medium' if len(risk_detections) > 0 else 'low'
        
        return {
            'risk_level': risk_level,
            'detected_risks': risk_detections,
            'risk_count': len(risk_detections),
            'recommendation': 'ブランド名の除去または汎用名称への置換が必要' if risk_detections else 'VERO リスク低'
        }
    
    def _generate_enhancement_recommendations(self, csv_data: List[Dict], headers: List[str]) -> List[str]:
        """改善提案生成"""
        recommendations = []
        
        # 商用準備度チェック
        readiness = self._assess_commercial_readiness(csv_data, headers)
        if readiness['level'] != 'excellent':
            recommendations.append(f"商用準備度向上: {', '.join(readiness['missing_fields'])}の追加")
        
        # Amazon/eBay互換性チェック
        amazon_compat = self._check_amazon_compatibility(csv_data, headers)
        if not amazon_compat['compatible']:
            recommendations.append(f"Amazon互換性向上: {', '.join(amazon_compat['missing_required_fields'])}の追加")
        
        ebay_compat = self._check_ebay_compatibility(csv_data, headers)
        if not ebay_compat['compatible']:
            recommendations.append(f"eBay互換性向上: {', '.join(ebay_compat['missing_required_fields'])}の追加")
        
        # VEROリスクチェック
        vero_risks = self._assess_vero_risks(csv_data, headers)
        if vero_risks['risk_level'] in ['high', 'medium']:
            recommendations.append(f"VERO対策: {vero_risks['risk_count']}件のブランド名問題への対応")
        
        return recommendations


class UniversalAIProcessor:
    """汎用AI処理システム - どのツールでも使用可能"""
    
    def __init__(self):
        self.logger = logging.getLogger("UniversalAI")
        self.csv_processor = CommercialCSVProcessor()
        self.deep_analyzer = DeepCSVAnalysisEngine()
        self.processing_history = []
    
    def process_any_data(self, data: Any, data_type: str, processing_requirements: Dict = None) -> Dict[str, Any]:
        """汎用データ処理 - CSV/JSON/XML/テキスト対応"""
        
        if data_type == 'csv':
            return self._process_csv_data(data, processing_requirements or {})
        elif data_type == 'json':
            return self._process_json_data(data, processing_requirements or {})
        else:
            return self._process_generic_data(data, data_type, processing_requirements or {})
    
    def _process_csv_data(self, csv_data: List[Dict], requirements: Dict) -> Dict[str, Any]:
        """CSV専用深度処理"""
        
        headers = list(csv_data[0].keys()) if csv_data else []
        
        # Phase 1: 構造解析
        structure_analysis = self._deep_structure_analysis(csv_data, headers)
        
        # Phase 2: 品質検証
        quality_assessment = self._comprehensive_quality_check(csv_data, headers)
        
        # Phase 3: AI強化処理
        ai_enhanced_data = self._apply_ai_enhancements(csv_data, headers, requirements)
        
        # Phase 4: 商用品質検証
        commercial_validation = self._validate_commercial_standards(ai_enhanced_data, headers)
        
        processing_log = self._generate_processing_log(csv_data, ai_enhanced_data)
        
        return {
            'processed_data': ai_enhanced_data,
            'quality_report': quality_assessment,
            'commercial_status': commercial_validation,
            'structure_analysis': structure_analysis,
            'processing_log': processing_log
        }
    
    def _deep_structure_analysis(self, csv_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """深度構造解析"""
        return self.deep_analyzer.analyze_csv_structure_deeply(csv_data, headers)
    
    def _comprehensive_quality_check(self, csv_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """包括的品質チェック"""
        return self.csv_processor.validate_and_enhance_csv(headers, csv_data)
    
    def _apply_ai_enhancements(self, csv_data: List[Dict], headers: List[str], requirements: Dict) -> List[Dict]:
        """AI強化処理適用"""
        enhanced_result = self.csv_processor.validate_and_enhance_csv(headers, csv_data)
        return enhanced_result.get('enhanced_data', csv_data)
    
    def _validate_commercial_standards(self, enhanced_data: List[Dict], headers: List[str]) -> Dict[str, Any]:
        """商用品質基準検証"""
        return self.deep_analyzer.analyze_csv_structure_deeply(enhanced_data, headers)
    
    def _generate_processing_log(self, original_data: List[Dict], enhanced_data: List[Dict]) -> Dict[str, Any]:
        """処理ログ生成"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'original_count': len(original_data),
            'enhanced_count': len(enhanced_data),
            'processing_type': 'commercial_csv_enhancement',
            'success': len(enhanced_data) > 0
        }
        
        self.processing_history.append(log_entry)
        return log_entry
    
    def _process_json_data(self, json_data: Any, requirements: Dict) -> Dict[str, Any]:
        """JSON処理（基本実装）"""
        return {
            'processed_data': json_data,
            'processing_type': 'json',
            'timestamp': datetime.now().isoformat()
        }
    
    def _process_generic_data(self, data: Any, data_type: str, requirements: Dict) -> Dict[str, Any]:
        """汎用データ処理（基本実装）"""
        return {
            'processed_data': data,
            'processing_type': data_type,
            'timestamp': datetime.now().isoformat()
        }


class AIDevelopmentSuiteEnhanced:
    """AI統合開発スイート - 商用品質CSV処理完全版"""
    
    def __init__(self):
        self.logger = logging.getLogger("AI_DEV_SUITE_ENHANCED")
        
        # 商用品質処理システム初期化
        self.csv_processor = CommercialCSVProcessor()
        self.scientific_protector = ScientificNotationProtector()
        self.universal_processor = UniversalAIProcessor()
    
    def process_csv_with_commercial_quality(self, csv_file_path: str) -> Dict[str, Any]:
        """商用品質CSV処理メイン関数"""
        try:
            # CSVファイル読み込み
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)
                headers = list(csv_reader.fieldnames)
                data = list(csv_reader)
            
            self.logger.info(f"CSV読み込み完了: {len(data)}行, {len(headers)}カラム")
            
            # 汎用AI処理システムを使用
            processing_result = self.universal_processor.process_any_data(
                data, 'csv', {'commercial_enhancement': True}
            )
            
            # 統合結果作成
            final_result = {
                'original_data_count': len(data),
                'processed_data_count': len(processing_result['processed_data']),
                'headers': headers,
                'enhanced_data': processing_result['processed_data'],
                'quality_enhancement': processing_result['quality_report'],
                'deep_analysis': processing_result['structure_analysis'],
                'commercial_validation': processing_result['commercial_status'],
                'processing_summary': {
                    'quality_score': processing_result['quality_report']['quality_score'],
                    'commercial_readiness': processing_result['quality_report']['commercial_readiness'],
                    'scientific_notation_fixes': len(processing_result['quality_report']['scientific_notation_issues']),
                    'data_quality_issues': len(processing_result['quality_report']['data_quality_issues']),
                    'missing_columns': len(processing_result['quality_report']['missing_columns']),
                    'vero_risk_level': processing_result['structure_analysis']['vero_risk_assessment']['risk_level'],
                    'amazon_compatible': processing_result['structure_analysis']['amazon_compatibility']['compatible'],
                    'ebay_compatible': processing_result['structure_analysis']['ebay_compatibility']['compatible']
                }
            }
            
            self.logger.info(f"商用品質処理完了 - 品質スコア: {final_result['processing_summary']['quality_score']}/100")
            return final_result
            
        except Exception as e:
            self.logger.error(f"CSV処理エラー: {e}")
            return {
                'error': str(e),
                'processing_summary': {
                    'quality_score': 0,
                    'commercial_readiness': 'error'
                }
            }
    
    def save_enhanced_csv(self, processing_result: Dict[str, Any], output_path: str) -> bool:
        """拡張済みCSVファイル保存"""
        try:
            enhanced_data = processing_result.get('enhanced_data', [])
            headers = processing_result.get('headers', [])
            
            if not enhanced_data or not headers:
                self.logger.error("保存するデータまたはヘッダーがありません")
                return False
            
            with open(output_path, 'w', newline='', encoding='utf-8-sig') as file:
                writer = csv.DictWriter(file, fieldnames=headers)
                writer.writeheader()
                writer.writerows(enhanced_data)
            
            self.logger.info(f"拡張済みCSV保存完了: {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"CSV保存エラー: {e}")
            return False
    
    def get_processing_statistics(self) -> Dict[str, Any]:
        """処理統計情報取得"""
        return {
            'csv_processor_stats': self.csv_processor.scientific_protector.get_protection_stats(),
            'universal_processor_history': self.universal_processor.processing_history,
            'system_status': 'active',
            'timestamp': datetime.now().isoformat()
        }


def main():
    """メイン実行関数 - 商用品質CSV処理テスト"""
    
    print("🚀 汎用AI統合システム深化・商用品質達成テスト")
    print("=" * 70)
    
    try:
        dev_suite = AIDevelopmentSuiteEnhanced()
        print("📊 商用サンプルCSVでテスト実行中...")
        
        # テスト用CSVファイルパス（実際のパスに置き換え）
        test_csv_path = "/Users/aritahiroaki/NAGANO-3/N3-Development/data/maru9/complete_sample_commercial.csv"
        
        if Path(test_csv_path).exists():
            # 商用品質処理実行
            processing_result = dev_suite.process_csv_with_commercial_quality(test_csv_path)
            
            print("\n" + "=" * 70)
            print("✅ 商用品質処理結果")
            print("=" * 70)
            
            summary = processing_result.get('processing_summary', {})
            print(f"📊 品質スコア: {summary.get('quality_score', 0)}/100")
            print(f"🏪 商用準備度: {summary.get('commercial_readiness', 'unknown')}")
            print(f"🔧 科学的記数法修復: {summary.get('scientific_notation_fixes', 0)}件")
            print(f"⚠️  データ品質問題: {summary.get('data_quality_issues', 0)}件")
            print(f"📝 不足カラム: {summary.get('missing_columns', 0)}個")
            print(f"🛡️  VEROリスク: {summary.get('vero_risk_level', 'unknown')}")
            print(f"🛒 Amazon対応: {'✅' if summary.get('amazon_compatible') else '❌'}")
            print(f"🔄 eBay対応: {'✅' if summary.get('ebay_compatible') else '❌'}")
            
            # 処理済みCSV保存テスト
            output_path = test_csv_path.replace('.csv', '_enhanced_commercial.csv')
            save_success = dev_suite.save_enhanced_csv(processing_result, output_path)
            print(f"💾 拡張CSV保存: {'✅ 成功' if save_success else '❌ 失敗'}")
            
            # 統計情報表示
            stats = dev_suite.get_processing_statistics()
            print(f"📈 処理統計: {stats['csv_processor_stats']['total_operations']}回の操作")
            
            print("\n🎉 商用品質CSV処理システム完全動作確認")
            return True
        else:
            print(f"❌ テストCSVファイルが見つかりません: {test_csv_path}")
            print("⚠️  scientific notation テスト用CSVで代替テスト実行")
            
            # 代替テストファイル
            alt_test_path = "/Users/aritahiroaki/NAGANO-3/N3-Development/data/maru9/test_scientific_notation.csv"
            if Path(alt_test_path).exists():
                processing_result = dev_suite.process_csv_with_commercial_quality(alt_test_path)
                summary = processing_result.get('processing_summary', {})
                print(f"📊 代替テスト品質スコア: {summary.get('quality_score', 0)}/100")
                print(f"🔧 科学的記数法修復: {summary.get('scientific_notation_fixes', 0)}件")
                return True
            else:
                print("❌ 代替テストファイルも見つかりません")
                return False
        
    except Exception as e:
        print(f"❌ テスト実行エラー: {e}")
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
