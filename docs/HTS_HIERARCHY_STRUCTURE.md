# HTS分類の正式な階層構造

## 📊 HTSの5階層構造（確定版）

```
階層0: Section（部）
├── 21のSection（I-XXI）
├── 最上位の大分類
└── 例: SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS
    │
    ├── 階層1: Chapter（類）★ 現在のページ
    │   ├── 2桁コード（01-99）
    │   └── 例: Chapter 01 - 生きている動物
    │       │
    │       ├── 階層2: Heading（項）
    │       │   ├── 4桁コード（0101, 0102...）
    │       │   └── 例: 0101 - 馬、ろば、ラバ及びけつろば
    │       │       │
    │       │       ├── 階層3: Subheading（号）
    │       │       │   ├── 6桁コード（010121, 010129...）
    │       │       │   └── 例: 010121 - 純粋種の繁殖用馬
    │       │       │       │
    │       │       │       └── 階層4: 統計品目番号
    │       │       │           ├── 10桁コード（0101211000）
    │       │       │           └── 最終的な税率決定コード
```

## 🎯 正確な日本語表記

| 階層 | 英語 | 日本語 | 桁数 | 例 | 備考 |
|------|------|--------|------|-----|------|
| 0 | Section | **部** | I-XXI | SECTION I | 21の大分類 |
| 1 | Chapter | **類** | 2桁 | 01 | 99類まで存在 |
| 2 | Heading | **項** | 4桁 | 0101 | Chapter内の中分類 |
| 3 | Subheading | **号** | 6桁 | 010121 | Heading内の小分類 |
| 4 | Statistical Suffix | **統計品目** | 10桁 | 0101211000 | 関税率確定コード |

## 📋 21のSection（部）一覧

| Section | Chapter範囲 | 日本語名 | 英語名 |
|---------|------------|----------|--------|
| I | 01-05 | 動物・動物性生産品 | LIVE ANIMALS; ANIMAL PRODUCTS |
| II | 06-14 | 植物性生産品 | VEGETABLE PRODUCTS |
| III | 15 | 動植物性油脂 | ANIMAL OR VEGETABLE FATS AND OILS |
| IV | 16-24 | 調製食料品 | PREPARED FOODSTUFFS |
| V | 25-27 | 鉱物性生産品 | MINERAL PRODUCTS |
| VI | 28-38 | 化学工業製品 | PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES |
| VII | 39-40 | プラスチック・ゴム | PLASTICS AND RUBBER |
| VIII | 41-43 | 革製品 | RAW HIDES AND SKINS, LEATHER, FURSKINS |
| IX | 44-46 | 木材製品 | WOOD AND ARTICLES OF WOOD |
| X | 47-49 | パルプ・紙 | PULP OF WOOD OR OTHER FIBROUS CELLULOSIC MATERIAL |
| XI | 50-63 | 紡織用繊維製品 | TEXTILES AND TEXTILE ARTICLES |
| XII | 64-67 | 履物・帽子 | FOOTWEAR, HEADGEAR, UMBRELLAS |
| XIII | 68-70 | 石・陶磁器・ガラス | ARTICLES OF STONE, PLASTER, CEMENT, ASBESTOS, MICA |
| XIV | 71 | 貴金属・宝石 | NATURAL OR CULTURED PEARLS, PRECIOUS OR SEMI-PRECIOUS STONES |
| XV | 72-83 | 卑金属 | BASE METALS AND ARTICLES OF BASE METAL |
| XVI | 84-85 | 機械類・電気機器 | MACHINERY AND MECHANICAL APPLIANCES; ELECTRICAL EQUIPMENT |
| XVII | 86-89 | 車両・航空機・船舶 | VEHICLES, AIRCRAFT, VESSELS AND ASSOCIATED TRANSPORT EQUIPMENT |
| XVIII | 90-92 | 精密機器・楽器 | OPTICAL, PHOTOGRAPHIC, CINEMATOGRAPHIC, MEASURING, CHECKING, PRECISION, MEDICAL OR SURGICAL INSTRUMENTS AND APPARATUS; CLOCKS AND WATCHES; MUSICAL INSTRUMENTS |
| XIX | 93 | 武器 | ARMS AND AMMUNITION; PARTS AND ACCESSORIES THEREOF |
| XX | 94-96 | 雑品 | MISCELLANEOUS MANUFACTURED ARTICLES |
| XXI | 97 | 美術品・収集品 | WORKS OF ART, COLLECTORS' PIECES AND ANTIQUES |

## ✅ 正しい表現

### ❌ 誤った表現
- Chapter = 「大分類」
- Heading = 「中分類」
- Subheading = 「小分類」

### ✅ 正しい表現
- Section = 「部」（大分類）
- Chapter = 「類」
- Heading = 「項」
- Subheading = 「号」
- Statistical Suffix = 「統計品目」

## 📝 実例：トレーディングカード（ポケモンカード）の場合

```
Section XX (第20部)
└── Miscellaneous Manufactured Articles（雑品）
    │
    └── Chapter 95（第95類）
        └── Toys, games and sports requisites（がん具、遊戯用具及び運動用具）
            │
            └── Heading 9504（項）
                └── Articles for funfair, table or parlor games
                    │
                    └── Subheading 950490（号）
                        └── Other
                            │
                            └── 9504903000（統計品目）
                                └── Playing cards
                                    ├── 基本関税率: Free
                                    └── 特別税率: Free
```

## 🔍 DBテーブル構造

### 現在実装されているテーブル

| テーブル名 | 階層 | 桁数 | 説明 |
|-----------|------|------|------|
| `hts_codes_chapters` | Chapter（類） | 2桁 | ✅ 新規作成予定 |
| `hts_codes_headings` | Heading（項） | 4桁 | ✅ 既存 |
| `hts_codes_subheadings` | Subheading（号） | 6桁 | ✅ 既存 |
| `hts_codes_details` | 統計品目 | 10桁 | ✅ 既存 |

### 今後追加を検討するテーブル

| テーブル名 | 階層 | 説明 |
|-----------|------|------|
| `hts_sections` | Section（部） | 21のSectionマスター |

## 🚀 実装済み機能

- ✅ Chapter（類）一覧の正確な表示
- ✅ 階層構造の明確な説明
- ✅ 日本語・英語のバイリンガル対応
- ✅ Section情報の表示準備（hts_codes_chaptersテーブルに含む）

## 📌 重要な注意事項

1. **「大分類」という表現は使用しない**
   - 正式には「部」「類」「項」「号」を使用

2. **階層構造を常に明示**
   - ユーザーが現在どの階層にいるかを明確にする

3. **Section（部）の表示**
   - 将来的にSection一覧ページを追加する予定

4. **Chapter 98, 99の特殊性**
   - Chapter 98: 特殊分類物品
   - Chapter 99: 特殊輸入物品
   - これらは通常のSectionには属さない特別なChapter

---

**作成日**: 2025-11-07
**最終更新**: 2025-11-07
**ステータス**: 階層構造確定・実装完了
