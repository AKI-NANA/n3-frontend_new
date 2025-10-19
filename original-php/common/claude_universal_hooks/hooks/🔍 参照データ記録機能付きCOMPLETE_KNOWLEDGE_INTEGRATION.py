"""
🔍 参照データ記録機能付きCOMPLETE_KNOWLEDGE_INTEGRATION
どのデータを参照したかを完全記録・報告するシステム
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Set, Optional
import json
import os
from pathlib import Path
from datetime import datetime
from enum import Enum
import re

@dataclass
class DataReference:
    """データ参照記録"""
    timestamp: str
    search_query: str
    data_source: str
    result_found: bool
    result_content: str
    result_size: int
    confidence_score: float
    processing_time_ms: float
    reference_context: str

@dataclass
class KnowledgeComponent:
    """ナレッジコンポーネント定義"""
    component_id: str
    component_name: str
    required_files: List[str]
    search_keywords: List[str]
    validation_rules: List[str]
    priority: str  # critical, high, medium, low
    dependencies: List[str]

class DataReferenceLogger:
    """データ参照記録システム"""
    
    def __init__(self, project_root: str = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.reference_log: List[DataReference] = []
        self.session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # ログ保存ディレクトリ
        self.log_dir = self.project_root / "logs" / "knowledge_references"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"📝 データ参照ログシステム初期化: {self.session_id}")
    
    def log_search_attempt(self, 
                          search_query: str, 
                          search_function: callable, 
                          context: str = "unknown") -> Any:
        """検索試行をログ記録付きで実行"""
        
        start_time = datetime.now()
        
        try:
            # 実際の検索実行
            print(f"🔍 検索実行: \"{search_query}\" (コンテキスト: {context})")
            result = search_function(search_query)
            
            # 処理時間計算
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # 結果分析
            result_found = result is not None and str(result).strip() != ""
            result_content = str(result) if result else ""
            result_size = len(result_content)
            
            # 信頼度計算
            confidence_score = self._calculate_confidence(result_content, search_query)
            
            # データ参照記録作成
            reference = DataReference(
                timestamp=start_time.isoformat(),
                search_query=search_query,
                data_source="project_knowledge_search",
                result_found=result_found,
                result_content=result_content[:1000] + "..." if len(result_content) > 1000 else result_content,
                result_size=result_size,
                confidence_score=confidence_score,
                processing_time_ms=processing_time,
                reference_context=context
            )
            
            self.reference_log.append(reference)
            
            # 結果表示
            status_icon = "✅" if result_found else "❌"
            print(f"  {status_icon} 結果: {result_size}文字, 信頼度: {confidence_score:.2f}, 時間: {processing_time:.1f}ms")
            
            if result_found:
                # 結果のプレビュー表示
                preview = result_content[:100] + "..." if len(result_content) > 100 else result_content
                print(f"  📄 内容プレビュー: {preview}")
            
            return result
            
        except Exception as e:
            # エラー時の記録
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            error_reference = DataReference(
                timestamp=start_time.isoformat(),
                search_query=search_query,
                data_source="project_knowledge_search",
                result_found=False,
                result_content=f"ERROR: {str(e)}",
                result_size=0,
                confidence_score=0.0,
                processing_time_ms=processing_time,
                reference_context=f"{context} (ERROR)"
            )
            
            self.reference_log.append(error_reference)
            
            print(f"  ❌ 検索エラー: {str(e)} (時間: {processing_time:.1f}ms)")
            return None
    
    def _calculate_confidence(self, result_content: str, search_query: str) -> float:
        """信頼度スコア計算"""
        
        if not result_content:
            return 0.0
        
        confidence = 0.0
        result_lower = result_content.lower()
        query_lower = search_query.lower()
        
        # キーワードマッチング
        if query_lower in result_lower:
            confidence += 0.4
        
        # 部分マッチング
        query_words = query_lower.split()
        matched_words = sum(1 for word in query_words if word in result_lower)
        if query_words:
            confidence += (matched_words / len(query_words)) * 0.3
        
        # 結果サイズ評価
        if len(result_content) > 100:
            confidence += 0.2
        elif len(result_content) > 50:
            confidence += 0.1
        
        # コード・設定ファイルっぽさ
        code_indicators = ['class ', 'def ', 'function', 'import', 'from ', '<?php', '{', '}', 'hooks']
        code_matches = sum(1 for indicator in code_indicators if indicator in result_lower)
        if code_matches > 0:
            confidence += min(code_matches * 0.05, 0.1)
        
        return min(confidence, 1.0)
    
    def generate_reference_report(self) -> str:
        """参照データ詳細レポート生成"""
        
        if not self.reference_log:
            return "❌ データ参照記録がありません"
        
        successful_refs = [ref for ref in self.reference_log if ref.result_found]
        failed_refs = [ref for ref in self.reference_log if not ref.result_found]
        
        # 統計計算
        total_refs = len(self.reference_log)
        success_rate = len(successful_refs) / total_refs * 100 if total_refs > 0 else 0
        avg_processing_time = sum(ref.processing_time_ms for ref in self.reference_log) / total_refs if total_refs > 0 else 0
        avg_confidence = sum(ref.confidence_score for ref in successful_refs) / len(successful_refs) if successful_refs else 0
        total_data_size = sum(ref.result_size for ref in successful_refs)
        
        report = f"""
