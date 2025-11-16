# HTS判別システム - テスト手順書

## 🐛 修正内容

### 問題
`v_hts_master_data`ビューに`usage_count`カラムが存在しないため、検索エラーが発生していました。

### 解決
`usage_count`カラムへの依存を削除し、キーワードマッチングのみでスコアリングを行うように修正しました。

## ✅ 修正ファイル

- `/lib/tariffService.ts` - `usage_count`への参照を削除

## 🧪 テスト手順

### 1. サーバー起動

```bash
cd ~/n3-frontend_new  # または正しいプロジェクトパス
npm run dev
```

サーバーが起動したら: `http://localhost:3000`

### 2. APIヘルスチェック

ブラウザまたはターミナルで:

```bash
curl http://localhost:3000/api/products/hts-lookup
```

**期待される結果:**
```json
{
  "service": "HTS Lookup API (Manual Mode)",
  "status": "ready",
  "mode": "manual",
  ...
}
```

### 3. HTS検索テスト

```bash
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{"keywords":"trading cards, game, collectible"}'
```

**期待される結果:**
```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "hts_number": "9504.90.3000",
        "heading_description": "...",
        "relevance_score": 180
      },
      ...
    ],
    "count": 10
  }
}
```

### 4. UI動作確認

1. ブラウザで `http://localhost:3000/tools/editing` を開く
2. 商品をクリック
3. **「編集」タブ** に移動
4. 以下を確認:

#### a. サンプルキーワード生成
- 「📝 サンプル生成」ボタンをクリック
- キーワードが自動生成されることを確認

#### b. HTS候補検索
- 推論用キーワード欄に入力: `trading cards, game, collectible`
- 「🔍 HTS候補を検索」ボタンをクリック
- 候補リストが表示されることを確認

#### c. 候補選択
- 候補をクリック
- HTSコード欄に自動入力されることを確認

#### d. 保存
- 原産国: `JP`
- 素材: `Card Stock`
- 「💾 全ての情報を保存」ボタンをクリック
- 成功メッセージが表示されることを確認

## 🔍 トラブルシューティング

### エラー: "column v_hts_master_data.usage_count does not exist"

**原因**: 古いコードが残っています

**解決**: 
```bash
# サーバーを停止
# Ctrl+C

# キャッシュクリア
rm -rf .next

# 再起動
npm run dev
```

### エラー: "該当するHTSコードが見つかりませんでした"

**原因1**: キーワードが不適切

**解決**: より一般的なキーワードを使用
```
❌ "Charizard PSA10" 
✅ "trading cards, collectible, paper"
```

**原因2**: `v_hts_master_data`ビューにデータがない

**解決**: Supabaseでビューを確認
```sql
SELECT COUNT(*) FROM v_hts_master_data;
```

### エラー: TypeError in tariffService.ts

**原因**: Supabaseクライアントの初期化エラー

**解決**: 環境変数を確認
```bash
# .env.local を確認
cat .env.local | grep SUPABASE
```

必要な環境変数:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📊 期待される動作

### 正常なフロー

1. **キーワード入力** → `trading cards, game, collectible`
2. **検索実行** → 50件を取得してスコアリング
3. **スコア計算**:
   - キーワード出現回数 × 15点
   - heading_descriptionマッチ +30点
   - subheading_descriptionマッチ +20点
4. **上位10件表示** → スコア降順
5. **候補選択** → クリックで自動入力
6. **保存** → Supabaseに保存

### コンソールログの例

```
🔍 HTS検索開始 - キーワード: trading cards, game, collectible
  検索条件数: 12
  初期検索結果: 45件
✅ HTS検索完了: 10件の候補を返却
  1. 9504.90.3000 (スコア: 180)
  2. 9504.40.0000 (スコア: 165)
  3. 4911.91.2000 (スコア: 120)
  4. 9503.00.0080 (スコア: 95)
  5. 4901.99.0092 (スコア: 75)
```

## 🎯 実際の使用例

### ポケモンカード

**商品**: ポケモンカード リザードン VMAX PSA10

**ステップ1**: 無料AI（Gemini）で生成
```
プロンプト: この商品のHTS分類用キーワードを英語で生成:
商品: ポケモンカード リザードン VMAX PSA10 グレード品
素材: 紙（カードストック）

Gemini回答: trading cards, game cards, collectible, paper, graded, pokemon
```

**ステップ2**: N3で検索
```
推論用キーワード: trading cards, game cards, collectible, paper
```

**ステップ3**: 結果
```
✅ 10件のHTS候補が見つかりました

1. 9504.90.3000 (関連度: 180)
   Video game consoles and machines
   → Other
   関税率: Free

2. 9504.40.0000 (関連度: 165)
   Playing cards
   関税率: Free
```

**ステップ4**: 選択
```
HTSコード: 9504.90.3000
原産国: JP
素材: Graded Card Stock
```

## 📝 チェックリスト

- [ ] サーバー起動確認
- [ ] APIヘルスチェック成功
- [ ] HTS検索API正常動作
- [ ] UIでサンプル生成動作
- [ ] UI でHTS検索動作
- [ ] 候補選択機能動作
- [ ] 保存機能動作
- [ ] エラーハンドリング確認

## 🚀 次のステップ

1. **v_hts_master_dataビューの確認**
   ```sql
   SELECT * FROM v_hts_master_data LIMIT 5;
   ```

2. **データがない場合**
   - ビューの作成SQL確認
   - hts_codes_detailsテーブル確認
   - マイグレーション実行

3. **本番運用開始**
   - 複数商品でテスト
   - パフォーマンス測定
   - ユーザーフィードバック収集

---

**作成日**: 2025-01-14  
**Status**: ✅ 修正完了  
**コスト**: ¥0 (完全無料)
