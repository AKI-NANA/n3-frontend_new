🪝 UNIVERSAL_HOOKS.md
🌐 全プロジェクト共通の開発前チェックシステム
目的: 全てのクロード開発プロジェクトで共通実行すべき基本品質・セキュリティチェック

🔒 Security Validation Hook
必須セキュリティチェック項目
javascriptconst SECURITY_CHECKS = {
csrf_protection: {
description: 'CSRF トークン実装確認',
check: () => {
return [
'CSRF トークン生成機能の実装',
'HTML でのトークン出力確認',
'JavaScript でのトークン取得確認',
'Ajax 送信時のトークン送信確認',
'PHP 側でのトークン検証確認'
];
}
},

    sql_injection: {
        description: 'SQLインジェクション対策確認',
        check: () => {
            return [
                'プリペアドステートメント使用確認',
                '動的SQL文の回避確認',
                '入力値の適切なエスケープ確認',
                'ユーザー入力の直接SQL埋め込み禁止確認'
            ];
        }
    },

    xss_protection: {
        description: 'XSS対策確認',
        check: () => {
            return [
                'htmlspecialchars()等のHTML出力エスケープ確認',
                'ユーザー入力のサニタイズ確認',
                'JavaScriptへの動的値埋め込み対策確認',
                'Content-Type ヘッダー適切設定確認'
            ];
        }
    },

    input_validation: {
        description: '入力値検証実装確認',
        check: () => {
            return [
                '必須パラメータの存在チェック実装',
                'データ型検証の実装',
                '文字数・範囲制限の実装',
                '不正な値の早期リジェクト実装'
            ];
        }
    },

    error_handling: {
        description: 'エラーハンドリング実装確認',
        check: () => {
            return [
                'try-catch文の適切な実装',
                'ユーザーフレンドリーなエラーメッセージ',
                '機密情報を含まないエラー出力',
                'ログ出力の適切な実装'
            ];
        }
    }

};
セキュリティチェック実行手順
markdown⚠️ 【必須実行】以下を開発前に確認：

□ CSRF トークンの完全実装
□ SQL インジェクション対策の実装
□ XSS 対策の実装
□ 入力値検証の実装
□ エラーハンドリングの実装

❌ 1 つでも未実装の場合は開発開始禁止

📝 Code Quality Hook
必須コード品質チェック項目
javascriptconst CODE_QUALITY_CHECKS = {
syntax_errors: {
description: '構文エラーチェック',
php_check: 'find . -name "\*.php" -exec php -l {} \\; 2>&1 | grep -i error',
js_check: 'eslint や構文チェックツールでの検証',
requirement: 'エラー 0 件必須'
},

    naming_convention: {
        description: '命名規則統一',
        rules: [
            'PHP: snake_case（変数・関数）',
            'PHP: PascalCase（クラス名）',
            'JavaScript: camelCase（変数・関数）',
            'CSS: BEM記法またはkebab-case',
            'data-action: kebab-case'
        ]
    },

    code_organization: {
        description: 'コード構成',
        requirements: [
            'HTMLからインラインstyle・script完全除去',
            'CSS外部ファイル化',
            'JavaScript外部ファイル化',
            '適切なディレクトリ構造',
            '機能別ファイル分離'
        ]
    },

    documentation: {
        description: 'ドキュメント・コメント',
        requirements: [
            '関数・クラスの目的説明',
            '複雑なロジックのコメント',
            'パラメータ・戻り値の説明',
            '外部依存関係の明記'
        ]
    }

};
コード品質チェック実行手順
markdown⚠️ 【必須実行】以下を開発前・後に確認：

□ PHP 構文エラー 0 件
□ JavaScript 構文エラー 0 件
□ 命名規則の統一
□ インライン要素の完全除去
□ 適切なコメント・ドキュメント

❌ 品質基準未達の場合は修正後再チェック

