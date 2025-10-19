# 🗺️ hooks読み取りマップシステム

## 🎯 システム概要
各開発フェーズで「hooksデータのどこを読むか」を自動判定し、必要な部分のみ抽出して指示書を生成するシステム。

---

## 📋 hooks構造化・タグ付けシステム

### hooks データの構造化
```yaml
# complete_hooks_data.yaml (構造化されたhooksデータ)

project_info:
  name: "サンプルツール"
  total_phases: 8
  estimated_time: "240分"

# 汎用hooks（全プロジェクト共通）
universal_hooks:
  css_externalization:
    phase_target: [1]  # Phase 1で使用
    tags: ["css", "styling", "externalization"]
    instructions: |
      ## CSS外部化手順
      1. inline styleを抽出
      2. style.css作成
      3. class属性に変換
    code_templates:
      css_template: |
        /* 抽出されたCSS */
        {{EXTRACTED_STYLES}}
      html_modifications: |
        <!-- style属性削除、class属性追加 -->
        
  php_conversion:
    phase_target: [2]  # Phase 2で使用
    tags: ["php", "conversion", "backend"]
    instructions: |
      ## PHP化手順
      1. .htmlを.phpに変更
      2. PHP基盤追加
      3. 動的コンテンツ準備
    code_templates:
      php_base: |
        <?php
        session_start();
        // PHP基盤
        ?>
        
  js_externalization:
    phase_target: [3]  # Phase 3で使用
    tags: ["javascript", "externalization", "events"]
    instructions: |
      ## JavaScript外部化手順
      1. onclick属性抽出
      2. script.js作成
      3. event listener設定
    code_templates:
      js_base: |
        class ToolManager {
          // JavaScript基盤
        }
        
  ajax_implementation:
    phase_target: [4]  # Phase 4で使用
    tags: ["ajax", "api", "communication"]
    instructions: |
      ## Ajax基盤実装手順
      1. PHP Ajax ハンドラー
      2. JavaScript Ajax クライアント
      3. エラーハンドリング
    code_templates:
      ajax_handler: |
        function handleAjaxRequest() {
          // Ajax処理
        }

# 専用hooks（プロジェクト固有）
specific_hooks:
  buttons:
    btn_calculate:
      phase_target: [5]  # Phase 5で使用
      tags: ["button", "calculate", "math"]
      button_info:
        text: "計算実行"
        original_onclick: "calculate()"
        function_name: "executeCalculation"
        input_sources: ["#number1", "#number2"]
        output_target: "#result"
      ajax_config:
        required: true
        action_name: "calculate"
        php_function: "handleCalculateRequest"
      instructions: |
        ## 計算ボタン実装
        1. 数値入力の取得
        2. バリデーション実行
        3. Ajax計算処理
      code_templates:
        js_function: |
          async function executeCalculation() {
            const num1 = document.getElementById('number1').value;
            const num2 = document.getElementById('number2').value;
            // 計算処理
          }
        php_function: |
          function handleCalculateRequest($data) {
            $result = $data['num1'] + $data['num2'];
            return ['success' => true, 'result' => $result];
          }
          
    btn_save:
      phase_target: [6]  # Phase 6で使用
      tags: ["button", "save", "file"]
      button_info:
        text: "保存"
        original_onclick: "saveData()"
        function_name: "saveToFile"
        input_sources: ["#data-input"]
        output_target: "#status"
      ajax_config:
        required: true
        action_name: "save"
        php_function: "handleSaveRequest"
      instructions: |
        ## 保存ボタン実装
        1. データ入力の取得
        2. ファイル保存処理
        3. 成功メッセージ表示
      code_templates:
        js_function: |
          async function saveToFile() {
            const data = document.getElementById('data-input').value;
            // 保存処理
          }
        php_function: |
          function handleSaveRequest($data) {
            file_put_contents('data.txt', $data['content']);
            return ['success' => true, 'message' => '保存完了'];
          }

# フェーズマッピング（重要：どのフェーズで何を読むか）
phase_mapping:
  phase_1:
    name: "CSS外部化"
    required_hooks:
      - path: "universal_hooks.css_externalization"
        reason: "CSS外部化の汎用手順"
      - path: "project_info"
        reason: "プロジェクト基本情報"
    optional_hooks: []
    
  phase_2:
    name: "PHP化"
    required_hooks:
      - path: "universal_hooks.php_conversion"
        reason: "PHP化の汎用手順"
      - path: "specific_hooks.buttons"
        reason: "Ajax要否判定のため"
    optional_hooks: []
    
  phase_3:
    name: "JavaScript外部化"
    required_hooks:
      - path: "universal_hooks.js_externalization"
        reason: "JS外部化の汎用手順"
      - path: "specific_hooks.buttons"
        reason: "onclick関数の情報"
    optional_hooks: []
    
  phase_4:
    name: "Ajax基盤実装"
    required_hooks:
      - path: "universal_hooks.ajax_implementation"
        reason: "Ajax基盤の汎用手順"
      - path: "specific_hooks.buttons.*.ajax_config"
        reason: "必要なAjax処理の特定"
    optional_hooks: []
    
  phase_5:
    name: "計算ボタン実装"
    required_hooks:
      - path: "specific_hooks.buttons.btn_calculate"
        reason: "計算ボタンの完全仕様"
    optional_hooks:
      - path: "universal_hooks.ajax_implementation"
        reason: "Ajax実装参考"
        
  phase_6:
    name: "保存ボタン実装"
    required_hooks:
      - path: "specific_hooks.buttons.btn_save"
        reason: "保存ボタンの完全仕様"
    optional_hooks:
      - path: "universal_hooks.ajax_implementation"
        reason: "Ajax実装参考"
```

