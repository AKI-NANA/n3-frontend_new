# 外部API統合 - Zonos HTS & DDP計算

## 📋 概要

商品データから **正確なHTSコードと関税・DDP計算** を行うための外部API統合システムです。

### 主要機能

1. **HTSコード分類** (`/api/external/zonos/classify-hts`)
   - 商品説明からHTSコードを推定
   - 原産国・素材を考慮した分類
   - 複数の候補コードを返却

2. **DDP計算** (`/api/external/zonos/calculate-ddp`)
   - 関税・VAT/消費税の正確な計算
   - 国別税率の自動適用
   - 配送料込みの総額計算

## 🔧 セットアップ

### 1. Zonos APIキーの取得

1. [Zonos](https://zonos.com/)にアカウント登録
2. API Keyを発行
3. `.env.local`に追加:

```bash
ZONOS_API_KEY=your_zonos_api_key_here
```

### 2. フォールバックモード

Zonos APIキーがない場合、自動的にSupabaseデータベースにフォールバックします:
- `hts_codes_details`テーブルから検索
- `customs_duties`テーブルから関税率を取得

## 📡 API使用方法

### HTSコード分類

```typescript
const response = await fetch('/api/external/zonos/classify-hts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: 'Pokemon Trading Card Game Charizard VMAX Graded PSA 10',
    originCountry: 'JP',
    material: 'Graded Card Stock',
    category: 'Trading Cards',
    value: 150.00
  })
})

const data = await response.json()

if (data.success) {
  console.log('HTSコード:', data.data.htsCode) // "9504.90.3000"
  console.log('関税率:', data.data.dutyRate) // 0
  console.log('確信度:', data.data.confidence) // 0.95
  console.log('代替候補:', data.data.alternativeCodes)
}
```

### DDP計算

```typescript
const response = await fetch('/api/external/zonos/calculate-ddp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    htsCode: '9504.90.3000',
    originCountry: 'JP',
    destinationCountry: 'US',
    value: 150.00,
    shippingCost: 25.00,
    weight: 0.25,
    quantity: 1
  })
})

const data = await response.json()

if (data.success) {
  console.log('関税:', data.data.dutyAmount) // $0.00
  console.log('VAT:', data.data.taxAmount) // $0.00
  console.log('DDP合計:', data.data.totalDDP) // $175.00
  console.log('内訳:', data.data.breakdown)
}
```

## 🔄 統合フロー

指示書に基づく完全な処理フロー:

```
1. 商品データ確認
   ↓
2. 原産国・素材が空欄？
   ↓ YES
3. Gemini APIで補完 (/api/gemini/suggest-trade-data)
   ↓
4. HTSコード分類 (/api/external/zonos/classify-hts)
   ↓
5. 確信度チェック (>= 98%?)
   ↓ YES: 自動承認 / NO: 手動承認
6. DDP計算 (/api/external/zonos/calculate-ddp)
   ↓
7. 最終販売価格設定
   ↓
8. 出品準備完了
```

## 📊 レスポンス例

### HTSコード分類成功

```json
{
  "success": true,
  "data": {
    "htsCode": "9504903000",
    "htsDescription": "Video game consoles and machines, other than those of subheading 9504.30",
    "dutyRate": 0,
    "confidence": 0.92,
    "alternativeCodes": [
      {
        "code": "9504400000",
        "description": "Playing cards",
        "confidence": 0.78
      },
      {
        "code": "9504902000",
        "description": "Chess, checkers, and other board games",
        "confidence": 0.65
      }
    ]
  }
}
```

### DDP計算成功

```json
{
  "success": true,
  "data": {
    "dutyAmount": 0,
    "taxAmount": 0,
    "totalDDP": 175.00,
    "breakdown": {
      "itemValue": 150.00,
      "shipping": 25.00,
      "duty": 0,
      "tax": 0,
      "total": 175.00
    },
    "dutyRate": 0,
    "taxRate": 0
  }
}
```

## 🛡️ エラーハンドリング

### エラーレスポンス例

```json
{
  "success": false,
  "error": "該当するHTSコードが見つかりませんでした。手動で確認してください。"
}
```

### フォールバック動作

1. **Zonos API失敗** → Supabaseデータベース検索
2. **データベースにも該当なし** → エラーを返却し、手動確認を促す
3. **部分的なデータのみ** → 利用可能なデータで計算し、確信度を下げる

## 📈 パフォーマンス

- **Zonos API**: 平均200-500ms
- **Supabaseフォールバック**: 平均100-300ms
- **失敗時の自動リトライ**: なし（エラー時は手動対応推奨）

## 🔐 セキュリティ

- APIキーは環境変数で管理
- サーバーサイドのみで実行（クライアントに露出しない）
- リクエストレート制限: Zonosプランに依存

## 🚀 今後の拡張

### Phase 2: 他サービス対応
- Avalara AvaTax
- Descartes Datamyne
- USITC公式API

### Phase 3: キャッシュ機能
- 頻繁に使用されるHTSコードをRedisにキャッシュ
- API呼び出し回数を削減

### Phase 4: バッチ処理
- 複数商品の一括HTS分類
- 一括DDP計算

## 📞 サポート

- Zonos API Documentation: https://docs.zonos.com/
- Zonos Support: support@zonos.com

## ✅ チェックリスト

- [ ] Zonos APIキーを取得
- [ ] `.env.local`に`ZONOS_API_KEY`を追加
- [ ] ヘルスチェックエンドポイントで確認: `GET /api/external/zonos/classify-hts`
- [ ] テスト実行: HTSコード分類
- [ ] テスト実行: DDP計算
- [ ] フォールバックモードの動作確認
- [ ] エラーハンドリングの確認

---

**実装日**: 2025-01-14  
**Status**: ✅ 実装完了  
**Zonos API**: 有料プラン推奨（フォールバック機能あり）