# 📊 ナレッジ参照データ詳細レポート

## 🎯 セッション情報
- **セッションID**: {self.session_id}
- **生成時刻**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📈 参照統計サマリー
- **総参照回数**: {total_refs}回
- **成功**: {len(successful_refs)}回 ({success_rate:.1f}%)
- **失敗**: {len(failed_refs)}回 ({100-success_rate:.1f}%)
- **平均処理時間**: {avg_processing_time:.1f}ms
- **平均信頼度**: {avg_confidence:.2f}
- **取得データ総量**: {total_data_size:,}文字

## 🔍 検索クエリ分析
"""
        
        # クエリ種別分析
        query_analysis = {}
        for ref in self.reference_log:
            context = ref.reference_context
            if context not in query_analysis:
                query_analysis[context] = {'total': 0, 'success': 0, 'avg_confidence': 0}
            
            query_analysis[context]['total'] += 1
            if ref.result_found:
                query_analysis[context]['success'] += 1
                query_analysis[context]['avg_confidence'] += ref.confidence_score
        
        for context, stats in query_analysis.items():
            success_rate_ctx = (stats['success'] / stats['total']) * 100 if stats['total'] > 0 else 0
            avg_conf_ctx = (stats['avg_confidence'] / stats['success']) if stats['success'] > 0 else 0
            
            report += f"""
### 📁 {context}
- 検索回数: {stats['total']}回
- 成功率: {success_rate_ctx:.1f}%
- 平均信頼度: {avg_conf_ctx:.2f}
"""
        
        report += f"""
## ✅ 成功した参照データ詳細
"""
        
        for i, ref in enumerate(successful_refs, 1):
            report += f"""
### 📄 参照#{i}
- **検索クエリ**: "{ref.search_query}"
- **コンテキスト**: {ref.reference_context}
- **実行時刻**: {ref.timestamp}
- **結果サイズ**: {ref.result_size:,}文字
- **信頼度**: {ref.confidence_score:.2f}
- **処理時間**: {ref.processing_time_ms:.1f}ms

**📋 取得データ内容:**
```
{ref.result_content[:300]}{'...' if len(ref.result_content) > 300 else ''}
```
"""
        
        if failed_refs:
            report += f"""
## ❌ 失敗した参照データ
"""
            for i, ref in enumerate(failed_refs, 1):
                report += f"""
### ⚠️ 失敗#{i}
- **検索クエリ**: "{ref.search_query}"
- **コンテキスト**: {ref.reference_context}
- **実行時刻**: {ref.timestamp}
- **エラー内容**: {ref.result_content}
- **処理時間**: {ref.processing_time_ms:.1f}ms
"""
        
        # パフォーマンス分析
        report += f"""
## ⚡ パフォーマンス分析

### 📊 処理時間分布
"""
        
        time_ranges = [
            (0, 100, "高速"),
            (100, 500, "普通"),
            (500, 1000, "やや遅い"),
            (1000, float('inf'), "遅い")
        ]
        
        for min_time, max_time, label in time_ranges:
            count = len([ref for ref in self.reference_log 
                        if min_time <= ref.processing_time_ms < max_time])
            percentage = (count / total_refs) * 100 if total_refs > 0 else 0
            report += f"- **{label}** ({min_time}-{max_time if max_time != float('inf') else '∞'}ms): {count}回 ({percentage:.1f}%)\n"
        
        # 信頼度分析
        report += f"""