🧪 Basic Functionality Hook
必須基本機能チェック項目
javascriptconst FUNCTIONALITY_CHECKS = {
ajax_communication: {
description: 'Ajax 通信の基本動作',
test_items: [
'health_check アクションの正常実行',
'CSRF トークン送信・検証の動作',
'エラー時の適切なレスポンス',
'JSON 形式でのレスポンス確認'
]
},

    data_flow: {
        description: 'データ送受信確認',
        test_items: [
            'HTMLからJavaScriptへのデータ抽出',
            'JavaScriptからPHPへのデータ送信',
            'PHPからJavaScriptへのレスポンス',
            'データ型の正確な受け渡し'
        ]
    },

    error_cases: {
        description: 'エラーケース処理確認',
        test_items: [
            '必須パラメータ不足時のエラー',
            '不正な値入力時のエラー',
            'ネットワークエラー時の処理',
            'タイムアウト時の処理'
        ]
    },

    ui_updates: {
        description: 'UI更新確認',
        test_items: [
            'ボタンクリック時の即座な反応',
            'ローディング状態の表示',
            '成功・エラー時の通知表示',
            '動的コンテンツの更新'
        ]
    }

};
基本機能チェック実行手順
markdown⚠️ 【必須実行】以下を実装後に確認：

□ health_check の正常動作
□ Ajax 通信の正常動作
□ エラーケースの適切な処理
□ UI 更新の正常動作

❌ 基本機能未動作の場合は修正後再テスト

🎯 Universal Hooks 実行フロー
Step 1: 開発前チェック
markdown🔍 【開発開始前】以下を必ず確認：

1. ✅ セキュリティ要件の理解
   - CSRF、SQL インジェクション、XSS 対策の実装方法を理解
2. ✅ コード品質基準の理解
   - 命名規則、ファイル構成、ドキュメント要件を理解
3. ✅ 基本機能要件の理解
   - Ajax 通信、データフロー、エラー処理の実装方法を理解

❌ 理解不足の場合は学習後に開発開始
Step 2: 実装中チェック
markdown🔧 【実装中】以下を随時確認：

1. ✅ セキュリティ実装の進捗
   - 各機能実装時にセキュリティ要件を満たしているか確認
2. ✅ コード品質の維持
   - ファイル追加・修正時に品質基準を満たしているか確認
3. ✅ 基本機能の動作

   - 新機能実装時に基本動作が正常か確認
     Step 3: 実装後チェック
     markdown🧪 【実装完了後】以下を必ず実行：

4. ✅ セキュリティ検証
   □ CSRF 攻撃耐性テスト
   □ SQL インジェクション耐性テスト
   □ XSS 攻撃耐性テスト
5. ✅ コード品質検証
   □ 構文エラーチェック実行
   □ 命名規則チェック実行
   □ ファイル構成チェック実行
6. ✅ 基本機能検証
   □ 全 Ajax 通信の動作確認
   □ エラーケースの動作確認
   □ UI 更新の動作確認

❌ 検証失敗の場合は修正後再検証
✅ 全検証成功後に Universal Hooks 完了

🚨 Universal Hooks 失敗時の対応
セキュリティチェック失敗時
markdown❌ セキュリティ要件未達の場合：

1. 🔒 該当セキュリティ対策の学習
2. 🔧 適切な実装方法の確認
3. 🧪 実装後の再テスト
4. ✅ 全セキュリティ要件クリアまで継続

⚠️ セキュリティ未達での開発継続は禁止
コード品質チェック失敗時
markdown❌ 品質基準未達の場合：

1. 📝 品質問題の特定
2. 🔧 適切な修正の実施
3. 🧪 修正後の再チェック
4. ✅ 全品質基準クリアまで継続

⚠️ 品質未達での次工程進行は推奨されない
基本機能チェック失敗時
markdown❌ 基本機能未動作の場合：

1. 🔍 問題箇所の特定
2. 🔧 根本原因の修正
3. 🧪 修正後の再テスト
4. ✅ 全基本機能動作まで継続

⚠️ 基本機能未動作での機能追加は禁止

📊 Universal Hooks 成功基準
✅ 合格基準
markdown🎯 Universal Hooks 合格基準：

□ セキュリティチェック：100%クリア必須
□ コード品質チェック：90%以上クリア
□ 基本機能チェック：100%クリア必須

✅ 全基準クリア → Project-Specific Hooks 進行可能
❌ 1 項目でも未達 → 修正後再チェック
📈 品質レベル判定
markdown🌟 品質レベル：

- Excellent（95%以上）：非常に高品質
- Good（85-94%）：良好な品質
- Acceptable（75-84%）：許容レベル
- Poor（75%未満）：要改善

⚠️ Acceptable 以上で Project-Specific Hooks 進行可能

Universal Hooks 実行により、全てのクロード開発プロジェクトで最低限の品質・セキュリティ・機能基準が保証されます。
