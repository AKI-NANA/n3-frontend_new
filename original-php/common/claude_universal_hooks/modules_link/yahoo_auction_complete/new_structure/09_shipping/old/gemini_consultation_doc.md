# 配送料金システム - ゾーン体系統一化相談資料

## 🚨 解決したい問題

国際配送料金計算システムで、配送会社ごとに異なるゾーン体系をどう統一的に管理するか？

### 現状の問題
1. **ゾーン体系がバラバラ**
   - EMS: 第1地帯～第5地帯（地理的分類）
   - SpeedPAK: USA/UK/DE/AU（対応国制）
   - eLogi: Zone1/Zone2/Zone3（サービスレベル制）

2. **対応国数の違い**
   - EMS: 全世界132カ国
   - SpeedPAK: 4カ国限定
   - eLogi: 主要国のみ

3. **データベース設計の課題**
   - 現在: 単一のzone_codeカラムで無理やり統一
   - 問題: 「第4地帯」「USA対応」「Zone1」が混在

## 🎯 要件

### ビジネス要件
- **受注時**: 顧客が「アメリカ」を選択
- **料金計算**: 各配送会社の料金を自動取得
- **DDP対応**: 関税込み価格で表示
- **最適化**: 最安・最速サービスを推奨

### 技術要件
- **データ整合性**: 配送会社×国×ゾーンの正確な管理
- **拡張性**: 新しい配送会社・サービスの追加容易性
- **パフォーマンス**: 高速な料金検索
- **保守性**: ゾーン変更時の一括更新

## 💡 検討中の解決案

### 案1: 配送会社別ゾーンテーブル
```sql
-- 配送会社ごとに独立したゾーン管理
CREATE TABLE carrier_zone_mapping (
    carrier_code VARCHAR(20),
    service_code VARCHAR(50), 
    country_code VARCHAR(5),
    zone_identifier VARCHAR(50), -- 各社独自のゾーン名
    zone_normalized VARCHAR(20), -- 正規化されたゾーンID
    is_supported BOOLEAN
);
```

### 案2: 統一ゾーン + マッピングテーブル
```sql
-- 統一ゾーンマスター
CREATE TABLE unified_zones (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(50),
    geographic_region VARCHAR(50)
);

-- 配送会社別マッピング
CREATE TABLE carrier_zone_mapping (
    carrier_code VARCHAR(20),
    country_code VARCHAR(5), 
    unified_zone_id INTEGER,
    carrier_zone_name VARCHAR(50),
    is_supported BOOLEAN
);
```

### 案3: 国ベース + 配送会社判定
```sql
-- 国マスター
CREATE TABLE countries (
    country_code VARCHAR(5) PRIMARY KEY,
    country_name VARCHAR(100)
);

-- 配送可能性マトリックス
CREATE TABLE shipping_availability (
    carrier_code VARCHAR(20),
    service_code VARCHAR(50),
    country_code VARCHAR(5),
    zone_reference VARCHAR(50),
    is_available BOOLEAN,
    price_tier INTEGER
);
```

## 🤔 相談したいポイント

### 1. アーキテクチャ選択
上記3案のうち、どれが最も適切？または他の設計パターンがあるか？

### 2. ゾーン正規化戦略
- 地理的ゾーン（アジア・ヨーロッパ・北米等）で統一？
- 価格帯ゾーン（安い・普通・高い等）で統一？
- 配送会社固有のまま維持？

### 3. UI設計方針
- ユーザーには何を選ばせるべき？
  - 国のみ（システムがゾーン判定）
  - 国＋ゾーン（ユーザーが意識）
  - 主要国＋その他ゾーン（ハイブリッド）

### 4. データ更新戦略
- 料金改定時の一括更新方法
- 新サービス追加時の影響範囲
- ゾーン変更時の整合性確保

## 📊 現在のデータ例

### アメリカ向け配送の場合
| 配送会社 | ゾーン表記 | 0.5kg料金 | 配送日数 |
|---------|-----------|-----------|----------|
| EMS | 第4地帯 | ¥3,900 | 3-6日 |
| SpeedPAK | USA対応 | ¥2,060 | 8-12日 |
| eLogi | Zone1 | ¥4,200 | 1-3日 |

### 求める理想形
| 配送会社 | 統一ゾーン | 0.5kg料金 | 配送日数 |
|---------|-----------|-----------|----------|
| EMS | NA-TIER2 | ¥3,900 | 3-6日 |
| SpeedPAK | NA-ECONOMY | ¥2,060 | 8-12日 |
| eLogi | NA-EXPRESS | ¥4,200 | 1-3日 |

## 🎯 期待する回答

1. **推奨データベース設計**（具体的なSQL）
2. **ゾーン統一化戦略**（命名規則・分類方法）
3. **API設計方針**（国コード→料金取得の流れ）
4. **UI設計ガイダンス**（ユーザー体験の最適化）

よろしくお願いします！