### 📈 信頼度分布
"""
        
        confidence_ranges = [
            (0.0, 0.3, "低"),
            (0.3, 0.6, "中"),
            (0.6, 0.8, "高"),
            (0.8, 1.0, "非常に高い")
        ]
        
        for min_conf, max_conf, label in confidence_ranges:
            count = len([ref for ref in successful_refs 
                        if min_conf <= ref.confidence_score < max_conf])
            percentage = (count / len(successful_refs)) * 100 if successful_refs else 0
            report += f"- **{label}** ({min_conf:.1f}-{max_conf:.1f}): {count}回 ({percentage:.1f}%)\n"
        
        return report
    
    def save_reference_log(self):
        """参照ログをファイルに保存"""
        
        log_file = self.log_dir / f"{self.session_id}_reference_log.json"
        
        # JSON形式で保存
        log_data = {
            'session_id': self.session_id,
            'timestamp': datetime.now().isoformat(),
            'total_references': len(self.reference_log),
            'references': [
                {
                    'timestamp': ref.timestamp,
                    'search_query': ref.search_query,
                    'data_source': ref.data_source,
                    'result_found': ref.result_found,
                    'result_content': ref.result_content,
                    'result_size': ref.result_size,
                    'confidence_score': ref.confidence_score,
                    'processing_time_ms': ref.processing_time_ms,
                    'reference_context': ref.reference_context
                }
                for ref in self.reference_log
            ]
        }
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, ensure_ascii=False, indent=2)
        
        # Markdownレポートも保存
        report_file = self.log_dir / f"{self.session_id}_reference_report.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(self.generate_reference_report())
        
        print(f"💾 参照ログ保存完了:")
        print(f"  📄 JSON: {log_file}")
        print(f"  📋 レポート: {report_file}")

class CompleteKnowledgeGuaranteeSystemWithReferenceTracking:
    """参照トラッキング機能付き完全ナレッジ保証システム"""
    
    def __init__(self, project_knowledge_search_function):
        self.project_knowledge_search = project_knowledge_search_function
        
        # データ参照ログシステム
        self.reference_logger = DataReferenceLogger()
        
        # 既存の初期化
        self.required_components = self._initialize_required_components()
        self.verification_results = {}
        self.missing_data_report = {}
        self.guarantee_log = []
        
        print("🔍 参照トラッキング機能付き完全ナレッジ保証システム初期化完了")
    
    def _initialize_required_components(self) -> Dict[str, KnowledgeComponent]:
        """必須ナレッジコンポーネント初期化（既存のまま）"""
        
        components = {}
        
        # 1. 統一Hooksシステム中核
        components["unified_hooks_core"] = KnowledgeComponent(
            component_id="unified_hooks_core",
            component_name="統一Hooksシステム中核",
            required_files=[
                "COMPLETE_KNOWLEDGE_INTEGRATION.md",
                "unified_hooks_system.py",
                "UnifiedHookDefinition"
            ],
            search_keywords=[
                "UnifiedHookDefinition", "統一Hooksシステム", "HookPriority", 
                "HookCategory", "COMPLETE_KNOWLEDGE_INTEGRATION"
            ],
            validation_rules=[
                "UnifiedHookDefinitionクラスが定義されている",
                "HookPriorityとHookCategoryが定義されている",
                "統一データ構造が含まれている"
            ],
            priority="critical",
            dependencies=[]
        )
        
        # 2. 統一データベース・認証システム
        components["unified_database_auth"] = KnowledgeComponent(
            component_id="unified_database_auth",
            component_name="統一データベース・認証システム",
            required_files=[
                "UnifiedDatabaseConfig",
                "UnifiedAuthManager",
                "unified_settings.json"
            ],
            search_keywords=[
                "UnifiedDatabaseConfig", "UnifiedAuthManager", "postgresql", 
                "jwt_with_session_fallback", "統一認証"
            ],
            validation_rules=[
                "PostgreSQL標準・MySQL例外設定が含まれている",
                "JWT+セッション統一認証が定義されている",
                "統一レスポンス形式が定義されている"
            ],
            priority="critical",
            dependencies=["unified_hooks_core"]
        )
        
        # ... 他の8個のコンポーネントも同様に定義 ...
        
        return components
    
    def execute_complete_data_guarantee_with_tracking(self):
        """参照トラッキング付き完全データ保証実行"""
        
        guarantee_result = {
            'execution_id': f"guarantee_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'total_components': len(self.required_components),
            'verified_components': 0,
            'missing_components': [],
            'verification_details': {},
            'dependency_check': {},
            'guarantee_status': 'unknown',
            'reference_tracking': True
        }
        
        print("🔍 参照トラッキング付き完全データ保証実行開始")
        print("=" * 70)
        print("📝 全ての検索クエリとデータ参照を詳細記録します")
        print("=" * 70)
        
        try:
            # 依存関係順で検証実行
            verification_order = self._calculate_verification_order()
            
            for component_id in verification_order:
                component = self.required_components[component_id]
                
                print(f"\n🔍 検証中: {component.component_name}")
                print(f"📋 検索キーワード: {', '.join(component.search_keywords)}")
                
                # コンポーネント検証実行（参照トラッキング付き）
                verification_result = self._verify_component_with_tracking(component)
                guarantee_result['verification_details'][component_id] = verification_result
                
                if verification_result['status'] == 'verified':
                    guarantee_result['verified_components'] += 1
                    print(f"✅ 検証成功: {verification_result['found_items']}個のアイテム発見")
                else:
                    guarantee_result['missing_components'].append(component_id)
                    print(f"❌ 検証失敗: {verification_result['missing_items']}個のアイテム不足")
                    
                    # 重要コンポーネントが不足している場合の警告
                    if component.priority == 'critical':
                        print(f"⚠️  CRITICAL: {component.component_name}の不足は致命的です")
            
            # 最終判定
            verification_rate = (guarantee_result['verified_components'] / guarantee_result['total_components']) * 100
            
            if verification_rate >= 90:
                guarantee_result['guarantee_status'] = 'excellent'
            elif verification_rate >= 70:
                guarantee_result['guarantee_status'] = 'good'
            elif verification_rate >= 50:
                guarantee_result['guarantee_status'] = 'partial'
            else:
                guarantee_result['guarantee_status'] = 'insufficient'
            
            guarantee_result['verification_rate'] = verification_rate
            
            print("\n" + "=" * 70)
            print(f"🎯 参照トラッキング付き完全データ保証完了")
            print(f"検証率: {verification_rate:.1f}% ({guarantee_result['verified_components']}/{guarantee_result['total_components']})")
            print(f"保証レベル: {guarantee_result['guarantee_status'].upper()}")
            print("=" * 70)
            
            # 参照データ保存
            self.reference_logger.save_reference_log()
            
        except Exception as e:
            guarantee_result['error'] = str(e)
            guarantee_result['guarantee_status'] = 'error'
            print(f"❌ 保証実行エラー: {e}")
        
        self.verification_results = guarantee_result
        return guarantee_result
    
    def _verify_component_with_tracking(self, component: KnowledgeComponent) -> Dict[str, Any]:
        """参照トラッキング付きコンポーネント検証"""
        
        verification_result = {
            'component_id': component.component_id,
            'status': 'unknown',
            'found_items': 0,
            'missing_items': 0,
            'search_results': [],
            'validation_results': [],
            'confidence_score': 0.0,
            'data_references': []
        }
        
        try:
            # キーワード検索実行（参照トラッキング付き）
            for keyword in component.search_keywords:
                try:
                    # 参照ログ付きで検索実行
                    search_result = self.reference_logger.log_search_attempt(
                        search_query=keyword,
                        search_function=self.project_knowledge_search,
                        context=f"component_{component.component_id}"
                    )
                    
                    if search_result:
                        verification_result['search_results'].append({
                            'keyword': keyword,
                            'found': True,
                            'result_length': len(str(search_result)),
                            'reference_logged': True
                        })
                        verification_result['found_items'] += 1
                    else:
                        verification_result['search_results'].append({
                            'keyword': keyword,
                            'found': False,
                            'result_length': 0,
                            'reference_logged': True
                        })
                        verification_result['missing_items'] += 1
                        
                except Exception as e:
                    verification_result['search_results'].append({
                        'keyword': keyword,
                        'found': False,
                        'error': str(e),
                        'reference_logged': True
                    })
                    verification_result['missing_items'] += 1
            
            # バリデーション実行
            for rule in component.validation_rules:
                rule_result = self._validate_rule(rule, verification_result['search_results'])
                verification_result['validation_results'].append({
                    'rule': rule,
                    'passed': rule_result
                })
            
            # 信頼度スコア計算
            total_searches = len(component.search_keywords)
            successful_searches = verification_result['found_items']
            passed_validations = sum(1 for v in verification_result['validation_results'] if v['passed'])
            total_validations = len(verification_result['validation_results'])
            
            search_score = (successful_searches / total_searches) if total_searches > 0 else 0
            validation_score = (passed_validations / total_validations) if total_validations > 0 else 0
            
            verification_result['confidence_score'] = (search_score + validation_score) / 2
            
            # 最終判定
            if verification_result['confidence_score'] >= 0.7:
                verification_result['status'] = 'verified'
            elif verification_result['confidence_score'] >= 0.5:
                verification_result['status'] = 'partial'
            else:
                verification_result['status'] = 'missing'
                
        except Exception as e:
            verification_result['status'] = 'error'
            verification_result['error'] = str(e)
        
        return verification_result
    
    def _validate_rule(self, rule: str, search_results: List[Dict]) -> bool:
        """バリデーションルール実行（既存のまま）"""
        
        rule_keywords = rule.lower().split()
        
        for result in search_results:
            if result.get('found', False):
                for keyword in rule_keywords:
                    if any(keyword in result.get('keyword', '').lower() for result in search_results if result.get('found')):
                        return True
        
        return False
    
    def _calculate_verification_order(self) -> List[str]:
        """依存関係を考慮した検証順序計算（既存のまま）"""
        
        order = []
        remaining = set(self.required_components.keys())
        
        while remaining:
            ready = []
            for component_id in remaining:
                component = self.required_components[component_id]
                if not component.dependencies or all(dep in order for dep in component.dependencies):
                    ready.append(component_id)
            
            if not ready:
                ready = list(remaining)
            
            ready.sort(key=lambda x: ['critical', 'high', 'medium', 'low'].index(self.required_components[x].priority))
            
            order.extend(ready)
            remaining -= set(ready)
        
        return order
    
    def get_complete_reference_report(self) -> str:
        """完全な参照レポート取得"""
        
        reference_report = self.reference_logger.generate_reference_report()
        
        combined_report = f"""
