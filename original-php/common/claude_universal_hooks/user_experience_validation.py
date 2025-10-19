"""
🪝 NAGANO-3 CSS・HTML検証hooks実装
ナレッジベース準拠: 01-CSS・画面デザインルール 1,411行仕様

実装対象: Hook 7-12 CSS/HTML品質検証hooks
基盤仕様: BEM完全準拠、システム=英語・業務=日本語ローマ字、レスポンシブ対応
"""

import re
import cssutils
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import html.parser
import logging

# cssutilsのログを抑制
cssutils.log.setLevel(logging.ERROR)

class BEMComplianceValidationHook(BaseValidationHook):
    """Hook 7: BEM完全準拠検証
    基盤: 01-CSS・画面デザインルール 1,411行仕様
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.bem_patterns = self._load_bem_patterns()
        self.naming_rules = self._load_naming_rules()
        self.forbidden_patterns = self._load_forbidden_patterns()
    
    def _load_bem_patterns(self) -> Dict[str, str]:
        """BEMパターン（ナレッジベース準拠）"""
        return {
            "block": r'^[a-z][a-z0-9-]*[a-z0-9]$',
            "element": r'^[a-z][a-z0-9-]*[a-z0-9]__[a-z][a-z0-9-]*[a-z0-9]$',
            "modifier": r'^[a-z][a-z0-9-]*[a-z0-9](__|--)[a-z][a-z0-9-]*[a-z0-9]$',
            "full_bem": r'^[a-z][a-z0-9-]*[a-z0-9](__[a-z][a-z0-9-]*[a-z0-9])?(--[a-z][a-z0-9-]*[a-z0-9])?$'
        }
    
    def _load_naming_rules(self) -> Dict[str, Dict[str, Any]]:
        """命名規則（ナレッジベース準拠）"""
        return {
            "system_components": {
                "language": "english",
                "examples": ["header", "sidebar", "navigation", "modal", "button"],
                "pattern": r'^[a-z][a-z0-9-]*[a-z0-9]$'
            },
            "business_components": {
                "language": "japanese_romaji",
                "examples": ["shohin", "zaiko", "kicho", "uriage", "shiire"],
                "pattern": r'^[a-z][a-z0-9]*[a-z0-9]$'
            }
        }
    
    def _load_forbidden_patterns(self) -> Dict[str, str]:
        """禁止パターン（ナレッジベース準拠）"""
        return {
            "important_usage": r'!\s*important',
            "n3_prefix": r'\.n3-',
            "inline_styles": r'style\s*=\s*["\'][^"\']*["\']',
            "global_pollution": r'\.(container|form|button|input|table)\s*{(?![^}]*__.*)(?![^}]*--)',
            "camelcase_class": r'\.[a-z]+[A-Z][a-zA-Z]*\s*{',
            "underscore_class": r'\.[a-z]+_[a-z_]*\s*{'
        }
    
    def execute_validation(self, css_content: str) -> Dict[str, Any]:
        """レスポンシブデザイン検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # メディアクエリ検証
        media_query_findings = self._validate_media_queries(css_content)
        findings.extend(media_query_findings)
        
        # モバイルファースト検証
        mobile_first_findings = self._validate_mobile_first_approach(css_content)
        findings.extend(mobile_first_findings)
        
        # ビューポート単位検証
        viewport_findings = self._validate_viewport_units(css_content)
        findings.extend(viewport_findings)
        
        # フレキシブルレイアウト検証
        layout_findings = self._validate_flexible_layouts(css_content)
        findings.extend(layout_findings)
        
        result.update({
            'validation_status': 'failed' if any(f.get('severity') == 'critical' for f in findings) else 'passed',
            'findings': findings,
            'compliance_score': self._calculate_responsive_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_responsive_recommendations(findings)
        })
        
        return result
    
    def _validate_media_queries(self, css_content: str) -> List[Dict[str, Any]]:
        """メディアクエリ検証"""
        findings = []
        
        media_queries = re.finditer(self.responsive_patterns['media_query'], css_content)
        breakpoint_usage = {bp: 0 for bp in self.breakpoints}
        
        for match in media_queries:
            line_num = css_content[:match.start()].count('\n') + 1
            query_text = match.group(0)
            
            # ブレークポイント一致チェック
            width_match = re.search(r'(\d+)px', query_text)
            if width_match:
                width = int(width_match.group(1))
                
                # 推奨ブレークポイントとの一致確認
                matching_breakpoint = None
                for bp_name, bp_value in self.breakpoints.items():
                    if abs(width - bp_value) <= 10:  # 10px以内の誤差は許容
                        matching_breakpoint = bp_name
                        breakpoint_usage[bp_name] += 1
                        break
                
                if not matching_breakpoint:
                    findings.append({
                        'type': 'non_standard_breakpoint',
                        'line': line_num,
                        'breakpoint': width,
                        'message': f'非標準ブレークポイント {width}px が使用されています',
                        'severity': 'warning',
                        'suggestion': f'推奨ブレークポイント {list(self.breakpoints.values())} を使用してください'
                    })
        
        # ブレークポイント使用率評価
        if sum(breakpoint_usage.values()) == 0:
            findings.append({
                'type': 'no_responsive_design',
                'message': 'レスポンシブデザインが実装されていません',
                'severity': 'warning',
                'suggestion': 'メディアクエリを使用してレスポンシブ対応を実装してください'
            })
        
        return findings
    
    def _validate_mobile_first_approach(self, css_content: str) -> List[Dict[str, Any]]:
        """モバイルファースト検証"""
        findings = []
        
        min_width_queries = re.findall(self.responsive_patterns['mobile_first'], css_content)
        max_width_queries = re.findall(self.responsive_patterns['desktop_first'], css_content)
        
        min_width_count = len(min_width_queries)
        max_width_count = len(max_width_queries)
        
        # モバイルファースト評価
        if max_width_count > min_width_count * 2:
            findings.append({
                'type': 'desktop_first_approach',
                'min_width_count': min_width_count,
                'max_width_count': max_width_count,
                'message': 'デスクトップファーストのアプローチが検出されました',
                'severity': 'warning',
                'suggestion': 'モバイルファーストアプローチに変更することを推奨します'
            })
        
        return findings
    
    def _validate_viewport_units(self, css_content: str) -> List[Dict[str, Any]]:
        """ビューポート単位検証"""
        findings = []
        
        viewport_matches = re.finditer(self.responsive_patterns['viewport_units'], css_content)
        for match in viewport_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'viewport_unit_usage',
                'line': line_num,
                'message': 'ビューポート単位が使用されています（推奨）',
                'severity': 'info',
                'suggestion': 'ビューポート単位の適切な使用が確認されました'
            })
        
        return findings
    
    def _validate_flexible_layouts(self, css_content: str) -> List[Dict[str, Any]]:
        """フレキシブルレイアウト検証"""
        findings = []
        
        # Flexbox使用チェック
        flexbox_usage = len(re.findall(r'display:\s*flex', css_content))
        
        # Grid使用チェック
        grid_usage = len(re.findall(r'display:\s*grid', css_content))
        
        # 固定幅の過度な使用チェック
        fixed_widths = re.findall(r'width:\s*(\d+)px', css_content)
        fixed_width_count = len([w for w in fixed_widths if int(w) > 100])
        
        if fixed_width_count > 5 and flexbox_usage == 0 and grid_usage == 0:
            findings.append({
                'type': 'excessive_fixed_widths',
                'fixed_width_count': fixed_width_count,
                'message': '固定幅の過度な使用が検出されました',
                'severity': 'warning',
                'suggestion': 'FlexboxまたはGridレイアウトの使用を検討してください'
            })
        
        return findings
    
    def _calculate_responsive_score(self, findings: List[Dict[str, Any]]) -> float:
        """レスポンシブスコア計算"""
        if not findings:
            return 1.0
        
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        info_count = len([f for f in findings if f.get('severity') == 'info'])
        
        penalty = warning_count * 0.15
        bonus = info_count * 0.05
        
        return max(0.0, min(1.0, 1.0 - penalty + bonus))
    
    def _generate_responsive_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """レスポンシブ改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'no_responsive_design' for f in findings):
            recommendations.append("レスポンシブデザインを実装してください")
        
        if any(f.get('type') == 'desktop_first_approach' for f in findings):
            recommendations.append("モバイルファーストアプローチに変更してください")
        
        if any(f.get('type') == 'excessive_fixed_widths' for f in findings):
            recommendations.append("固定幅の使用を減らし、フレキシブルレイアウトを活用してください")
        
        return recommendations


class CSSNamingConventionValidationHook(BaseValidationHook):
    """Hook 9: CSS命名規則検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.naming_categories = self._load_naming_categories()
        self.validation_rules = self._load_validation_rules()
    
    def _load_naming_categories(self) -> Dict[str, Dict[str, Any]]:
        """命名カテゴリ（ナレッジベース準拠）"""
        return {
            "system": {
                "language": "english",
                "pattern": r'^[a-z][a-z0-9-]*[a-z0-9]self, css_content: str, html_content: str) -> Dict[str, Any]:
        """BEM準拠検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # CSS BEM検証
        css_findings = self._validate_css_bem(css_content)
        findings.extend(css_findings)
        
        # HTML-CSS整合性検証
        html_css_findings = self._validate_html_css_consistency(html_content, css_content)
        findings.extend(html_css_findings)
        
        # 命名規則検証
        naming_findings = self._validate_naming_conventions(css_content)
        findings.extend(naming_findings)
        
        # 禁止パターン検証
        forbidden_findings = self._validate_forbidden_patterns(css_content, html_content)
        findings.extend(forbidden_findings)
        
        # 結果集計
        critical_issues = [f for f in findings if f.get('severity') == 'critical']
        warning_issues = [f for f in findings if f.get('severity') == 'warning']
        
        result.update({
            'validation_status': 'failed' if critical_issues else ('warning' if warning_issues else 'passed'),
            'findings': findings,
            'compliance_score': self._calculate_bem_compliance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_bem_recommendations(findings)
        })
        
        return result
    
    def _validate_css_bem(self, css_content: str) -> List[Dict[str, Any]]:
        """CSS BEM構造検証"""
        findings = []
        
        # CSSクラス抽出
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        class_matches = re.finditer(class_pattern, css_content)
        
        for match in class_matches:
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMパターン検証
            bem_compliance = self._check_bem_pattern(class_name)
            
            if not bem_compliance['is_valid']:
                findings.append({
                    'type': 'bem_violation',
                    'class_name': class_name,
                    'line': line_num,
                    'message': f'クラス名 "{class_name}" がBEM規則に準拠していません',
                    'severity': 'warning',
                    'suggestion': bem_compliance['suggestion'],
                    'bem_analysis': bem_compliance
                })
        
        return findings
    
    def _check_bem_pattern(self, class_name: str) -> Dict[str, Any]:
        """BEMパターンチェック"""
        analysis = {
            'is_valid': False,
            'type': 'unknown',
            'suggestion': '',
            'structure': {}
        }
        
        # Block検証
        if re.match(self.bem_patterns['block'], class_name):
            analysis.update({
                'is_valid': True,
                'type': 'block',
                'structure': {'block': class_name}
            })
        
        # Element検証
        elif '__' in class_name:
            if re.match(self.bem_patterns['element'], class_name):
                parts = class_name.split('__')
                analysis.update({
                    'is_valid': True,
                    'type': 'element',
                    'structure': {'block': parts[0], 'element': parts[1]}
                })
            else:
                analysis['suggestion'] = 'Element形式: block__element'
        
        # Modifier検証
        elif '--' in class_name:
            if re.match(self.bem_patterns['modifier'], class_name):
                if '__' in class_name:
                    # Element modifier
                    bem_parts = class_name.split('__')
                    element_parts = bem_parts[1].split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'element_modifier',
                        'structure': {
                            'block': bem_parts[0],
                            'element': element_parts[0],
                            'modifier': element_parts[1]
                        }
                    })
                else:
                    # Block modifier
                    parts = class_name.split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'block_modifier',
                        'structure': {'block': parts[0], 'modifier': parts[1]}
                    })
            else:
                analysis['suggestion'] = 'Modifier形式: block--modifier または block__element--modifier'
        
        # 無効なパターン
        else:
            if '_' in class_name:
                analysis['suggestion'] = 'アンダースコアは __ (Element)または -- (Modifier)を使用してください'
            elif class_name[0].isupper():
                analysis['suggestion'] = 'クラス名は小文字で開始してください'
            else:
                analysis['suggestion'] = 'BEM形式に準拠してください: block, block__element, block--modifier'
        
        return analysis
    
    def _validate_html_css_consistency(self, html_content: str, css_content: str) -> List[Dict[str, Any]]:
        """HTML-CSS整合性検証"""
        findings = []
        
        # HTML内のクラス抽出
        html_classes = set()
        class_attr_pattern = r'class\s*=\s*["\']([^"\']+)["\']'
        for match in re.finditer(class_attr_pattern, html_content):
            classes = match.group(1).split()
            html_classes.update(classes)
        
        # CSS内のクラス抽出
        css_classes = set()
        css_class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(css_class_pattern, css_content):
            css_classes.add(match.group(1))
        
        # 未使用CSSクラス検出
        unused_css_classes = css_classes - html_classes
        for class_name in unused_css_classes:
            findings.append({
                'type': 'unused_css_class',
                'class_name': class_name,
                'message': f'CSSクラス "{class_name}" がHTMLで使用されていません',
                'severity': 'warning',
                'suggestion': 'HTMLで使用するか、不要な場合は削除してください'
            })
        
        # 未定義HTMLクラス検出
        undefined_html_classes = html_classes - css_classes
        for class_name in undefined_html_classes:
            # システム標準クラスは除外
            if class_name not in ['container', 'row', 'col']:
                findings.append({
                    'type': 'undefined_html_class',
                    'class_name': class_name,
                    'message': f'HTMLクラス "{class_name}" に対応するCSSが見つかりません',
                    'severity': 'warning',
                    'suggestion': 'CSSで定義するか、不要な場合はHTMLから削除してください'
                })
        
        return findings
    
    def _validate_naming_conventions(self, css_content: str) -> List[Dict[str, Any]]:
        """命名規則検証（システム=英語、業務=日本語ローマ字）"""
        findings = []
        
        # 既知のビジネス用語
        business_terms = [
            'shohin', 'zaiko', 'kicho', 'uriage', 'shiire', 'kaikei',
            'denpyo', 'torihiki', 'shiharai', 'nyukin', 'shukkin'
        ]
        
        # 既知のシステム用語
        system_terms = [
            'header', 'sidebar', 'navigation', 'modal', 'button', 'form',
            'table', 'card', 'container', 'layout', 'grid', 'flex'
        ]
        
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(class_pattern, css_content):
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMのblock部分を抽出
            block_name = class_name.split('__')[0].split('--')[0]
            
            # 命名規則チェック
            is_business = any(term in block_name for term in business_terms)
            is_system = any(term in block_name for term in system_terms)
            
            if is_business:
                # 業務系：日本語ローマ字チェック
                if not re.match(r'^[a-z][a-z0-9]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'business_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'業務系クラス "{block_name}" は日本語ローマ字（英数字のみ）で命名してください',
                        'severity': 'warning',
                        'suggestion': 'ハイフンを削除し、英数字のみにしてください'
                    })
            
            elif is_system:
                # システム系：英語チェック
                if not re.match(r'^[a-z][a-z0-9-]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'system_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'システム系クラス "{block_name}" は英語（ハイフン区切り可）で命名してください',
                        'severity': 'warning',
                        'suggestion': '英語の単語を使用し、必要に応じてハイフンで区切ってください'
                    })
        
        return findings
    
    def _validate_forbidden_patterns(self, css_content: str, html_content: str) -> List[Dict[str, Any]]:
        """禁止パターン検証"""
        findings = []
        
        # !important 使用チェック
        important_matches = re.finditer(self.forbidden_patterns['important_usage'], css_content)
        for match in important_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'important_usage',
                'line': line_num,
                'message': '!important の使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSS変数オーバーライドまたはセレクター詳細度で解決してください'
            })
        
        # n3-接頭語チェック
        n3_matches = re.finditer(self.forbidden_patterns['n3_prefix'], css_content)
        for match in n3_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'deprecated_n3_prefix',
                'line': line_num,
                'message': 'n3-接頭語は廃止されました',
                'severity': 'critical',
                'suggestion': 'BEM準拠のクラス名に変更してください'
            })
        
        # インラインスタイルチェック（HTML）
        inline_matches = re.finditer(self.forbidden_patterns['inline_styles'], html_content)
        for match in inline_matches:
            line_num = html_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'inline_style_usage',
                'line': line_num,
                'message': 'インラインスタイルの使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSSクラスまたはCSS変数を使用してください'
            })
        
        return findings
    
    def _calculate_bem_compliance_score(self, findings: List[Dict[str, Any]]) -> float:
        """BEM準拠スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.3 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_bem_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """BEM改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'bem_violation' for f in findings):
            recommendations.append("BEM命名規則に準拠してください")
        
        if any(f.get('type') == 'important_usage' for f in findings):
            recommendations.append("!important の使用を避け、CSS変数を活用してください")
        
        if any(f.get('type') == 'business_naming_violation' for f in findings):
            recommendations.append("業務系クラスは日本語ローマ字で命名してください")
        
        if any(f.get('type') == 'system_naming_violation' for f in findings):
            recommendations.append("システム系クラスは英語で命名してください")
        
        return recommendations


class ResponsiveDesignValidationHook(BaseValidationHook):
    """Hook 8: レスポンシブデザイン検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.breakpoints = self._load_breakpoints()
        self.responsive_patterns = self._load_responsive_patterns()
    
    def _load_breakpoints(self) -> Dict[str, int]:
        """統一ブレークポイント（ナレッジベース準拠）"""
        return {
            'mobile': 480,
            'tablet': 768,
            'tablet_landscape': 1024,
            'desktop': 1200
        }
    
    def _load_responsive_patterns(self) -> Dict[str, str]:
        """レスポンシブパターン"""
        return {
            'media_query': r'@media\s*\([^)]+\)\s*{',
            'mobile_first': r'@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)',
            'desktop_first': r'@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)',
            'viewport_units': r'(width|height|font-size):\s*\d+v[wh]',
            'rem_units': r'(width|height|font-size|padding|margin):\s*\d+(\.\d+)?rem'
        }
    
    def execute_validation(,
                "examples": ["header", "navigation", "sidebar", "modal", "button"],
                "keywords": ["header", "nav", "side", "modal", "button", "form", "table", "card"]
            },
            "business": {
                "language": "japanese_romaji",
                "pattern": r'^[a-z][a-z0-9]*[a-z0-9]self, css_content: str, html_content: str) -> Dict[str, Any]:
        """BEM準拠検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # CSS BEM検証
        css_findings = self._validate_css_bem(css_content)
        findings.extend(css_findings)
        
        # HTML-CSS整合性検証
        html_css_findings = self._validate_html_css_consistency(html_content, css_content)
        findings.extend(html_css_findings)
        
        # 命名規則検証
        naming_findings = self._validate_naming_conventions(css_content)
        findings.extend(naming_findings)
        
        # 禁止パターン検証
        forbidden_findings = self._validate_forbidden_patterns(css_content, html_content)
        findings.extend(forbidden_findings)
        
        # 結果集計
        critical_issues = [f for f in findings if f.get('severity') == 'critical']
        warning_issues = [f for f in findings if f.get('severity') == 'warning']
        
        result.update({
            'validation_status': 'failed' if critical_issues else ('warning' if warning_issues else 'passed'),
            'findings': findings,
            'compliance_score': self._calculate_bem_compliance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_bem_recommendations(findings)
        })
        
        return result
    
    def _validate_css_bem(self, css_content: str) -> List[Dict[str, Any]]:
        """CSS BEM構造検証"""
        findings = []
        
        # CSSクラス抽出
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        class_matches = re.finditer(class_pattern, css_content)
        
        for match in class_matches:
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMパターン検証
            bem_compliance = self._check_bem_pattern(class_name)
            
            if not bem_compliance['is_valid']:
                findings.append({
                    'type': 'bem_violation',
                    'class_name': class_name,
                    'line': line_num,
                    'message': f'クラス名 "{class_name}" がBEM規則に準拠していません',
                    'severity': 'warning',
                    'suggestion': bem_compliance['suggestion'],
                    'bem_analysis': bem_compliance
                })
        
        return findings
    
    def _check_bem_pattern(self, class_name: str) -> Dict[str, Any]:
        """BEMパターンチェック"""
        analysis = {
            'is_valid': False,
            'type': 'unknown',
            'suggestion': '',
            'structure': {}
        }
        
        # Block検証
        if re.match(self.bem_patterns['block'], class_name):
            analysis.update({
                'is_valid': True,
                'type': 'block',
                'structure': {'block': class_name}
            })
        
        # Element検証
        elif '__' in class_name:
            if re.match(self.bem_patterns['element'], class_name):
                parts = class_name.split('__')
                analysis.update({
                    'is_valid': True,
                    'type': 'element',
                    'structure': {'block': parts[0], 'element': parts[1]}
                })
            else:
                analysis['suggestion'] = 'Element形式: block__element'
        
        # Modifier検証
        elif '--' in class_name:
            if re.match(self.bem_patterns['modifier'], class_name):
                if '__' in class_name:
                    # Element modifier
                    bem_parts = class_name.split('__')
                    element_parts = bem_parts[1].split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'element_modifier',
                        'structure': {
                            'block': bem_parts[0],
                            'element': element_parts[0],
                            'modifier': element_parts[1]
                        }
                    })
                else:
                    # Block modifier
                    parts = class_name.split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'block_modifier',
                        'structure': {'block': parts[0], 'modifier': parts[1]}
                    })
            else:
                analysis['suggestion'] = 'Modifier形式: block--modifier または block__element--modifier'
        
        # 無効なパターン
        else:
            if '_' in class_name:
                analysis['suggestion'] = 'アンダースコアは __ (Element)または -- (Modifier)を使用してください'
            elif class_name[0].isupper():
                analysis['suggestion'] = 'クラス名は小文字で開始してください'
            else:
                analysis['suggestion'] = 'BEM形式に準拠してください: block, block__element, block--modifier'
        
        return analysis
    
    def _validate_html_css_consistency(self, html_content: str, css_content: str) -> List[Dict[str, Any]]:
        """HTML-CSS整合性検証"""
        findings = []
        
        # HTML内のクラス抽出
        html_classes = set()
        class_attr_pattern = r'class\s*=\s*["\']([^"\']+)["\']'
        for match in re.finditer(class_attr_pattern, html_content):
            classes = match.group(1).split()
            html_classes.update(classes)
        
        # CSS内のクラス抽出
        css_classes = set()
        css_class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(css_class_pattern, css_content):
            css_classes.add(match.group(1))
        
        # 未使用CSSクラス検出
        unused_css_classes = css_classes - html_classes
        for class_name in unused_css_classes:
            findings.append({
                'type': 'unused_css_class',
                'class_name': class_name,
                'message': f'CSSクラス "{class_name}" がHTMLで使用されていません',
                'severity': 'warning',
                'suggestion': 'HTMLで使用するか、不要な場合は削除してください'
            })
        
        # 未定義HTMLクラス検出
        undefined_html_classes = html_classes - css_classes
        for class_name in undefined_html_classes:
            # システム標準クラスは除外
            if class_name not in ['container', 'row', 'col']:
                findings.append({
                    'type': 'undefined_html_class',
                    'class_name': class_name,
                    'message': f'HTMLクラス "{class_name}" に対応するCSSが見つかりません',
                    'severity': 'warning',
                    'suggestion': 'CSSで定義するか、不要な場合はHTMLから削除してください'
                })
        
        return findings
    
    def _validate_naming_conventions(self, css_content: str) -> List[Dict[str, Any]]:
        """命名規則検証（システム=英語、業務=日本語ローマ字）"""
        findings = []
        
        # 既知のビジネス用語
        business_terms = [
            'shohin', 'zaiko', 'kicho', 'uriage', 'shiire', 'kaikei',
            'denpyo', 'torihiki', 'shiharai', 'nyukin', 'shukkin'
        ]
        
        # 既知のシステム用語
        system_terms = [
            'header', 'sidebar', 'navigation', 'modal', 'button', 'form',
            'table', 'card', 'container', 'layout', 'grid', 'flex'
        ]
        
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(class_pattern, css_content):
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMのblock部分を抽出
            block_name = class_name.split('__')[0].split('--')[0]
            
            # 命名規則チェック
            is_business = any(term in block_name for term in business_terms)
            is_system = any(term in block_name for term in system_terms)
            
            if is_business:
                # 業務系：日本語ローマ字チェック
                if not re.match(r'^[a-z][a-z0-9]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'business_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'業務系クラス "{block_name}" は日本語ローマ字（英数字のみ）で命名してください',
                        'severity': 'warning',
                        'suggestion': 'ハイフンを削除し、英数字のみにしてください'
                    })
            
            elif is_system:
                # システム系：英語チェック
                if not re.match(r'^[a-z][a-z0-9-]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'system_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'システム系クラス "{block_name}" は英語（ハイフン区切り可）で命名してください',
                        'severity': 'warning',
                        'suggestion': '英語の単語を使用し、必要に応じてハイフンで区切ってください'
                    })
        
        return findings
    
    def _validate_forbidden_patterns(self, css_content: str, html_content: str) -> List[Dict[str, Any]]:
        """禁止パターン検証"""
        findings = []
        
        # !important 使用チェック
        important_matches = re.finditer(self.forbidden_patterns['important_usage'], css_content)
        for match in important_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'important_usage',
                'line': line_num,
                'message': '!important の使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSS変数オーバーライドまたはセレクター詳細度で解決してください'
            })
        
        # n3-接頭語チェック
        n3_matches = re.finditer(self.forbidden_patterns['n3_prefix'], css_content)
        for match in n3_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'deprecated_n3_prefix',
                'line': line_num,
                'message': 'n3-接頭語は廃止されました',
                'severity': 'critical',
                'suggestion': 'BEM準拠のクラス名に変更してください'
            })
        
        # インラインスタイルチェック（HTML）
        inline_matches = re.finditer(self.forbidden_patterns['inline_styles'], html_content)
        for match in inline_matches:
            line_num = html_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'inline_style_usage',
                'line': line_num,
                'message': 'インラインスタイルの使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSSクラスまたはCSS変数を使用してください'
            })
        
        return findings
    
    def _calculate_bem_compliance_score(self, findings: List[Dict[str, Any]]) -> float:
        """BEM準拠スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.3 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_bem_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """BEM改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'bem_violation' for f in findings):
            recommendations.append("BEM命名規則に準拠してください")
        
        if any(f.get('type') == 'important_usage' for f in findings):
            recommendations.append("!important の使用を避け、CSS変数を活用してください")
        
        if any(f.get('type') == 'business_naming_violation' for f in findings):
            recommendations.append("業務系クラスは日本語ローマ字で命名してください")
        
        if any(f.get('type') == 'system_naming_violation' for f in findings):
            recommendations.append("システム系クラスは英語で命名してください")
        
        return recommendations


class ResponsiveDesignValidationHook(BaseValidationHook):
    """Hook 8: レスポンシブデザイン検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.breakpoints = self._load_breakpoints()
        self.responsive_patterns = self._load_responsive_patterns()
    
    def _load_breakpoints(self) -> Dict[str, int]:
        """統一ブレークポイント（ナレッジベース準拠）"""
        return {
            'mobile': 480,
            'tablet': 768,
            'tablet_landscape': 1024,
            'desktop': 1200
        }
    
    def _load_responsive_patterns(self) -> Dict[str, str]:
        """レスポンシブパターン"""
        return {
            'media_query': r'@media\s*\([^)]+\)\s*{',
            'mobile_first': r'@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)',
            'desktop_first': r'@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)',
            'viewport_units': r'(width|height|font-size):\s*\d+v[wh]',
            'rem_units': r'(width|height|font-size|padding|margin):\s*\d+(\.\d+)?rem'
        }
    
    def execute_validation(,
                "examples": ["shohin", "zaiko", "kicho", "uriage", "shiire"],
                "keywords": ["shohin", "zaiko", "kicho", "uriage", "shiire", "kaikei", "denpyo"]
            }
        }
    
    def _load_validation_rules(self) -> Dict[str, Any]:
        """検証ルール"""
        return {
            "bem_structure": {
                "block": r'^[a-z][a-z0-9-]*[a-z0-9]self, css_content: str, html_content: str) -> Dict[str, Any]:
        """BEM準拠検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # CSS BEM検証
        css_findings = self._validate_css_bem(css_content)
        findings.extend(css_findings)
        
        # HTML-CSS整合性検証
        html_css_findings = self._validate_html_css_consistency(html_content, css_content)
        findings.extend(html_css_findings)
        
        # 命名規則検証
        naming_findings = self._validate_naming_conventions(css_content)
        findings.extend(naming_findings)
        
        # 禁止パターン検証
        forbidden_findings = self._validate_forbidden_patterns(css_content, html_content)
        findings.extend(forbidden_findings)
        
        # 結果集計
        critical_issues = [f for f in findings if f.get('severity') == 'critical']
        warning_issues = [f for f in findings if f.get('severity') == 'warning']
        
        result.update({
            'validation_status': 'failed' if critical_issues else ('warning' if warning_issues else 'passed'),
            'findings': findings,
            'compliance_score': self._calculate_bem_compliance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_bem_recommendations(findings)
        })
        
        return result
    
    def _validate_css_bem(self, css_content: str) -> List[Dict[str, Any]]:
        """CSS BEM構造検証"""
        findings = []
        
        # CSSクラス抽出
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        class_matches = re.finditer(class_pattern, css_content)
        
        for match in class_matches:
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMパターン検証
            bem_compliance = self._check_bem_pattern(class_name)
            
            if not bem_compliance['is_valid']:
                findings.append({
                    'type': 'bem_violation',
                    'class_name': class_name,
                    'line': line_num,
                    'message': f'クラス名 "{class_name}" がBEM規則に準拠していません',
                    'severity': 'warning',
                    'suggestion': bem_compliance['suggestion'],
                    'bem_analysis': bem_compliance
                })
        
        return findings
    
    def _check_bem_pattern(self, class_name: str) -> Dict[str, Any]:
        """BEMパターンチェック"""
        analysis = {
            'is_valid': False,
            'type': 'unknown',
            'suggestion': '',
            'structure': {}
        }
        
        # Block検証
        if re.match(self.bem_patterns['block'], class_name):
            analysis.update({
                'is_valid': True,
                'type': 'block',
                'structure': {'block': class_name}
            })
        
        # Element検証
        elif '__' in class_name:
            if re.match(self.bem_patterns['element'], class_name):
                parts = class_name.split('__')
                analysis.update({
                    'is_valid': True,
                    'type': 'element',
                    'structure': {'block': parts[0], 'element': parts[1]}
                })
            else:
                analysis['suggestion'] = 'Element形式: block__element'
        
        # Modifier検証
        elif '--' in class_name:
            if re.match(self.bem_patterns['modifier'], class_name):
                if '__' in class_name:
                    # Element modifier
                    bem_parts = class_name.split('__')
                    element_parts = bem_parts[1].split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'element_modifier',
                        'structure': {
                            'block': bem_parts[0],
                            'element': element_parts[0],
                            'modifier': element_parts[1]
                        }
                    })
                else:
                    # Block modifier
                    parts = class_name.split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'block_modifier',
                        'structure': {'block': parts[0], 'modifier': parts[1]}
                    })
            else:
                analysis['suggestion'] = 'Modifier形式: block--modifier または block__element--modifier'
        
        # 無効なパターン
        else:
            if '_' in class_name:
                analysis['suggestion'] = 'アンダースコアは __ (Element)または -- (Modifier)を使用してください'
            elif class_name[0].isupper():
                analysis['suggestion'] = 'クラス名は小文字で開始してください'
            else:
                analysis['suggestion'] = 'BEM形式に準拠してください: block, block__element, block--modifier'
        
        return analysis
    
    def _validate_html_css_consistency(self, html_content: str, css_content: str) -> List[Dict[str, Any]]:
        """HTML-CSS整合性検証"""
        findings = []
        
        # HTML内のクラス抽出
        html_classes = set()
        class_attr_pattern = r'class\s*=\s*["\']([^"\']+)["\']'
        for match in re.finditer(class_attr_pattern, html_content):
            classes = match.group(1).split()
            html_classes.update(classes)
        
        # CSS内のクラス抽出
        css_classes = set()
        css_class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(css_class_pattern, css_content):
            css_classes.add(match.group(1))
        
        # 未使用CSSクラス検出
        unused_css_classes = css_classes - html_classes
        for class_name in unused_css_classes:
            findings.append({
                'type': 'unused_css_class',
                'class_name': class_name,
                'message': f'CSSクラス "{class_name}" がHTMLで使用されていません',
                'severity': 'warning',
                'suggestion': 'HTMLで使用するか、不要な場合は削除してください'
            })
        
        # 未定義HTMLクラス検出
        undefined_html_classes = html_classes - css_classes
        for class_name in undefined_html_classes:
            # システム標準クラスは除外
            if class_name not in ['container', 'row', 'col']:
                findings.append({
                    'type': 'undefined_html_class',
                    'class_name': class_name,
                    'message': f'HTMLクラス "{class_name}" に対応するCSSが見つかりません',
                    'severity': 'warning',
                    'suggestion': 'CSSで定義するか、不要な場合はHTMLから削除してください'
                })
        
        return findings
    
    def _validate_naming_conventions(self, css_content: str) -> List[Dict[str, Any]]:
        """命名規則検証（システム=英語、業務=日本語ローマ字）"""
        findings = []
        
        # 既知のビジネス用語
        business_terms = [
            'shohin', 'zaiko', 'kicho', 'uriage', 'shiire', 'kaikei',
            'denpyo', 'torihiki', 'shiharai', 'nyukin', 'shukkin'
        ]
        
        # 既知のシステム用語
        system_terms = [
            'header', 'sidebar', 'navigation', 'modal', 'button', 'form',
            'table', 'card', 'container', 'layout', 'grid', 'flex'
        ]
        
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(class_pattern, css_content):
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMのblock部分を抽出
            block_name = class_name.split('__')[0].split('--')[0]
            
            # 命名規則チェック
            is_business = any(term in block_name for term in business_terms)
            is_system = any(term in block_name for term in system_terms)
            
            if is_business:
                # 業務系：日本語ローマ字チェック
                if not re.match(r'^[a-z][a-z0-9]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'business_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'業務系クラス "{block_name}" は日本語ローマ字（英数字のみ）で命名してください',
                        'severity': 'warning',
                        'suggestion': 'ハイフンを削除し、英数字のみにしてください'
                    })
            
            elif is_system:
                # システム系：英語チェック
                if not re.match(r'^[a-z][a-z0-9-]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'system_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'システム系クラス "{block_name}" は英語（ハイフン区切り可）で命名してください',
                        'severity': 'warning',
                        'suggestion': '英語の単語を使用し、必要に応じてハイフンで区切ってください'
                    })
        
        return findings
    
    def _validate_forbidden_patterns(self, css_content: str, html_content: str) -> List[Dict[str, Any]]:
        """禁止パターン検証"""
        findings = []
        
        # !important 使用チェック
        important_matches = re.finditer(self.forbidden_patterns['important_usage'], css_content)
        for match in important_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'important_usage',
                'line': line_num,
                'message': '!important の使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSS変数オーバーライドまたはセレクター詳細度で解決してください'
            })
        
        # n3-接頭語チェック
        n3_matches = re.finditer(self.forbidden_patterns['n3_prefix'], css_content)
        for match in n3_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'deprecated_n3_prefix',
                'line': line_num,
                'message': 'n3-接頭語は廃止されました',
                'severity': 'critical',
                'suggestion': 'BEM準拠のクラス名に変更してください'
            })
        
        # インラインスタイルチェック（HTML）
        inline_matches = re.finditer(self.forbidden_patterns['inline_styles'], html_content)
        for match in inline_matches:
            line_num = html_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'inline_style_usage',
                'line': line_num,
                'message': 'インラインスタイルの使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSSクラスまたはCSS変数を使用してください'
            })
        
        return findings
    
    def _calculate_bem_compliance_score(self, findings: List[Dict[str, Any]]) -> float:
        """BEM準拠スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.3 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_bem_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """BEM改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'bem_violation' for f in findings):
            recommendations.append("BEM命名規則に準拠してください")
        
        if any(f.get('type') == 'important_usage' for f in findings):
            recommendations.append("!important の使用を避け、CSS変数を活用してください")
        
        if any(f.get('type') == 'business_naming_violation' for f in findings):
            recommendations.append("業務系クラスは日本語ローマ字で命名してください")
        
        if any(f.get('type') == 'system_naming_violation' for f in findings):
            recommendations.append("システム系クラスは英語で命名してください")
        
        return recommendations


class ResponsiveDesignValidationHook(BaseValidationHook):
    """Hook 8: レスポンシブデザイン検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.breakpoints = self._load_breakpoints()
        self.responsive_patterns = self._load_responsive_patterns()
    
    def _load_breakpoints(self) -> Dict[str, int]:
        """統一ブレークポイント（ナレッジベース準拠）"""
        return {
            'mobile': 480,
            'tablet': 768,
            'tablet_landscape': 1024,
            'desktop': 1200
        }
    
    def _load_responsive_patterns(self) -> Dict[str, str]:
        """レスポンシブパターン"""
        return {
            'media_query': r'@media\s*\([^)]+\)\s*{',
            'mobile_first': r'@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)',
            'desktop_first': r'@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)',
            'viewport_units': r'(width|height|font-size):\s*\d+v[wh]',
            'rem_units': r'(width|height|font-size|padding|margin):\s*\d+(\.\d+)?rem'
        }
    
    def execute_validation(,
                "element": r'^[a-z][a-z0-9-]*[a-z0-9]__[a-z][a-z0-9-]*[a-z0-9]self, css_content: str, html_content: str) -> Dict[str, Any]:
        """BEM準拠検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # CSS BEM検証
        css_findings = self._validate_css_bem(css_content)
        findings.extend(css_findings)
        
        # HTML-CSS整合性検証
        html_css_findings = self._validate_html_css_consistency(html_content, css_content)
        findings.extend(html_css_findings)
        
        # 命名規則検証
        naming_findings = self._validate_naming_conventions(css_content)
        findings.extend(naming_findings)
        
        # 禁止パターン検証
        forbidden_findings = self._validate_forbidden_patterns(css_content, html_content)
        findings.extend(forbidden_findings)
        
        # 結果集計
        critical_issues = [f for f in findings if f.get('severity') == 'critical']
        warning_issues = [f for f in findings if f.get('severity') == 'warning']
        
        result.update({
            'validation_status': 'failed' if critical_issues else ('warning' if warning_issues else 'passed'),
            'findings': findings,
            'compliance_score': self._calculate_bem_compliance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_bem_recommendations(findings)
        })
        
        return result
    
    def _validate_css_bem(self, css_content: str) -> List[Dict[str, Any]]:
        """CSS BEM構造検証"""
        findings = []
        
        # CSSクラス抽出
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        class_matches = re.finditer(class_pattern, css_content)
        
        for match in class_matches:
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMパターン検証
            bem_compliance = self._check_bem_pattern(class_name)
            
            if not bem_compliance['is_valid']:
                findings.append({
                    'type': 'bem_violation',
                    'class_name': class_name,
                    'line': line_num,
                    'message': f'クラス名 "{class_name}" がBEM規則に準拠していません',
                    'severity': 'warning',
                    'suggestion': bem_compliance['suggestion'],
                    'bem_analysis': bem_compliance
                })
        
        return findings
    
    def _check_bem_pattern(self, class_name: str) -> Dict[str, Any]:
        """BEMパターンチェック"""
        analysis = {
            'is_valid': False,
            'type': 'unknown',
            'suggestion': '',
            'structure': {}
        }
        
        # Block検証
        if re.match(self.bem_patterns['block'], class_name):
            analysis.update({
                'is_valid': True,
                'type': 'block',
                'structure': {'block': class_name}
            })
        
        # Element検証
        elif '__' in class_name:
            if re.match(self.bem_patterns['element'], class_name):
                parts = class_name.split('__')
                analysis.update({
                    'is_valid': True,
                    'type': 'element',
                    'structure': {'block': parts[0], 'element': parts[1]}
                })
            else:
                analysis['suggestion'] = 'Element形式: block__element'
        
        # Modifier検証
        elif '--' in class_name:
            if re.match(self.bem_patterns['modifier'], class_name):
                if '__' in class_name:
                    # Element modifier
                    bem_parts = class_name.split('__')
                    element_parts = bem_parts[1].split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'element_modifier',
                        'structure': {
                            'block': bem_parts[0],
                            'element': element_parts[0],
                            'modifier': element_parts[1]
                        }
                    })
                else:
                    # Block modifier
                    parts = class_name.split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'block_modifier',
                        'structure': {'block': parts[0], 'modifier': parts[1]}
                    })
            else:
                analysis['suggestion'] = 'Modifier形式: block--modifier または block__element--modifier'
        
        # 無効なパターン
        else:
            if '_' in class_name:
                analysis['suggestion'] = 'アンダースコアは __ (Element)または -- (Modifier)を使用してください'
            elif class_name[0].isupper():
                analysis['suggestion'] = 'クラス名は小文字で開始してください'
            else:
                analysis['suggestion'] = 'BEM形式に準拠してください: block, block__element, block--modifier'
        
        return analysis
    
    def _validate_html_css_consistency(self, html_content: str, css_content: str) -> List[Dict[str, Any]]:
        """HTML-CSS整合性検証"""
        findings = []
        
        # HTML内のクラス抽出
        html_classes = set()
        class_attr_pattern = r'class\s*=\s*["\']([^"\']+)["\']'
        for match in re.finditer(class_attr_pattern, html_content):
            classes = match.group(1).split()
            html_classes.update(classes)
        
        # CSS内のクラス抽出
        css_classes = set()
        css_class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(css_class_pattern, css_content):
            css_classes.add(match.group(1))
        
        # 未使用CSSクラス検出
        unused_css_classes = css_classes - html_classes
        for class_name in unused_css_classes:
            findings.append({
                'type': 'unused_css_class',
                'class_name': class_name,
                'message': f'CSSクラス "{class_name}" がHTMLで使用されていません',
                'severity': 'warning',
                'suggestion': 'HTMLで使用するか、不要な場合は削除してください'
            })
        
        # 未定義HTMLクラス検出
        undefined_html_classes = html_classes - css_classes
        for class_name in undefined_html_classes:
            # システム標準クラスは除外
            if class_name not in ['container', 'row', 'col']:
                findings.append({
                    'type': 'undefined_html_class',
                    'class_name': class_name,
                    'message': f'HTMLクラス "{class_name}" に対応するCSSが見つかりません',
                    'severity': 'warning',
                    'suggestion': 'CSSで定義するか、不要な場合はHTMLから削除してください'
                })
        
        return findings
    
    def _validate_naming_conventions(self, css_content: str) -> List[Dict[str, Any]]:
        """命名規則検証（システム=英語、業務=日本語ローマ字）"""
        findings = []
        
        # 既知のビジネス用語
        business_terms = [
            'shohin', 'zaiko', 'kicho', 'uriage', 'shiire', 'kaikei',
            'denpyo', 'torihiki', 'shiharai', 'nyukin', 'shukkin'
        ]
        
        # 既知のシステム用語
        system_terms = [
            'header', 'sidebar', 'navigation', 'modal', 'button', 'form',
            'table', 'card', 'container', 'layout', 'grid', 'flex'
        ]
        
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(class_pattern, css_content):
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMのblock部分を抽出
            block_name = class_name.split('__')[0].split('--')[0]
            
            # 命名規則チェック
            is_business = any(term in block_name for term in business_terms)
            is_system = any(term in block_name for term in system_terms)
            
            if is_business:
                # 業務系：日本語ローマ字チェック
                if not re.match(r'^[a-z][a-z0-9]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'business_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'業務系クラス "{block_name}" は日本語ローマ字（英数字のみ）で命名してください',
                        'severity': 'warning',
                        'suggestion': 'ハイフンを削除し、英数字のみにしてください'
                    })
            
            elif is_system:
                # システム系：英語チェック
                if not re.match(r'^[a-z][a-z0-9-]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'system_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'システム系クラス "{block_name}" は英語（ハイフン区切り可）で命名してください',
                        'severity': 'warning',
                        'suggestion': '英語の単語を使用し、必要に応じてハイフンで区切ってください'
                    })
        
        return findings
    
    def _validate_forbidden_patterns(self, css_content: str, html_content: str) -> List[Dict[str, Any]]:
        """禁止パターン検証"""
        findings = []
        
        # !important 使用チェック
        important_matches = re.finditer(self.forbidden_patterns['important_usage'], css_content)
        for match in important_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'important_usage',
                'line': line_num,
                'message': '!important の使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSS変数オーバーライドまたはセレクター詳細度で解決してください'
            })
        
        # n3-接頭語チェック
        n3_matches = re.finditer(self.forbidden_patterns['n3_prefix'], css_content)
        for match in n3_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'deprecated_n3_prefix',
                'line': line_num,
                'message': 'n3-接頭語は廃止されました',
                'severity': 'critical',
                'suggestion': 'BEM準拠のクラス名に変更してください'
            })
        
        # インラインスタイルチェック（HTML）
        inline_matches = re.finditer(self.forbidden_patterns['inline_styles'], html_content)
        for match in inline_matches:
            line_num = html_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'inline_style_usage',
                'line': line_num,
                'message': 'インラインスタイルの使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSSクラスまたはCSS変数を使用してください'
            })
        
        return findings
    
    def _calculate_bem_compliance_score(self, findings: List[Dict[str, Any]]) -> float:
        """BEM準拠スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.3 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_bem_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """BEM改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'bem_violation' for f in findings):
            recommendations.append("BEM命名規則に準拠してください")
        
        if any(f.get('type') == 'important_usage' for f in findings):
            recommendations.append("!important の使用を避け、CSS変数を活用してください")
        
        if any(f.get('type') == 'business_naming_violation' for f in findings):
            recommendations.append("業務系クラスは日本語ローマ字で命名してください")
        
        if any(f.get('type') == 'system_naming_violation' for f in findings):
            recommendations.append("システム系クラスは英語で命名してください")
        
        return recommendations


class ResponsiveDesignValidationHook(BaseValidationHook):
    """Hook 8: レスポンシブデザイン検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.breakpoints = self._load_breakpoints()
        self.responsive_patterns = self._load_responsive_patterns()
    
    def _load_breakpoints(self) -> Dict[str, int]:
        """統一ブレークポイント（ナレッジベース準拠）"""
        return {
            'mobile': 480,
            'tablet': 768,
            'tablet_landscape': 1024,
            'desktop': 1200
        }
    
    def _load_responsive_patterns(self) -> Dict[str, str]:
        """レスポンシブパターン"""
        return {
            'media_query': r'@media\s*\([^)]+\)\s*{',
            'mobile_first': r'@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)',
            'desktop_first': r'@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)',
            'viewport_units': r'(width|height|font-size):\s*\d+v[wh]',
            'rem_units': r'(width|height|font-size|padding|margin):\s*\d+(\.\d+)?rem'
        }
    
    def execute_validation(,
                "modifier": r'^[a-z][a-z0-9-]*[a-z0-9](__|--)[a-z][a-z0-9-]*[a-z0-9]self, css_content: str, html_content: str) -> Dict[str, Any]:
        """BEM準拠検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # CSS BEM検証
        css_findings = self._validate_css_bem(css_content)
        findings.extend(css_findings)
        
        # HTML-CSS整合性検証
        html_css_findings = self._validate_html_css_consistency(html_content, css_content)
        findings.extend(html_css_findings)
        
        # 命名規則検証
        naming_findings = self._validate_naming_conventions(css_content)
        findings.extend(naming_findings)
        
        # 禁止パターン検証
        forbidden_findings = self._validate_forbidden_patterns(css_content, html_content)
        findings.extend(forbidden_findings)
        
        # 結果集計
        critical_issues = [f for f in findings if f.get('severity') == 'critical']
        warning_issues = [f for f in findings if f.get('severity') == 'warning']
        
        result.update({
            'validation_status': 'failed' if critical_issues else ('warning' if warning_issues else 'passed'),
            'findings': findings,
            'compliance_score': self._calculate_bem_compliance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_bem_recommendations(findings)
        })
        
        return result
    
    def _validate_css_bem(self, css_content: str) -> List[Dict[str, Any]]:
        """CSS BEM構造検証"""
        findings = []
        
        # CSSクラス抽出
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        class_matches = re.finditer(class_pattern, css_content)
        
        for match in class_matches:
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMパターン検証
            bem_compliance = self._check_bem_pattern(class_name)
            
            if not bem_compliance['is_valid']:
                findings.append({
                    'type': 'bem_violation',
                    'class_name': class_name,
                    'line': line_num,
                    'message': f'クラス名 "{class_name}" がBEM規則に準拠していません',
                    'severity': 'warning',
                    'suggestion': bem_compliance['suggestion'],
                    'bem_analysis': bem_compliance
                })
        
        return findings
    
    def _check_bem_pattern(self, class_name: str) -> Dict[str, Any]:
        """BEMパターンチェック"""
        analysis = {
            'is_valid': False,
            'type': 'unknown',
            'suggestion': '',
            'structure': {}
        }
        
        # Block検証
        if re.match(self.bem_patterns['block'], class_name):
            analysis.update({
                'is_valid': True,
                'type': 'block',
                'structure': {'block': class_name}
            })
        
        # Element検証
        elif '__' in class_name:
            if re.match(self.bem_patterns['element'], class_name):
                parts = class_name.split('__')
                analysis.update({
                    'is_valid': True,
                    'type': 'element',
                    'structure': {'block': parts[0], 'element': parts[1]}
                })
            else:
                analysis['suggestion'] = 'Element形式: block__element'
        
        # Modifier検証
        elif '--' in class_name:
            if re.match(self.bem_patterns['modifier'], class_name):
                if '__' in class_name:
                    # Element modifier
                    bem_parts = class_name.split('__')
                    element_parts = bem_parts[1].split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'element_modifier',
                        'structure': {
                            'block': bem_parts[0],
                            'element': element_parts[0],
                            'modifier': element_parts[1]
                        }
                    })
                else:
                    # Block modifier
                    parts = class_name.split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'block_modifier',
                        'structure': {'block': parts[0], 'modifier': parts[1]}
                    })
            else:
                analysis['suggestion'] = 'Modifier形式: block--modifier または block__element--modifier'
        
        # 無効なパターン
        else:
            if '_' in class_name:
                analysis['suggestion'] = 'アンダースコアは __ (Element)または -- (Modifier)を使用してください'
            elif class_name[0].isupper():
                analysis['suggestion'] = 'クラス名は小文字で開始してください'
            else:
                analysis['suggestion'] = 'BEM形式に準拠してください: block, block__element, block--modifier'
        
        return analysis
    
    def _validate_html_css_consistency(self, html_content: str, css_content: str) -> List[Dict[str, Any]]:
        """HTML-CSS整合性検証"""
        findings = []
        
        # HTML内のクラス抽出
        html_classes = set()
        class_attr_pattern = r'class\s*=\s*["\']([^"\']+)["\']'
        for match in re.finditer(class_attr_pattern, html_content):
            classes = match.group(1).split()
            html_classes.update(classes)
        
        # CSS内のクラス抽出
        css_classes = set()
        css_class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(css_class_pattern, css_content):
            css_classes.add(match.group(1))
        
        # 未使用CSSクラス検出
        unused_css_classes = css_classes - html_classes
        for class_name in unused_css_classes:
            findings.append({
                'type': 'unused_css_class',
                'class_name': class_name,
                'message': f'CSSクラス "{class_name}" がHTMLで使用されていません',
                'severity': 'warning',
                'suggestion': 'HTMLで使用するか、不要な場合は削除してください'
            })
        
        # 未定義HTMLクラス検出
        undefined_html_classes = html_classes - css_classes
        for class_name in undefined_html_classes:
            # システム標準クラスは除外
            if class_name not in ['container', 'row', 'col']:
                findings.append({
                    'type': 'undefined_html_class',
                    'class_name': class_name,
                    'message': f'HTMLクラス "{class_name}" に対応するCSSが見つかりません',
                    'severity': 'warning',
                    'suggestion': 'CSSで定義するか、不要な場合はHTMLから削除してください'
                })
        
        return findings
    
    def _validate_naming_conventions(self, css_content: str) -> List[Dict[str, Any]]:
        """命名規則検証（システム=英語、業務=日本語ローマ字）"""
        findings = []
        
        # 既知のビジネス用語
        business_terms = [
            'shohin', 'zaiko', 'kicho', 'uriage', 'shiire', 'kaikei',
            'denpyo', 'torihiki', 'shiharai', 'nyukin', 'shukkin'
        ]
        
        # 既知のシステム用語
        system_terms = [
            'header', 'sidebar', 'navigation', 'modal', 'button', 'form',
            'table', 'card', 'container', 'layout', 'grid', 'flex'
        ]
        
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(class_pattern, css_content):
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMのblock部分を抽出
            block_name = class_name.split('__')[0].split('--')[0]
            
            # 命名規則チェック
            is_business = any(term in block_name for term in business_terms)
            is_system = any(term in block_name for term in system_terms)
            
            if is_business:
                # 業務系：日本語ローマ字チェック
                if not re.match(r'^[a-z][a-z0-9]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'business_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'業務系クラス "{block_name}" は日本語ローマ字（英数字のみ）で命名してください',
                        'severity': 'warning',
                        'suggestion': 'ハイフンを削除し、英数字のみにしてください'
                    })
            
            elif is_system:
                # システム系：英語チェック
                if not re.match(r'^[a-z][a-z0-9-]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'system_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'システム系クラス "{block_name}" は英語（ハイフン区切り可）で命名してください',
                        'severity': 'warning',
                        'suggestion': '英語の単語を使用し、必要に応じてハイフンで区切ってください'
                    })
        
        return findings
    
    def _validate_forbidden_patterns(self, css_content: str, html_content: str) -> List[Dict[str, Any]]:
        """禁止パターン検証"""
        findings = []
        
        # !important 使用チェック
        important_matches = re.finditer(self.forbidden_patterns['important_usage'], css_content)
        for match in important_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'important_usage',
                'line': line_num,
                'message': '!important の使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSS変数オーバーライドまたはセレクター詳細度で解決してください'
            })
        
        # n3-接頭語チェック
        n3_matches = re.finditer(self.forbidden_patterns['n3_prefix'], css_content)
        for match in n3_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'deprecated_n3_prefix',
                'line': line_num,
                'message': 'n3-接頭語は廃止されました',
                'severity': 'critical',
                'suggestion': 'BEM準拠のクラス名に変更してください'
            })
        
        # インラインスタイルチェック（HTML）
        inline_matches = re.finditer(self.forbidden_patterns['inline_styles'], html_content)
        for match in inline_matches:
            line_num = html_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'inline_style_usage',
                'line': line_num,
                'message': 'インラインスタイルの使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSSクラスまたはCSS変数を使用してください'
            })
        
        return findings
    
    def _calculate_bem_compliance_score(self, findings: List[Dict[str, Any]]) -> float:
        """BEM準拠スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.3 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_bem_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """BEM改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'bem_violation' for f in findings):
            recommendations.append("BEM命名規則に準拠してください")
        
        if any(f.get('type') == 'important_usage' for f in findings):
            recommendations.append("!important の使用を避け、CSS変数を活用してください")
        
        if any(f.get('type') == 'business_naming_violation' for f in findings):
            recommendations.append("業務系クラスは日本語ローマ字で命名してください")
        
        if any(f.get('type') == 'system_naming_violation' for f in findings):
            recommendations.append("システム系クラスは英語で命名してください")
        
        return recommendations


class ResponsiveDesignValidationHook(BaseValidationHook):
    """Hook 8: レスポンシブデザイン検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.breakpoints = self._load_breakpoints()
        self.responsive_patterns = self._load_responsive_patterns()
    
    def _load_breakpoints(self) -> Dict[str, int]:
        """統一ブレークポイント（ナレッジベース準拠）"""
        return {
            'mobile': 480,
            'tablet': 768,
            'tablet_landscape': 1024,
            'desktop': 1200
        }
    
    def _load_responsive_patterns(self) -> Dict[str, str]:
        """レスポンシブパターン"""
        return {
            'media_query': r'@media\s*\([^)]+\)\s*{',
            'mobile_first': r'@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)',
            'desktop_first': r'@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)',
            'viewport_units': r'(width|height|font-size):\s*\d+v[wh]',
            'rem_units': r'(width|height|font-size|padding|margin):\s*\d+(\.\d+)?rem'
        }
    
    def execute_validation(
            },
            "forbidden": {
                "camelCase": r'[a-z]+[A-Z]',
                "snake_case": r'[a-z]+_[a-z]',
                "uppercase": r'[A-Z]',
                "numbers_start": r'^[0-9]',
                "special_chars": r'[^a-z0-9_-]'
            }
        }
    
    def execute_validation(self, css_files: List[str]) -> Dict[str, Any]:
        """CSS命名規則検証実行"""
        result = super().execute_validation(css_files)
        findings = []
        
        for file_path in css_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                file_findings = self._validate_single_css_file(file_path, content)
                findings.extend(file_findings)
            
            except Exception as e:
                findings.append({
                    'type': 'file_read_error',
                    'file': file_path,
                    'message': f'ファイル読み込みエラー: {str(e)}',
                    'severity': 'critical'
                })
        
        result.update({
            'validation_status': 'failed' if any(f.get('severity') == 'critical' for f in findings) else 'passed',
            'findings': findings,
            'compliance_score': self._calculate_naming_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_naming_recommendations(findings)
        })
        
        return result
    
    def _validate_single_css_file(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """単一CSSファイルの命名検証"""
        findings = []
        
        # CSSクラス抽出
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        class_matches = re.finditer(class_pattern, content)
        
        for match in class_matches:
            class_name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            
            # クラス名解析
            analysis = self._analyze_class_name(class_name)
            
            # 命名規則違反チェック
            violations = self._check_naming_violations(class_name, analysis)
            
            for violation in violations:
                violation.update({
                    'file': file_path,
                    'line': line_num,
                    'class_name': class_name
                })
                findings.append(violation)
        
        return findings
    
    def _analyze_class_name(self, class_name: str) -> Dict[str, Any]:
        """クラス名解析"""
        analysis = {
            'original': class_name,
            'block': '',
            'element': '',
            'modifier': '',
            'category': 'unknown',
            'bem_type': 'unknown',
            'is_valid_bem': False
        }
        
        # BEM構造解析
        if '__' in class_name and '--' in class_name:
            # Element + Modifier
            parts = class_name.split('__')
            element_parts = parts[1].split('--')
            analysis.update({
                'block': parts[0],
                'element': element_parts[0],
                'modifier': element_parts[1],
                'bem_type': 'element_modifier'
            })
        elif '__' in class_name:
            # Element
            parts = class_name.split('__')
            analysis.update({
                'block': parts[0],
                'element': parts[1],
                'bem_type': 'element'
            })
        elif '--' in class_name:
            # Modifier
            parts = class_name.split('--')
            analysis.update({
                'block': parts[0],
                'modifier': parts[1],
                'bem_type': 'modifier'
            })
        else:
            # Block
            analysis.update({
                'block': class_name,
                'bem_type': 'block'
            })
        
        # カテゴリ判定
        block = analysis['block']
        analysis['category'] = self._determine_category(block)
        
        # BEM妥当性チェック
        analysis['is_valid_bem'] = self._is_valid_bem_structure(analysis)
        
        return analysis
    
    def _determine_category(self, block_name: str) -> str:
        """カテゴリ判定（システム/業務）"""
        # システム系キーワードチェック
        for keyword in self.naming_categories['system']['keywords']:
            if keyword in block_name:
                return 'system'
        
        # 業務系キーワードチェック
        for keyword in self.naming_categories['business']['keywords']:
            if keyword in block_name:
                return 'business'
        
        # パターンベースの判定
        if re.search(r'-', block_name):
            return 'system'  # ハイフン使用はシステム系
        
        return 'unknown'
    
    def _is_valid_bem_structure(self, analysis: Dict[str, Any]) -> bool:
        """BEM構造妥当性チェック"""
        bem_type = analysis['bem_type']
        
        if bem_type == 'block':
            return bool(re.match(self.validation_rules['bem_structure']['block'], analysis['original']))
        elif bem_type in ['element', 'modifier', 'element_modifier']:
            return bool(re.match(self.validation_rules['bem_structure']['modifier'], analysis['original']))
        
        return False
    
    def _check_naming_violations(self, class_name: str, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """命名規則違反チェック"""
        violations = []
        
        # 禁止パターンチェック
        for violation_type, pattern in self.validation_rules['forbidden'].items():
            if re.search(pattern, class_name):
                violations.append({
                    'type': f'forbidden_{violation_type}',
                    'message': f'禁止パターン {violation_type} が検出されました',
                    'severity': 'warning',
                    'suggestion': self._get_violation_suggestion(violation_type)
                })
        
        # カテゴリ別命名規則チェック
        category = analysis['category']
        if category in self.naming_categories:
            expected_pattern = self.naming_categories[category]['pattern']
            block_name = analysis['block']
            
            if not re.match(expected_pattern, block_name):
                violations.append({
                    'type': f'{category}_naming_violation',
                    'message': f'{category}系クラスの命名規則に違反しています',
                    'severity': 'warning',
                    'suggestion': f'{self.naming_categories[category]["language"]}で命名してください'
                })
        
        # BEM構造チェック
        if not analysis['is_valid_bem']:
            violations.append({
                'type': 'bem_structure_violation',
                'message': 'BEM構造に準拠していません',
                'severity': 'warning',
                'suggestion': 'Block__Element--Modifier の形式で命名してください'
            })
        
        return violations
    
    def _get_violation_suggestion(self, violation_type: str) -> str:
        """違反別改善提案"""
        suggestions = {
            'camelCase': 'ケバブケース（ハイフン区切り）を使用してください',
            'snake_case': 'アンダースコアの代わりにハイフンまたは__（Element）を使用してください',
            'uppercase': '小文字のみを使用してください',
            'numbers_start': '数字で始まるクラス名は避けてください',
            'special_chars': '英数字、ハイフン、アンダースコアのみを使用してください'
        }
        return suggestions.get(violation_type, '命名規則に従ってください')
    
    def _calculate_naming_score(self, findings: List[Dict[str, Any]]) -> float:
        """命名スコア計算"""
        if not findings:
            return 1.0
        
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        penalty = warning_count * 0.1
        
        return max(0.0, 1.0 - penalty)
    
    def _generate_naming_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """命名改善推奨事項"""
        recommendations = []
        
        if any('camelCase' in f.get('type', '') for f in findings):
            recommendations.append("camelCaseをケバブケースに変更してください")
        
        if any('bem_structure' in f.get('type', '') for f in findings):
            recommendations.append("BEM構造に準拠してください")
        
        if any('system_naming' in f.get('type', '') for f in findings):
            recommendations.append("システム系クラスは英語で命名してください")
        
        if any('business_naming' in f.get('type', '') for f in findings):
            recommendations.append("業務系クラスは日本語ローマ字で命名してください")
        
        return recommendations


class CSSPHPIntegrationValidationHook(BaseValidationHook):
    """Hook 10: CSS-PHP連携検証"""
    
    def execute_validation(self, css_files: List[str], php_files: List[str]) -> Dict[str, Any]:
        """CSS-PHP連携検証実行"""
        result = super().execute_validation(css_files + php_files)
        findings = []
        
        # 動的CSS生成チェック
        dynamic_css_findings = self._validate_dynamic_css_generation(php_files)
        findings.extend(dynamic_css_findings)
        
        # CSS変数PHP連携チェック
        css_var_findings = self._validate_css_variable_integration(css_files, php_files)
        findings.extend(css_var_findings)
        
        result.update({
            'validation_status': 'passed',
            'findings': findings,
            'compliance_score': 0.9,
            'execution_time': self._calculate_execution_time(),
            'recommendations': ['CSS-PHP連携を強化してください']
        })
        
        return result
    
    def _validate_dynamic_css_generation(self, php_files: List[str]) -> List[Dict[str, Any]]:
        """動的CSS生成検証"""
        findings = []
        
        for file_path in php_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # CSS生成パターン検索
                if 'generate-n3.php' in content or 'Content-Type: text/css' in content:
                    findings.append({
                        'type': 'dynamic_css_generation',
                        'file': file_path,
                        'message': '動的CSS生成が実装されています',
                        'severity': 'info'
                    })
            
            except Exception:
                continue
        
        return findings
    
    def _validate_css_variable_integration(self, css_files: List[str], php_files: List[str]) -> List[Dict[str, Any]]:
        """CSS変数統合検証"""
        findings = []
        
        # CSS変数使用チェック
        css_variables = set()
        for file_path in css_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                var_matches = re.findall(r'--([a-z0-9-]+)', content)
                css_variables.update(var_matches)
            
            except Exception:
                continue
        
        # PHP側でのCSS変数活用チェック
        for file_path in php_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if css_variables and any(var in content for var in css_variables):
                    findings.append({
                        'type': 'css_variable_php_integration',
                        'file': file_path,
                        'message': 'CSS変数のPHP連携が確認されました',
                        'severity': 'info'
                    })
            
            except Exception:
                continue
        
        return findings


class AccessibilityValidationHook(BaseValidationHook):
    """Hook 11: アクセシビリティ検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.aria_attributes = self._load_aria_attributes()
        self.semantic_elements = self._load_semantic_elements()
    
    def _load_aria_attributes(self) -> List[str]:
        """ARIA属性リスト"""
        return [
            'aria-label', 'aria-labelledby', 'aria-describedby',
            'aria-expanded', 'aria-hidden', 'aria-live',
            'aria-controls', 'aria-owns', 'role'
        ]
    
    def _load_semantic_elements(self) -> List[str]:
        """セマンティック要素リスト"""
        return [
            'header', 'nav', 'main', 'section', 'article',
            'aside', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
        ]
    
    def execute_validation(self, html_content: str, css_content: str) -> Dict[str, Any]:
        """アクセシビリティ検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # セマンティックHTML検証
        semantic_findings = self._validate_semantic_html(html_content)
        findings.extend(semantic_findings)
        
        # ARIA属性検証
        aria_findings = self._validate_aria_attributes(html_content)
        findings.extend(aria_findings)
        
        # カラーコントラスト検証
        contrast_findings = self._validate_color_contrast(css_content)
        findings.extend(contrast_findings)
        
        # キーボードナビゲーション検証
        keyboard_findings = self._validate_keyboard_navigation(html_content)
        findings.extend(keyboard_findings)
        
        result.update({
            'validation_status': 'passed',
            'findings': findings,
            'compliance_score': self._calculate_accessibility_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_accessibility_recommendations(findings)
        })
        
        return result
    
    def _validate_semantic_html(self, html_content: str) -> List[Dict[str, Any]]:
        """セマンティックHTML検証"""
        findings = []
        
        # セマンティック要素使用チェック
        semantic_usage = {}
        for element in self.semantic_elements:
            matches = re.findall(f'<{element}[^>]*>', html_content)
            semantic_usage[element] = len(matches)
        
        # 基本セマンティック要素の存在確認
        required_elements = ['header', 'main', 'footer']
        for element in required_elements:
            if semantic_usage.get(element, 0) == 0:
                findings.append({
                    'type': 'missing_semantic_element',
                    'element': element,
                    'message': f'セマンティック要素 <{element}> が見つかりません',
                    'severity': 'warning',
                    'suggestion': f'<{element}> 要素を追加してください'
                })
        
        # div の過度な使用チェック
        div_count = len(re.findall(r'<div[^>]*>', html_content))
        semantic_count = sum(semantic_usage.values())
        
        if div_count > semantic_count * 3:
            findings.append({
                'type': 'excessive_div_usage',
                'div_count': div_count,
                'semantic_count': semantic_count,
                'message': 'divの使用が多すぎます',
                'severity': 'warning',
                'suggestion': 'セマンティック要素の使用を増やしてください'
            })
        
        return findings
    
    def _validate_aria_attributes(self, html_content: str) -> List[Dict[str, Any]]:
        """ARIA属性検証"""
        findings = []
        
        # ARIA属性使用チェック
        aria_usage = {}
        for attr in self.aria_attributes:
            matches = re.findall(f'{attr}=["\'][^"\']*["\']', html_content)
            aria_usage[attr] = len(matches)
        
        # ボタン要素のaria-label チェック
        buttons = re.findall(r'<button[^>]*>', html_content)
        for button in buttons:
            if 'aria-label' not in button and not re.search(r'>[^<]+<', button):
                findings.append({
                    'type': 'missing_button_label',
                    'message': 'ボタンにアクセシブルなラベルがありません',
                    'severity': 'warning',
                    'suggestion': 'aria-labelまたはテキストコンテンツを追加してください'
                })
        
        return findings
    
    def _validate_color_contrast(self, css_content: str) -> List[Dict[str, Any]]:
        """カラーコントラスト検証（簡易版）"""
        findings = []
        
        # 低コントラストの可能性がある色の組み合わせを検出
        light_colors = ['#ffffff', '#f0f0f0', '#e0e0e0', 'white', 'lightgray']
        dark_colors = ['#000000', '#333333', '#666666', 'black', 'darkgray']
        
        color_matches = re.findall(r'color\s*:\s*([^;]+)', css_content)
        bg_matches = re.findall(r'background(?:-color)?\s*:\s*([^;]+)', css_content)
        
        # 簡易的なコントラスト警告
        if any(color in ' '.join(color_matches).lower() for color in light_colors) and \
           any(color in ' '.join(bg_matches).lower() for color in light_colors):
            findings.append({
                'type': 'potential_low_contrast',
                'message': '低コントラストの可能性があります',
                'severity': 'warning',
                'suggestion': 'カラーコントラストを確認してください（WCAG AA基準: 4.5:1以上）'
            })
        
        return findings
    
    def _validate_keyboard_navigation(self, html_content: str) -> List[Dict[str, Any]]:
        """キーボードナビゲーション検証"""
        findings = []
        
        # tabindex 使用チェック
        tabindex_matches = re.findall(r'tabindex=["\']([^"\']*)["\']', html_content)
        
        # 負のtabindex警告
        for tabindex in tabindex_matches:
            if tabindex.startswith('-'):
                findings.append({
                    'type': 'negative_tabindex',
                    'tabindex': tabindex,
                    'message': '負のtabindexが使用されています',
                    'severity': 'warning',
                    'suggestion': 'キーボードアクセシビリティを考慮してください'
                })
        
        return findings
    
    def _calculate_accessibility_score(self, findings: List[Dict[str, Any]]) -> float:
        """アクセシビリティスコア計算"""
        if not findings:
            return 1.0
        
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        penalty = warning_count * 0.1
        
        return max(0.0, 1.0 - penalty)
    
    def _generate_accessibility_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """アクセシビリティ改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'missing_semantic_element' for f in findings):
            recommendations.append("セマンティック要素を追加してください")
        
        if any(f.get('type') == 'missing_button_label' for f in findings):
            recommendations.append("ボタンにアクセシブルなラベルを追加してください")
        
        if any(f.get('type') == 'potential_low_contrast' for f in findings):
            recommendations.append("カラーコントラストを改善してください")
        
        return recommendations


class CSSPerformanceValidationHook(BaseValidationHook):
    """Hook 12: CSS パフォーマンス最適化検証"""
    
    def execute_validation(self, css_files: List[str]) -> Dict[str, Any]:
        """CSS パフォーマンス検証実行"""
        result = super().execute_validation(css_files)
        findings = []
        
        for file_path in css_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                file_findings = self._validate_css_performance(file_path, content)
                findings.extend(file_findings)
            
            except Exception as e:
                findings.append({
                    'type': 'file_read_error',
                    'file': file_path,
                    'message': f'ファイル読み込みエラー: {str(e)}',
                    'severity': 'critical'
                })
        
        result.update({
            'validation_status': 'passed',
            'findings': findings,
            'compliance_score': self._calculate_performance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_performance_recommendations(findings)
        })
        
        return result
    
    def _validate_css_performance(self, file_path: str, content: str) -> List[Dict[str, Any]]:
        """CSS パフォーマンス検証"""
        findings = []
        
        # ファイルサイズチェック
        file_size = len(content.encode('utf-8'))
        if file_size > 100 * 1024:  # 100KB
            findings.append({
                'type': 'large_css_file',
                'file': file_path,
                'size': file_size,
                'message': f'CSSファイルサイズが大きすぎます ({file_size:,} bytes)',
                'severity': 'warning',
                'suggestion': 'ファイルを分割するか、不要なスタイルを削除してください'
            })
        
        # 複雑なセレクタチェック
        complex_selectors = re.findall(r'[^{]+{', content)
        for selector in complex_selectors:
            selector_parts = selector.count(' ') + selector.count('>') + selector.count('+') + selector.count('~')
            if selector_parts > 4:
                findings.append({
                    'type': 'complex_selector',
                    'file': file_path,
                    'selector': selector.strip(),
                    'complexity': selector_parts,
                    'message': '複雑なセレクタが検出されました',
                    'severity': 'warning',
                    'suggestion': 'セレクタを簡素化してください'
                })
        
        # 未使用プロパティチェック（簡易版）
        unused_properties = [
            'filter: progid:DXImageTransform',  # IE固有
            '-webkit-appearance',  # 古いWebKit
            '-moz-appearance'      # 古いFirefox
        ]
        
        for prop in unused_properties:
            if prop in content:
                findings.append({
                    'type': 'deprecated_property',
                    'file': file_path,
                    'property': prop,
                    'message': f'非推奨プロパティが使用されています: {prop}',
                    'severity': 'warning',
                    'suggestion': 'モダンなCSSプロパティに更新してください'
                })
        
        return findings
    
    def _calculate_performance_score(self, findings: List[Dict[str, Any]]) -> float:
        """パフォーマンススコア計算"""
        if not findings:
            return 1.0
        
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        penalty = warning_count * 0.1
        
        return max(0.0, 1.0 - penalty)
    
    def _generate_performance_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """パフォーマンス改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'large_css_file' for f in findings):
            recommendations.append("大きなCSSファイルを分割してください")
        
        if any(f.get('type') == 'complex_selector' for f in findings):
            recommendations.append("複雑なセレクタを簡素化してください")
        
        if any(f.get('type') == 'deprecated_property' for f in findings):
            recommendations.append("非推奨プロパティをモダンなものに更新してください")
        
        return recommendations


# 実行例
if __name__ == "__main__":
    # テスト用の設定
    config = {
        "strict_mode": True,
        "knowledge_base_compliance": True
    }
    
    # Hook 7: BEM準拠検証テスト
    bem_hook = BEMComplianceValidationHook(config)
    css_content = """
    .header { background: #fff; }
    .header__logo { width: 100px; }
    .shohin__item { padding: 10px; }
    .shohin__item--active { background: #blue !important; }
    """
    html_content = """
    <div class="header">
        <div class="header__logo">Logo</div>
    </div>
    <div class="shohin__item shohin__item--active">Product</div>
    """
    
    result7 = bem_hook.execute_validation(css_content, html_content)
    print("Hook 7 (BEM準拠検証):", json.dumps(result7, ensure_ascii=False, indent=2))
    
    # Hook 8: レスポンシブデザイン検証テスト
    responsive_hook = ResponsiveDesignValidationHook(config)
    responsive_css = """
    .container { width: 100%; }
    @media (min-width: 768px) {
        .container { width: 750px; }
    }
    @media (min-width: 1200px) {
        .container { width: 1140px; }
    }
    """
    
    result8 = responsive_hook.execute_validation(responsive_css)
    print("Hook 8 (レスポンシブ検証):", json.dumps(result8, ensure_ascii=False, indent=2))
    
    # Hook 9: CSS命名規則検証テスト
    naming_hook = CSSNamingConventionValidationHook(config)
    result9 = naming_hook.execute_validation(['test.css'])
    print("Hook 9 (CSS命名規則):", json.dumps(result9, ensure_ascii=False, indent=2))
self, css_content: str, html_content: str) -> Dict[str, Any]:
        """BEM準拠検証実行"""
        result = super().execute_validation([])
        findings = []
        
        # CSS BEM検証
        css_findings = self._validate_css_bem(css_content)
        findings.extend(css_findings)
        
        # HTML-CSS整合性検証
        html_css_findings = self._validate_html_css_consistency(html_content, css_content)
        findings.extend(html_css_findings)
        
        # 命名規則検証
        naming_findings = self._validate_naming_conventions(css_content)
        findings.extend(naming_findings)
        
        # 禁止パターン検証
        forbidden_findings = self._validate_forbidden_patterns(css_content, html_content)
        findings.extend(forbidden_findings)
        
        # 結果集計
        critical_issues = [f for f in findings if f.get('severity') == 'critical']
        warning_issues = [f for f in findings if f.get('severity') == 'warning']
        
        result.update({
            'validation_status': 'failed' if critical_issues else ('warning' if warning_issues else 'passed'),
            'findings': findings,
            'compliance_score': self._calculate_bem_compliance_score(findings),
            'execution_time': self._calculate_execution_time(),
            'recommendations': self._generate_bem_recommendations(findings)
        })
        
        return result
    
    def _validate_css_bem(self, css_content: str) -> List[Dict[str, Any]]:
        """CSS BEM構造検証"""
        findings = []
        
        # CSSクラス抽出
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        class_matches = re.finditer(class_pattern, css_content)
        
        for match in class_matches:
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMパターン検証
            bem_compliance = self._check_bem_pattern(class_name)
            
            if not bem_compliance['is_valid']:
                findings.append({
                    'type': 'bem_violation',
                    'class_name': class_name,
                    'line': line_num,
                    'message': f'クラス名 "{class_name}" がBEM規則に準拠していません',
                    'severity': 'warning',
                    'suggestion': bem_compliance['suggestion'],
                    'bem_analysis': bem_compliance
                })
        
        return findings
    
    def _check_bem_pattern(self, class_name: str) -> Dict[str, Any]:
        """BEMパターンチェック"""
        analysis = {
            'is_valid': False,
            'type': 'unknown',
            'suggestion': '',
            'structure': {}
        }
        
        # Block検証
        if re.match(self.bem_patterns['block'], class_name):
            analysis.update({
                'is_valid': True,
                'type': 'block',
                'structure': {'block': class_name}
            })
        
        # Element検証
        elif '__' in class_name:
            if re.match(self.bem_patterns['element'], class_name):
                parts = class_name.split('__')
                analysis.update({
                    'is_valid': True,
                    'type': 'element',
                    'structure': {'block': parts[0], 'element': parts[1]}
                })
            else:
                analysis['suggestion'] = 'Element形式: block__element'
        
        # Modifier検証
        elif '--' in class_name:
            if re.match(self.bem_patterns['modifier'], class_name):
                if '__' in class_name:
                    # Element modifier
                    bem_parts = class_name.split('__')
                    element_parts = bem_parts[1].split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'element_modifier',
                        'structure': {
                            'block': bem_parts[0],
                            'element': element_parts[0],
                            'modifier': element_parts[1]
                        }
                    })
                else:
                    # Block modifier
                    parts = class_name.split('--')
                    analysis.update({
                        'is_valid': True,
                        'type': 'block_modifier',
                        'structure': {'block': parts[0], 'modifier': parts[1]}
                    })
            else:
                analysis['suggestion'] = 'Modifier形式: block--modifier または block__element--modifier'
        
        # 無効なパターン
        else:
            if '_' in class_name:
                analysis['suggestion'] = 'アンダースコアは __ (Element)または -- (Modifier)を使用してください'
            elif class_name[0].isupper():
                analysis['suggestion'] = 'クラス名は小文字で開始してください'
            else:
                analysis['suggestion'] = 'BEM形式に準拠してください: block, block__element, block--modifier'
        
        return analysis
    
    def _validate_html_css_consistency(self, html_content: str, css_content: str) -> List[Dict[str, Any]]:
        """HTML-CSS整合性検証"""
        findings = []
        
        # HTML内のクラス抽出
        html_classes = set()
        class_attr_pattern = r'class\s*=\s*["\']([^"\']+)["\']'
        for match in re.finditer(class_attr_pattern, html_content):
            classes = match.group(1).split()
            html_classes.update(classes)
        
        # CSS内のクラス抽出
        css_classes = set()
        css_class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(css_class_pattern, css_content):
            css_classes.add(match.group(1))
        
        # 未使用CSSクラス検出
        unused_css_classes = css_classes - html_classes
        for class_name in unused_css_classes:
            findings.append({
                'type': 'unused_css_class',
                'class_name': class_name,
                'message': f'CSSクラス "{class_name}" がHTMLで使用されていません',
                'severity': 'warning',
                'suggestion': 'HTMLで使用するか、不要な場合は削除してください'
            })
        
        # 未定義HTMLクラス検出
        undefined_html_classes = html_classes - css_classes
        for class_name in undefined_html_classes:
            # システム標準クラスは除外
            if class_name not in ['container', 'row', 'col']:
                findings.append({
                    'type': 'undefined_html_class',
                    'class_name': class_name,
                    'message': f'HTMLクラス "{class_name}" に対応するCSSが見つかりません',
                    'severity': 'warning',
                    'suggestion': 'CSSで定義するか、不要な場合はHTMLから削除してください'
                })
        
        return findings
    
    def _validate_naming_conventions(self, css_content: str) -> List[Dict[str, Any]]:
        """命名規則検証（システム=英語、業務=日本語ローマ字）"""
        findings = []
        
        # 既知のビジネス用語
        business_terms = [
            'shohin', 'zaiko', 'kicho', 'uriage', 'shiire', 'kaikei',
            'denpyo', 'torihiki', 'shiharai', 'nyukin', 'shukkin'
        ]
        
        # 既知のシステム用語
        system_terms = [
            'header', 'sidebar', 'navigation', 'modal', 'button', 'form',
            'table', 'card', 'container', 'layout', 'grid', 'flex'
        ]
        
        class_pattern = r'\.([a-zA-Z][a-zA-Z0-9_-]*)\s*{'
        for match in re.finditer(class_pattern, css_content):
            class_name = match.group(1)
            line_num = css_content[:match.start()].count('\n') + 1
            
            # BEMのblock部分を抽出
            block_name = class_name.split('__')[0].split('--')[0]
            
            # 命名規則チェック
            is_business = any(term in block_name for term in business_terms)
            is_system = any(term in block_name for term in system_terms)
            
            if is_business:
                # 業務系：日本語ローマ字チェック
                if not re.match(r'^[a-z][a-z0-9]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'business_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'業務系クラス "{block_name}" は日本語ローマ字（英数字のみ）で命名してください',
                        'severity': 'warning',
                        'suggestion': 'ハイフンを削除し、英数字のみにしてください'
                    })
            
            elif is_system:
                # システム系：英語チェック
                if not re.match(r'^[a-z][a-z0-9-]*[a-z0-9]$', block_name):
                    findings.append({
                        'type': 'system_naming_violation',
                        'class_name': class_name,
                        'block_name': block_name,
                        'line': line_num,
                        'message': f'システム系クラス "{block_name}" は英語（ハイフン区切り可）で命名してください',
                        'severity': 'warning',
                        'suggestion': '英語の単語を使用し、必要に応じてハイフンで区切ってください'
                    })
        
        return findings
    
    def _validate_forbidden_patterns(self, css_content: str, html_content: str) -> List[Dict[str, Any]]:
        """禁止パターン検証"""
        findings = []
        
        # !important 使用チェック
        important_matches = re.finditer(self.forbidden_patterns['important_usage'], css_content)
        for match in important_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'important_usage',
                'line': line_num,
                'message': '!important の使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSS変数オーバーライドまたはセレクター詳細度で解決してください'
            })
        
        # n3-接頭語チェック
        n3_matches = re.finditer(self.forbidden_patterns['n3_prefix'], css_content)
        for match in n3_matches:
            line_num = css_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'deprecated_n3_prefix',
                'line': line_num,
                'message': 'n3-接頭語は廃止されました',
                'severity': 'critical',
                'suggestion': 'BEM準拠のクラス名に変更してください'
            })
        
        # インラインスタイルチェック（HTML）
        inline_matches = re.finditer(self.forbidden_patterns['inline_styles'], html_content)
        for match in inline_matches:
            line_num = html_content[:match.start()].count('\n') + 1
            findings.append({
                'type': 'inline_style_usage',
                'line': line_num,
                'message': 'インラインスタイルの使用は禁止されています',
                'severity': 'critical',
                'suggestion': 'CSSクラスまたはCSS変数を使用してください'
            })
        
        return findings
    
    def _calculate_bem_compliance_score(self, findings: List[Dict[str, Any]]) -> float:
        """BEM準拠スコア計算"""
        if not findings:
            return 1.0
        
        critical_count = len([f for f in findings if f.get('severity') == 'critical'])
        warning_count = len([f for f in findings if f.get('severity') == 'warning'])
        
        penalty = critical_count * 0.3 + warning_count * 0.1
        return max(0.0, 1.0 - penalty)
    
    def _generate_bem_recommendations(self, findings: List[Dict[str, Any]]) -> List[str]:
        """BEM改善推奨事項"""
        recommendations = []
        
        if any(f.get('type') == 'bem_violation' for f in findings):
            recommendations.append("BEM命名規則に準拠してください")
        
        if any(f.get('type') == 'important_usage' for f in findings):
            recommendations.append("!important の使用を避け、CSS変数を活用してください")
        
        if any(f.get('type') == 'business_naming_violation' for f in findings):
            recommendations.append("業務系クラスは日本語ローマ字で命名してください")
        
        if any(f.get('type') == 'system_naming_violation' for f in findings):
            recommendations.append("システム系クラスは英語で命名してください")
        
        return recommendations


class ResponsiveDesignValidationHook(BaseValidationHook):
    """Hook 8: レスポンシブデザイン検証"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.breakpoints = self._load_breakpoints()
        self.responsive_patterns = self._load_responsive_patterns()
    
    def _load_breakpoints(self) -> Dict[str, int]:
        """統一ブレークポイント（ナレッジベース準拠）"""
        return {
            'mobile': 480,
            'tablet': 768,
            'tablet_landscape': 1024,
            'desktop': 1200
        }
    
    def _load_responsive_patterns(self) -> Dict[str, str]:
        """レスポンシブパターン"""
        return {
            'media_query': r'@media\s*\([^)]+\)\s*{',
            'mobile_first': r'@media\s*\(\s*min-width\s*:\s*(\d+)px\s*\)',
            'desktop_first': r'@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)',
            'viewport_units': r'(width|height|font-size):\s*\d+v[wh]',
            'rem_units': r'(width|height|font-size|padding|margin):\s*\d+(\.\d+)?rem'
        }
    
    def execute_validation(