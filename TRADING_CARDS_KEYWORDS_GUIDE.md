# トレーディングカード用キーワードガイド

## 🎴 正しいキーワード例

### ❌ 間違ったキーワード
```
trading cards, game, collectible
```
**問題**: "game" がビデオゲーム機器にマッチしてしまう

### ✅ 正しいキーワード
```
playing cards, card games, paper cards
```

### ✅ さらに良いキーワード
```
playing cards, printed cards, card stock, paper
```

---

## 📋 商品別の最適キーワード

### ポケモンカード
```
playing cards, printed cards, paper, collectible cards
```

### 遊戯王カード
```
playing cards, game cards, printed paper
```

### MTG（Magic: The Gathering）
```
playing cards, trading card game, paper cards
```

### ベースボールカード
```
trading cards, collectible cards, printed cards, paper
```

---

## 🎯 キーワード選定のコツ

### 1. HTS用語を使う
- ❌ "trading" → ✅ "playing"
- ❌ "game" → ✅ "cards"
- ❌ "collectible" → ✅ "printed"

### 2. 素材を明示
- "paper"
- "card stock"
- "printed"

### 3. 具体的なカテゴリ
- "playing cards" (Chapter 9504.40)
- "printed matter" (Chapter 4911)

---

## 🔍 データベース確認SQL

Supabaseで実行して正しいHTSコードを確認:

```sql
-- Playing cardsを検索
SELECT 
  hts_number,
  heading_description,
  subheading_description
FROM v_hts_master_data
WHERE 
  hts_number LIKE '9504.40%' OR
  heading_description ILIKE '%playing card%'
ORDER BY hts_number;
```

期待される結果:
```
9504.40.0000 | Playing cards
```

---

## 🧪 テストケース

### テスト1: 改善されたキーワード

```bash
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{"keywords":"playing cards, printed cards, paper, card stock"}'
```

**期待**: `9504.40.0000` が上位に来る

### テスト2: 印刷物として検索

```bash
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{"keywords":"printed matter, paper, cards, collectible"}'
```

**期待**: `4911.91` (Printed cards) も候補に

---

## 💡 無料AI（Gemini）への改善プロンプト

### 改善前
```
この商品のHTS分類用キーワードを生成:
商品: ポケモンカード
```

### 改善後
```
この商品のHTS分類用キーワードを英語で生成してください。

商品: ポケモンカード リザードン
素材: 紙（カードストック）

重要な注意事項:
1. HTS（米国関税）の公式用語を使用してください
2. トレーディングカードは "playing cards" として分類されます
3. "game" という単語は避けてください（ビデオゲームと混同される）
4. 素材（paper, card stock）を必ず含めてください
5. カンマ区切りで3-7個のキーワードを返してください

例: playing cards, printed cards, paper, card stock, collectible
```

---

## 🎓 HTS分類の基礎知識

### Chapter 9504: Articles for entertainment

```
9504.40.0000 - Playing cards
  └─ トレーディングカード、ゲームカード含む

9504.90 - Other
  ├─ 9504.90.60.00 - Video game consoles ❌
  └─ 9504.90.91.00 - Game cards (alternative)
```

### Chapter 4911: Printed matter

```
4911.91 - Pictures, designs and photographs
  └─ 印刷されたカード類も含まれる場合あり
```

---

作成日: 2025-01-14
