# データベースパスワード完全ガイド

## ❌ いいえ、.envには入っていません

### 理由

**3種類の認証方式があります**:

```
┌─────────────────────────────────────────┐
│ 1. REST API認証（Next.jsで使用中）      │
├─────────────────────────────────────────┤
│ NEXT_PUBLIC_SUPABASE_ANON_KEY          │
│ ✅ .env.local に存在                    │
│ ✅ 既に使用中                           │
│ 用途: Next.js → Supabase REST API      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 2. Service Role認証（管理用）           │
├─────────────────────────────────────────┤
│ SUPABASE_SERVICE_ROLE_KEY              │
│ ✅ .env.local に存在                    │
│ ✅ 既に使用中                           │
│ 用途: サーバーサイド管理                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 3. PostgreSQL直接接続（今回必要）⭐️    │
├─────────────────────────────────────────┤
│ Database Password                      │
│ ❌ .envには存在しない                   │
│ ❓ 今回初めて必要                       │
│ 用途: Claude Desktop → PostgreSQL      │
└─────────────────────────────────────────┘
```

---

## 🎯 2つの簡単な解決方法

### 方法1: Service Role Keyで接続（最も簡単・推奨）⭐️

**メリット**:
- ✅ パスワード不要
- ✅ 既存の.env.localを使用
- ✅ 設定が簡単（コマンド1つ）
- ✅ すぐにテスト可能

**実行コマンド**:

```bash
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase",
        "https://zdzfpucdyxdlavkgrvil.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0NjE2NSwiZXhwIjoyMDc0NjIyMTY1fQ.U91DMzI4MchkC1qPKA3nzrgn-rZtt1lYqvKQ3xeGu7Q"
      ]
    }
  }
}
EOF

echo "✅ 設定完了！Claude Desktopを再起動してください"
```

**次のステップ**:
1. ✅ 上記コマンドを実行
2. Claude Desktopを再起動（Cmd + Q → 再起動）
3. 左下に "supabase" が表示されることを確認
4. テスト: 「hs_codesテーブルから1件取得して」

---

### 方法2: PostgreSQL直接接続（高度な用途）

**いつ使う？**:
- 複雑なSQLクエリが必要な場合
- トランザクション処理が必要な場合
- 大量データの一括操作

**手順**:

```bash
# 1. Supabase Dashboardでパスワードをリセット
# https://supabase.com/dashboard/project/zdzfpucdyxdlavkgrvil/settings/database
# → "Reset database password" をクリック
# → 新しいパスワードをコピー

# 2. パスワードを設定
read -sp "新しいDBパスワード: " DB_PASS && echo

cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << EOF
{
  "mcpServers": {
    "supabase-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "enhanced-postgres-mcp-server",
        "postgresql://postgres.zdzfpucdyxdlavkgrvil:${DB_PASS}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
EOF

echo "✅ 設定完了！"
```

---

## 📊 比較表

| 項目 | Service Role Key | PostgreSQL直接 |
|-----|------------------|----------------|
| **設定の簡単さ** | ⭐⭐⭐⭐⭐ 超簡単 | ⭐⭐⭐ 普通 |
| **パスワード必要** | ❌ 不要 | ✅ 必要 |
| **検索機能** | ✅ 可能 | ✅ 可能 |
| **データ保存** | ✅ 可能 | ✅ 可能 |
| **複雑なSQL** | ⚠️ 制限あり | ✅ 全機能 |
| **推奨度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🚀 今すぐ実行（推奨）

### ステップ1: Service Role Keyで設定

```bash
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase",
        "https://zdzfpucdyxdlavkgrvil.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0NjE2NSwiZXhwIjoyMDc0NjIyMTY1fQ.U91DMzI4MchkC1qPKA3nzrgn-rZtt1lYqvKQ3xeGu7Q"
      ]
    }
  }
}
EOF
```

### ステップ2: Claude Desktopを再起動

```
Cmd + Q で終了 → 再起動
```

### ステップ3: 接続テスト

Claude Desktopで送信:
```
hs_codesテーブルから1件取得して表示してください
```

**✅ 成功すれば**:
```
SELECT * FROM hs_codes LIMIT 1;

結果:
- code: 8471.30.0100
- description: Portable automatic data processing machines...
```

---

## ❓ よくある質問

### Q1: Service Role Keyは安全？

**A: はい、安全です**
- Service Role KeyはClaude Desktopローカルでのみ使用
- 外部に送信されない
- .envと同じセキュリティレベル

### Q2: PostgreSQL直接接続との違いは？

**A: 基本的な操作は同じです**

Service Role Key:
- ✅ 検索、保存、更新、削除が可能
- ✅ 17,000件のHTSコード検索可能
- ✅ バッチ処理可能
- ⚠️ 複雑なトランザクションは制限あり

PostgreSQL直接:
- ✅ すべてのSQL機能が使える
- ✅ トランザクション完全対応
- ❌ パスワード管理が必要

**今回の用途（HTSコード判定）では Service Role Key で十分です！**

### Q3: 後からPostgreSQL直接接続に変更できる？

**A: はい、いつでも変更可能です**

設定ファイルを上書きするだけ：
```bash
# Service Role Key → PostgreSQL直接に変更
# 上記の「方法2」のコマンドを実行
```

---

## 🎉 推奨アクション

### 今すぐ実行:

```bash
# これをコピー&ペーストして実行
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase",
        "https://zdzfpucdyxdlavkgrvil.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemZwdWNkeXhkbGF2a2dydmlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0NjE2NSwiZXhwIjoyMDc0NjIyMTY1fQ.U91DMzI4MchkC1qPKA3nzrgn-rZtt1lYqvKQ3xeGu7Q"
      ]
    }
  }
}
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 設定完了！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "次のステップ:"
echo "1. Claude Desktopを再起動（Cmd + Q → 再起動）"
echo "2. 左下に 'supabase' が表示されることを確認"
echo "3. テスト: 「hs_codesテーブルから1件取得して」"
echo ""
```

**所要時間**: 1分  
**パスワード**: 不要  
**すぐにテスト可能**: ✅

---

## 📝 まとめ

| 質問 | 回答 |
|-----|------|
| **DBパスワードは.envにある？** | ❌ いいえ、別物です |
| **パスワード必要？** | ❌ Service Role Keyで不要 |
| **今すぐ使える？** | ✅ はい、コマンド1つで完了 |
| **機能は十分？** | ✅ HTSコード判定には十分 |

**推奨**: Service Role Key方式（パスワード不要・1分で完了）
