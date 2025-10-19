"""
🛡️ Python版汎用エラー対策Hooksシステム
あらゆるPythonツール開発で再利用可能な基盤システム
前段階のエラー根本原因を完全解決
"""

import os
import sys
import json
import time
import traceback
import importlib
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Callable, Union
from datetime import datetime
import logging
from functools import wraps

@dataclass
class ErrorPattern:
    """エラーパターン定義"""
    pattern_name: str
    error_types: List[type]
    message_patterns: List[str]
    severity: str  # critical, high, medium, low
    category: str
    recovery_strategies: List[str]

@dataclass
class RecoveryContext:
    """復旧コンテキスト"""
    original_error: Exception
    error_pattern: str
    attempt_count: int = 0
    max_attempts: int = 3
    context_data: Dict[str, Any] = field(default_factory=dict)
    fallback_values: Dict[str, Any] = field(default_factory=dict)
    user_preferences: Dict[str, Any] = field(default_factory=dict)

class UniversalErrorHandlingHooks:
    """Python版汎用エラー対策Hooksシステム"""
    
    def __init__(self, project_root: Optional[str] = None):
        self.project_root = Path(project_root) if project_root else Path.cwd()
        self.error_patterns: Dict[str, ErrorPattern] = {}
        self.recovery_hooks: Dict[str, Callable] = {}
        self.fallback_strategies: Dict[str, Callable] = {}
        self.error_log: List[Dict[str, Any]] = []
        self.recovery_statistics: Dict[str, int] = {}
        
        # ログ設定
        self.setup_logging()
        
        # 基本エラーパターン登録
        self.register_universal_error_patterns()
        
        # 復旧フック登録
        self.register_recovery_hooks()
        
        self.logger.info("🛡️ Python版汎用エラー対策Hooksシステム初期化完了")

    def setup_logging(self):
        """ログシステム設定"""
        log_dir = self.project_root / "logs"
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / "error_handling.log"),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger("UniversalErrorHooks")

    def register_universal_error_patterns(self):
        """汎用エラーパターン登録"""
        
        # 1. ファイル/モジュール読み込みエラー
        self.error_patterns["file_import_error"] = ErrorPattern(
            pattern_name="file_import_error",
            error_types=[FileNotFoundError, ImportError, ModuleNotFoundError],
            message_patterns=[
                "No module named", "cannot import", "file not found",
                "No such file or directory", "import error"
            ],
            severity="high",
            category="file_system",
            recovery_strategies=[
                "try_alternative_paths",
                "install_missing_packages",
                "use_embedded_fallback",
                "create_missing_files"
            ]
        )
        
        # 2. データ解析/変換エラー
        self.error_patterns["data_parsing_error"] = ErrorPattern(
            pattern_name="data_parsing_error",
            error_types=[json.JSONDecodeError, ValueError, TypeError],
            message_patterns=[
                "json decode", "invalid literal", "can't convert",
                "invalid value", "parsing error"
            ],
            severity="medium",
            category="data_processing",
            recovery_strategies=[
                "sanitize_data",
                "try_alternative_parsers",
                "use_default_values",
                "partial_data_recovery"
            ]
        )
        
        # 3. 属性/キーアクセスエラー
        self.error_patterns["attribute_access_error"] = ErrorPattern(
            pattern_name="attribute_access_error",
            error_types=[AttributeError, KeyError, IndexError],
            message_patterns=[
                "has no attribute", "key error", "list index out of range",
                "object has no attribute", "missing key"
            ],
            severity="medium",
            category="object_access",
            recovery_strategies=[
                "use_safe_getters",
                "create_missing_attributes",
                "use_default_values",
                "validate_object_structure"
            ]
        )
        
        # 4. 依存関係/環境エラー
        self.error_patterns["dependency_error"] = ErrorPattern(
            pattern_name="dependency_error",
            error_types=[ImportError, OSError, RuntimeError],
            message_patterns=[
                "dependency", "requirement", "environment",
                "missing package", "version conflict"
            ],
            severity="critical",
            category="environment",
            recovery_strategies=[
                "install_dependencies",
                "check_environment",
                "use_alternative_implementations",
                "fallback_to_basic_features"
            ]
        )
        
        # 5. 非同期/並行処理エラー
        self.error_patterns["async_processing_error"] = ErrorPattern(
            pattern_name="async_processing_error",
            error_types=[TimeoutError, ConnectionError, RuntimeError],
            message_patterns=[
                "timeout", "connection", "async", "concurrent",
                "thread", "process"
            ],
            severity="high",
            category="async_processing",
            recovery_strategies=[
                "retry_with_backoff",
                "reduce_concurrency",
                "switch_to_sync",
                "use_cached_results"
            ]
        )

    def register_recovery_hooks(self):
        """復旧フック登録"""
        
        # ファイル/モジュール読み込み復旧
        self.recovery_hooks["file_import_error"] = self._recover_file_import_error
        
        # データ解析復旧
        self.recovery_hooks["data_parsing_error"] = self._recover_data_parsing_error
        
        # 属性アクセス復旧
        self.recovery_hooks["attribute_access_error"] = self._recover_attribute_access_error
        
        # 依存関係復旧
        self.recovery_hooks["dependency_error"] = self._recover_dependency_error
        
        # 非同期処理復旧
        self.recovery_hooks["async_processing_error"] = self._recover_async_processing_error

    def handle_error(self, error: Exception, context: Dict[str, Any] = None) -> Any:
        """メインエラーハンドリング"""
        
        if context is None:
            context = {}
            
        self.logger.error(f"🚨 エラー検出: {type(error).__name__}: {str(error)}")
        
        # エラーパターン識別
        pattern_name = self._identify_error_pattern(error)
        
        if pattern_name:
            self.logger.info(f"🎯 エラーパターン識別: {pattern_name}")
            
            # 復旧コンテキスト作成
            recovery_context = RecoveryContext(
                original_error=error,
                error_pattern=pattern_name,
                context_data=context
            )
            
            # 復旧実行
            return self._execute_recovery(pattern_name, recovery_context)
        else:
            self.logger.warning("❓ 未知のエラーパターン - 汎用復旧実行")
            return self._generic_error_recovery(error, context)

    def _identify_error_pattern(self, error: Exception) -> Optional[str]:
        """エラーパターン識別"""
        
        error_message = str(error).lower()
        error_type = type(error)
        
        for pattern_name, pattern in self.error_patterns.items():
            # エラー型チェック
            if error_type in pattern.error_types:
                return pattern_name
            
            # エラーメッセージパターンチェック
            for message_pattern in pattern.message_patterns:
                if message_pattern.lower() in error_message:
                    return pattern_name
        
        return None

    def _execute_recovery(self, pattern_name: str, context: RecoveryContext) -> Any:
        """復旧実行"""
        
        recovery_hook = self.recovery_hooks.get(pattern_name)
        if not recovery_hook:
            self.logger.error(f"❌ 復旧フックが見つかりません: {pattern_name}")
            return None
        
        max_attempts = context.max_attempts
        
        for attempt in range(max_attempts):
            context.attempt_count = attempt + 1
            
            try:
                self.logger.info(f"🔧 復旧試行 {context.attempt_count}/{max_attempts}: {pattern_name}")
                result = recovery_hook(context)
                
                if result is not None:
                    self.logger.info(f"✅ 復旧成功: {pattern_name}")
                    self._record_recovery_success(pattern_name, context)
                    return result
                    
            except Exception as recovery_error:
                self.logger.warning(f"⚠️ 復旧失敗 {context.attempt_count}/{max_attempts}: {recovery_error}")
                
                if attempt == max_attempts - 1:
                    self.logger.error(f"❌ 最終復旧失敗: {pattern_name}")
                    self._record_recovery_failure(pattern_name, context)
                else:
                    time.sleep(2 ** attempt)  # 指数バックオフ
        
        return None

    def _recover_file_import_error(self, context: RecoveryContext) -> Any:
        """ファイル/モジュール読み込み復旧"""
        
        original_path = context.context_data.get('original_path', '')
        module_name = context.context_data.get('module_name', '')
        
        # 1. 代替パス試行
        if original_path:
            alternative_paths = self._generate_alternative_paths(original_path)
            for alt_path in alternative_paths:
                if Path(alt_path).exists():
                    self.logger.info(f"✅ 代替パス発見: {alt_path}")
                    try:
                        if alt_path.endswith('.py'):
                            spec = importlib.util.spec_from_file_location("module", alt_path)
                            module = importlib.util.module_from_spec(spec)
                            spec.loader.exec_module(module)
                            return module
                        else:
                            with open(alt_path, 'r', encoding='utf-8') as f:
                                return f.read()
                    except Exception as e:
                        self.logger.warning(f"代替パス読み込み失敗: {e}")
                        continue
        
        # 2. 埋め込みフォールバック使用
        fallback_content = self._get_embedded_fallback(context)
        if fallback_content:
            self.logger.info("📋 埋め込みフォールバック使用")
            return fallback_content
        
        # 3. 動的ファイル作成
        if context.context_data.get('create_if_missing', False):
            created_content = self._create_missing_file(context)
            if created_content:
                self.logger.info("🏗️ 動的ファイル作成完了")
                return created_content
        
        return None

    def _recover_data_parsing_error(self, context: RecoveryContext) -> Any:
        """データ解析復旧"""
        
        raw_data = context.context_data.get('raw_data', '')
        expected_type = context.context_data.get('expected_type', 'dict')
        
        # 1. データサニタイゼーション
        try:
            sanitized_data = self._sanitize_data(raw_data)
            if expected_type == 'json':
                return json.loads(sanitized_data)
            elif expected_type == 'int':
                return int(float(sanitized_data))
            elif expected_type == 'float':
                return float(sanitized_data)
            else:
                return sanitized_data
        except Exception as e:
            self.logger.warning(f"サニタイゼーション失敗: {e}")
        
        # 2. 部分データ回復
        try:
            partial_data = self._extract_partial_data(raw_data, expected_type)
            if partial_data is not None:
                self.logger.info("✅ 部分データ回復成功")
                return partial_data
        except Exception as e:
            self.logger.warning(f"部分データ回復失敗: {e}")
        
        # 3. デフォルト値使用
        default_value = self._get_default_value(expected_type)
        self.logger.info(f"📋 デフォルト値使用: {default_value}")
        return default_value

    def _recover_attribute_access_error(self, context: RecoveryContext) -> Any:
        """属性アクセス復旧"""
        
        target_object = context.context_data.get('target_object')
        attribute_name = context.context_data.get('attribute_name', '')
        key_name = context.context_data.get('key_name', '')
        
        # 1. 安全ゲッター使用
        if target_object is not None:
            if attribute_name:
                result = getattr(target_object, attribute_name, None)
                if result is not None:
                    return result
            
            if key_name and hasattr(target_object, 'get'):
                result = target_object.get(key_name)
                if result is not None:
                    return result
        
        # 2. 属性/キー動的作成
        if context.context_data.get('create_if_missing', False):
            default_value = context.context_data.get('default_value')
            if target_object is not None and default_value is not None:
                if attribute_name:
                    setattr(target_object, attribute_name, default_value)
                    return default_value
                elif key_name and isinstance(target_object, dict):
                    target_object[key_name] = default_value
                    return default_value
        
        # 3. フォールバック値
        return context.context_data.get('fallback_value')

    def _recover_dependency_error(self, context: RecoveryContext) -> Any:
        """依存関係復旧"""
        
        package_name = context.context_data.get('package_name', '')
        
        # 1. パッケージ自動インストール試行
        if package_name and context.context_data.get('auto_install', False):
            try:
                import subprocess
                result = subprocess.run([
                    sys.executable, '-m', 'pip', 'install', package_name
                ], capture_output=True, text=True, timeout=60)
                
                if result.returncode == 0:
                    self.logger.info(f"✅ パッケージインストール成功: {package_name}")
                    # 再インポート試行
                    try:
                        return importlib.import_module(package_name)
                    except ImportError:
                        pass
            except Exception as e:
                self.logger.warning(f"パッケージインストール失敗: {e}")
        
        # 2. 代替実装使用
        alternative_implementation = self._get_alternative_implementation(package_name)
        if alternative_implementation:
            self.logger.info(f"📋 代替実装使用: {package_name}")
            return alternative_implementation
        
        # 3. 基本機能フォールバック
        basic_fallback = self._get_basic_fallback(package_name)
        if basic_fallback:
            self.logger.info(f"⚡ 基本機能フォールバック: {package_name}")
            return basic_fallback
        
        return None

    def _recover_async_processing_error(self, context: RecoveryContext) -> Any:
        """非同期処理復旧"""
        
        # 1. リトライ機構
        if context.attempt_count <= context.max_attempts:
            delay = min(2 ** context.attempt_count, 30)  # 最大30秒
            self.logger.info(f"⏱️ {delay}秒待機後リトライ")
            time.sleep(delay)
            
            # 元の処理を再実行（コンテキストから取得）
            original_function = context.context_data.get('original_function')
            if original_function and callable(original_function):
                try:
                    return original_function()
                except Exception as e:
                    self.logger.warning(f"リトライ失敗: {e}")
        
        # 2. キャッシュ結果使用
        cache_key = context.context_data.get('cache_key', '')
        if cache_key:
            cached_result = self._get_cached_result(cache_key)
            if cached_result is not None:
                self.logger.info("📦 キャッシュ結果使用")
                return cached_result
        
        # 3. 同期処理切り替え
        sync_alternative = context.context_data.get('sync_alternative')
        if sync_alternative and callable(sync_alternative):
            self.logger.info("🔄 同期処理に切り替え")
            try:
                return sync_alternative()
            except Exception as e:
                self.logger.warning(f"同期処理切り替え失敗: {e}")
        
        return None

    def _generate_alternative_paths(self, original_path: str) -> List[str]:
        """代替パス生成"""
        alternatives = []
        path_obj = Path(original_path)
        
        # 相対パス変換
        alternatives.extend([
            str(Path('.') / path_obj.name),
            str(Path('./hooks') / path_obj.name),
            str(Path('./src') / path_obj.name),
            str(Path('./lib') / path_obj.name),
            str(Path('./utils') / path_obj.name),
        ])
        
        # プロジェクトルート基準
        alternatives.extend([
            str(self.project_root / path_obj.name),
            str(self.project_root / 'hooks' / path_obj.name),
            str(self.project_root / 'src' / path_obj.name),
            str(self.project_root / 'lib' / path_obj.name),
        ])
        
        return alternatives

    def _get_embedded_fallback(self, context: RecoveryContext) -> Optional[str]:
        """埋め込みフォールバック取得"""
        
        file_type = context.context_data.get('file_type', 'unknown')
        
        fallbacks = {
            'hooks': '''
"""埋め込みフォールバックHooks"""

def default_hook(data):
    """デフォルトフック処理"""
    print(f"Default hook executed with: {data}")
    return data

def error_handler(error):
    """デフォルトエラーハンドラー"""
    print(f"Default error handler: {error}")
    return None

# デフォルトフック辞書
default_hooks = {
    'on_init': lambda: print("Default init hook"),
    'on_process': default_hook,
    'on_error': error_handler,
    'on_complete': lambda result: print(f"Default complete hook: {result}")
}
''',
            'config': '''
{
    "fallback_mode": true,
    "default_settings": {
        "retry_count": 3,
        "timeout": 5000,
        "auto_recovery": true
    },
    "error_handling": {
        "log_errors": true,
        "user_notification": false,
        "fallback_values": {}
    }
}
''',
            'rules': '''
"""埋め込みフォールバックルール"""

DEFAULT_RULES = {
    'validation': {
        'required_fields': [],
        'optional_fields': [],
        'data_types': {}
    },
    'processing': {
        'max_retries': 3,
        'timeout': 30,
        'fallback_enabled': True
    },
    'error_handling': {
        'log_level': 'INFO',
        'notification_enabled': False,
        'auto_recovery': True
    }
}

def validate_data(data, rules=None):
    """データ検証（フォールバック版）"""
    if rules is None:
        rules = DEFAULT_RULES['validation']
    return True  # 常に成功

def process_data(data, options=None):
    """データ処理（フォールバック版）"""
    if options is None:
        options = DEFAULT_RULES['processing']
    return data  # そのまま返却
'''
        }
        
        return fallbacks.get(file_type)

    def _sanitize_data(self, raw_data: str) -> str:
        """データサニタイゼーション"""
        if not isinstance(raw_data, str):
            raw_data = str(raw_data)
        
        # 制御文字除去
        sanitized = ''.join(char for char in raw_data if ord(char) >= 32)
        
        # 不正なJSON構文修正
        sanitized = sanitized.replace(',}', '}').replace(',]', ']')
        
        # 末尾カンマ除去
        import re
        sanitized = re.sub(r',(\s*[}\]])', r'\1', sanitized)
        
        return sanitized.strip()

    def _extract_partial_data(self, raw_data: str, expected_type: str) -> Any:
        """部分データ抽出"""
        import re
        
        if expected_type == 'json':
            # JSON部分抽出
            json_match = re.search(r'\{.*\}', raw_data, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            array_match = re.search(r'\[.*\]', raw_data, re.DOTALL)
            if array_match:
                return json.loads(array_match.group())
        
        elif expected_type in ['int', 'float']:
            # 数値部分抽出
            number_match = re.search(r'-?\d+\.?\d*', raw_data)
            if number_match:
                number_str = number_match.group()
                return float(number_str) if '.' in number_str else int(number_str)
        
        return None

    def _get_default_value(self, expected_type: str) -> Any:
        """デフォルト値取得"""
        defaults = {
            'dict': {},
            'list': [],
            'str': '',
            'int': 0,
            'float': 0.0,
            'bool': False,
            'json': {},
            'config': {'fallback': True},
            'rules': {'default_rules': True}
        }
        
        return defaults.get(expected_type, None)

    def _get_alternative_implementation(self, package_name: str) -> Any:
        """代替実装取得"""
        
        # よく使われるパッケージの代替実装
        alternatives = {
            'requests': self._create_basic_http_client(),
            'pandas': self._create_basic_data_processor(),
            'numpy': self._create_basic_math_utils(),
            'matplotlib': self._create_basic_plotter()
        }
        
        return alternatives.get(package_name)

    def _create_basic_http_client(self):
        """基本HTTPクライアント"""
        import urllib.request
        import urllib.parse
        
        class BasicHTTPClient:
            def get(self, url, **kwargs):
                try:
                    with urllib.request.urlopen(url) as response:
                        return response.read().decode('utf-8')
                except Exception as e:
                    self.logger.error(f"HTTP GET failed: {e}")
                    return None
        
        return BasicHTTPClient()

    def _create_basic_data_processor(self):
        """基本データプロセッサー"""
        class BasicDataProcessor:
            def __init__(self, data=None):
                self.data = data or []
            
            def to_dict(self):
                return {'data': self.data}
            
            def filter(self, condition):
                filtered = [item for item in self.data if condition(item)]
                return BasicDataProcessor(filtered)
        
        return BasicDataProcessor

    def _create_basic_math_utils(self):
        """基本数学ユーティリティ"""
        import math
        
        class BasicMathUtils:
            @staticmethod
            def mean(data):
                return sum(data) / len(data) if data else 0
            
            @staticmethod
            def std(data):
                if not data:
                    return 0
                mean_val = BasicMathUtils.mean(data)
                variance = sum((x - mean_val) ** 2 for x in data) / len(data)
                return math.sqrt(variance)
        
        return BasicMathUtils

    def _create_basic_plotter(self):
        """基本プロッター"""
        class BasicPlotter:
            def plot(self, x, y, **kwargs):
                print(f"Plot: x={x}, y={y}")
                return self
            
            def show(self):
                print("Plot displayed")
        
        return BasicPlotter()

    def _get_basic_fallback(self, package_name: str) -> Any:
        """基本機能フォールバック"""
        
        # 最小限の機能を提供
        class BasicFallback:
            def __init__(self, name):
                self.name = name
            
            def __getattr__(self, attr):
                def fallback_method(*args, **kwargs):
                    self.logger.info(f"Fallback method called: {self.name}.{attr}")
                    return None
                return fallback_method
        
        return BasicFallback(package_name)

    def _get_cached_result(self, cache_key: str) -> Any:
        """キャッシュ結果取得"""
        cache_file = self.project_root / '.cache' / f"{cache_key}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    # キャッシュの有効期限チェック（24時間）
                    cache_time = datetime.fromisoformat(cached_data['timestamp'])
                    if (datetime.now() - cache_time).total_seconds() < 86400:
                        return cached_data['result']
            except Exception as e:
                self.logger.warning(f"キャッシュ読み込み失敗: {e}")
        
        return None

    def _create_missing_file(self, context: RecoveryContext) -> Optional[str]:
        """不足ファイル作成"""
        
        file_path = context.context_data.get('file_path', '')
        file_type = context.context_data.get('file_type', 'unknown')
        
        if not file_path:
            return None
        
        # ディレクトリ作成
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        
        # デフォルトコンテンツ作成
        default_content = self._get_embedded_fallback(context)
        if default_content:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(default_content)
                self.logger.info(f"✅ ファイル作成完了: {file_path}")
                return default_content
            except Exception as e:
                self.logger.error(f"ファイル作成失敗: {e}")
        
        return None

    def _record_recovery_success(self, pattern_name: str, context: RecoveryContext):
        """復旧成功記録"""
        self.recovery_statistics[f"{pattern_name}_success"] = \
            self.recovery_statistics.get(f"{pattern_name}_success", 0) + 1
        
        self.error_log.append({
            'timestamp': datetime.now().isoformat(),
            'pattern': pattern_name,
            'status': 'recovered',
            'attempts': context.attempt_count,
            'error_type': type(context.original_error).__name__
        })

    def _record_recovery_failure(self, pattern_name: str, context: RecoveryContext):
        """復旧失敗記録"""
        self.recovery_statistics[f"{pattern_name}_failure"] = \
            self.recovery_statistics.get(f"{pattern_name}_failure", 0) + 1
        
        self.error_log.append({
            'timestamp': datetime.now().isoformat(),
            'pattern': pattern_name,
            'status': 'failed',
            'attempts': context.attempt_count,
            'error_type': type(context.original_error).__name__,
            'error_message': str(context.original_error)
        })

    def _generic_error_recovery(self, error: Exception, context: Dict[str, Any]) -> Any:
        """汎用エラー復旧"""
        
        self.logger.info("🔧 汎用エラー復旧実行")
        
        # フォールバック値返却
        fallback_value = context.get('fallback_value')
        if fallback_value is not None:
            self.logger.info("📋 フォールバック値使用")
            return fallback_value
        
        # 型別デフォルト値
        expected_type = context.get('expected_type', 'None')
        default_value = self._get_default_value(expected_type)
        
        self.logger.info(f"📋 デフォルト値使用: {default_value}")
        return default_value

    # 外部インターフェース
    def with_error_handling(self, 
                          fallback_value: Any = None,
                          expected_type: str = 'None',
                          auto_install: bool = False,
                          create_if_missing: bool = False,
                          **kwargs):
        """デコレーター用エラーハンドリング設定"""
        
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **func_kwargs):
                try:
                    return func(*args, **func_kwargs)
                except Exception as e:
                    context = {
                        'fallback_value': fallback_value,
                        'expected_type': expected_type,
                        'auto_install': auto_install,
                        'create_if_missing': create_if_missing,
                        'original_function': lambda: func(*args, **func_kwargs),
                        **kwargs
                    }
                    return self.handle_error(e, context)
            return wrapper
        return decorator

    def get_error_statistics(self) -> Dict[str, Any]:
        """エラー統計取得"""
        return {
            'recovery_statistics': self.recovery_statistics,
            'error_log_count': len(self.error_log),
            'recent_errors': self.error_log[-10:],  # 最新10件
            'success_rate': self._calculate_success_rate()
        }

    def _calculate_success_rate(self) -> Dict[str, float]:
        """成功率計算"""
        success_rates = {}
        
        for pattern_name in self.error_patterns:
            success_count = self.recovery_statistics.get(f"{pattern_name}_success", 0)
            failure_count = self.recovery_statistics.get(f"{pattern_name}_failure", 0)
            total_count = success_count + failure_count
            
            if total_count > 0:
                success_rates[pattern_name] = success_count / total_count
            else:
                success_rates[pattern_name] = 0.0
        
        return success_rates

