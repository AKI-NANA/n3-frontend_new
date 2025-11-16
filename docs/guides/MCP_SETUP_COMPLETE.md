# 🎉 Claude Desktop MCP設定完了！

## ✅ 現在の状態

### 設定ファイル作成完了
```
場所: ~/Library/Application Support/Claude/claude_desktop_config.json
状態: ✅ 作成済み
```

### 設定内容
```json
{
  "mcpServers": {
    "supabase-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.zdzfpucdyxdlavkgrvil:[YOUR-DATABASE-PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
```

---

## 🔧 次の手順（3ステップ）

### ステップ1: データベースパスワードを取得（2分）

1. **Supabase Dashboardを開く**
   ```
   https://supabase.com/dashboard/project/zdzfpucdyxdlavkgrvil/settings/database
   ```

2. **Connection stringセクションを見つける**
   - 「Connection string」タブをクリック
   - 「Transaction mode」を選択
   - 「Password」欄にデータベースパスワードを入力
   - 接続文字列が表示される

3. **パスワード部分だけをコピー**
   ```
   例: postgresql://postgres.xxx:MY_PASSWORD@aws-0...
                              ^^^^^^^^^^^
                              この部分だけコピー
   ```

---

### ステップ2: パスワードを設定（1分）

**方法A: コマンドで設定（推奨）**

ターミナルで以下を実行:
```bash
# パスワードを入力してください
read -p "データベースパスワード: " DB_PASS

# 設定ファイルを更新
sed -i '' "s/\[YOUR-DATABASE-PASSWORD\]/$DB_PASS/" ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 確認
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**方法B: 手動で編集**

1. ファイルを開く:
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. `[YOUR-DATABASE-PASSWORD]` を実際のパスワードに置き換える

3. 保存して閉じる

---

### ステップ3: Claude Desktopで接続テスト（2分）

#### 1. Claude Desktopを再起動

```
1. Claude Desktopを完全に終了（Cmd + Q）
2. Claude Desktopを再度起動
3. 左下に "supabase-postgres" が表示されることを確認
```

#### 2. 接続テスト

Claude Desktopで以下のメッセージを送信:

```
hs_codesテーブルから1件だけ取得して表示してください
```

**期待される応答**:
```
実行します：
SELECT * FROM hs_codes LIMIT 1;

結果:
code: 8471.30.0100
description: Portable automatic data processing machines...
category: Computers & Electronics
...
```

#### 3. HTSコード判定テスト

Claude Desktopで以下を送信:

```
以下の商品のHTSコードを判定してください：

商品名: Canon EOS カメラ三脚
価格: 3,000円

処理手順:
1. hs_codesテーブルで "camera" または "tripod" を含むコードを検索
2. 最適なHTSコードを選択
3. 原産国をCN（中国）と判定
4. customs_dutiesテーブルで関税率を取得
5. 結果をJSON形式で表示
```

**期待される応答**:
```json
{
  "hts_code": "9006.91.0000",
  "description": "Parts and accessories for cameras (tripods)",
  "origin_country": "CN",
  "duty_rate": 0.1025,
  "duty_rate_percent": "10.25%"
}
```

---

## 🎯 実際の使用方法

### パターン1: 1件処理

```
以下の商品を処理してSupabaseに保存してください：

商品名: Sony WH-1000XM5 ヘッドホン
価格: 45,000円
画像URL: https://example.com/image.jpg

処理内容:
1. HTSコード判定
2. 原産国判定
3. 関税率取得
4. products テーブルに保存
```

### パターン2: バッチ処理

```
以下のCSVデータを一括処理してください：

商品名,価格,URL
Canon EOS 三脚,3000,https://...
Sony ヘッドホン,45000,https://...
Apple AirPods,35000,https://...

各商品について：
1. hs_codesテーブルでHTSコード検索
2. 原産国判定（主にCN）
3. customs_dutiesテーブルで関税率取得
4. productsテーブルに保存

完了後、処理結果のサマリーを表示してください。
```

---

## ✅ 動作確認チェックリスト

- [ ] 設定ファイル作成完了
- [ ] データベースパスワード取得
- [ ] パスワード設定完了
- [ ] Claude Desktop再起動
- [ ] 左下にMCP接続表示を確認
- [ ] 接続テスト成功（hs_codes取得）
- [ ] HTSコード判定テスト成功

---

## 🚨 トラブルシューティング

### 問題1: MCP接続が表示されない

**原因**: 設定ファイルのJSON形式エラー

**解決策**:
```bash
# JSON形式を確認
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python3 -m json.tool

# エラーがある場合は再作成
```

### 問題2: 接続エラー "connection refused"

**原因**: パスワードが間違っている

**解決策**:
1. Supabase Dashboardでパスワードを再確認
2. 設定ファイルを再編集
3. Claude Desktop再起動

### 問題3: "permission denied"

**原因**: データベース権限不足

**解決策**:
```
Supabase Dashboardで:
Settings → Database → Connection pooling
→ "Session mode" を試す
```

### 問題4: クエリが実行されない

**原因**: テーブル名が間違っている

**解決策**:
```
正しいテーブル名:
✅ hs_codes
✅ hts_countries  
✅ customs_duties
✅ products

❌ hts_codes (間違い)
```

---

## 📊 設定情報まとめ

### Supabase接続情報
```
プロジェクトID: zdzfpucdyxdlavkgrvil
ホスト: aws-0-ap-northeast-1.pooler.supabase.com
ポート: 6543 (Transaction mode)
データベース: postgres
ユーザー: postgres.zdzfpucdyxdlavkgrvil
```

### テーブル一覧
```
- hs_codes (17,000件のHTSコード候補)
- hts_countries (50カ国の原産国マスター)
- customs_duties (HTSコード×原産国の関税率)
- products (商品データ)
```

---

## 🎉 成功したら

### 次のステップ

1. **大量データのバッチ処理**
   - 100件単位でCSVデータを貼り付け
   - Claude Desktopが自動処理
   - 5分で完了

2. **Next.jsシステムと連携**
   - Claude Desktopで処理
   - Next.jsで確認・エクスポート

3. **本番運用開始**
   - Yahoo Auctionからデータ収集
   - Claude Desktopで一括処理
   - eBay出品準備

---

## 📞 サポート

問題が解決しない場合:

1. **ログを確認**
   ```bash
   # Claude Desktopのログ
   ~/Library/Logs/Claude/
   ```

2. **MCP公式ドキュメント**
   ```
   https://modelcontextprotocol.io/
   ```

3. **Supabaseサポート**
   ```
   https://supabase.com/docs
   ```

---

**現在の状態**: ✅ 設定ファイル作成完了  
**次の作業**: パスワード設定 → Claude Desktop再起動 → テスト  
**所要時間**: 5分
