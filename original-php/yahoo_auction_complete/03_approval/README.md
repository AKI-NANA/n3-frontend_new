# 03_approval PHP API システム

## 🎯 概要

Yahoo→eBay商品承認システムのPHP API版です。HTML+JSから完全PHP APIに変換し、統合ワークフローエンジンに対応しています。

## ✨ 主な機能

### 基本機能
- **承認キュー管理**: 商品一覧表示・フィルタリング・ページング
- **一括操作**: 複数商品の同時承認・否認
- **リアルタイム統計**: 承認待ち・AI推奨・期限超過件数の表示
- **高度フィルター**: 状態・価格・AI判定・期限での絞り込み
- **CSV出力**: 承認データのエクスポート

### 技術的特徴
- **統一ログシステム**: JSON形式での中央ログ管理
- **JWT認証**: 一元的なAPI認証管理
- **パフォーマンス最適化**: インデックス・クエリ最適化
- **Redis連携**: 次ステップ（08_listing）への自動トリガー
- **エラー回復**: 自動再試行・ロールバック機能

## 🏗️ アーキテクチャ

```
03_approval/
├── api/                    # PHP APIコア
│   ├── approval.php        # メインAPI エンドポイント
│   ├── JWTAuth.php        # JWT認証システム
│   ├── UnifiedLogger.php   # 統一ログシステム
│   └── DatabaseConnection.php # データベース接続管理
├── database/
│   └── schema.sql         # 最適化されたDBスキーマ
├── index.php              # フロントエンド (PHP版)
├── config.php             # 設定ファイル
└── README.md              # このファイル
```

## 📊 データベーススキーマ

### 最適化されたテーブル設計

#### workflows テーブル
- パフォーマンス向上のための専用インデックス
- `product_id`, `priority`, `next_step` カラムの独立

#### approval_queue テーブル
- 複数画像対応 (`all_images` JSONB)
- AI信頼度・期限管理機能
- 自動エスカレーション機能

#### 統計用マテリアライズドビュー
- 高速な統計情報取得
- 定期更新機能

## 🚀 API エンドポイント

### 基本エンドポイント
- `GET api/approval.php?action=get_approval_queue` - 承認キュー取得
- `GET api/approval.php?action=get_stats` - 統計情報取得
- `POST api/approval.php` - 承認・否認処理

### パラメータ例
```php
// 承認キュー取得
?action=get_approval_queue&status=pending&ai_filter=ai-approved&limit=20

// 一括承認
POST {
    "action": "approve_products",
    "product_ids": [1, 2, 3],
    "reviewer_notes": "承認コメント"
}
```

## 🔧 設定・セットアップ

### 1. データベース設定
```bash
# PostgreSQL スキーマ作成
psql -d nagano3 -f database/schema.sql
```

### 2. 環境変数設定
```bash
export DB_HOST=localhost
export DB_NAME=nagano3
export DB_USER=postgres
export DB_PASS=your_password
export JWT_SECRET=your_jwt_secret
```

### 3. PHP設定
- PHP 8.1以上
- PostgreSQL PDO拡張
- Redis拡張（オプション）

### 4. アクセス
```
http://localhost:8081/new_structure/03_approval/
```

## 🎯 統合ワークフローとの連携

### 承認完了時の自動処理
1. **状態更新**: `workflows.status` → `ready_for_listing`
2. **ステップ進行**: `current_step` → 8 (listing)
3. **Redis キューイング**: 08_listing ジョブの自動エンキュー
4. **ログ記録**: 完全な処理履歴の保存

### 他ツールとのデータ連携
- **07_editing** からのデータ取得
- **08_listing** への自動トリガー
- **10_zaiko** へのデータ連携（承認後）

## 📈 パフォーマンス特徴

### データベース最適化
- **インデックス戦略**: 頻繁にクエリされるカラムに最適化
- **マテリアライズドビュー**: 統計情報の高速取得
- **バルクインサート**: 大量データの効率的処理

### メモリ最適化
- **ジェネレータ**: 大量データ処理時のメモリ効率化
- **ストリーム処理**: チャンク単位での処理
- **接続プール**: データベース接続の効率的管理

## 🔐 セキュリティ機能

### JWT認証システム
- **トークンベース認証**: ステートレス認証
- **権限管理**: 細かい権限制御
- **トークン無効化**: セキュリティ侵害時の対応
- **レート制限**: API乱用防止

### ログ・監査機能
- **完全な操作履歴**: 誰が・いつ・何を承認/否認したか
- **セキュリティイベント**: 不正アクセス試行の記録
- **パフォーマンス監視**: 処理時間・メモリ使用量の追跡

## 🔄 運用・監視

### 自動化機能
- **期限管理**: 期限超過アイテムの自動エスカレーション
- **通知システム**: メール・Slack連携
- **自動復旧**: エラー時の再試行機能

### 統計・分析
- **リアルタイム統計**: 承認率・処理速度の監視
- **AI精度分析**: AI推奨の精度追跡
- **期限遵守率**: SLA監視

## 🧪 テスト・デバッグ

### 開発用機能
- **サンプルデータ**: テスト用商品データの自動生成
- **ログレベル調整**: 開発時の詳細ログ
- **API テスト**: Postman・curl での動作確認

### モニタリング
- **ヘルスチェック**: `api/approval.php?action=health`
- **統計ダッシュボード**: リアルタイム状況表示
- **エラー追跡**: 完全なスタックトレース記録

## 📝 変更履歴

### v2.0 (PHP API版)
- HTML+JS → 完全PHP API化
- JWT認証システム導入
- 統一ログシステム実装
- パフォーマンス最適化
- Redis連携対応
- 統合ワークフローエンジン対応

### v1.0 (HTML版)
- 基本的な承認機能
- JavaScript ベースの UI
- 簡易なデータ表示

## 🤝 開発・貢献

### コード品質
- **PSR-12準拠**: PHP コーディング規約
- **型安全**: 厳密な型チェック
- **例外処理**: 適切なエラーハンドリング
- **ドキュメント**: 詳細なコメント

### 拡張ポイント
- 新しい承認ルールの追加
- カスタムフィルターの実装
- 追加の統計指標
- 外部システムとの連携

---

**Next Steps**: 08_listing のPHP API化と統合ワークフローエンジンの実装
