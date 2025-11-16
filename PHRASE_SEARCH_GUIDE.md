# フレーズ検索ガイド - HTS判別システム

## 🎯 重要な改善点

**単語ではなくフレーズ（単語の組み合わせ）で検索することで精度が大幅に向上しました。**

---

## 📝 フレーズ検索の使い方

### 基本ルール

1. **複数の単語 = 自動的にフレーズ**
   ```
   playing cards → フレーズとして検索
   ```

2. **カンマで区切る = 複数のフレーズ/単語**
   ```
   playing cards, paper, collectible
   ```

3. **ダブルクォートで明示的にフレーズ指定**
   ```
   "video game", console, electronic
   ```

---

## ✅ 良い例

### トレーディングカード
```
playing cards, printed cards, paper
```
**なぜ良い**: 
- "playing cards" がフレーズとして検索される
- "printed cards" もフレーズとして検索される
- ビデオゲームとは区別される

### スマートフォン
```
mobile phone, smartphone, electronic device
```
**なぜ良い**:
- "mobile phone" = 携帯電話（フレーズ）
- "electronic device" = 電子機器（フレーズ）

### 衣料品
```
cotton shirt, textile, apparel
```
**なぜ良い**:
- "cotton shirt" = 綿製シャツ（フレーズ）
- 素材と用途が明確

---

## ❌ 悪い例

### トレーディングカード（間違い）
```
trading, cards, game, collectible
```
**なぜ悪い**:
- 単語がバラバラに検索される
- "game" → ビデオゲーム機器にもマッチ
- "cards" → business cards, credit cardsにもマッチ

**修正後**:
```
playing cards, collectible cards, paper
```

---

## 🧪 テストケース

### テスト1: フレーズ検索（推奨）

```bash
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{"keywords":"playing cards, printed cards, paper"}'
```

**期待される結果**:
```
✅ HTS検索完了: 10件の候補を返却
  フレーズ: ["playing cards", "printed cards"]
  単語: ["paper"]
  
  1. 9504.40.0000 (スコア: 280, タイプ: phrase)
     Playing cards
  
  2. 4911.91.0000 (スコア: 160, タイプ: phrase)
     Printed cards
```

### テスト2: 単語検索（精度低い）

```bash
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{"keywords":"playing, cards, game, collectible"}'
```

**結果**: ビデオゲーム機器も混ざる可能性

---

## 💡 Geminiへの改善プロンプト

### 最適化されたプロンプト

```
この商品のHTS分類用キーワードを生成してください。

商品情報:
- タイトル: ポケモンカード リザードン VMAX PSA10
- 素材: Card Stock（紙製カード）
- カテゴリ: トレーディングカードゲーム

重要な要件:
1. 複数の単語を組み合わせたフレーズを使用してください
2. HTS公式用語を使用してください
3. 具体的で曖昧でないフレーズを選んでください
4. カンマ区切りで3-7個返してください

フレーズ例:
✅ "playing cards" - 正しい（2語のフレーズ）
✅ "printed cards" - 正しい（2語のフレーズ）  
❌ "cards" - 悪い（単語のみ、曖昧）
❌ "game" - 悪い（ビデオゲームと混同）

回答形式: カンマ区切りのフレーズリスト
```

### Geminiの回答例

```
playing cards, printed cards, collectible cards, paper card stock
```

---

## 🎓 検索の仕組み

### 3段階検索戦略

```
ステップ1: フレーズ完全一致（最優先）
  heading_description = "playing cards"
  → スコア +200

ステップ2: フレーズ部分一致
  heading_description LIKE "%playing cards%"
  → スコア +100

ステップ3: 単語一致（フォールバック）
  heading_description LIKE "%paper%"
  → スコア +50
```

### スコア配分

| マッチタイプ | 位置 | スコア |
|-------------|------|--------|
| フレーズ完全一致 | heading | +200 |
| フレーズ完全一致 | subheading | +150 |
| フレーズ含有 | heading | +80 |
| フレーズ含有 | subheading | +60 |
| フレーズ含有 | detail | +30 |
| 単語含有 | heading | +15 |
| 単語含有 | subheading | +10 |
| ペナルティ | ビデオゲーム | -100 |

---

## 📊 実際の比較

### Before（単語検索）

```
キーワード: trading, cards, game

結果:
1. 9504.90.60.00 (スコア: 95) ❌ Video game consoles
2. 9504.90.40.00 (スコア: 50) ❌ Other games
3. 9504.40.0000 (スコア: 45) ✅ Playing cards (3位)
```

### After（フレーズ検索）

```
キーワード: playing cards, printed cards

結果:
1. 9504.40.0000 (スコア: 280) ✅ Playing cards (1位)
2. 4911.91.0000 (スコア: 160) ✅ Printed cards
3. 9504.90.60.00 (スコア: 45) Video game consoles (圏外)
```

---

## 🚀 推奨ワークフロー

### 1. Geminiでフレーズ生成

```
プロンプト: 
この商品のHTS分類用に、2-3語のフレーズを3-5個生成してください。
商品: ポケモンカード

Gemini回答:
playing cards, printed cards, collectible cards, paper card stock
```

### 2. N3で検索

```
推論用キーワード: playing cards, printed cards, collectible cards
```

### 3. 結果確認

```
✅ フレーズ一致で正確な結果
1. 9504.40.0000 - Playing cards ← 正解！
```

---

## 🔧 トラブルシューティング

### Q: "該当するHTSコードが見つかりませんでした"

**A**: フレーズが厳密すぎる可能性

**解決**:
1. より一般的なフレーズを使う
   - ❌ "pokemon trading cards"
   - ✅ "playing cards"

2. 単語も混ぜる
   - `playing cards, paper, collectible`

### Q: まだビデオゲームが上位に来る

**A**: データベースの問題

**確認**:
```sql
SELECT * FROM v_hts_master_data
WHERE hts_number = '9504.40.0000';
```

結果が空 = データベースにデータがない

---

作成日: 2025-01-14
バージョン: 2.0 (フレーズ検索対応)