---

## 🔍 フェーズ別hooks読み取りエンジン

### 自動読み取りシステム
```python
def extract_hooks_for_phase(phase_number, complete_hooks_data):
    """指定フェーズに必要なhooksデータのみ抽出"""
    
    # 1. フェーズマッピング取得
    phase_info = complete_hooks_data["phase_mapping"][f"phase_{phase_number}"]
    
    # 2. 必要なhooksパス一覧
    required_paths = phase_info["required_hooks"]
    optional_paths = phase_info.get("optional_hooks", [])
    
    # 3. 実際のデータ抽出
    extracted_data = {
        "phase_info": phase_info,
        "required_data": {},
        "optional_data": {}
    }
    
    # 必須データ抽出
    for hook_ref in required_paths:
        path = hook_ref["path"]
        data = extract_data_by_path(complete_hooks_data, path)
        extracted_data["required_data"][path] = {
            "data": data,
            "reason": hook_ref["reason"]
        }
    
    # オプションデータ抽出
    for hook_ref in optional_paths:
        path = hook_ref["path"]
        data = extract_data_by_path(complete_hooks_data, path)
        extracted_data["optional_data"][path] = {
            "data": data,
            "reason": hook_ref["reason"]
        }
    
    return extracted_data

def extract_data_by_path(data, path):
    """ドット記法パスからデータ抽出"""
    
    keys = path.split(".")
    current = data
    
    for key in keys:
        if key == "*":  # ワイルドカード対応
            # 全ての子要素を返す
            return current
        elif isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    
    return current

def generate_phase_instructions(phase_number, extracted_hooks):
    """抽出されたhooksから実際の指示書生成"""
    
    phase_info = extracted_hooks["phase_info"]
    required_data = extracted_hooks["required_data"]
    
    instructions = f"""
# 🎯 Phase {phase_number}: {phase_info['name']}

## 📋 このフェーズで使用するhooksデータ

"""
    
    # 必須データの展開
    for path, hook_data in required_data.items():
        instructions += f"""
### 📚 {path}
**使用理由**: {hook_data['reason']}

**指示内容**:
{hook_data['data'].get('instructions', '')}

**コードテンプレート**:
```
{format_code_templates(hook_data['data'].get('code_templates', {}))}
```

"""
    
    return instructions

def format_code_templates(templates):
    """コードテンプレートのフォーマット"""
    formatted = ""
    for template_name, template_code in templates.items():
        formatted += f"# {template_name}\n{template_code}\n\n"
    return formatted
```

---

## 🗺️ 実際のフェーズ別読み取り例

### Phase 1実行時
```python
# Phase 1で読み取られるデータ
phase_1_data = extract_hooks_for_phase(1, complete_hooks_data)

# 結果:
{
  "phase_info": {
    "name": "CSS外部化"
  },
  "required_data": {
    "universal_hooks.css_externalization": {
      "data": {
        "instructions": "## CSS外部化手順\n1. inline styleを抽出...",
        "code_templates": {
          "css_template": "/* 抽出されたCSS */\n{{EXTRACTED_STYLES}}"
        }
      },
      "reason": "CSS外部化の汎用手順"
    },
    "project_info": {
      "data": {
        "name": "サンプルツール",
        "total_phases": 8
      },
      "reason": "プロジェクト基本情報"
    }
  }
}
```

