# Yahoo→eBay統合ワークフロー 完全版 バックエンドAPI

## 概要

このシステムは、Yahoo オークションの商品データをスクレイピングし、送料計算を行い、eBay出品用データを生成する統合ワークフローのバックエンドAPIサーバーです。

## 主な機能

### 🕷️ データ取得・スクレイピング
- Yahoo オークション商品情報の自動取得
- 商品画像、価格、説明文の抽出
- 非同期処理によるバッチスクレイピング
- レート制限対応（サイト負荷軽減）

### 📊 高精度送料計算
- 物理的制限を考慮した配送方法選定
- 複数配送業者の料金比較（eLogi、cpass、日本郵便）
- 燃油サーチャージ、保険料、追加費用の自動計算
- 容積重量計算対応
- 送料マトリックス表生成

### 🛒 eBay出品統合
- 日本語から英語への商品タイトル翻訳
- HTML形式の商品説明文自動生成
- 利益率を考慮した価格設定
- eBay手数料自動計算
- カテゴリマッピング機能

### 💾 データベース統合
- SQLiteベースのデータ永続化
- 商品データ、送料計算履歴、出品データの一元管理
- 検索・フィルタリング機能
- CSV入出力対応

## システム要件

- **Python**: 3.8以上
- **OS**: macOS、Linux
- **メモリ**: 512MB以上
- **ディスク**: 1GB以上の空き容量
- **ネットワーク**: インターネット接続必須

## インストール・セットアップ

### 1. 事前準備

```bash
# Yahoo Auction Toolディレクトリに移動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool

# セットアップ実行
chmod +x setup_complete.sh
./setup_complete.sh
```

### 2. システム診断

```bash
# システム状態確認
./diagnose_system.sh
```

### 3. クイック起動

```bash
# APIサーバー起動・テスト実行
./quick_start.sh
```

## 基本的な使用方法

### APIサーバー個別操作

```bash
# APIサーバー起動
./start_api_server_complete.sh

# 接続テスト実行
./test_api_server_complete.sh

# サーバー停止
./stop_api_server_complete.sh
```

### フロントエンドアクセス

```bash
# PHPサーバー起動（別ターミナル）
cd /Users/aritahiroaki/NAGANO-3/N3-Development
php -S localhost:8080

# ブラウザでアクセス
open http://localhost:8080/modules/yahoo_auction_tool/index.php
```

## API エンドポイント

### システム状態

```bash
GET /system_status
```

### Yahoo オークション スクレイピング

```bash
POST /scrape_yahoo
Content-Type: application/json

{
    "urls": ["https://auctions.yahoo.co.jp/jp/auction/xxxxx"],
    "delay_seconds": 2.0
}
```

### 送料計算

```bash
POST /calculate_shipping
Content-Type: application/json

{
    "weight_kg": 1.5,
    "length_cm": 30,
    "width_cm": 20,
    "height_cm": 15,
    "destination_country": "USA",
    "declared_value_usd": 50.0,
    "include_insurance": false,
    "include_signature": false
}
```

### データ取得

```bash
GET /get_all_data?limit=100&offset=0
```

### 検索

```bash
GET /search?query=ゲーム&category=おもちゃ&min_price=1000&max_price=10000
```

### eBay出品データ作成

```bash
POST /list_on_ebay
Content-Type: application/json

{
    "sku": "product_id_here",
    "force_update": false
}
```

## ファイル構成

```
yahoo_auction_tool/
├── api_server_complete_v2.py       # メインAPIサーバー
├── requirements_api_server.txt     # Python依存関係
├── start_api_server_complete.sh    # サーバー起動スクリプト
├── stop_api_server_complete.sh     # サーバー停止スクリプト
├── test_api_server_complete.sh     # APIテストスクリプト
├── quick_start.sh                  # クイック起動
├── diagnose_system.sh              # システム診断
├── setup_complete.sh               # セットアップ
├── yahoo_ebay_data/                # データベースディレクトリ
│   └── complete_database.db        # SQLiteデータベース
├── logs/                          # ログディレクトリ
│   └── api_server.log             # APIサーバーログ
├── venv/                          # Python仮想環境
└── uploads/                       # アップロードファイル
```

## 送料計算設定

### 対応配送業者

1. **eLogi (FedEx)**
   - FedEx International Economy
   - FedEx International Priority
   - 重量制限: 68kg
   - 燃油サーチャージ: 15%

