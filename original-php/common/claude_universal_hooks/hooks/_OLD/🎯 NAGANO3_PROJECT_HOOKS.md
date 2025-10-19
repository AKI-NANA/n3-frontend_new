🎯 NAGANO3_PROJECT_HOOKS.md
🎯 NAGANO3 プロジェクト固有の開発前チェックシステム
目的: NAGANO3 記帳ツールプロジェクト特有の知識・技術・要件チェック

📚 NAGANO3 Knowledge Verification Hook
プロジェクト固有知識チェック
javascriptconst NAGANO3_KNOWLEDGE_CHECKS = {
data_flow_understanding: {
question: 'HTML の data-action="delete-data-item"がクリックされた時、PHP で受け取るべき必須パラメータは何ですか？',
expected_answer: [
'item_id（削除対象の ID）',
'csrf_token（CSRF 検証用トークン）',
'action（delete-data-item）'
],
implementation_note: 'data-item-id 属性から item_id パラメータを抽出する必要がある'
},

    phase_understanding: {
        question: 'Phase2の詳細実装とPhase1の簡易実装の違いは何ですか？',
        expected_answer: [
            'Phase2：実データベース接続・トランザクション・エラーハンドリング完備',
            'Phase1：模擬データ・基本的なレスポンスのみ',
            'Phase2：UI更新指示・ログ記録・関連データ処理を含む'
        ],
        implementation_note: 'Phase2の詳細実装の採用が必須'
    },

    mf_integration: {
        question: 'MFクラウド連携で必要な技術要素は何ですか？',
        expected_answer: [
            'OAuth2認証システム',
            'MFクラウドAPI通信処理',
            '取引データパース・変換処理',
            'データベース保存処理',
            '重複検出・除外システム',
            'エラーハンドリング・リトライ機能'
        ],
        implementation_note: 'callPythonAIService()と同様のAPI連携パターンを使用'
    },

    ai_learning_flow: {
        question: 'AI学習機能の処理フローを順番に説明してください',
        expected_answer: [
            '1. テキスト入力取得・検証',
            '2. データベースにセッション記録',
            '3. Python FastAPI呼び出し',
            '4. AI処理結果の受信・検証',
            '5. 結果のデータベース保存',
            '6. UI更新・結果表示'
        ],
        implementation_note: 'execute-integrated-ai-learningの完全実装が必要'
    },

    error_prevention: {
        question: 'Phase1で防ぐべき最重要エラー3つは何ですか？',
        expected_answer: [
            'JavaScript競合エラー（useCapture・stopImmediatePropagation必須）',
            'PHP構文エラー（return vs => エラー）',
            'CSRF検証失敗（トークン生成・送信・検証の不備）'
        ],
        implementation_note: '43個エラーパターンの事前チェックが必要'
    }

};
知識チェック実行手順
markdown🧠 【必須実行】NAGANO3 知識確認：

以下の質問に正確に回答できることを確認：

□ Q1: data-action と PHP パラメータの連携方法
□ Q2: Phase2 詳細実装と Phase1 簡易実装の違い
□ Q3: MF クラウド連携の必要技術要素
□ Q4: AI 学習機能の完全な処理フロー
□ Q5: Phase1 で防ぐべき最重要エラー

❌ 回答不正確の場合は関連指示書を再確認
✅ 全問正解後に次の Hook に進行

