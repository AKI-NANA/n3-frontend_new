# 視覚的比較: 有料AI vs 無料AI

## 🔴 有料AI（Claude API）の場合

```
┌─────────────┐
│   ツール    │ 
│  (Next.js)  │
└─────┬───────┘
      │ 1. 商品データ送信
      │    {title: "Canon 三脚"}
      ↓
┌─────────────────────┐
│   Claude API        │ ← Supabase接続可能
│   (有料: ¥7.5/回)   │ ← MCP使用可能
└─────┬───────────────┘
      │ 2. 自動でSupabase検索
      ├──→ hs_codes テーブル読み取り
      ├──→ hts_countries テーブル読み取り
      ├──→ customs_duties テーブル検索
      │
      │ 3. AI判定実行
      │    - HTSコード選択
      │    - 原産国判定
      │    - 関税率取得
      ↓
┌─────────────┐
│   ツール    │
│  結果受信   │
└─────────────┘

✅ 完全自動
❌ コスト: ¥7.5/商品
```

---

## 🟢 無料AI（Gemini / Claude Web）の場合

```
┌─────────────┐
│   ツール    │
│  (Next.js)  │
└─────┬───────┘
      │ 1. Supabaseから候補取得
      ├──→ GET /api/hts-codes
      │     └─ 200件のHTSコード
      └──→ GET /api/hts-countries
            └─ 50カ国
      ↓
┌─────────────────────────────┐
│  プロンプト生成              │
│                              │
│  商品名: Canon 三脚           │
│                              │
│  HTSコード候補:              │
│  - 9006.91.0000: tripods    │
│  - 8517.62.0050: phones     │
│  ... 198件                   │
│                              │
│  原産国候補:                 │
│  - JP: Japan                │
│  - CN: China                │
│  ... 48カ国                  │
└──────────┬──────────────────┘
           │ 2. 人間がコピー
           ↓
      ┌─────────┐
      │  人間    │ ← クリップボード
      └────┬────┘
           │ 3. AIに貼り付け
           ↓
┌────────────────────────┐
│  Gemini / Claude Web   │ ← Supabase接続不可
│  (無料)                │ ← MCP使用不可
└────────┬───────────────┘
         │ 4. プロンプトのデータだけを使用
         │    - HTSコード候補から選択
         │    - 原産国候補から選択
         │    - Web検索で確認
         ↓
┌────────────────────────┐
│  JSON出力              │
│                        │
│  {                     │
│    "hts_candidates": [ │
│      {                 │
│        "code":         │
│        "9006.91.0000"  │
│      }                 │
│    ],                  │
│    "origin_country": { │
│      "code": "CN"      │
│    }                   │
│  }                     │
└────────┬───────────────┘
         │ 5. 人間がコピー
         ↓
      ┌─────────┐
      │  人間    │
      └────┬────┘
           │ 6. ツールに貼り付け
           ↓
┌─────────────┐
│   ツール    │
└─────┬───────┘
      │ 7. AIの選択結果でSupabase検索
      │
      ├──→ SELECT * FROM customs_duties
      │     WHERE hts_code = '9006.91.0000'
      │       AND origin_country = 'CN'
      │     
      │     結果: duty_rate = 0.1025
      ↓
┌─────────────┐
│  保存完了   │
└─────────────┘

⚠️ 人間が仲介必要（2回のコピペ）
✅ コスト: ¥0
```

---

## 🔑 重要な違い

### データベース接続

```
有料AI（Claude API）:
┌──────────┐
│ Claude   │────→ Supabase
│   API    │  ↑   (直接接続可能)
└──────────┘  │
              │ MCP サーバー経由
              └─ データベース操作


無料AI（Gemini / Claude Web）:
┌──────────┐
│ Gemini/  │  ╳╳╳→ Supabase
│ Claude   │        (接続不可)
│  Web     │
└──────────┘
      ↑
      │ プロンプトのテキストのみ
      └─ データはすべてプロンプトに含める
```

### データの流れ

```
【有料AI】
商品データ → API → Supabase → 結果

【無料AI】
Supabase → データ取得
         ↓
      プロンプト生成（データ埋め込み）
         ↓
      人間 → AI（プロンプト渡す）
         ↓
      AI → 選択（プロンプトのデータから）
         ↓
      人間 → ツール（選択結果渡す）
         ↓
      ツール → Supabase（選択結果で検索）
```

---

## 📊 具体例: プロンプトの中身

### プロンプトに含まれるデータ

```markdown
# 商品データ強化タスク

## 📦 商品基本情報
- 商品名: Canon EOS カメラ三脚
- 価格: ¥3,000

## 🗂️ HTSコード候補（Supabaseから取得済み）
- 9006.91.0000: camera tripods, stands and similar supports
- 8517.62.0050: smartphones and telephones for cellular
- 8471.30.0100: portable automatic data processing machines
- 6204.62.4031: women's trousers and shorts, of cotton
- 9503.00.0080: toys representing animals or non-human
- 8529.90.9900: parts suitable for use solely with cameras
- 9006.99.0000: other photographic accessories
- 8543.70.9999: electrical machines and apparatus
- 8517.69.0050: other apparatus for transmission
- 9027.50.4000: instruments using optical radiations

## 🌍 原産国候補（Supabaseから取得済み）
- JP: Japan
- CN: China
- US: United States
- DE: Germany
- KR: Korea
- TW: Taiwan
- VN: Vietnam
- TH: Thailand
- MY: Malaysia
- ID: Indonesia
- IN: India
- MX: Mexico
- CA: Canada
- GB: United Kingdom
- FR: France

## 📋 タスク
上記の候補から最も適切なものを選んでください。

👆 すべてのデータがプロンプトに含まれている！
   AIはこのテキストだけを見て判定する
   Supabaseには一切接続しない
```

---

## 🎯 まとめ

### どのAIもSupabaseに接続できない

```
❌ Gemini（無料版）
   → Supabase接続不可
   → プロンプトのデータから選択

❌ Claude Web（無料版）
   → Supabase接続不可
   → プロンプトのデータから選択

❌ Claude Desktop（通常版）
   → Supabase接続不可
   → プロンプトのデータから選択

✅ Claude API（有料）
   → MCP使用でSupabase接続可能
   → でもコストが¥7.5/商品
```

### すべてのデータはプロンプトに含める

```
1. ツールがSupabaseからデータ取得
2. ツールがプロンプトに埋め込む
3. 人間がAIに渡す
4. AIがプロンプトのデータから選択
5. 人間がツールに結果を渡す
6. ツールがSupabaseで検証
```

### コスト比較

```
有料AI: ¥7.5/商品
無料AI: ¥0

追加手間: コピペ2回（30秒）
```
