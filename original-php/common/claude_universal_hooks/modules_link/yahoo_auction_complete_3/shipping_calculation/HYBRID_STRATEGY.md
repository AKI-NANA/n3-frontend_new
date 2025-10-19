# 配送ポリシー生成戦略 - ハイブリッド方式

## Phase 1: 初回テンプレート作成（Claude/Gemini担当）

### ステップ1: Eloji送料データ分析
```
ユーザー → Eloji送料データをClaude/Geminiに提供
AI → データ分析・構造理解・最適化
AI → 3つの配送ポリシーテンプレート生成
```

### ステップ2: 配送ポリシー設計
```php
// AI生成のポリシーテンプレート例
$policyTemplate = [
    'economy' => [
        'name' => 'Economy International Shipping',
        'zones' => [
            'North America' => ['base_cost' => 15.50, 'weight_factor' => 2.5],
            'Europe' => ['base_cost' => 18.50, 'weight_factor' => 3.0],
            'Asia Pacific' => ['base_cost' => 22.00, 'weight_factor' => 3.5]
        ],
        'rules' => [
            'max_weight' => 2.0,
            'max_length' => 60,
            'delivery_days' => '7-21'
        ]
    ],
    'standard' => [
        // AI最適化された中間設定
    ],
    'express' => [
        // AI最適化された高速設定
    ]
];
```

### ステップ3: ツール設定ファイル生成
```json
{
    "policy_templates": {
        "economy": { /* AI生成設定 */ },
        "standard": { /* AI生成設定 */ },
        "express": { /* AI生成設定 */ }
    },
    "zone_mapping": {
        "North America": ["US", "CA", "MX"],
        "Europe": ["GB", "DE", "FR", "IT", "ES"]
    },
    "calculation_rules": {
        "volume_weight_factor": 5000,
        "fuel_surcharge": 5.0,
        "handling_fee": 2.50
    }
}
```

## Phase 2: ツール自動運用（以後の運用）

### 自動処理フロー
```
1. 新送料データ → ツール直接アップロード
2. ツール → 既存テンプレート適用
3. ツール → 自動ポリシー生成
4. ツール → eBay API連携
5. 完了 → 運用開始
```

### ツール機能要件
- テンプレート適用エンジン
- データ差分検出
- 自動価格調整
- eBay同期機能

## 実装方針

### Claude/Gemini役割
- 初回データ分析（高品質）
- ポリシー最適化設計
- テンプレート生成
- 例外ケース対応ルール設計

### ツール役割
- テンプレート実行
- データ更新処理
- eBay API連携
- 日常運用自動化

## メリット
- 初回: AI分析で高品質設定
- 運用: ツール自動化で効率化
- 更新: データ差し替えのみ
- 拡張: テンプレート調整で対応
