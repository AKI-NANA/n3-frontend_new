# 🪝 汎用Hooks開発指示書【修正版】- AI学習・共有問題対応

## 🎯 **修正目的・背景**
分析結果により判明した問題点を解決し、真の汎用性を持つhooksシステムを設計する。

### **📊 修正対象問題**
1. **分類の不適切性**: 「専用」に分類されているが実際は「汎用」な項目の再分類
2. **AI学習の動作不明**: ローカルAI（DEEPSEEK/Ollama等）の具体的な動作・設定理解不足
3. **AI共有問題**: 複数ツール間でのデータ重複・設定分散・連携複雑化

---

## 🔄 **hooks分類の大幅修正**

### **🟢 新・汎用hooks（大幅拡充）**

#### **A. AI操作時自動質問システム（新規汎用）**
```python
class UniversalAIOperationHooks:
    """AI操作ボタン押下時の自動質問システム（汎用）"""
    
    def detect_ai_operation_and_question(self, button_context: Dict):
        """AIボタン押下→自動質問開始"""
        
        universal_questions = {
            "tool_selection": [
                "使用するAIツールは？",
                "・DEEPSEEK（コード生成特化）",
                "・Ollama（多モデル対応）", 
                "・Transformers（カスタマイズ重視）",
                "・OpenAI API（高精度優先）",
                "・混合使用（フォールバック設定）"
            ],
            
            "data_source_config": [
                "学習データの取得元は？",
                "・PostgreSQLテーブル（テーブル名指定）",
                "・CSVファイル（ファイルパス指定）",
                "・JSON API（エンドポイント指定）",
                "・手動入力（即座実行）",
                "・既存学習データ（再利用）"
            ],
            
            "model_storage_config": [
                "モデル・設定の保存場所は？",
                "・ai_workspace/models/（推奨）",
                "・カスタムパス指定",
                "・データベーステーブル",
                "・一時メモリのみ",
                "・外部ストレージ（S3等）"
            ],
            
            "execution_method": [
                "AI学習の実行方法は？",
                "・リアルタイム（データ変更時即座）",
                "・バッチ処理（定時実行）",
                "・手動実行（ボタンクリック時）",
                "・API経由（外部トリガー）"
            ],
            
            "performance_config": [
                "計算リソースの制限は？",
                "・GPU使用量（0-100%）",
                "・CPU使用量（0-100%）", 
                "・メモリ制限（GB指定）",
                "・実行時間制限（秒指定）",
                "・制限なし（最大性能）"
            ]
        }
        
        return self._generate_dynamic_questionnaire(universal_questions)
```

#### **B. バックエンド基本ルール（専用→汎用移行）**
```python
class UniversalBackendRulesHooks:
    """バックエンドの汎用ルール管理hooks"""
    
    def setup_universal_backend_structure(self):
        """どのツール・技術でも共通のバックエンド構造"""
        
        universal_backend_rules = {
            "directory_structure": {
                "rule": "models/config/logs/cache の4フォルダ必須",
                "enforcement": "自動作成・存在確認",
                "applies_to": ["FastAPI", "Django", "Flask", "Express", "全フレームワーク"]
            },
            
            "config_management": {
                "rule": "config.json統一フォーマット",
                "template": {
                    "database": {"host": "", "port": "", "name": ""},
                    "api": {"host": "", "port": "", "timeout": 30},
                    "security": {"jwt_secret": "", "cors_origins": []},
                    "performance": {"cache_size": "", "max_connections": ""}
                },
                "applies_to": ["全バックエンド技術"]
            },
            
            "error_handling": {
                "rule": "統一エラーレスポンス形式",
                "format": {
                    "status": "error",
                    "message": "エラーメッセージ",
                    "error_code": "ERROR_CODE",
                    "timestamp": "ISO8601",
                    "details": {}
                },
                "applies_to": ["API", "Web", "全レスポンス"]
            },
            
            "logging_standard": {
                "rule": "logs/app.log統一ログ出力",
                "format": "[TIMESTAMP] [LEVEL] [MODULE] MESSAGE",
                "levels": ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"],
                "applies_to": ["全バックエンド処理"]
            }
        }
        
        return universal_backend_rules
```

