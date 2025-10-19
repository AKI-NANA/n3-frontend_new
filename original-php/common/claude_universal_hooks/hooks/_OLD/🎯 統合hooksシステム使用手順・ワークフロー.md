# 🎯 統合hooksシステム使用手順・ワークフロー

## 📋 **Step 1: 初期セットアップ（1回のみ）**

### **1.1 ナレッジ登録**
```bash
# 統合hooksシステムをナレッジに追加
統合hooks実行マネージャー.md → プロジェクトナレッジに保存
```

### **1.2 確認事項**
- ✅ ナレッジに汎用hooks（CSS外部化、PHP化、JS外部化、Ajax実装）が存在
- ✅ hooks読み取りマップシステムが存在
- ✅ 統合hooks実行マネージャーが追加済み

---

## 🔧 **Step 2: プロジェクトごとの実行手順**

### **📝 必要な準備物**
1. **HTMLファイル** - 開発対象のHTML
2. **開発指示書** - 何を作るかの説明（テキスト・Markdown等）

### **🚀 実行フロー**

#### **Phase A: 専用hooks自動生成**
```bash
# HTMLファイルと開発指示書を準備
example_project/
├── target.html          # 開発対象HTML
└── requirements.md      # 開発指示書
```

**実行コマンド例：**
```python
# 1. HTML解析 → 専用hooks生成
html_analyzer = HTMLAnalyzer()
specific_hooks = html_analyzer.analyze_and_generate_hooks("target.html")

# 生成されるデータ例:
specific_hooks = {
    "buttons": {
        "save_btn": {"text": "保存", "function": "saveData()"},
        "calc_btn": {"text": "計算", "function": "calculate()"}
    },
    "forms": {
        "user_form": {"action": "register.php", "fields": ["name", "email"]}
    }
}
```

#### **Phase B: 統合スケジュール生成**
```python
# 2. 統合hooks実行マネージャー呼び出し
from project_knowledge_search import project_knowledge_search

# ナレッジから統合システム読み込み
integration_system = project_knowledge_search("統合hooks実行マネージャー")

# スケジュール自動生成
schedule = integration_system.generate_execution_plan(
    html_file="target.html",
    requirements="requirements.md",
    specific_hooks=specific_hooks
)
```

#### **Phase C: 開発スケジュール実行**
```python
# 3. フェーズ別実行
execution_result = integration_system.execute_phases(schedule)

# 自動生成される実行計画例:
"""
Phase 1: CSS外部化 (汎用hooks)
├── 質問: "inline styleの外部化方法は理解していますか？"
├── 実行: CSS抽出・外部ファイル化
└── 確認: BEM命名規則適用

Phase 2: PHP化 (汎用hooks)  
├── 質問: "HTML→PHP変換の方針は理解していますか？"
├── 実行: .html→.php変換・基盤追加
└── 確認: 動的コンテンツ準備

Phase 3: JavaScript外部化 (汎用hooks)
├── 質問: "onclick属性の外部化は理解していますか？"
├── 実行: event listener実装
└── 確認: 関数競合なし

Phase 4: Ajax基盤 (汎用hooks)
├── 質問: "Ajax通信の実装方針は理解していますか？"
├── 実行: Ajax基盤実装
└── 確認: CSRF対応・エラーハンドリング

Phase 5: 保存ボタン実装 (専用hooks)
├── 質問: "保存ボタンの動作内容は理解していますか？"
├── 実行: saveData()関数実装
└── 確認: データ保存・レスポンス処理

Phase 6: 計算ボタン実装 (専用hooks)
├── 質問: "計算ボタンの処理内容は理解していますか？"
├── 実行: calculate()関数実装
└── 確認: 計算処理・結果表示
"""
```

---

## 📊 **Step 3: 成果物生成・次プロジェクト準備**

### **3.1 プロジェクト完了時の成果物**
```bash
project_completed/
├── target.html                    # 元のHTML
├── requirements.md                # 開発指示書
├── generated_specific_hooks.md    # 自動生成された専用hooks
├── execution_schedule.md          # 実行スケジュール
├── execution_log.json            # 実行ログ・成功率
└── final_recommendations.md       # 最終推奨事項
```

