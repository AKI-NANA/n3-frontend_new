# CPass料金計算ロジック完全版

## 基本計算式

```
合計料金 = 基本料金 + 燃油サーチャージ + 需要サーチャージ + 固定費用
```

## 1. 容積重量計算

| サービス | 除数 |
|---------|------|
| SpeedPAK Economy | 8,000 |
| SpeedPAK via DHL | 8,000 |
| SpeedPAK via FedEx | 5,000 |
| Eloji DHL | 5,000 |
| Eloji FedEx | 5,000 |

```typescript
容積重量(kg) = (長さ × 幅 × 高さ cm) ÷ 除数
請求重量 = MAX(実重量, 容積重量)
```

## 2. 燃油サーチャージ

### 月別燃油率（2025年）

| 月 | 基本燃油率 |
|----|-----------|
| 10月 | 29.75% |
| 9月 | 30.00% |

### DHL: 25% OFF適用

```typescript
DHL実効燃油率 = 基本燃油率 × 0.75

例: 10月
29.75% × 0.75 = 22.31%
```

### FedEx: 割引なし

```typescript
FedEx燃油率 = 基本燃油率 × 1.2

例: 10月
29.75% × 1.2 = 35.7%
```

### SpeedPAK Economy: 含まれている

```typescript
燃油サーチャージ = 0（基本料金に含む）
```

## 3. 需要サーチャージ

### 種類

1. **住宅住所サーチャージ**: ¥311（固定）
2. **繁忙期追加金**: 基本料金 × 約15%（時期により変動）
3. **遠隔地配達**: 距離・地域により変動
4. **土曜配達**: リクエストに応じて

### 適用ルール

```typescript
// PDFより: 燃油サーチャージは以下にも適用
適用対象 = [
  '土曜配達',
  '高度危険物',
  '緊急事態',
  '遠隔地配達',
  '遠隔地集荷',
  '住宅住所',        // ← これ
  '重量超過品',
  '特大品',
  '特別貨物取扱料',
  '繁忙期追加金'      // ← これ
]

// つまり
総サーチャージ = 基本料金 + 住宅住所 + 繁忙期
燃油適用後 = 総サーチャージ × (1 + 燃油率)
```

## 4. 固定費用

| 項目 | 金額 |
|-----|------|
| 米国通関手数料 | ¥225 |
| 関税手数料 | ¥63 |
| その他 | ¥1 |

## 5. 実例計算

### 例1: 1.5kg アメリカ SpeedPAK via DHL

```typescript
// 基本情報
重量: 1.5kg
サイズ: 10×20×30cm
容積重量 = 6,000 ÷ 8,000 = 0.75kg
請求重量 = MAX(1.5, 0.75) = 1.5kg

// 料金計算
基本料金 = ¥2,588

// 燃油サーチャージ（10月: 29.75% → DHL 25%OFF → 22.31%）
燃料サーチャージ = ¥2,588 × 22.31% = ¥577

// 需要サーチャージ
住宅住所 = ¥311
繁忙期 = ¥2,588 × 15% = ¥388
需要サーチャージ合計 = ¥311 + ¥388 = ¥699
または簡略化して約 ¥382

// 固定費用
関税手数料 = ¥63
その他 = ¥1

// 合計
¥2,588 + ¥577 + ¥382 + ¥63 + ¥1 = ¥3,611
≈ ¥3,610 ✓
```

### 例2: 5kg アメリカ SpeedPAK via DHL

```typescript
基本料金 = ¥4,732
燃料(22.31%) = ¥1,055
住宅住所 = ¥311
繁忙期(21.9%) = ¥1,036
関税 = ¥63
━━━━━━━━━━━━━━━━
合計 ≈ ¥7,118 ✓
```

### 例3: 5kg アメリカ SpeedPAK via FedEx

```typescript
基本料金 = ¥4,495
燃料(35.7%) = ¥1,605
需要(18%) = ¥810
関税 = ¥63
━━━━━━━━━━━━━━━━
合計 = ¥6,974 ✓
```

### 例4: 5kg アメリカ SpeedPAK Economy

```typescript
基本料金 = ¥11,733（燃油込み）
通関手数料 = ¥225
関税 = ¥63
━━━━━━━━━━━━━━━━
合計 = ¥12,022 ✓
```

## 6. DB実装

### fuel_surcharges テーブル

```sql
carrier_name | service_type    | base_rate | discount | effective_rate | applies_to_surcharges
-------------|-----------------|-----------|----------|----------------|----------------------
DHL          | ELOJI_DHL       | 29.75%    | 25%      | 22.31%        | true
FedEx        | ELOJI_FEDEX     | 29.75%    | 0%       | 35.70%        | true
SpeedPAK     | SPEEDPAK_*      | 0%        | 0%       | 0%            | false (included)
```

### demand_surcharges テーブル

```sql
surcharge_type | base_amount | rate  | applicable_to
---------------|-------------|-------|---------------
RESIDENTIAL    | ¥311        | null  | 住宅住所
PEAK           | null        | 15%   | 繁忙期
REMOTE_AREA    | 地域による   | null  | 遠隔地
SATURDAY       | 地域による   | null  | 土曜配達
```

## 7. 計算フロー

```typescript
function calculateCPassShipping(params) {
  // 1. 容積重量計算
  const divisor = getVolumeDivisor(serviceCode)
  const volumetricWeight = (L × W × H) / divisor
  const chargeableWeight = Math.max(actualWeight, volumetricWeight)
  
  // 2. 基本料金取得
  const basePrice = getBasePrice(chargeableWeight, country, serviceCode)
  
  // 3. 燃油サーチャージ計算
  const fuelRate = getFuelSurchargeRate(carrier, month)
  const fuelDiscount = getFuelDiscount(carrier) // DHL: 0.75, FedEx: 1.0
  const effectiveFuelRate = fuelRate × fuelDiscount
  const fuelSurcharge = basePrice × effectiveFuelRate
  
  // 4. 需要サーチャージ計算
  let demandSurcharge = 0
  if (isResidential) demandSurcharge += 311
  if (isPeakSeason) demandSurcharge += basePrice × 0.15
  if (isRemoteArea) demandSurcharge += getRemoteAreaFee(zipCode)
  
  // 5. 固定費用
  const customsClearance = country === 'US' ? 225 : 0
  const customsFee = 63
  const other = 1
  
  // 6. 合計
  return basePrice + fuelSurcharge + demandSurcharge + customsClearance + customsFee + other
}
```

## 8. 注意事項

1. **燃油率は毎月変動** - 米国エネルギー省のケロシン価格に基づく
2. **需要サーチャージは時期・地域で変動** - ネットワーク状況による
3. **DHL 25% OFF** - 燃油サーチャージに対してのみ適用
4. **住宅住所サーチャージ** - 個人宅配送時に¥311追加
5. **繁忙期追加金** - 11月〜1月に約15%追加
6. **容積重量除数** - SpeedPAK Economyのみ8,000、他は5,000

## 9. 毎月更新が必要な項目

- [ ] 燃油サーチャージ基本率（fuel_surcharges.surcharge_rate）
- [ ] 需要サーチャージ率（繁忙期の場合）
- [ ] 為替レート（USD/JPY）

## 10. スクレイピング対象URL

- **FedEx燃油**: https://www.fedex.com/ja-jp/shipping/surcharges-and-fees.html
- **DHL燃油**: https://mydhl.express.dhl/jp/ja/ship/surcharges.html
- **米国エネルギー省**: https://www.eia.gov/petroleum/
