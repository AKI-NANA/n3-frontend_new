🎯 NAGANO3\_開発統合ガイド.md
📋 既存指示書を活用した効果的な開発システム
目的: 既存の優秀な指示書を最大活用し、クロードが確実に全てを参照・理解・実行するためのガイド

🗺️ 既存指示書マップ
📚 指示書一覧と役割
mermaidgraph TD
A[🪝 UNIVERSAL_HOOKS] --> B[🎯 NAGANO3_PROJECT_HOOKS]
B --> C[📋 統合ガイド]
C --> D[0🛡️ Phase0: 基盤設計強制質問]
D --> E[1⚠️ Phase1: エラー予防チェック]
E --> F[2🚀 Phase2: 動作保証実装]
F --> G[3🧪 Phase3: 検証テスト]
G --> H[4🔧 Phase4: 運用サポート]
F --> I[💯 限界突破システム]
I --> J[✅ 開発完了]
📊 各指示書の重要度・必須度マトリックス
指示書重要度必須度スキップ可否主な内容詳細実装の場所 Universal Hooks⭐⭐⭐⭐⭐ 必須 ❌ セキュリティ・品質基準全プロジェクト共通 NAGANO3 Hooks⭐⭐⭐⭐⭐ 必須 ❌ プロジェクト固有知識 NAGANO3 専用 Phase0⭐⭐⭐⭐⭐ 必須 ❌10 個の強制質問基盤設計方針決定 Phase1⭐⭐⭐⭐ 必須 ❌43 個エラーパターンエラー予防策 Phase2⭐⭐⭐⭐⭐ 必須 ❌ 詳細実装コード実機能の完全実装 Phase3⭐⭐⭐ 推奨 🔶 検証・テスト手順品質検証方法 Phase4⭐⭐ オプション ✅ 運用・保守手順長期運用方法限界突破 ⭐⭐⭐⭐ 推奨 🔶 段階的実装方法確実な成功手法

🔄 統合開発フロー
Step 1: 事前準備（Hooks 実行）
markdown🪝 【必須】事前準備フェーズ

1. ✅ Universal Hooks 実行
   - セキュリティ要件確認
   - コード品質基準確認
   - 基本機能要件確認
2. ✅ NAGANO3 Project Hooks 実行
   - プロジェクト固有知識確認
   - インフラ・環境確認
   - 指示書理解度確認

⚠️ Hooks 未完了での Phase 開始は禁止
✅ 全 Hooks 完了後、Phase0 開始可能
Step 2: 基盤構築（Phase0-1）
markdown📋 【必須】基盤構築フェーズ

1. ✅ Phase0: 基盤設計強制質問システム実行
   - 🛑 10 個の強制質問に全回答
   - 📁 development_config.php 生成
   - 🔧 設定内容の適用確認
2. ✅ Phase1: エラー予防チェック実行
   - 🔍 43 個エラーパターンスキャン
   - 📝 PHP 構文エラー 0 件確認
   - 🚨 危険パターン検出・修正

⚠️ エラー 1 件でも検出時は修正後再実行
✅ エラー 0 件確認後、Phase2 開始可能
Step 3: 実装実行（Phase2 重点）
markdown🚀 【最重要】実装実行フェーズ

⚠️ 重要：Phase2 の詳細実装を必ず採用（簡易版使用禁止）

1. ✅ Phase2 詳細実装コードの採用

   ```php
   // ❌ 禁止：簡易実装
   function handleDeleteDataItem() {
       sendResponse('success', '削除しました');
   }

   // ✅ 必須：Phase2詳細実装
   case 'delete-data-item':
       try {
           $item_id = $_POST['item_id'] ?? '';
           if (empty($item_id)) {
               throw new Exception('削除対象のIDが指定されていません');
           }

           $pdo = getKichoDatabase();
           $pdo->beginTransaction();

           try {
               // 1. 実際のデータ削除
               $stmt = $pdo->prepare("DELETE FROM transactions WHERE id = ? AND status != 'protected'");
               $result = $stmt->execute([$item_id]);

               if ($stmt->rowCount() === 0) {
                   throw new Exception('削除対象が見つからないか、保護されています');
               }

               // 2. 削除ログ記録
               $stmt = $pdo->prepare("INSERT INTO delete_log (item_id, deleted_at, deleted_by) VALUES (?, NOW(), ?)");
               $stmt->execute([$item_id, $_SESSION['user_id'] ?? 'system']);

               // 3. 関連データクリーンアップ
               $stmt = $pdo->prepare("DELETE FROM transaction_rules WHERE transaction_id = ?");
               $stmt->execute([$item_id]);

               $pdo->commit();

               // 4. UI更新指示
               sendResponse('success', 'データを削除しました', [
                   'deleted_id' => $item_id,
                   'ui_update' => [
                       'type' => 'remove_item',
                       'target_id' => $item_id,
                       'update_counters' => true
                   ]
               ]);

           } catch (Exception $e) {
               $pdo->rollback();
               throw $e;
           }

       } catch (Exception $e) {
           sendResponse('error', $e->getMessage());
       }
       break;
   ```

