# 🎉 Claude Desktop MCP接続 - 完全セットアップガイド

## ✅ 実装完了！

### 設定ファイル作成完了
```
場所: ~/Library/Application Support/Claude/claude_desktop_config.json
状態: ✅ 作成済み（最新版に更新済み）
サーバー: enhanced-postgres-mcp-server（読み書き対応）
```

---

## 🚀 今すぐ実行: 3ステップセットアップ

### ステップ1: データベースパスワード取得（2分）

1. **Supabase Dashboardを開く**
   ```
   https://supabase.com/dashboard/project/zdzfpucdyxdlavkgrvil/settings/database
   ```

2. **接続文字列を取得**
   - 左メニュー: Settings → Database
   - 「Connection string」タブをクリック
   - プルダウンで **「Transaction mode」** を選択
   - 「Password」欄にデータベースパスワードを入力
   - 表示された接続文字列からパスワード部分をコピー

   ```
   例: postgresql://postgres.xxx:MY_SECRET_PASSWORD@aws-0...
                              ^^^^^^^^^^^^^^^^^^
                              この部分だけコピー
   ```

---

### ステップ2: パスワード設定（1分）

**以下のコマンドをターミナルで実行:**

```bash
# パスワードを入力（入力時は表示されません）
read -sp "Supabase DBパスワード: " DB_PASS && echo

# 設定ファイルを更新
sed -i '' "s/\[YOUR-DATABASE-PASSWORD\]/$DB_PASS/" ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 確認（パスワードが正しく設定されているか）
echo "設定内容を確認:"
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | grep -v PASSWORD || cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

echo ""
echo "✅ パスワード設定完了！"
```

**または手動で設定:**

```bash
# エディタで開く
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# [YOUR-DATABASE-PASSWORD] を実際のパスワードに置き換える
# 保存して閉じる
```

---

### ステップ3: Claude Desktopで接続テスト（2分）

#### 3-1. Claude Desktopを再起動

```
1. Claude Desktopを完全に終了
   → メニューバー: Claude → Quit Claude (Cmd + Q)
   
2. Claude Desktopを再起動
   
3. 左下のツールアイコンを確認
   → 🔌 "supabase-postgres" が表示されていればOK
```

#### 3-2. 基本接続テスト

Claude Desktopで以下のメッセージを送信:

```
hs_codesテーブルから1件だけ取得して表示してください
```

**✅ 成功の場合:**
```
実行します：
SELECT * FROM hs_codes LIMIT 1;

結果:
code: 8471.30.0100
description: Portable automatic data processing machines...
category: Computers & Electronics
```

**❌ エラーの場合:**
- パスワードが間違っている → ステップ2をやり直す
- MCP接続が表示されない → Claude Desktopを完全再起動

#### 3-3. HTSコード判定テスト

Claude Desktopで以下を送信:

```
以下の商品のHTSコードを判定してください：

商品名: Canon EOS カメラ三脚
価格: 3,000円

処理手順:
1. hs_codesテーブルで "camera" または "tripod" を検索
2. 最適なHTSコードを選択
3. 原産国をCN（中国）と判定
4. customs_dutiesテーブルで関税率を取得
5. 結果をJSON形式で表示
```

**✅ 期待される応答:**
```json
{
  "product_name": "Canon EOS カメラ三脚",
  "price_jpy": 3000,
  "hts_code": "9006.91.0000",
  "hts_description": "Parts and accessories: tripods, bipods and similar articles",
  "origin_country": "CN",
  "duty_rate": 0.1025,
  "duty_rate_percent": "10.25%"
}
```

---

## 🎯 実際の使用方法

### パターンA: 1件ずつ処理

```
以下の商品を処理してproductsテーブルに保存してください：

商品名: Sony WH-1000XM5 ヘッドホン
価格: 45,000円
画像URL: https://example.com/image.jpg

1. HTSコード判定
2. 原産国判定
3. 関税率取得
4. productsテーブルに保存
```

### パターンB: バッチ処理（推奨）

```
以下のCSVデータを一括処理してproductsテーブルに保存してください：

商品名,価格,URL
Canon EOS カメラ三脚,3000,https://example.com/1
Sony WH-1000XM5 ヘッドホン,45000,https://example.com/2
Apple AirPods Pro,35000,https://example.com/3
Nintendo Switch ゲームソフト,5980,https://example.com/4
Dell ゲーミングキーボード,12800,https://example.com/5

各商品について：
1. hs_codesテーブルでHTSコード検索
2. 原産国判定（主にCN）
3. customs_dutiesテーブルで関税率取得
4. productsテーブルに保存

完了後、処理結果サマリーを表示してください。
```

**期待される処理結果:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
処理完了サマリー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

処理件数: 5件
成功: 5件
失敗: 0件

HTSコード分布:
- 9006.91.0000 (カメラ用品): 1件
- 8518.30.2000 (オーディオ): 2件
- 9504.50.0000 (ゲーム): 1件
- 8471.60.2000 (PC周辺機器): 1件

原産国分布:
- CN (中国): 5件

平均関税率: 5.1%