2. **cpass (eBay SpeedPAK)**
   - eBay SpeedPAK Standard
   - 重量制限: 30kg
   - 燃油サーチャージ: 12%

3. **日本郵便**
   - EMS
   - 重量制限: 30kg
   - 燃油サーチャージ: 10%

### 対応国・地域

- アメリカ合衆国 (USA)
- カナダ (CAN)
- オーストラリア (AUS)
- 英国 (GBR)
- ドイツ (DEU)
- フランス (FRA)
- イタリア (ITA)
- スペイン (ESP)

## トラブルシューティング

### 一般的な問題

#### 1. APIサーバーが起動しない

```bash
# システム診断実行
./diagnose_system.sh

# ポート確認
lsof -i:5001

# 強制停止後再起動
./stop_api_server_complete.sh
./start_api_server_complete.sh
```

#### 2. 依存関係エラー

```bash
# 仮想環境再作成
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_api_server.txt
```

#### 3. データベースエラー

```bash
# データベース初期化
rm -f yahoo_ebay_data/complete_database.db
./start_api_server_complete.sh
```

#### 4. スクレイピングエラー

- レート制限: delay_secondsを増加（推奨: 3-5秒）
- IP制限: VPN使用やプロキシ設定を検討
- サイト構造変更: スクレイピングコードの更新が必要

### ログ確認

```bash
# リアルタイムログ監視
tail -f logs/api_server.log

# エラーログ抽出
grep "ERROR" logs/api_server.log

# 最新100行表示
tail -n 100 logs/api_server.log
```

### パフォーマンス最適化

#### スクレイピング

- `delay_seconds`: 2-5秒（サイト負荷軽減）
- 並行処理数: 1-3件（制限回避）
- タイムアウト: 30秒

#### 送料計算

- キャッシュ機能: 同一条件での再計算回避
- バッチ処理: 複数商品の一括計算

#### データベース

- インデックス作成: 検索性能向上
- 定期的なVACUUM: ディスク使用量最適化

## 本番環境デプロイ

### セキュリティ対策

1. **API認証**
   - JWTトークン認証の実装
   - レート制限の強化

2. **データ保護**
   - SQLiteからPostgreSQLへの移行
   - データ暗号化

3. **ネットワーク**
   - HTTPS対応
   - ファイアウォール設定

### スケーリング

1. **負荷分散**
   - 複数APIサーバーインスタンス
   - ロードバランサー設定

2. **データベース**
   - レプリケーション設定
   - 読み書き分離

3. **監視**
   - ヘルスチェック
   - アラート設定

## 開発者向け情報

### 環境変数

```bash
# 為替レート
EXCHANGE_RATE_USD_JPY=148.5

# eBay設定
EBAY_SANDBOX_MODE=true
EBAY_APP_ID=your_app_id

# データベース
DATABASE_PATH=./yahoo_ebay_data/complete_database.db
```

### 拡張ポイント

1. **新配送業者追加**
   - `Config.SHIPPING_SERVICES`に設定追加
   - `ShippingCalculator`の処理ロジック拡張

2. **新対応国追加**
   - 配送業者の料金テーブル更新
   - 国コード対応追加

3. **eBay API完全連携**
   - OAuth認証実装
   - 実際の出品API呼び出し

## サポート

技術的な問題や機能要望については、以下の情報を含めて報告してください：

1. システム診断結果：`./diagnose_system.sh`
2. エラーログ：`logs/api_server.log`
3. 実行環境：OS、Pythonバージョン
4. 再現手順：具体的な操作内容

## ライセンス

このソフトウェアは、CAIDS開発チームによって開発されました。
商用利用については別途ライセンス契約が必要です。

---

## クイックリファレンス

### 最初の起動

```bash
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool
chmod +x setup_complete.sh
./setup_complete.sh
./quick_start.sh
```

### 日常使用

```bash
# 起動
./start_api_server_complete.sh

# 停止
./stop_api_server_complete.sh

# テスト
./test_api_server_complete.sh
```

### 緊急時

```bash
# 全プロセス停止
./stop_api_server_complete.sh

# システム診断
./diagnose_system.sh

# 初期化
rm -rf venv yahoo_ebay_data logs
./setup_complete.sh
./quick_start.sh
```