✅ AI 学習機能の詳細実装採用
php// ✅ 必須：Phase2 詳細実装
case 'execute-integrated-ai-learning':
try {
$text_content = $_POST['text_content'] ?? '';
        if (empty($text_content)) {
throw new Exception('学習テキストが指定されていません');
}

        // 1. データベースに学習セッション記録
        $pdo = getKichoDatabase();
        $stmt = $pdo->prepare("INSERT INTO ai_learning_sessions (text_content, created_at, status) VALUES (?, NOW(), 'processing')");
        $stmt->execute([$text_content]);
        $session_id = $pdo->lastInsertId();

        // 2. Python FastAPI連携
        $ai_result = callPythonAIService([
            'action' => 'learn_text',
            'text' => $text_content,
            'session_id' => $session_id
        ]);

        if ($ai_result['success']) {
            // 3. 結果をデータベースに保存
            $stmt = $pdo->prepare("UPDATE ai_learning_sessions SET status = 'completed', accuracy = ?, confidence = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$ai_result['accuracy'], $ai_result['confidence'], $session_id]);

            $visualization_data = generateLearningVisualization($ai_result);

            sendResponse('success', 'AI学習が完了しました', [
                'session_id' => $session_id,
                'accuracy' => $ai_result['accuracy'],
                'confidence' => $ai_result['confidence'],
                'visualization' => $visualization_data,
                'ui_update' => [
                    'type' => 'ai_learning_success',
                    'clear_input' => true,
                    'show_results' => true
                ]
            ]);
        } else {
            throw new Exception('AI学習処理でエラーが発生しました: ' . $ai_result['error']);
        }

    } catch (Exception $e) {
        if (isset($session_id)) {
            $stmt = $pdo->prepare("UPDATE ai_learning_sessions SET status = 'error', error_message = ? WHERE id = ?");
            $stmt->execute([$e->getMessage(), $session_id]);
        }
        sendResponse('error', $e->getMessage());
    }
    break;

✅ JavaScript 修正（データ抽出問題解決）
javascript// ✅ 必須：パラメータ抽出の修正
function extractDataFromTarget(target) {
const data = {};

    // data-*属性からの取得（ハイフン→アンダースコア変換）
    Object.entries(target.dataset).forEach(([key, value]) => {
        if (key !== 'action') {
            // itemId → item_id に変換
            const phpKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            data[phpKey] = value;
        }
    });

    // フォーム要素の値取得
    const action = target.getAttribute('data-action');

    if (action === 'execute-integrated-ai-learning') {
        const textArea = document.querySelector('#aiTextInput');
        if (textArea) {
            data.text_content = textArea.value;
        }
    }

    return data;

}

⚠️ Phase2 詳細実装の採用が最重要
❌ 簡易実装・モック実装は禁止

### Step 4: 品質検証（Phase3）

```markdown
🧪 【推奨】品質検証フェーズ

1. ✅ Phase3: 検証テスト実行

   - 📁 ファイル構造・基本要件チェック
   - 🔧 PHP 実装品質チェック
   - 🎨 CSS 実装品質チェック
   - ⚡ JavaScript 実装品質チェック
   - 🌐 ブラウザ基本動作テスト
   - 🔄 Ajax 通信動作テスト

2. ✅ 品質評価・判定
   - 優秀品質（90%以上）: 本番適用可能
   - 良好品質（75-89%）: 軽微改善で完成
   - 要改善（50-74%）: 重要な修正必要
   - 品質不足（50%未満）: 大幅修正必要

✅ 75%以上で合格、90%以上で理想的品質
Step 5: 運用準備（Phase4・限界突破）
markdown🔧 【オプション】運用準備フェーズ

1. 🔶 Phase4: 運用サポート（必要に応じて）

   - 📊 モニタリングシステム
   - 🔄 自動更新システム
   - 📱 レスポンシブ最適化
   - 🚀 パフォーマンス最適化

2. 🔶 限界突破システム（問題発生時）
   - 📋 段階的実装方法
   - 🔧 問題解決システム
   - 🧪 エンドツーエンド確認

✅ 基本機能完成後、必要に応じて実行

🎯 既存指示書の効果的使用方法
Phase0 使用時の注意点
markdown📄 0🛡️Phase0*基盤設計*強制質問システム.md

✅ 必ず実行すべき部分:

- 🛑 【STEP 0】開発前強制停止・質問システム
- ❓ 質問 1〜10 の全回答
- 📁 設定ファイル自動生成

⚠️ プロジェクト固有の調整が必要な部分:

- データベース接続情報（実環境に合わせて調整）
- Python API URL（実際のエンドポイントに調整）
- CSV ディレクトリパス（実際のパスに調整）

🔧 効果的な使用方法:

1. 10 個の質問に真面目に回答（適当な回答禁止）
2. 回答結果を config/development_config.php に確実に反映
3. 設定内容の動作確認後に次 Phase 進行

❌ よくある失敗パターン:

- 質問をスキップして開発開始
- 適当な回答で済ませる
- 設定ファイルに反映しない
  Phase1 使用時の注意点
  markdown📄 1⚠️Phase1*予防チェック*エラー防止システム.md

✅ 必ず実行すべき部分:

- 🚨 43 個エラーパターンの完全スキャン
- 🔍 PHP 構文エラーチェック
- ⚡ JavaScript 競合チェック
- 🔒 CSRF 検証チェック

⚠️ 環境依存の調整が必要な部分:

- ファイルパス（実際のプロジェクト構造に合わせて調整）
- 開発環境設定（ローカル環境の違いに対応）

🔧 効果的な使用方法:

1. チェックスクリプトを実際に実行
2. エラー検出時は必ず修正してから次工程
3. 重要エラー 15 個は特に重点チェック

❌ よくある失敗パターン:

- エラーチェックをスキップ
- エラー検出後に修正せず進行
- 重要エラーを軽視
  Phase2 使用時の注意点（最重要）
  markdown📄 2🚀Phase2*動作保証*実装システム.md

✅ 必ず採用すべき部分（簡易版使用禁止）:

- delete-data-item の完全実装
- execute-integrated-ai-learning の完全実装
- callPythonAIService の完全実装
- getKichoDatabase の完全実装
- データベーステーブル作成 SQL

⚠️ プロジェクト固有の調整が必要な部分:

- テーブル名・カラム名（既存 DB スキーマに合わせて調整）
- API エンドポイント（実際のサービス URL に調整）
- エラーメッセージ（ユーザーフレンドリーに調整）

🔧 効果的な使用方法:

1. 詳細実装コードをそのまま採用（コピー推奨）
2. プロジェクト固有部分のみ最小限調整
3. 簡易版・モック版は絶対に使用しない

❌ よくある失敗パターン:

- 詳細実装を見落として簡易版を使用
- 「動けば良い」でモック実装を採用
- エラーハンドリングを省略

🚨 よくある失敗パターンと対策
失敗パターン 1: Phase2 の詳細実装を見落とし
markdown❌ 失敗例:
// 簡易実装を採用してしまう
function handleDeleteDataItem() {
sendResponse('success', '削除しました', ['deleted_at' => date('Y-m-d H:i:s')]);
}

✅ 正解（Phase2 の詳細実装を採用）:
// Phase2 の完全実装を採用
case 'delete-data-item':
try {
$item_id = $_POST['item_id'] ?? '';
        if (empty($item_id)) {
throw new Exception('削除対象の ID が指定されていません');
}

        $pdo = getKichoDatabase();
        $pdo->beginTransaction();

        // [トランザクション・ログ・関連削除の完全実装]

    } catch (Exception $e) {
        sendResponse('error', $e->getMessage());
    }
    break;

🔧 対策:

- Phase2 の詳細実装セクションを必ず確認
- 「【実装必須】」マークの付いたコードを採用
- 簡易版は開発時も使用禁止
  失敗パターン 2: Phase0 の質問をスキップ
  markdown❌ 失敗例:
  「とりあえず開発を始めよう」で Phase0 をスキップ

✅ 正解:
Phase0 の 10 個質問に確実に回答してから開発開始

必須確認項目:
□ Q1: データベース接続方式（実 DB 必須・模擬データ禁止）
□ Q2: Python API 連携方式（実連携必須・モック禁止）
□ Q3: CSV 機能実装レベル（実処理必須・ボタンのみ禁止）
□ Q4: 削除動作レベル（実 DB 削除必須・セッション削除禁止）
□ Q5: AI 学習動作レベル（実 Python 連携必須・モック禁止）
[...他 5 問]

🔧 対策:

- 開発開始前に Phase0 を必ず実行
- 各質問に真剣に回答（適当回答禁止）
- 回答内容を確実に config 設定に反映
  失敗パターン 3: JavaScript データ抽出エラー
  markdown❌ 失敗例:
  // data-item-id が item_id として送信されない
  function extractDataFromTarget(target) {
  const data = {};
  Object.entries(target.dataset).forEach(([key, value]) => {
  if (key !== 'action') {
  data[key] = value; // ❌ itemId のまま送信される
  }
  });
  return data;
  }

✅ 正解:
// data-item-id → item_id 変換を実装
function extractDataFromTarget(target) {
const data = {};

    Object.entries(target.dataset).forEach(([key, value]) => {
        if (key !== 'action') {
            // itemId → item_id に変換
            const phpKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            data[phpKey] = value;
        }
    });

    // フォーム要素の値も取得
    const action = target.getAttribute('data-action');
    if (action === 'execute-integrated-ai-learning') {
        const textArea = document.querySelector('#aiTextInput');
        if (textArea) {
            data.text_content = textArea.value;
        }
    }

    return data;

}

🔧 対策:

- HTML の data 属性と PHP の$\_POST 変数の命名規則違いを理解
- JavaScript 側でキャメルケース → スネークケース変換を実装
- フォーム要素の値取得ロジックを追加

📊 統合開発の成功基準
✅ 段階別合格基準
markdown🎯 各段階の合格基準:

【事前準備】
□ Universal Hooks: 100%クリア必須
□ NAGANO3 Hooks: 100%クリア必須

【基盤構築】  
□ Phase0: 10 個質問回答 100%完了必須
□ Phase1: エラーチェック 0 件必須

【実装実行】
□ Phase2: 詳細実装採用 100%必須
□ 簡易実装・モック実装 使用率 0%必須

【品質検証】
□ Phase3: 品質スコア 75%以上（理想 90%以上）

【運用準備】
□ Phase4・限界突破: 必要に応じて実行

❌ 1 段階でも基準未達の場合は修正後再実行
✅ 全段階基準クリア後に開発完了
🏆 最終品質判定
markdown🌟 最終品質レベル:

- Excellent（95%以上）: SaaS 企業レベルの実装品質
- Good（85-94%）: 商用システムレベルの品質
- Acceptable（75-84%）: 実用レベルの品質
- Poor（75%未満）: 改善必要レベル

🎯 目標: Good 以上（85%以上）
⚠️ Acceptable 未満の場合は改善後再評価

🎮 クロード用実行チェックリスト
開発開始前の必須確認
markdown【クロード必読】以下を順番通り実行してから開発開始：

□ Step 1: Universal Hooks 実行

- セキュリティ・品質・基本機能要件の理解確認

□ Step 2: NAGANO3 Project Hooks 実行

- プロジェクト固有知識・インフラ・指示書理解確認

□ Step 3: Phase0 実行

- 10 個の強制質問に全回答・設定ファイル生成

□ Step 4: Phase1 実行

- 43 個エラーパターンチェック・0 件確認

□ Step 5: Phase2 詳細実装確認

- 詳細実装コードの採用決定・簡易版使用禁止確認

❌ 上記 1 つでも未確認の場合は開発開始禁止
✅ 全確認完了後、Phase2 の詳細実装で開発開始
実装中の継続確認
markdown【実装中】以下を継続的に確認：

□ Phase2 詳細実装の確実な採用
□ エラーハンドリングの完全実装
□ UI 更新指示の適切な実装
□ データベース処理の確実な実装

❌ 簡易実装への切り替えは禁止
✅ 詳細実装の維持を継続

既存指示書統合ガイドにより、優秀な既存指示書を最大活用し、確実に高品質な動的システムが実現されます。
```