🏗️ NAGANO3 Infrastructure Hook
インフラ・環境要件チェック
javascriptconst NAGANO3_INFRASTRUCTURE_CHECKS = {
database_requirements: {
description: 'PostgreSQL 接続設定確認',
check_items: [
'config/kicho_config.php の存在確認',
'データベース接続情報の設定確認',
'getKichoDatabase()関数の実装確認',
'必須テーブルの存在確認（transactions, ai_learning_sessions, delete_log）'
],
fallback_policy: 'Phase2 では実 DB 接続必須・フォールバック禁止'
},

    python_api: {
        description: 'Python FastAPI環境確認',
        check_items: [
            'FastAPI サーバーの起動状態確認',
            'http://localhost:8000/api/ai-learning エンドポイント確認',
            'callPythonAIService()関数の実装確認',
            'AI学習処理の応答確認'
        ],
        fallback_policy: 'API未起動時の適切なエラーハンドリング実装'
    },

    file_system: {
        description: 'ファイルシステム設定確認',
        check_items: [
            'uploads/ ディレクトリの存在・書き込み権限確認',
            'exports/ ディレクトリの存在・書き込み権限確認',
            'CSV処理機能の実装確認',
            'ファイルアップロード機能の実装確認'
        ],
        fallback_policy: 'ディレクトリ自動作成・権限エラー時の適切な処理'
    },

    security_infrastructure: {
        description: 'セキュリティ基盤確認',
        check_items: [
            'セッション管理の適切な実装',
            'CSRFトークン生成・検証システム',
            'SECURE_ACCESS定義の実装',
            '直接アクセス防止システム'
        ],
        fallback_policy: 'セキュリティ要件未達時の開発停止'
    }

};
インフラチェック実行手順
markdown🏗️ 【必須実行】NAGANO3 インフラ確認：

□ PostgreSQL データベース接続・テーブル確認
□ Python FastAPI 環境・エンドポイント確認
□ ファイルシステム・ディレクトリ権限確認
□ セキュリティ基盤・CSRF システム確認

❌ インフラ未整備の場合は環境構築後に再チェック
✅ 全インフラ確認後に次の Hook に進行

📖 NAGANO3 Documentation Hook
指示書理解度チェック
javascriptconst NAGANO3_DOCUMENTATION_CHECKS = {
phase0_compliance: {
description: 'Phase0: 10 個質問の回答完了確認',
required_answers: [
'データベース接続方式（実 DB 必須）',
'Python API 連携（実連携必須）',
'CSV 機能実装レベル（実処理必須）',
'既存コード保護方針',
'クラス名命名規則（BEM 推奨）',
'外部リンク方針',
'削除動作レベル（実 DB 削除）',
'AI 学習動作レベル（実 Python 連携）',
'開発範囲定義',
'緊急時対応方針'
],
verification: '全 10 問の回答が development_config.php に反映されているか確認'
},

    phase1_compliance: {
        description: 'Phase1: 43個エラーパターンの理解確認',
        critical_patterns: [
            'JavaScript競合エラー（header.js と kicho.js）',
            'PHP構文エラー（return vs => 記法）',
            'CSRF 403エラー（トークン生成・送信・検証）',
            'Ajax処理失敗（get_statistics アクション）',
            'データ抽出エラー（data-item-id未設定）'
        ],
        verification: '重大エラー15個の予防策を理解しているか確認'
    },

    phase2_compliance: {
        description: 'Phase2: 詳細実装コードの採用確認',
        required_implementations: [
            'delete-data-item の完全実装（トランザクション・ログ・関連削除）',
            'execute-integrated-ai-learning の完全実装（DB保存・API連携・結果保存）',
            'callPythonAIService の完全実装（API通信・エラーハンドリング）',
            'getKichoDatabase の完全実装（実DB接続・フォールバック禁止）'
        ],
        verification: '詳細実装コードを簡易版ではなく採用することを確認'
    },

    phase3_compliance: {
        description: 'Phase3: 検証手順の準備確認',
        verification_methods: [
            'ファイル構造・基本要件チェック',
            'PHP実装品質チェック',
            'CSS実装品質チェック',
            'JavaScript実装品質チェック',
            'ブラウザ基本動作テスト',
            'Ajax通信動作テスト'
        ],
        verification: '品質評価・判定基準を理解しているか確認'
    }

};
ドキュメント理解チェック実行手順
markdown📖 【必須実行】NAGANO3 指示書理解確認：

□ Phase0: 10 個の強制質問システムの理解・回答
□ Phase1: 43 個エラーパターンの理解・対策確認
□ Phase2: 詳細実装コードの理解・採用決定
□ Phase3: 検証テスト手順の理解・準備

❌ 指示書理解不足の場合は該当 Phase を再確認
✅ 全 Phase 理解確認後に実装開始可能

