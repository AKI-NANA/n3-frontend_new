# HTSコード判定フロー - 視覚的図解

## 🔑 最重要ポイント

### Q: ツールはSupabaseを検索できるのか？
**A: はい、できます！**

```
ツール（バックエンドAPI）:
✅ Supabaseから候補リストを取得できる
✅ Supabaseから関税率を検索できる
✅ Supabaseにデータを保存できる
```

### Q: AIは何を判定するのか？
**A: 候補から「選択」します**

```
AI（Gemini/Claude Web）:
✅ HTSコードを「選ぶ」（Supabaseの200件から）
✅ 原産国を「選ぶ」（Supabaseの50カ国から）
❌ 関税率を「計算」（できない）
❌ Supabaseを「検索」（できない）
```

---

## 📊 完全なフロー図

```
ステップ1: 候補取得
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ツール → Supabase
  ├─ GET /api/hts-codes
  │   └─ 返り値: 200件のHTSコード候補
  └─ GET /api/hts-countries
      └─ 返り値: 50カ国の原産国候補


ステップ2: AIに渡す
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ツール → プロンプト生成
  ├─ 商品名: Canon EOS カメラ三脚
  ├─ HTSコード候補: 200件
  └─ 原産国候補: 50カ国
          ↓
人間がコピー → Gemini/Claude Web


ステップ3: AI判定
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI（Gemini/Claude Web）
  ├─ Web検索: "camera tripod HTS code"
  ├─ 候補から選択: 9006.91.0000
  ├─ Web検索: "Canon manufacturing country"
  └─ 候補から選択: CN (China)
          ↓
JSON出力 → 人間がコピー


ステップ4: 関税率取得
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ツール → Supabase
  SELECT * FROM customs_duties
  WHERE hts_code = '9006.91.0000'
    AND origin_country = 'CN'
          ↓
  結果: duty_rate = 0.1025 (10.25%)


ステップ5: 保存・計算
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ツール → Supabase
  ├─ products テーブルに保存
  └─ DDP計算実行（duty_rate使用）
```

---

## 💡 簡単な例で理解

### 例: Canon カメラ三脚の場合

**ステップ1**: ツールが候補を取得
```javascript
// GET /api/hts-codes の返り値
[
  { code: "9006.91.0000", description: "camera tripods" },
  { code: "8517.62.0050", description: "smartphones" },
  { code: "8471.30.0100", description: "laptops" },
  // ... 197件
]

// GET /api/hts-countries の返り値
[
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "US", name: "United States" },
  // ... 47カ国
]
```

**ステップ2**: AIが選択
```
AI の判断プロセス:
1. "カメラ三脚" → camera tripod
2. Web検索 → 9006.91.0000 が適切
3. 候補にある → 選択！

4. "Canon" → 日本ブランドだが...
5. Web検索 → 多くは中国製造
6. 候補にある → CN を選択！
```

**ステップ3**: ツールが関税率を取得
```sql
-- ツールが実行するSQL
SELECT * FROM customs_duties
WHERE hts_code = '9006.91.0000'
  AND origin_country = 'CN';

-- 結果
{
  base_duty: 0.0275,        -- 2.75%
  section301_rate: 0.075,   -- 7.5%
  total_duty_rate: 0.1025   -- 10.25%
}
```

---

## 🎯 なぜこの設計なのか？

### 理由1: API課金回避
```
❌ AIに全て任せる場合:
   商品データ → Claude API → 判定完了
   コスト: ¥7.5/商品

✅ 候補を渡す方式:
   候補 → 無料AI → 選択 → ツール → 検証
   コスト: ¥0
```

### 理由2: 精度向上
```
❌ AIに自由に判定させる:
   → 存在しないHTSコードを返す可能性
   → 関税率が不明

✅ 候補から選択:
   → 必ずSupabaseに存在するコード
   → 関税率が確実に取得できる
```

### 理由3: データベース一元管理
```
関税率データ:
- customs_duties テーブルで管理
- 更新が容易
- 他の機能でも使用可能
- 履歴管理可能
```

---

## 🔄 役割分担（超シンプル版）

```
【ツール】
できること:
✅ Supabase読み書き
✅ 計算実行
✅ データ変換

できないこと:
❌ 商品理解
❌ Web検索
❌ 判断


【AI】
できること:
✅ 商品理解
✅ Web検索
✅ 判断・選択

できないこと:
❌ Supabase操作
❌ 複雑な計算
❌ データ保存
```

---

## 🎉 まとめ

**ツールはSupabaseを検索できるのか？**
→ はい！候補取得と関税率取得の両方で使用

**AIは何を判定するのか？**
→ Supabaseの候補から「選択」のみ

**関税率はどうするのか？**
→ ツールがSupabaseから「検索」して取得

**コストは？**
→ ¥0（無料AIサービス使用）
