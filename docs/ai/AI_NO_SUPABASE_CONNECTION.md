# AI判定の仕組み - 完全解説

## 🎯 最重要ポイント

**AIはSupabaseと連携していません！**
**すべてのデータは「プロンプトに含めて」渡します**

---

## 📋 実際のフロー

```
ステップ1: ツールがSupabaseからデータ取得
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ツール（Next.js） → Supabase
  ├─ GET /api/hts-codes
  │   └─ 200件のHTSコード取得
  └─ GET /api/hts-countries
      └─ 50カ国取得


ステップ2: ツールがプロンプトを生成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
プロンプト = `
商品名: Canon EOS カメラ三脚

HTSコード候補（以下から選んでください）:
- 9006.91.0000: camera tripods
- 8517.62.0050: smartphones
- 8471.30.0100: laptops
... 197件

原産国候補（以下から選んでください）:
- JP: Japan
- CN: China
- US: United States
... 47カ国

この商品に最も適切なHTSコードを3つ選んでください。
`

👆 すべてのデータがプロンプトに含まれている！


ステップ3: 人間がプロンプトをコピー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ブラウザ → クリップボード
  └─ プロンプト全文をコピー


ステップ4: 人間がAIに貼り付け
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
クリップボード → AI（Gemini / Claude Web / Claude Desktop）
  └─ プロンプトを貼り付けて送信


ステップ5: AIが判定（Supabase不要！）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI の処理:
  ├─ プロンプトを読む（すべてのデータが含まれている）
  ├─ Web検索: "camera tripod HTS code"
  ├─ 候補から選択: 9006.91.0000
  ├─ Web検索: "Canon manufacturing country"
  └─ 候補から選択: CN

👆 AIはプロンプトのデータだけを使う
   Supabaseには接続しない！


ステップ6: 人間がAIの回答をコピー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI → クリップボード
  └─ JSON回答をコピー


ステップ7: 人間がツールに貼り付け
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
クリップボード → ツール（Next.js）
  └─ JSONを貼り付けて「保存」


ステップ8: ツールがSupabaseで関税率を検索
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ツール → Supabase
  SELECT * FROM customs_duties
  WHERE hts_code = '9006.91.0000'  ← AIが選んだ
    AND origin_country = 'CN'       ← AIが選んだ
  
  結果: duty_rate = 0.1025
```

---

## 🔍 具体例で理解

### プロンプトの実際の内容

```
# 商品データ強化タスク

## 📦 商品基本情報
- **商品名**: Canon EOS カメラ三脚
- **価格**: ¥3,000

## 🗂️ データベース参照（以下から選択）

### HTSコード候補
- **9006.91.0000**: camera tripods, stands and similar supports
- **8517.62.0050**: smartphones and telephones for cellular networks
- **8471.30.0100**: portable automatic data processing machines (laptops)
- **6204.62.4031**: women's trousers and shorts, of cotton
- **9503.00.0080**: toys representing animals or non-human creatures
- **8529.90.9900**: parts suitable for use solely with cameras
- **9006.99.0000**: other photographic accessories and equipment
- **8543.70.9999**: electrical machines and apparatus
- **8517.69.0050**: other apparatus for transmission of voice, images
- **9027.50.4000**: instruments using optical radiations

### 原産国候補
- **JP**: Japan
- **CN**: China
- **US**: United States
- **DE**: Germany
- **KR**: Korea
- **TW**: Taiwan
- **VN**: Vietnam
- **TH**: Thailand
- **MY**: Malaysia
- **ID**: Indonesia
- **IN**: India
- **MX**: Mexico
- **CA**: Canada
- **GB**: United Kingdom
- **FR**: France

---

## 📋 実行タスク

### 1. HTSコード判定
上記の候補から **最も適切な3つ** を選んでください。

### 2. 原産国判定
上記の候補から選択してください。

---

## 📤 回答フォーマット

```json
{
  "hts_candidates": [
    {
      "code": "9006.91.0000",
      "description": "camera tripods",
      "reasoning": "商品はカメラ用三脚なので最適",
      "confidence": 85
    }
  ],
  "origin_country": {
    "code": "CN",
    "name": "China",
    "reasoning": "Canonの多くは中国製造"
  }
}
```
```