🎯 NAGANO3 Project Hooks 実行フロー
Step 1: 知識確認フェーズ
markdown🧠 【NAGANO3 知識確認】以下を順次実行：

1. ✅ プロジェクト固有技術の理解確認
   - data-action 連携、Phase 違い、MF 連携、AI 学習フロー、エラー予防
2. ✅ 実装方針の確認
   - Phase2 詳細実装の採用決定
   - フォールバック処理の最小化決定
   - 実データベース接続の必須確認

❌ 知識不足の場合は関連指示書で学習後再確認
Step 2: インフラ確認フェーズ
markdown🏗️ 【NAGANO3 インフラ確認】以下を順次実行：

1. ✅ データベース環境確認
   - PostgreSQL 接続・テーブル存在確認
2. ✅ Python API 環境確認
   - FastAPI 起動・エンドポイント確認
3. ✅ ファイルシステム確認
   - ディレクトリ・権限確認
4. ✅ セキュリティ基盤確認
   - CSRF・セッション管理確認

❌ インフラ未整備の場合は環境構築後再確認
Step 3: ドキュメント確認フェーズ
markdown📖 【NAGANO3 指示書確認】以下を順次実行：

1. ✅ Phase0 理解確認
   - 10 個質問の回答・反映確認
2. ✅ Phase1 理解確認
   - 43 個エラーパターンの理解・対策確認
3. ✅ Phase2 理解確認
   - 詳細実装コードの理解・採用確認
4. ✅ Phase3 理解確認
   - 検証手順の理解・準備確認

❌ 指示書理解不足の場合は該当 Phase 再学習後再確認

🚨 NAGANO3 Project Hooks 失敗時の対応
知識チェック失敗時
markdown❌ NAGANO3 固有知識不足の場合：

1. 📚 該当指示書の詳細確認
   - Phase0-4 の関連セクション再読
2. 🧠 技術理解の深化
   - 具体的実装例の確認
   - エラーパターンの学習
3. 🧪 理解度の再確認
   - 質問への再回答
   - 実装方針の再確認

⚠️ 知識不足での実装開始は品質低下・エラー多発の原因
インフラチェック失敗時
markdown❌ NAGANO3 インフラ未整備の場合：

1. 🔧 環境構築の実施
   - データベース設定・テーブル作成
   - Python FastAPI 環境構築
   - ディレクトリ作成・権限設定
2. 🧪 接続テストの実施
   - データベース接続確認
   - API 通信確認
   - ファイル読み書き確認
3. ✅ 再チェックの実施
   - 全インフラ要素の再確認

⚠️ インフラ未整備での開発は実装不可・動作不良の原因
ドキュメント理解チェック失敗時
markdown❌ 指示書理解不足の場合：

1. 📖 該当 Phase 指示書の精読
   - 実装例の詳細確認
   - 注意点・禁止事項の確認
2. 💡 実装方針の明確化
   - 詳細実装 vs 簡易実装の違い理解
   - エラー予防策の理解
3. 📝 理解内容の整理
   - 重要ポイントの抽出
   - 実装手順の整理

⚠️ 指示書理解不足での実装は方針違い・品質問題の原因

📊 NAGANO3 Project Hooks 成功基準
✅ 合格基準
markdown🎯 NAGANO3 Project Hooks 合格基準：

□ 知識確認：全 5 問正解必須
□ インフラ確認：全要素動作確認必須
□ ドキュメント確認：全 Phase 理解必須

✅ 全基準クリア → 既存 Phase 指示書の実行開始可能
❌ 1 項目でも未達 → 改善後再チェック
🎮 実装開始判定
markdown🚀 実装開始可能条件：

1. ✅ Universal Hooks 合格
2. ✅ NAGANO3 Project Hooks 合格
3. ✅ Phase0 の 10 個質問回答完了
4. ✅ Phase1 のエラーチェック実行準備完了
5. ✅ Phase2 の詳細実装採用決定

🎯 全条件クリア → Phase0 から順次実行開始
❌ 条件不足 → 不足部分の改善後再判定

NAGANO3 Project Hooks 実行により、プロジェクト固有の知識・技術・要件が確実に満たされ、高品質な実装が保証されます。
