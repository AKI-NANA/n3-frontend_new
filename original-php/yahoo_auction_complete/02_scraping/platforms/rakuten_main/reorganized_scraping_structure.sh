# 整理された 02_scraping フォルダ構成
02_scraping/
├── 📁 common/                          # 共通ファイル
│   ├── ScrapingManager.php            # 統合管理クラス
│   ├── PlatformDetector.php           # プラットフォーム判定
│   ├── DataValidator.php              # データ検証
│   └── ScrapingLogger.php             # ログ管理
│
├── 📁 platforms/                       # プラットフォーム別実装
│   ├── 📁 yahoo/                      # Yahoo オークション
│   │   ├── YahooScraper.php           # Yahoo スクレイパー
│   │   ├── yahoo_parser_v2025.php     # Yahoo パーサー
│   │   └── yahoo_config.php           # Yahoo 設定
│   │
│   ├── 📁 rakuten/                    # 楽天市場
│   │   ├── RakutenScraper.php         # 楽天スクレイパー
│   │   ├── rakuten_parser_v2025.php   # 楽天パーサー
│   │   └── rakuten_config.php         # 楽天設定
│   │
│   ├── 📁 mercari/                    # メルカリ（実装予定）
│   │   ├── MercariScraper.php         # メルカリスクレイパー
│   │   ├── mercari_parser.php         # メルカリパーサー
│   │   └── mercari_config.php         # メルカリ設定
│   │
│   ├── 📁 paypayfleamarket/          # PayPayフリマ（実装予定）
│   │   ├── PayPayScraper.php          # PayPayスクレイパー
│   │   ├── paypay_parser.php          # PayPayパーサー
│   │   └── paypay_config.php          # PayPay設定
│   │
│   ├── 📁 pokemon_center/             # ポケモンセンター（実装予定）
│   │   ├── PokemonScraper.php         # ポケモンスクレイパー
│   │   ├── pokemon_parser.php         # ポケモンパーサー
│   │   └── pokemon_config.php         # ポケモン設定
│   │
│   ├── 📁 yodobashi/                  # ヨドバシカメラ（実装予定）
│   │   ├── YodobashiScraper.php       # ヨドバシスクレイパー
│   │   ├── yodobashi_parser.php       # ヨドバシパーサー
│   │   └── yodobashi_config.php       # ヨドバシ設定
│   │
│   └── 📁 golfdo/                     # ゴルフドゥ（実装予定）
│       ├── GolfdoScraper.php          # ゴルフドゥスクレイパー
│       ├── golfdo_parser.php          # ゴルフドゥパーサー
│       └── golfdo_config.php          # ゴルフドゥ設定
│
├── 📁 api/                            # API エンドポイント
│   ├── unified_scraping.php           # 統合スクレイピングAPI
│   ├── yahoo_scraping.php             # Yahoo専用API
│   ├── rakuten_scraping.php           # 楽天専用API
│   └── batch_scraping.php             # バッチ処理API
│
├── 📁 ui/                             # ユーザーインターフェース
│   ├── unified_processor.php          # 統合UI（メイン）
│   ├── yahoo_processor.php            # Yahoo専用UI
│   ├── rakuten_processor.php          # 楽天専用UI
│   └── batch_processor.php            # バッチ処理UI
│
├── 📁 config/                         # 設定ファイル
│   ├── scraping_config.php            # 共通設定
│   ├── platform_settings.php         # プラットフォーム設定
│   └── database_config.php            # データベース設定
│
├── 📁 logs/                           # ログファイル
│   ├── 📁 yahoo/                      # Yahoo ログ
│   ├── 📁 rakuten/                    # 楽天ログ
│   ├── 📁 common/                     # 共通ログ
│   └── 📁 errors/                     # エラーログ
│
├── 📁 scripts/                        # バッチスクリプト
│   ├── unified_batch.php              # 統合バッチ処理
│   ├── yahoo_batch.php                # Yahoo バッチ
│   ├── rakuten_batch.php              # 楽天バッチ
│   └── cleanup.php                    # データクリーンアップ
│
├── 📁 tests/                          # テストファイル
│   ├── YahooScrapingTest.php          # Yahoo テスト
│   ├── RakutenScrapingTest.php        # 楽天テスト
│   └── UnifiedScrapingTest.php        # 統合テスト
│
├── 📁 docs/                           # ドキュメント
│   ├── README.md                      # システム概要
│   ├── PLATFORM_GUIDE.md             # プラットフォームガイド
│   └── API_REFERENCE.md              # API リファレンス
│
├── processor.php                      # 【既存】メインプロセッサー（移行予定）
└── index.php                          # システムインデックス

========================================
移行計画
========================================

## Phase 1: 基本構造作成（完了予定：即日）
✅ フォルダ構造作成
✅ 共通ファイル移動・整理
✅ プラットフォーム別フォルダ作成

## Phase 2: Yahoo関連ファイル移行（完了予定：1日）
□ 既存YahooScrapingクラス → platforms/yahoo/
□ yahoo_parser_v2025.php → platforms/yahoo/
□ 設定ファイル分離
□ ログファイル分離

## Phase 3: 楽天関連ファイル配置（完了予定：1日）
□ RakutenScraper.php → platforms/rakuten/
□ rakuten_parser_v2025.php → platforms/rakuten/
□ 楽天専用設定作成

## Phase 4: 統合システム作成（完了予定：2日）
□ 統合管理クラス作成
□ プラットフォーム自動判定
□ 統合API作成
□ 統合UI作成

## Phase 5: その他プラットフォーム準備（完了予定：1日）
□ メルカリ用構造準備
□ その他プラットフォーム用構造準備
□ プレースホルダー作成

========================================
メリット
========================================

📁 構造の明確化
- プラットフォームごとに完全分離
- 新しいプラットフォーム追加が容易
- メンテナンスが簡単

🔧 開発効率向上
- 特定プラットフォームの修正が他に影響しない
- テストが独立して実行可能
- 並行開発が可能

🚀 拡張性
- 新プラットフォーム追加時のテンプレート提供
- 共通機能の再利用
- 設定の一元管理

🔍 運用性
- ログ管理の最適化
- エラー調査の効率化
- パフォーマンス監視の向上