# スコア管理システム v3 セットアップ完全ガイド

## ⚠️ 重要: 正しいセットアップ手順

既に001のSQLを実行している場合と、これから新規セットアップする場合で手順が異なります。

---

## 🆕 新規セットアップの場合

**推奨**: v3の統合SQLを使用します。

### Step 1: 統合SQLを実行

Supabase SQL Editorで以下のSQLを実行:

```sql
-- 001と002を統合した完全版
-- このファイルを使用: database/migrations/004_score_system_v3_complete.sql
```

### Step 2: 確認

```bash
node scripts/init-score-system.mjs
```

重み合計が100点であることを確認してください。

---

## 🔄 既に001を実行済みの場合（現在の状況）

### Step 1: 重みを修正

Supabase SQL Editorで以下のSQLを実行:

```sql
-- 003_fix_default_weights.sql を実行
```

このSQLは:
- デフォルト設定の重みを **40/25/15/5/5/10 = 100点** に修正
- 説明文を「🌟 バランス型デフォルト設定 v3（おすすめ）」に更新

### Step 2: 002を実行（まだの場合）

```sql
-- 002_score_system_v3_upgrade.sql を実行
```

### Step 3: 確認

```bash
node scripts/init-score-system.mjs
```

---

## 📊 正しい重み配分

### 🌟 おすすめ: バランス型（デフォルト）
```
利益:    40点
競合:    25点
将来性:  15点 ⭐NEW
鮮度:     5点
希少性:   5点
実績:    10点
──────────
合計:   100点
```

### 💰 利益最優先型（profit_focus）
```
利益:    60点
競合:    20点
将来性:  10点
鮮度:     5点
希少性:   5点
実績:    10点
──────────
合計:   100点
```

### 🏪 低競合優先型（low_competition）
```
利益:    30点
競合:    50点
将来性:  10点
鮮度:     5点
希少性:   5点
実績:    10点
──────────
合計:   100点
```

### 🌟 将来性重視型（future_focus）
```
利益:    30点
競合:    20点
将来性:  30点 ⭐⭐⭐
鮮度:     5点
希少性:   5点
実績:    10点
──────────
合計:   100点
```

---

## 🔍 トラブルシューティング

### 問題: 重み合計が115点になっている

**原因**: 001のSQL（v2）を実行後、002のSQLでweight_futureが追加されたため

**解決方法**:
```sql
-- 003_fix_default_weights.sql を実行
```

### 問題: weight_futureカラムが存在しない

**原因**: 002のSQLがまだ実行されていない

**解決方法**:
```sql
-- 002_score_system_v3_upgrade.sql を実行
```

### 問題: データベースをリセットしたい

**解決方法**:
```sql
-- score_settingsテーブルを削除して再作成
DROP TABLE IF EXISTS score_settings CASCADE;

-- その後、004_score_system_v3_complete.sql を実行
```

---

## 🚀 推奨セットアップ手順（まとめ）

### 既存ユーザー（001実行済み）
1. `003_fix_default_weights.sql` を実行 → 重みを100点に修正
2. `002_score_system_v3_upgrade.sql` を実行（未実行の場合）
3. `node scripts/init-score-system.mjs` で確認

### 新規ユーザー
1. `004_score_system_v3_complete.sql` を実行（作成予定）
2. `node scripts/init-score-system.mjs` で確認

---

## 💡 確認コマンド

```bash
# 初期化スクリプトで確認
node scripts/init-score-system.mjs

# 出力例:
# ✅ デフォルト設定確認OK
#    名前: default
#    説明: 🌟 バランス型デフォルト設定 v3（おすすめ）
#    重み合計: 100点  ← ここが100点であることを確認！
```

---

## 📝 現在のアクション

**今すぐ実行してください**:

```sql
-- Supabase SQL Editorで実行
-- database/migrations/003_fix_default_weights.sql
```

これで重み合計が100点に修正されます！

---

**更新日**: 2025-11-02  
**バージョン**: v3.0.0