保存ID: 101, 102, 103, 104, 105
```

---

## 🔧 データベース操作コマンド

### データ確認
```
productsテーブルで最近追加された10件を表示してください
```

### データ削除
```
productsテーブルでID=123のレコードを削除してください
```

### データ更新
```
productsテーブルのID=123のHTSコードを9006.91.0000に更新してください
```

### 統計情報
```
各テーブルのレコード数を表示してください
```

---

## 📊 設定情報まとめ

### 使用しているMCPサーバー
```
名前: enhanced-postgres-mcp-server
機能: PostgreSQL読み書き対応
バージョン: 最新版（自動取得）
```

### Supabase接続情報
```
プロジェクトID: zdzfpucdyxdlavkgrvil
ホスト: aws-0-ap-northeast-1.pooler.supabase.com
ポート: 6543 (Transaction mode)
データベース: postgres
```

### 利用可能なテーブル
```
1. hs_codes (17,000件)
   - HTSコード候補マスター
   
2. hts_countries (50カ国)
   - 原産国マスター
   
3. customs_duties (HTSコード×原産国)
   - 関税率データ
   
4. products
   - 商品データ保存先
```

---

## 🚨 トラブルシューティング

### 問題1: MCP接続が表示されない

**症状**: Claude Desktop左下にツールアイコンがない

**解決策**:
```bash
# 設定ファイルのJSON形式を確認
python3 << 'EOF'
import json
with open('/Users/aritahiroaki/Library/Application Support/Claude/claude_desktop_config.json') as f:
    config = json.load(f)
    print("✅ JSON形式OK")
    print(json.dumps(config, indent=2))
EOF

# Claude Desktopを完全再起動
# Cmd + Q → 再起動
```

### 問題2: "connection refused" エラー

**症状**: 接続時にエラーが発生

**原因**: パスワードが間違っている

**解決策**:
```bash
# パスワードを再設定
read -sp "正しいDBパスワード: " DB_PASS && echo
sed -i '' "s/postgresql:\/\/postgres\.zdzfpucdyxdlavkgrvil:.*@/postgresql:\/\/postgres.zdzfpucdyxdlavkgrvil:$DB_PASS@/" ~/Library/Application\ Support/Claude/claude_desktop_config.json
echo "✅ パスワード再設定完了"
```

### 問題3: テーブルが見つからない

**症状**: "relation does not exist" エラー

**解決策**:
```
Claude Desktopで実行:

「データベース内のすべてのテーブルを表示してください」

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 問題4: 書き込み権限エラー

**症状**: "permission denied" エラー

**解決策**:
```
Supabase Dashboard → Settings → Database
→ Connection pooling のモード確認
→ "Transaction mode" を使用
```

---

## ✅ セットアップ完了チェックリスト

- [ ] 設定ファイル作成完了
- [ ] データベースパスワード取得
- [ ] パスワード設定完了
- [ ] Claude Desktop再起動
- [ ] MCP接続確認（左下にアイコン表示）
- [ ] 基本接続テスト成功（hs_codes取得）
- [ ] HTSコード判定テスト成功
- [ ] データ保存テスト成功

---

## 🎉 セットアップ成功後の使い方

### 日常ワークフロー

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ1: データ収集
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next.jsシステム:
- Yahoo Auctionスクレイピング
- CSVエクスポート
  ↓
products_raw_20250129.csv


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ2: Claude Desktopで一括処理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

人間の作業:
1. CSVファイルを開く
2. 内容をコピー（Cmd + A → Cmd + C）
3. Claude Desktopに貼り付け
4. 「処理して保存して」と入力

Claude Desktop:
- 自動的に全商品処理
- HTSコード判定
- 関税率取得
- Supabaseに保存
  ↓
5分で100件完了


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ステップ3: Next.jsで確認・エクスポート
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next.jsシステム:
- 処理済みデータ確認
- 拡張CSVエクスポート
- eBay出品準備
```

---

## 💰 コスト

| 項目 | コスト |
|-----|--------|
| MCP設定 | ¥0 |
| PostgreSQL接続 | ¥0 |
| Claude Desktop使用 | ¥0 |
| データ処理 | ¥0 |
| **合計** | **¥0** |

---

## 📞 サポート・参考資料

### ドキュメント
- 完全ガイド: `/Users/aritahiroaki/n3-frontend_new/CLAUDE_DESKTOP_FULL_AUTO.md`
- テストプロンプト: `/Users/aritahiroaki/n3-frontend_new/MCP_TEST_PROMPTS.md`
- 大量データ対応: `/Users/aritahiroaki/n3-frontend_new/MASSIVE_DATA_SOLUTION.md`

### 外部リンク
- MCP公式: https://modelcontextprotocol.io/
- Supabase Docs: https://supabase.com/docs
- Enhanced PostgreSQL MCP: https://npm.im/enhanced-postgres-mcp-server

---

**現在の状態**: ✅ 設定完了（パスワード設定待ち）  
**次のステップ**: パスワード設定 → Claude Desktop再起動 → テスト  
**所要時間**: 残り3分