#### **C. セキュリティ基本ルール（完全汎用）**
```python
class UniversalSecurityHooks:
    """セキュリティの汎用ルール（技術無関係）"""
    
    def apply_universal_security_rules(self):
        """どの技術・フレームワークでも適用される基本セキュリティ"""
        
        universal_security = {
            "authentication": {
                "password_hash": "必須（bcrypt/scrypt/argon2）",
                "session_management": "必須（timeout設定）",
                "multi_factor": "推奨（TOTP/SMS）"
            },
            
            "input_validation": {
                "xss_prevention": "必須（HTML エスケープ）",
                "sql_injection": "必須（パラメータ化クエリ）",
                "csrf_protection": "必須（トークン検証）",
                "file_upload": "必須（拡張子・MIME検証）"
            },
            
            "data_protection": {
                "encryption_at_rest": "推奨（DB暗号化）",
                "encryption_in_transit": "必須（SSL/TLS）",
                "sensitive_data": "必須（ログ出力禁止）",
                "backup_security": "必須（暗号化バックアップ）"
            }
        }
        
        return universal_security
```

### **🟡 真の専用hooks（大幅縮小）**

#### **純粋に専用の項目のみ**
```yaml
DEEPSEEK専用:
  - .bin/.safetensors モデルファイル処理
  - DEEPSEEK固有API呼び出し仕様
  - DEEPSEEK特有のパラメータ調整

Ollama専用:
  - Modelfile構文解析・生成
  - ollama CLI コマンド実行
  - Ollama固有のモデル管理

FastAPI専用:
  - Pydantic スキーマ定義
  - FastAPI ミドルウェア設定
  - FastAPI 固有のデコレータ使用
```

---

## 🤖 **AI学習の具体的動作・設定質問システム**

### **🔍 ローカルAI動作確認の核心質問**

#### **A. AI学習動作確認質問（汎用hooks必須機能）**
```python
class AILearningOperationQuestionnaire:
    """AI学習操作時の必須動作確認質問"""
    
    def generate_ai_operation_questions(self, ai_tool_type: str):
        """AI学習開始時の必須確認質問"""
        
        core_questions = {
            "model_loading": [
                f"{ai_tool_type}のモデルはどこに保存しますか？",
                "・ai_workspace/models/{tool_name}/",
                "・カスタムパス（フルパス指定）",
                "・データベースBLOB保存",
                "・外部ストレージ（S3/NFS）",
                "",
                "モデルのロード方法は？",
                "・起動時一括ロード（高速・大メモリ）",
                "・オンデマンドロード（省メモリ・初回遅延）",
                "・分割ロード（大モデル対応）"
            ],
            
            "training_data_flow": [
                "学習データの流れを確認します：",
                "データソース → 前処理 → 学習 → モデル更新 → 結果保存",
                "",
                "各段階の設定は？",
                "・データソース：PostgreSQL/CSV/API/手動",
                "・前処理：正規化/トークン化/フィルタ",
                "・学習頻度：リアルタイム/バッチ/手動",
                "・モデル更新：上書き/バージョン管理/差分更新",
                "・結果保存：DB/ファイル/メモリ/API送信"
            ],
            
            "inference_execution": [
                "推論実行の設定を確認します：",
                "",
                "推論のトリガーは？",
                "・ユーザー入力時（リアルタイム）",
                "・データ変更時（自動実行）",
                "・定時実行（cron/スケジューラー）",
                "・API呼び出し時（外部トリガー）",
                "",
                "推論結果の出力先は？",
                "・画面表示（UI更新）",
                "・データベース保存",
                "・ファイル出力（CSV/JSON）",
                "・API レスポンス",
                "・他システム連携"
            ],
            
            "resource_management": [
                "計算リソースの管理設定：",
                "",
                f"{ai_tool_type}のリソース使用制限は？",
                "・GPU使用率（0-100%）",
                "・GPU メモリ使用量（GB）",
                "・CPU 使用率（0-100%）",
                "・システムメモリ使用量（GB）",
                "・実行時間制限（秒）",
                "",
                "リソース不足時の対応は？",
                "・待機（キューイング）",
                "・エラー終了",
                "・品質を下げて実行",
                "・外部API にフォールバック"
            ]
        }
        
        return self._format_questionnaire(core_questions)
```