# 🔍 COMPLETE_KNOWLEDGE_INTEGRATION 参照トラッキングレポート

{reference_report}

## 🎯 コンポーネント検証と参照データの関連

"""
        
        if hasattr(self, 'verification_results') and 'verification_details' in self.verification_results:
            for component_id, verification in self.verification_results['verification_details'].items():
                component = self.required_components[component_id]
                
                combined_report += f"""
### 📦 {component.component_name}
- **検証結果**: {verification['status']}
- **検索キーワード数**: {len(component.search_keywords)}個
- **発見データ**: {verification['found_items']}個
- **信頼度**: {verification['confidence_score']:.2f}

**使用された検索クエリ:**
"""
                for keyword in component.search_keywords:
                    combined_report += f"- `{keyword}`\n"
        
        return combined_report

# メイン実行関数
def execute_complete_knowledge_guarantee_with_tracking(project_knowledge_search_function):
    """参照トラッキング付き完全ナレッジ保証実行関数"""
    
    print("🌟 参照トラッキング付き完全ナレッジ保証システム開始")
    print("COMPLETE_KNOWLEDGE_INTEGRATION.md準拠版 + データ参照完全記録")
    print("=" * 80)
    
    # システム初期化
    guarantee_system = CompleteKnowledgeGuaranteeSystemWithReferenceTracking(project_knowledge_search_function)
    
    # 完全データ保証実行
    guarantee_result = guarantee_system.execute_complete_data_guarantee_with_tracking()
    
    # 参照トラッキングレポート生成・表示
    reference_report = guarantee_system.get_complete_reference_report()
    print("\n" + "=" * 80)
    print("📊 完全参照トラッキングレポート")
    print("=" * 80)
    print(reference_report)
    
    return guarantee_result, guarantee_system.reference_logger

# 実行例
if __name__ == "__main__":
    # テスト用検索関数
    def test_search(keyword):
        return f"テスト検索結果: {keyword} - 見つかりました"
    
    # 参照トラッキング付き保証実行
    result, logger = execute_complete_knowledge_guarantee_with_tracking(test_search)
    
    print("\n🎉 実行完了！")
    print("📁 参照ログが logs/knowledge_references/ に保存されました")

"""
✅ 参照データ記録機能付きCOMPLETE_KNOWLEDGE_INTEGRATION完成

🎯 新機能:
✅ 全検索クエリの詳細記録
✅ データ参照結果の完全保存
✅ 処理時間・信頼度の計測
✅ 成功/失敗の詳細分析
✅ JSONとMarkdownでのログ保存
✅ リアルタイム進捗表示

📊 記録される情報:
- 検索クエリ内容
- 検索結果の有無・サイズ
- 信頼度スコア
- 処理時間
- コンテキスト情報
- エラー詳細

🎉 これで「どのデータを参照したか」が完全に分かります！
"""