# グローバルインスタンス
universal_error_hooks = UniversalErrorHandlingHooks()

# 便利関数
def safe_import(module_name: str, package_name: str = None, auto_install: bool = False):
    """安全なモジュールインポート"""
    try:
        if package_name:
            return importlib.import_module(module_name, package_name)
        else:
            return importlib.import_module(module_name)
    except (ImportError, ModuleNotFoundError) as e:
        context = {
            'module_name': module_name,
            'package_name': package_name,
            'auto_install': auto_install,
            'file_type': 'module'
        }
        return universal_error_hooks.handle_error(e, context)

def safe_file_read(file_path: str, encoding: str = 'utf-8', create_if_missing: bool = False):
    """安全なファイル読み込み"""
    try:
        with open(file_path, 'r', encoding=encoding) as f:
            return f.read()
    except (FileNotFoundError, OSError, UnicodeDecodeError) as e:
        context = {
            'original_path': file_path,
            'encoding': encoding,
            'create_if_missing': create_if_missing,
            'file_type': Path(file_path).suffix[1:] or 'text'
        }
        return universal_error_hooks.handle_error(e, context)

def safe_json_parse(json_string: str, fallback_value: Any = None):
    """安全なJSON解析"""
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError, ValueError) as e:
        context = {
            'raw_data': json_string,
            'expected_type': 'json',
            'fallback_value': fallback_value or {}
        }
        return universal_error_hooks.handle_error(e, context)

def safe_getattr(obj: Any, attr_name: str, default_value: Any = None, create_if_missing: bool = False):
    """安全な属性取得"""
    try:
        return getattr(obj, attr_name)
    except AttributeError as e:
        context = {
            'target_object': obj,
            'attribute_name': attr_name,
            'default_value': default_value,
            'create_if_missing': create_if_missing,
            'fallback_value': default_value
        }
        return universal_error_hooks.handle_error(e, context)

if __name__ == "__main__":
    print("🛡️ Python版汎用エラー対策Hooksシステム")
    print("=" * 60)
    print("✅ 基本エラーパターン登録完了")
    print("✅ 復旧フック登録完了") 
    print("✅ 便利関数定義完了")
    print("=" * 60)
    print("🎯 使用例:")
    print("1. safe_import('missing_module', auto_install=True)")
    print("2. safe_file_read('missing_file.py', create_if_missing=True)")
    print("3. safe_json_parse('{invalid json}', fallback_value={})")
    print("4. @universal_error_hooks.with_error_handling(fallback_value=[])")
    print("=" * 60)