### **3.2 次のプロジェクトでの再利用**
```python
# 新しいプロジェクトで再利用
next_project = {
    "html_file": "new_project.html",
    "requirements": "new_requirements.md",
    # 前回の成功パターンを参考として利用
    "reference_project": "project_completed/"
}

# 同じシステムで再実行
new_schedule = integration_system.generate_execution_plan(next_project)
```

---

## 🎯 **実際の使用例（具体的なコマンド）**

### **プロジェクト開始時**
```python
# 1. HTMLファイル準備
html_content = """
<!DOCTYPE html>
<html>
<head><title>在庫管理</title></head>
<body>
    <button onclick="addItem()">商品追加</button>
    <button onclick="searchItems()">検索</button>
    <form action="register.php" method="post">
        <input name="item_name" placeholder="商品名">
        <input name="quantity" placeholder="数量">
        <button type="submit">登録</button>
    </form>
</body>
</html>
"""

# 2. 開発指示書準備
requirements = """
在庫管理システムの開発
- 商品の追加・検索機能
- 在庫数の管理
- レスポンシブ対応
- Ajax通信実装
"""

# 3. 統合hooks実行
result = project_knowledge_search("統合hooks実行マネージャー").execute(
    html_content=html_content,
    requirements=requirements
)
```

### **実行結果の確認**
```python
print("📊 実行結果:")
print(f"全体成功率: {result['success_rate']:.1%}")
print(f"実行フェーズ数: {result['total_phases']}")
print(f"質問総数: {result['total_questions']}")
print(f"開発準備状況: {result['readiness_status']}")

if result['success_rate'] >= 0.85:
    print("✅ 開発開始可能！")
else:
    print("⚠️ 改善推奨事項:")
    for rec in result['recommendations']:
        print(f"  - {rec}")
```

---

## 🔄 **継続的改善・拡張**

### **4.1 新しい汎用hooksの追加**
```python
# 新しい汎用パターンが見つかった場合
new_universal_hook = {
    "security_check": {
        "phase_target": [1],
        "instructions": "セキュリティチェック手順...",
        "questions": ["XSS対策は理解していますか？"]
    }
}

# ナレッジに追加 → 次回から自動で使用される
```

### **4.2 専用hooksテンプレートの蓄積**
```python
# よく使われる専用パターンをテンプレート化
common_patterns = {
    "crud_buttons": "作成・読取・更新・削除ボタンセット",
    "search_form": "検索フォーム標準パターン",
    "pagination": "ページネーション標準パターン"
}

# これらも自動検出・適用されるように拡張
```

---

## 📋 **使用チェックリスト**

### **✅ 開始前確認**
- [ ] HTMLファイル準備完了
- [ ] 開発指示書作成完了
- [ ] ナレッジに統合hooksシステム登録済み

### **✅ 実行中確認**
- [ ] 各フェーズの質問に適切に回答
- [ ] 汎用hooks（Phase 1-4）の理解確認
- [ ] 専用hooks（Phase 5以降）の理解確認

### **✅ 完了後確認**
- [ ] 全体成功率85%以上達成
- [ ] 成果物（.md, .json）保存完了
- [ ] 次プロジェクト用参考資料準備完了

---

## 🏆 **期待される効果**

### **✅ 開発効率化**
- **手動質問作成**不要 → **自動生成**
- **個別hooks作成**不要 → **ナレッジ+HTML解析の統合**
- **開発順序検討**不要 → **自動スケジューリング**

### **✅ 品質保証**
- **経験者の知見**（汎用hooks）+ **プロジェクト固有要件**（専用hooks）
- **段階的確認**による確実な理解
- **成功率数値化**による客観的評価

### **✅ 資産化・再利用**
- **完了プロジェクトの知見**が次回に活用
- **共通パターン**の自動テンプレート化
- **継続的改善**による品質向上

---

**🎉 この手順により、HTMLと開発指示書だけで、ナレッジの汎用知識と自動生成の専用知識を統合した最適な開発スケジュールが自動生成され、確実な開発準備が実現できます！**