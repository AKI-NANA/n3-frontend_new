# Eloji送料データ CSVフォーマット仕様書

## 基本フォーマット

### ファイル命名規則
```
eloji_shipping_rates_YYYYMMDD.csv
例: eloji_shipping_rates_20250905.csv
```

### CSVヘッダー（必須）
```csv
zone_name,country_codes,service_type,weight_min_kg,weight_max_kg,length_max_cm,cost_usd,delivery_days_min,delivery_days_max,fuel_surcharge_percent,notes
```

### データ例
```csv
zone_name,country_codes,service_type,weight_min_kg,weight_max_kg,length_max_cm,cost_usd,delivery_days_min,delivery_days_max,fuel_surcharge_percent,notes
"North America","US,CA,MX",economy,0.000,0.500,30,15.50,7,14,5.0,"Small packet"
"North America","US,CA,MX",standard,0.000,0.500,30,22.00,5,10,5.0,"Standard delivery"
"North America","US,CA,MX",express,0.000,0.500,30,35.00,2,5,5.0,"Express delivery"
"North America","US,CA,MX",economy,0.501,1.000,40,18.75,7,14,5.0,"Medium packet"
"North America","US,CA,MX",standard,0.501,1.000,40,28.50,5,10,5.0,"Standard delivery"
"North America","US,CA,MX",express,0.501,1.000,40,42.00,2,5,5.0,"Express delivery"
"Europe","GB,DE,FR,IT,ES,NL,BE",economy,0.000,0.500,30,18.50,10,21,5.0,"Small packet Europe"
"Europe","GB,DE,FR,IT,ES,NL,BE",standard,0.501,1.000,40,32.00,7,14,5.0,"Standard Europe"
"Asia Pacific","AU,NZ,SG,HK,KR,JP",economy,0.000,0.500,30,22.00,14,28,5.0,"Asia Pacific small"
"USA Domestic Zone 1-3","US",economy,0.000,0.500,30,8.50,3,7,3.0,"Local zones"
"USA Domestic Zone 4-5","US",economy,0.000,0.500,30,12.00,4,8,3.0,"Regional zones"
"USA Domestic Zone 6-8","US",economy,0.000,0.500,30,16.50,5,10,3.0,"National zones"
"USA Alaska/Hawaii","US",economy,0.000,0.500,30,25.00,7,14,5.0,"Special handling"
```

## フィールド定義

| フィールド名 | 型 | 必須 | 説明 | 例 |
|-------------|----|----|------|-----|
| zone_name | string | ✅ | ゾーン名 | "North America" |
| country_codes | string | ✅ | 国コード（カンマ区切り） | "US,CA,MX" |
| service_type | enum | ✅ | サービス種別 | economy/standard/express |
| weight_min_kg | decimal | ✅ | 最小重量(kg) | 0.000 |
| weight_max_kg | decimal | ✅ | 最大重量(kg) | 0.500 |
| length_max_cm | decimal | | 最大長さ制限(cm) | 30 |
| cost_usd | decimal | ✅ | 送料(USD) | 15.50 |
| delivery_days_min | integer | | 最短配送日数 | 7 |
| delivery_days_max | integer | | 最長配送日数 | 14 |
| fuel_surcharge_percent | decimal | | 燃油サーチャージ率(%) | 5.0 |
| notes | string | | 備考・特記事項 | "Small packet" |

## バリデーションルール

### 必須チェック
- zone_name, country_codes, service_type, weight_min_kg, weight_max_kg, cost_usd は必須
- weight_min_kg <= weight_max_kg
- cost_usd > 0
- service_type は economy/standard/express のいずれか

### データ整合性
- 同一ゾーン・同一サービスタイプで重量範囲の重複なし
- 国コードはISO 3166-1 alpha-2準拠
- 配送日数は min <= max

## 特殊ケース

### USA国内詳細ゾーン
```csv
zone_name,country_codes,service_type,weight_min_kg,weight_max_kg,length_max_cm,cost_usd,delivery_days_min,delivery_days_max,fuel_surcharge_percent,notes
"USA Zone 1","US",economy,0.000,0.500,30,7.50,2,5,3.0,"Zone 1 (Local)"
"USA Zone 2","US",economy,0.000,0.500,30,8.00,2,5,3.0,"Zone 2 (Local)"
"USA Zone 3","US",economy,0.000,0.500,30,8.50,3,6,3.0,"Zone 3 (Local)"
```

### 大型商品対応
```csv
zone_name,country_codes,service_type,weight_min_kg,weight_max_kg,length_max_cm,cost_usd,delivery_days_min,delivery_days_max,fuel_surcharge_percent,notes
"North America","US,CA,MX",economy,5.001,10.000,100,85.00,10,21,5.0,"Large package"
"North America","US,CA,MX",economy,10.001,20.000,150,160.00,14,28,5.0,"Extra large"
```

### 禁止・制限アイテム
```csv
zone_name,country_codes,service_type,weight_min_kg,weight_max_kg,length_max_cm,cost_usd,delivery_days_min,delivery_days_max,fuel_surcharge_percent,notes
"Europe","GB,DE,FR",economy,0.000,0.500,30,0.00,0,0,0.0,"PROHIBITED - Electronics with batteries"
"Asia Pacific","AU,NZ",standard,2.001,5.000,80,0.00,0,0,0.0,"RESTRICTED - Customs clearance required"
```

## アップロード処理フロー

1. **CSV構文チェック** → ヘッダー確認・文字エンコーディング
2. **データバリデーション** → 必須項目・データ型・範囲チェック
3. **重複データ処理** → 既存データとの重複解決
4. **ゾーン自動作成** → 新しいゾーンの自動生成
5. **料金テーブル更新** → shipping_rates テーブルへの一括挿入
6. **ポリシー再計算** → 影響を受ける配送ポリシーの更新