#### **B. ツール固有動作質問**
```python
def generate_tool_specific_questions(self, tool_type: str):
    """ツール固有の動作確認質問"""
    
    if tool_type == "DEEPSEEK":
        return {
            "deepseek_specific": [
                "DEEPSEEKの動作設定：",
                "",
                "モデルファイル形式は？",
                "・.bin（PyTorch形式）",
                "・.safetensors（安全な形式）",
                "・.ggml（量子化形式）",
                "",
                "推論エンジンは？",
                "・transformers ライブラリ",
                "・vLLM（高速推論）",
                "・llama.cpp（軽量実行）",
                "",
                "コンテキスト長の設定は？",
                "・デフォルト（4096トークン）",
                "・拡張（8192/16384トークン）",
                "・動的調整（入力に応じて変更）"
            ]
        }
    
    elif tool_type == "Ollama":
        return {
            "ollama_specific": [
                "Ollamaの動作設定：",
                "",
                "Modelfileの管理は？",
                "・自動生成（設定から作成）",
                "・手動作成（カスタム調整）",
                "・既存テンプレート使用",
                "",
                "ollama サーバーの起動は？",
                "・システム起動時自動開始",
                "・アプリケーション開始時起動",
                "・使用時のみ起動",
                "",
                "モデルの切り替えは？",
                "・固定モデル使用",
                "・タスク別自動選択",
                "・ユーザー選択制"
            ]
        }
```

---

## 📁 **AI共有問題の解決方針**

### **🎯 統一AI ワークスペース設計**

#### **A. 統一ディレクトリ構造（共有問題解決）**
```
ai_workspace/                          # 統一ワークスペース
├── shared/                           # 共有リソース
│   ├── training_data/                # 全ツール共通学習データ
│   │   ├── raw/                      # 元データ
│   │   ├── processed/                # 前処理済み
│   │   └── validation/               # 検証用
│   ├── models/                       # 共通モデル保存
│   │   ├── embeddings/               # 埋め込みモデル
│   │   └── tokenizers/               # トークナイザー
│   └── results/                      # 結果出力
│       ├── predictions/              # 予測結果
│       └── evaluations/              # 評価結果
├── tools/                            # ツール別設定
│   ├── deepseek/
│   │   ├── models/                   # DEEPSEEK固有モデル
│   │   ├── config/                   # DEEPSEEK設定
│   │   └── cache/                    # DEEPSEEK キャッシュ
│   ├── ollama/
│   │   ├── models/                   # Ollama モデル
│   │   ├── modelfiles/               # Modelfile管理
│   │   └── config/                   # Ollama設定
│   └── transformers/
│       ├── models/                   # Transformers モデル
│       ├── config/                   # 設定ファイル
│       └── cache/                    # HuggingFace キャッシュ
└── unified_config/                   # 統一設定管理
    ├── ai_tools.json                 # ツール共通設定
    ├── data_sources.json             # データソース設定
    └── resource_limits.json          # リソース制限設定
```

#### **B. 統一設定管理システム**
```python
class UnifiedAIConfigManager:
    """AI共有問題解決：統一設定管理"""
    
    def __init__(self):
        self.workspace_root = Path("ai_workspace")
        self.unified_config_path = self.workspace_root / "unified_config"
        
    def setup_unified_workspace(self):
        """統一ワークスペース初期化"""
        
        # 1. ディレクトリ構造作成
        directories = [
            "shared/training_data/raw",
            "shared/training_data/processed", 
            "shared/training_data/validation",
            "shared/models/embeddings",
            "shared/models/tokenizers",
            "shared/results/predictions",
            "shared/results/evaluations",
            "tools/deepseek/models",
            "tools/deepseek/config",
            "tools/deepseek/cache",
            "tools/ollama/models",
            "tools/ollama/modelfiles",
            "tools/ollama/config",
            "tools/transformers/models",
            "tools/transformers/config",
            "tools/transformers/cache",
            "unified_config"
        ]
        
        for dir_path in directories:
            (self.workspace_root / dir_path).mkdir(parents=True, exist_ok=True)
    
    def create_unified_config(self):
        """統一設定ファイル生成"""
        
        unified_config = {
            "ai_tools.json": {
                "available_tools": ["deepseek", "ollama", "transformers", "openai_api"],
                "default_tool": "deepseek",
                "fallback_chain": ["deepseek", "ollama", "openai_api"],
                "tool_selection_rules": {
                    "code_generation": "deepseek",
                    "text_analysis": "ollama", 
                    "custom_training": "transformers",
                    "high_accuracy": "openai_api"
                }
            },
            
            "data_sources.json": {
                "primary_database": {
                    "type": "postgresql",
                    "connection": "postgresql://user:pass@localhost/db",
                    "tables": {
                        "training_data": "ai_training_data",
                        "models": "ai_models",
                        "results": "ai_results"
                    }
                },
                "file_sources": {
                    "csv_directory": "shared/training_data/raw",
                    "processed_directory": "shared/training_data/processed"
                }
            },
            
            "resource_limits.json": {
                "global_limits": {
                    "max_gpu_memory": "8GB",
                    "max_cpu_usage": "80%",
                    "max_system_memory": "16GB",
                    "max_execution_time": 3600
                },
                "tool_specific_limits": {
                    "deepseek": {"gpu_memory": "4GB", "cpu_usage": "50%"},
                    "ollama": {"gpu_memory": "6GB", "cpu_usage": "60%"},
                    "transformers": {"gpu_memory": "8GB", "cpu_usage": "80%"}
                }
            }
        }
        
        # 設定ファイル保存
        for filename, config in unified_config.items():
            with open(self.unified_config_path / filename, 'w') as f:
                json.dump(config, f, indent=2)
    
    def resolve_data_sharing_conflicts(self):
        """データ共有競合の解決"""
        
        sharing_strategy = {
            "training_data": {
                "policy": "copy_on_write",
                "master_location": "shared/training_data/",
                "tool_specific_copies": "tools/{tool_name}/cache/",
                "sync_strategy": "one_way_master_to_tool"
            },
            
            "models": {
                "policy": "format_conversion",
                "shared_formats": ["onnx", "safetensors"],
                "tool_native_formats": {
                    "deepseek": ["bin", "safetensors"],
                    "ollama": ["ggml", "gguf"],
                    "transformers": ["bin", "safetensors", "h5"]
                },
                "auto_conversion": True
            },
            
            "results": {
                "policy": "unified_format",
                "output_format": "json",
                "schema": {
                    "timestamp": "ISO8601",
                    "tool_used": "string",
                    "input_data": "object",
                    "output_data": "object",
                    "confidence_score": "float",
                    "execution_time_ms": "integer"
                }
            }
        }
        
        return sharing_strategy
```