👆 **このプロンプトには：**
- ✅ HTSコード候補10件が含まれている
- ✅ 原産国候補15カ国が含まれている
- ✅ 商品情報が含まれている

👆 **AIは：**
- ✅ このプロンプトだけを見て判定
- ❌ Supabaseには接続しない
- ❌ データベースは読まない

---

## 💡 なぜこの方式なのか？

### 理由1: AIはデータベースに接続できない

```
Gemini（無料版）:
❌ Supabaseに接続できない
❌ APIを実行できない
✅ プロンプトのテキストだけを読める

Claude Web（無料版）:
❌ Supabaseに接続できない
❌ APIを実行できない
✅ プロンプトのテキストだけを読める

Claude Desktop（Claude Code除く）:
❌ Supabaseに接続できない
❌ APIを実行できない
✅ プロンプトのテキストだけを読める
```

### 理由2: プロンプトに含めれば解決

```
❌ AIにSupabase接続を要求
   → 不可能

✅ ツールがSupabaseから取得
   → プロンプトに含める
   → AIは選択するだけ
   → 可能！
```

### 理由3: コスト削減

```
❌ Claude API（有料）を使う:
   ツール → Claude API → 自動判定
   コスト: ¥7.5/商品
   Claude APIはSupabaseに接続可能

✅ プロンプトに含める方式:
   ツール → データ取得
   → プロンプト生成
   → 人間 → 無料AI
   → 人間 → ツール
   コスト: ¥0
```

---

## 🤔 よくある誤解

### 誤解1: AIが自動でSupabaseを読む
```
❌ 間違い:
   AI → Supabaseに接続
   AI → データベース検索
   AI → 関税率取得

✅ 正しい:
   ツール → Supabaseからデータ取得
   ツール → プロンプトに埋め込み
   AI → プロンプトを読んで選択
   ツール → 選択結果でSupabase検索
```

### 誤解2: Claude Desktopなら自動化できる
```
❌ Claude Desktop（通常版）:
   Supabaseに接続できない

⚠️ Claude Code:
   MCPサーバー経由でSupabase接続可能
   しかし今回は「無料AI」が目的なので不使用
```

### 誤解3: Geminiだけ無理
```
✅ すべてのAIで可能:
   - Gemini（無料版）
   - Claude Web（無料版）
   - Claude Desktop（通常版）
   
   すべて同じ方式:
   プロンプトを読む → 選択する
```

---

## 🎯 データの流れ（超シンプル版）

```
【準備】
ツール → Supabase → データ取得
        ↓
     プロンプト
        ↓
      コピー

【判定】
人間 → AI（無料）に貼り付け
     ↓
    AI判定
     ↓
   JSON出力
     ↓
    コピー

【保存】
人間 → ツールに貼り付け
     ↓
   ツール → Supabase検索（AIの選択結果で）
     ↓
    保存
```

---

## 📊 比較表

| 項目 | 有料AI API | 無料AI（今回の方式） |
|-----|-----------|------------------|
| **Supabase接続** | ✅ 可能 | ❌ 不可能 |
| **自動実行** | ✅ 可能 | ❌ 人間が仲介 |
| **コスト** | ¥7.5/商品 | ¥0 |
| **データ渡し方** | API経由 | プロンプト経由 |
| **精度** | 高い | 同等（候補から選択） |

---

## 🎉 まとめ

### AIの役割

```
✅ AIができること:
   - プロンプトを読む
   - Web検索する
   - 候補から選択する
   - JSON出力する

❌ AIができないこと:
   - Supabaseに接続
   - データベース検索
   - API実行
   - 自動保存
```

### 人間の役割

```
✅ 人間がやること:
   1. プロンプトをコピー
   2. AIに貼り付け
   3. JSON回答をコピー
   4. ツールに貼り付け

⏱️ 所要時間: 約30秒
💰 コスト: ¥0
```

### ツールの役割

```
✅ ツールがやること:
   1. Supabaseから候補取得
   2. プロンプト生成
   3. JSON検証
   4. Supabaseで関税率検索
   5. データ保存
   6. DDP計算

💻 自動実行: すべて自動
```

---

## 📝 結論

**AIはSupabaseと連携していません！**
**すべてのデータはプロンプトに含めて渡します！**
**どのAI（Gemini / Claude Web / Claude Desktop）でも同じ方式！**
**コスト: ¥0**