### Phase 5実行時
```python
# Phase 5で読み取られるデータ
phase_5_data = extract_hooks_for_phase(5, complete_hooks_data)

# 結果:
{
  "phase_info": {
    "name": "計算ボタン実装"
  },
  "required_data": {
    "specific_hooks.buttons.btn_calculate": {
      "data": {
        "button_info": {
          "text": "計算実行",
          "function_name": "executeCalculation",
          "input_sources": ["#number1", "#number2"]
        },
        "ajax_config": {
          "required": true,
          "action_name": "calculate"
        },
        "instructions": "## 計算ボタン実装\n1. 数値入力の取得...",
        "code_templates": {
          "js_function": "async function executeCalculation() {...}",
          "php_function": "function handleCalculateRequest($data) {...}"
        }
      },
      "reason": "計算ボタンの完全仕様"
    }
  }
}
```

---

## 🔄 フェーズ実行時の自動読み取りフロー

### 完全自動化システム
```python
def execute_phase_with_auto_reading(phase_number, complete_hooks_path):
    """フェーズ実行時の自動hooks読み取り・指示書生成"""
    
    # 1. 完全hooksデータ読み込み
    complete_hooks_data = load_yaml(complete_hooks_path)
    
    # 2. フェーズ別データ抽出
    extracted_hooks = extract_hooks_for_phase(phase_number, complete_hooks_data)
    
    # 3. 実行用指示書生成
    phase_instructions = generate_phase_instructions(phase_number, extracted_hooks)
    
    # 4. アーティファクト修正コード生成
    artifact_code = generate_artifact_modifications(extracted_hooks)
    
    # 5. 完全な実行指示作成
    complete_instructions = f"""
{phase_instructions}

## 🔧 アーティファクト修正

{artifact_code}

## ✅ 完了確認
- [ ] 指定された修正が完了している
- [ ] 動作確認が完了している

**完了後、Phase {phase_number + 1}に進んでください**
"""
    
    return complete_instructions
```

---

## 📋 hooksデータの作成・管理

### hooks作成時のタグ付けルール
```yaml
# hooks作成時に必須のタグ付け
每个hooks条目必须包含:
  phase_target: [対象フェーズ番号のリスト]
  tags: [検索用タグのリスト]
  instructions: "具体的な実装手順"
  code_templates: "使用するコードテンプレート"

# 例:
universal_hooks:
  new_feature:
    phase_target: [7, 8]  # Phase 7-8で使用
    tags: ["feature", "implementation", "advanced"]
    instructions: |
      新機能実装手順
    code_templates:
      template1: "コードテンプレート1"
```

### フェーズマッピングの自動生成
```python
def auto_generate_phase_mapping(complete_hooks_data):
    """hooksデータからフェーズマッピング自動生成"""
    
    phase_mapping = {}
    
    # 全hooksを走査
    for category in ["universal_hooks", "specific_hooks"]:
        hooks_data = complete_hooks_data.get(category, {})
        
        for hook_name, hook_info in hooks_data.items():
            phase_targets = hook_info.get("phase_target", [])
            
            for phase_num in phase_targets:
                phase_key = f"phase_{phase_num}"
                
                if phase_key not in phase_mapping:
                    phase_mapping[phase_key] = {
                        "name": f"Phase {phase_num}",
                        "required_hooks": [],
                        "optional_hooks": []
                    }
                
                # hooksパス追加
                hook_path = f"{category}.{hook_name}"
                phase_mapping[phase_key]["required_hooks"].append({
                    "path": hook_path,
                    "reason": f"{hook_name}の実装"
                })
    
    return phase_mapping
```

---

## 🎯 システムの特徴

### ✅ 自動読み取り
- フェーズ番号を指定するだけで必要データ抽出
- パス指定によるピンポイント読み取り
- ワイルドカード対応

### ✅ 構造化hooks
- phase_targetによる使用フェーズ明確化
- タグ付けによる検索・分類
- 理由付きデータ抽出

### ✅ 完全自動化
- フェーズ実行時の自動読み取り
- 必要な部分のみの指示書生成
- アーティファクト修正コード自動生成

**このシステムにより、膨大なhooksデータから各フェーズで必要な部分のみを正確に読み取って実行できます！**