#### **C. AI共有問題対応hooks**
```python
class AIDataSharingHooks:
    """AI共有問題専用hooks"""
    
    def detect_data_conflicts(self):
        """データ重複・競合の検出"""
        
        conflicts = {
            "duplicate_models": self._find_duplicate_models(),
            "conflicting_configs": self._find_config_conflicts(),
            "shared_resource_competition": self._detect_resource_conflicts()
        }
        
        return conflicts
    
    def auto_resolve_sharing_issues(self, conflicts: Dict):
        """共有問題の自動解決"""
        
        resolution_actions = []
        
        # 重複モデルの統合
        if conflicts["duplicate_models"]:
            resolution_actions.append(self._consolidate_duplicate_models())
        
        # 設定競合の解決
        if conflicts["conflicting_configs"]:
            resolution_actions.append(self._merge_conflicting_configs())
        
        # リソース競合の調整
        if conflicts["shared_resource_competition"]:
            resolution_actions.append(self._allocate_shared_resources())
        
        return resolution_actions
    
    def setup_ai_sharing_governance(self):
        """AI共有ガバナンス設定"""
        
        governance_rules = {
            "data_ownership": {
                "training_data": "shared_read_only",
                "models": "creator_ownership_shared_read",
                "results": "creator_ownership_shared_read"
            },
            
            "access_control": {
                "model_creation": "all_tools",
                "model_modification": "creator_only",
                "model_usage": "all_tools_read_only"
            },
            
            "resource_allocation": {
                "method": "time_slicing",
                "priority_rules": ["user_request", "scheduled_batch", "background_tasks"],
                "conflict_resolution": "queue_with_timeout"
            }
        }
        
        return governance_rules
```

---

## 🎯 **修正版hooks実装優先順位**

### **📋 Phase 1: 汎用hooks基盤構築**
1. **AI操作時自動質問システム** - 最優先実装
2. **統一AI ワークスペース管理** - AI共有問題解決
3. **バックエンド汎用ルール** - 既存専用から汎用へ移行
4. **セキュリティ汎用ルール** - 全技術共通基盤

### **📋 Phase 2: AI学習動作確認機能**
1. **ローカルAI動作質問生成** - DEEPSEEK/Ollama対応
2. **学習データフロー確認** - データソース～結果保存まで
3. **リソース管理設定** - GPU/CPU/メモリ制限管理
4. **推論実行制御** - トリガー・出力先設定

### **📋 Phase 3: 専用hooks最適化**
1. **真の専用hooks抽出** - 不適切分類の修正
2. **ツール固有機能のみ残存** - 純粋専用機能の明確化
3. **汎用・専用の明確な境界線確立**

この修正版指示書により、真の汎用性を持ったhooksシステムと、AI学習の具体的動作理解、AI共有問題の解決が実現されます。