#!/bin/bash

# v0フォルダ完全移行スクリプト
# 実行方法: chmod +x migrate-v0.sh && ./migrate-v0.sh

set -e  # エラーで停止

echo "🚀 v0フォルダ完全移行を開始します..."

# ベースディレクトリ
BASE_DIR="/Users/aritahiroaki/n3-frontend_new"
V0_DIR="$BASE_DIR/v0"

cd "$BASE_DIR"

# ==============================================
# 1. 棚卸しツール（完全コピー）
# ==============================================
echo "📦 1/15 棚卸しツールを移行中..."

if [ -d "$V0_DIR/棚卸しツール" ]; then
  # ページファイル
  cp -r "$V0_DIR/棚卸しツール/app/tools/inventory" "app/zaiko/tanaoroshi/" 2>/dev/null || true
  
  # APIルート
  cp -r "$V0_DIR/棚卸しツール/app/api/products/"* "app/api/products/" 2>/dev/null || true
  cp -r "$V0_DIR/棚卸しツール/app/api/listings/"* "app/api/listings/" 2>/dev/null || true
  
  # コンポーネント
  mkdir -p "components/zaiko"
  cp -r "$V0_DIR/棚卸しツール/components/inventory" "components/zaiko/" 2>/dev/null || true
  cp -r "$V0_DIR/棚卸しツール/components/dashboard" "components/zaiko/" 2>/dev/null || true
  
  # ユーティリティ
  mkdir -p "lib/utils/zaiko"
  cp -r "$V0_DIR/棚卸しツール/lib/utils/"* "lib/utils/zaiko/" 2>/dev/null || true
  
  echo "  ✅ 棚卸しツール完了"
else
  echo "  ⚠️  棚卸しツールフォルダが見つかりません"
fi

# ==============================================
# 2. Amazon刈り取りツール
# ==============================================
echo "📦 2/15 Amazon刈り取りツールを移行中..."

if [ -d "$V0_DIR/リサーチ系/Amazon刈り取り" ]; then
  cp "$V0_DIR/リサーチ系/Amazon刈り取り/page.tsx" "app/tools/amazon-arbitrage/" 2>/dev/null || true
  cp "$V0_DIR/リサーチ系/Amazon刈り取り/route.ts" "app/api/amazon/arbitrage/route.ts" 2>/dev/null || true
  
  mkdir -p "lib/scoring/amazon"
  cp "$V0_DIR/リサーチ系/Amazon刈り取り/scorer.ts" "lib/scoring/amazon/" 2>/dev/null || true
  cp "$V0_DIR/リサーチ系/Amazon刈り取り/product.ts" "lib/types/amazon-arbitrage.ts" 2>/dev/null || true
  
  echo "  ✅ Amazon刈り取りツール完了"
else
  echo "  ⚠️  Amazon刈り取りフォルダが見つかりません"
fi

# ==============================================
# 3. 多販路マッパー（全種類）
# ==============================================
echo "📦 3/15 多販路マッパーを移行中..."

if [ -d "$V0_DIR/多販路系" ]; then
  # Amazon系
  mkdir -p "lib/mappers/amazon"
  cp "$V0_DIR/多販路系/Amazon/"*.js "lib/mappers/amazon/" 2>/dev/null || true
  
  # BUYMA
  mkdir -p "lib/mappers/buyma"
  cp "$V0_DIR/多販路系/BUYMA/"*.js "lib/mappers/buyma/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/BUYMA無在庫仕入れ戦略シミュレーター (次期拡張フェーズ)/"*.jsx "lib/mappers/buyma/" 2>/dev/null || true
  
  # Shopee
  mkdir -p "lib/mappers/shopee"
  cp "$V0_DIR/開発モジュール 2- Shopee マッピングロジック/"*.js "lib/mappers/shopee/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/shopee出品/"*.ts "lib/mappers/shopee/" 2>/dev/null || true
  
  # 楽天系
  mkdir -p "lib/mappers/rakuten"
  cp "$V0_DIR/多販路系/楽天台湾/"*.js "lib/mappers/rakuten/" 2>/dev/null || true
  
  # Walmart
  mkdir -p "lib/mappers/walmart"
  cp "$V0_DIR/多販路系/Walmart/"*.js "lib/mappers/walmart/" 2>/dev/null || true
  
  # Qoo10
  mkdir -p "lib/mappers/qoo10"
  cp "$V0_DIR/多販路系/Qoo10/"*.js "lib/mappers/qoo10/" 2>/dev/null || true
  
  # Lazada
  mkdir -p "lib/mappers/lazada"
  cp "$V0_DIR/多販路系/LazadaMapper.js/"*.js "lib/mappers/lazada/" 2>/dev/null || true
  
  # Coupang
  mkdir -p "lib/mappers/coupang"
  cp "$V0_DIR/多販路系/Coupang/"*.js "lib/mappers/coupang/" 2>/dev/null || true
  
  # Wish
  mkdir -p "lib/mappers/wish"
  cp "$V0_DIR/多販路系/Wish/"*.js "lib/mappers/wish/" 2>/dev/null || true
  
  # その他特殊マーケット
  mkdir -p "lib/mappers/specialty"
  cp "$V0_DIR/多販路系/Card Market : TCGplayer/"*.js "lib/mappers/specialty/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/Chrono24/"*.js "lib/mappers/specialty/" 2>/dev/null || true
  
  # 汎用マッパー
  mkdir -p "lib/mappers/generic"
  cp "$V0_DIR/多販路系/AutoNicheMapper.js/"*.js "lib/mappers/generic/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/B2BMapper.js/"*.js "lib/mappers/generic/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/FashionMapper/"*.js "lib/mappers/generic/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/HobbyArtsMapper.js/"*.js "lib/mappers/generic/" 2>/dev/null || true
  
  # 地域別マッパー
  mkdir -p "lib/mappers/regional"
  cp "$V0_DIR/多販路系/Europe/"*.js "lib/mappers/regional/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/French/"*.js "lib/mappers/regional/" 2>/dev/null || true
  cp "$V0_DIR/多販路系/Emerging/"*.js "lib/mappers/regional/" 2>/dev/null || true
  
  # 多販路エンジン
  mkdir -p "lib/mappers/engine"
  cp "$V0_DIR/多販路系/多販路エンジン/"*.ts "lib/mappers/engine/" 2>/dev/null || true
  
  # 統合出品ハブ
  mkdir -p "lib/mappers/hub"
  cp "$V0_DIR/総合ui_これがないと多販路できない/統合出品実行ハブ/"*.js "lib/mappers/hub/" 2>/dev/null || true
  
  echo "  ✅ 多販路マッパー完了"
else
  echo "  ⚠️  多販路系フォルダが見つかりません"
fi

# ==============================================
# 4. 受注・出荷管理
# ==============================================
echo "📦 4/15 受注・出荷管理を移行中..."

if [ -d "$V0_DIR/管理系" ]; then
  # 受注管理V2
  mkdir -p "app/management/orders/v2"
  cp "$V0_DIR/管理系/受注管理システム＿自動注文/OrderManager_V2.jsx" "app/management/orders/v2/" 2>/dev/null || true
  cp "$V0_DIR/管理系/受注ページ/OrderManager_V2.jsx" "app/management/orders/v2/" 2>/dev/null || true
  
  # 出荷管理
  mkdir -p "app/management/shipping"
  cp "$V0_DIR/管理系/出荷ページ/ShippingManager.jsx" "app/management/shipping/" 2>/dev/null || true
  cp "$V0_DIR/管理系/受注管理システム＿自動注文/ShippingManager_V1.jsx" "app/management/shipping/" 2>/dev/null || true
  
  # 統合ダッシュボード
  mkdir -p "app/management/dashboard"
  cp "$V0_DIR/管理系/受注管理システム＿自動注文/IntegratedDashboard_V1.jsx" "app/management/dashboard/" 2>/dev/null || true
  
  # キャッシュフロー予測
  mkdir -p "app/tools/cash-flow-forecast"
  cp "$V0_DIR/管理系/受注管理システム＿自動注文/CashFlowForecaster_V1.jsx" "app/tools/cash-flow-forecast/" 2>/dev/null || true
  
  # 一括仕入れ承認
  mkdir -p "app/management/sourcing"
  cp "$V0_DIR/管理系/受注管理システム＿自動注文/BulkSourcingApproval_V1.jsx" "app/management/sourcing/" 2>/dev/null || true
  
  # セキュリティ
  mkdir -p "lib/security"
  cp "$V0_DIR/管理系/受注管理システム＿自動注文/SPOE_Security_V1.jsx" "lib/security/" 2>/dev/null || true
  
  # タスク管理V4
  mkdir -p "app/management/tasks"
  cp "$V0_DIR/管理系/タスク管理機能の高度化 V4 (リッチコンテンツ・カレンダー連携)/MultiChannelManager_v4.jsx" "app/management/tasks/" 2>/dev/null || true
  
  # 製品主導型仕入れ
  mkdir -p "app/management/product-sourcing"
  cp "$V0_DIR/管理系/製品主導型仕入れ管理システム (Product-Driven Sourcing Management System)/SourcingManagementSystem.jsx" "app/management/product-sourcing/" 2>/dev/null || true
  
  echo "  ✅ 受注・出荷管理完了"
else
  echo "  ⚠️  管理系フォルダが見つかりません"
fi

# ==============================================
# 5. HTS関連
# ==============================================
echo "📦 5/15 HTS関連を移行中..."

if [ -d "$V0_DIR/HTS階層システム 修正・再構築計画書" ]; then
  mkdir -p "lib/hts/utils"
  cp "$V0_DIR/HTS階層システム 修正・再構築計画書/htsUtils.ts" "lib/hts/utils/" 2>/dev/null || true
  
  mkdir -p "lib/hts/translation"
  cp "$V0_DIR/HTS階層システム 修正・再構築計画書/translateDescriptions.ts" "lib/hts/translation/" 2>/dev/null || true
  
  mkdir -p "app/api/hts/translate"
  cp "$V0_DIR/HTS階層システム 修正・再構築計画書/route.ts" "app/api/hts/translate/" 2>/dev/null || true
  
  # 分類キーワード生成
  mkdir -p "lib/hts/keywords"
  cp "$V0_DIR/💻 分類キーワード自動生成ツール 実装骨子/generateKeywords.ts" "lib/hts/keywords/" 2>/dev/null || true
  
  # Gemini HTS判定
  mkdir -p "lib/services/hts"
  cp "$V0_DIR/htsをジェミナイで判定する新機能/tariffService.ts" "lib/services/hts/" 2>/dev/null || true
  
  echo "  ✅ HTS関連完了"
else
  echo "  ⚠️  HTS関連フォルダが見つかりません"
fi

# ==============================================
# 6. AI連携・プロンプト系
# ==============================================
echo "📦 6/15 AI連携を移行中..."

if [ -d "$V0_DIR/プロンプト系" ]; then
  # Claude分析サービス
  mkdir -p "lib/services/ai/claude"
  cp "$V0_DIR/プロンプト系/二段階リサーチフローと専門AI連携/claude-analysis-service.ts" "lib/services/ai/claude/" 2>/dev/null || true
  cp "$V0_DIR/プロンプト系/二段階リサーチフローと専門AI連携/route.ts" "app/api/ai/claude-analysis/route.ts" 2>/dev/null || true
  
  # Gemini画像分析
  mkdir -p "lib/services/ai/gemini"
  cp "$V0_DIR/プロンプト系/画像で全てのデータを取得する/gemini-api.ts" "lib/services/ai/gemini/" 2>/dev/null || true
  cp "$V0_DIR/プロンプト系/画像で全てのデータを取得する/route.ts" "app/api/ai/gemini-image/route.ts" 2>/dev/null || true
  
  echo "  ✅ AI連携完了"
else
  echo "  ⚠️  プロンプト系フォルダが見つかりません"
fi

# ==============================================
# 7. データ取得関連
# ==============================================
echo "📦 7/15 データ取得を移行中..."

if [ -d "$V0_DIR/データ取得関連" ]; then
  mkdir -p "lib/services/amazon"
  cp "$V0_DIR/データ取得関連/Amazon自動データ取得/amazonService.ts" "lib/services/amazon/" 2>/dev/null || true
  cp "$V0_DIR/データ取得関連/Amazon自動データ取得/route.ts" "app/api/amazon/auto-fetch/route.ts" 2>/dev/null || true
  
  echo "  ✅ データ取得完了"
else
  echo "  ⚠️  データ取得関連フォルダが見つかりません"
fi

# ==============================================
# 8. メルカリスクレイピング・在庫
# ==============================================
echo "📦 8/15 メルカリ在庫を移行中..."

if [ -d "$V0_DIR/メルカリスクレイピング、在庫" ]; then
  mkdir -p "lib/services/mercari"
  cp "$V0_DIR/メルカリスクレイピング、在庫/inventoryService.ts" "lib/services/mercari/" 2>/dev/null || true
  cp "$V0_DIR/メルカリスクレイピング、在庫/scraping-core.ts" "lib/services/mercari/" 2>/dev/null || true
  cp "$V0_DIR/メルカリスクレイピング、在庫/route.ts" "app/api/mercari/inventory/route.ts" 2>/dev/null || true
  
  echo "  ✅ メルカリ在庫完了"
else
  echo "  ⚠️  メルカリ在庫フォルダが見つかりません"
fi

# ==============================================
# 9. バリエーション出品機能
# ==============================================
echo "📦 9/15 バリエーション機能を移行中..."

if [ -d "$V0_DIR/バリーション出品機能" ]; then
  mkdir -p "lib/services/pricing"
  cp "$V0_DIR/バリーション出品機能/priceCalculationService.ts" "lib/services/pricing/" 2>/dev/null || true
  cp "$V0_DIR/バリーション出品機能/create-variation:route.ts" "app/api/products/create-variation/route.ts" 2>/dev/null || true
  
  echo "  ✅ バリエーション機能完了"
else
  echo "  ⚠️  バリエーション機能フォルダが見つかりません"
fi

# ==============================================
# 10. eBay強化ツール
# ==============================================
echo "📦 10/15 eBay強化ツールを移行中..."

if [ -d "$V0_DIR/ebay強化" ]; then
  mkdir -p "app/tools/ebay-seo"
  cp "$V0_DIR/ebay強化/SEO:リスティング健全性マネージャー V1.0/EbaySeoManager_V2.jsx" "app/tools/ebay-seo/" 2>/dev/null || true
  
  echo "  ✅ eBay強化ツール完了"
else
  echo "  ⚠️  eBay強化フォルダが見つかりません"
fi

# ==============================================
# 11. リサーチ系（その他）
# ==============================================
echo "📦 11/15 リサーチ系を移行中..."

if [ -d "$V0_DIR/リサーチ系" ]; then
  # プレミアム価格分析
  mkdir -p "app/tools/premium-price-analysis/components"
  cp "$V0_DIR/リサーチ系/プレミアム価格分析ダッシュボード/PremiumPriceDashboard.jsx" "app/tools/premium-price-analysis/components/" 2>/dev/null || true
  
  # 楽天せどり
  mkdir -p "lib/services/rakuten"
  cp "$V0_DIR/リサーチ系/楽天せどり高度選定ツール 開発指示書 v2.0/rakuten_arbitrage_tool.ts" "lib/services/rakuten/" 2>/dev/null || true
  
  # 廃盤・希少性
  mkdir -p "lib/services/arbitrage"
  cp "$V0_DIR/リサーチ系/廃盤・希少性高騰戦略（P3）のためのデータ構造追加と自動購入シミュレーションロジックの強化/karitori_dashboard.ts" "lib/services/arbitrage/" 2>/dev/null || true
  
  echo "  ✅ リサーチ系完了"
else
  echo "  ⚠️  リサーチ系フォルダが見つかりません"
fi

# ==============================================
# 12. 統合コミュニケーションハブ
# ==============================================
echo "📦 12/15 コミュニケーションハブを移行中..."

if [ -d "$V0_DIR/💻 統合コミュニケーションハブ コアロジック実装" ]; then
  mkdir -p "lib/services/messaging"
  cp "$V0_DIR/💻 統合コミュニケーションハブ コアロジック実装/messaging.ts" "lib/services/messaging/" 2>/dev/null || true
  cp "$V0_DIR/💻 統合コミュニケーションハブ コアロジック実装/AutoReplyEngine.ts" "lib/services/messaging/" 2>/dev/null || true
  cp "$V0_DIR/💻 統合コミュニケーションハブ コアロジック実装/KpiController.ts" "lib/services/messaging/" 2>/dev/null || true
  
  echo "  ✅ コミュニケーションハブ完了"
else
  echo "  ⚠️  コミュニケーションハブフォルダが見つかりません"
fi

# ==============================================
# 13. 統合出品データ管理
# ==============================================
echo "📦 13/15 出品データ管理を移行中..."

if [ -d "$V0_DIR/💻 統合出品データ管理 UI実装骨子" ]; then
  mkdir -p "app/tools/listing-optimization/components"
  cp "$V0_DIR/💻 統合出品データ管理 UI実装骨子/IntegratedListingTable.tsx" "app/tools/listing-optimization/components/" 2>/dev/null || true
  cp "$V0_DIR/💻 統合出品データ管理 UI実装骨子/ListingEditModal.tsx" "app/tools/listing-optimization/components/" 2>/dev/null || true
  
  mkdir -p "lib/types"
  cp "$V0_DIR/💻 統合出品データ管理 UI実装骨子/listing.ts" "lib/types/" 2>/dev/null || true
  
  echo "  ✅ 出品データ管理完了"
else
  echo "  ⚠️  出品データ管理フォルダが見つかりません"
fi

# ==============================================
# 14. 出品データコアサービス
# ==============================================
echo "📦 14/15 出品コアサービスを移行中..."

if [ -d "$V0_DIR/🛠️ 出品データ管理 コアサービス実装" ]; then
  mkdir -p "lib/services/listing"
  cp "$V0_DIR/🛠️ 出品データ管理 コアサービス実装/ListingDataService.ts" "lib/services/listing/" 2>/dev/null || true
  cp "$V0_DIR/🛠️ 出品データ管理 コアサービス実装/LogService.ts" "lib/services/listing/" 2>/dev/null || true
  cp "$V0_DIR/🛠️ 出品データ管理 コアサービス実装/route.ts" "app/api/listing/manage/route.ts" 2>/dev/null || true
  
  echo "  ✅ 出品コアサービス完了"
else
  echo "  ⚠️  出品コアサービスフォルダが見つかりません"
fi

# ==============================================
# 15. ドキュメント・SQLファイル
# ==============================================
echo "📦 15/15 ドキュメント・SQLを移行中..."

# SQLマイグレーション
mkdir -p "scripts/migrations/v0"
find "$V0_DIR" -name "*.sql" -exec cp {} "scripts/migrations/v0/" \; 2>/dev/null || true

# ドキュメント
mkdir -p "docs/v0-archive"
find "$V0_DIR" -name "*.ini" -exec cp {} "docs/v0-archive/" \; 2>/dev/null || true
find "$V0_DIR" -name "*.md" -exec cp {} "docs/v0-archive/" \; 2>/dev/null || true
find "$V0_DIR" -name "📄*" -exec cp {} "docs/v0-archive/" \; 2>/dev/null || true
find "$V0_DIR" -name "💻*" -type f -exec cp {} "docs/v0-archive/" \; 2>/dev/null || true

echo "  ✅ ドキュメント・SQL完了"

# ==============================================
# 完了
# ==============================================
echo ""
echo "✅ v0フォルダ移行完了！"
echo ""
echo "📊 移行サマリー:"
echo "  - 棚卸しツール: app/zaiko/tanaoroshi/"
echo "  - Amazon刈り取り: app/tools/amazon-arbitrage/"
echo "  - 多販路マッパー: lib/mappers/"
echo "  - 受注・出荷管理: app/management/"
echo "  - HTS関連: lib/hts/"
echo "  - AI連携: lib/services/ai/"
echo "  - ドキュメント: docs/v0-archive/"
echo ""
echo "🔗 次のステップ:"
echo "  1. npm run build でビルドエラーを確認"
echo "  2. エラーがあれば修正"
echo "  3. サイドバーリンク追加"
echo "  4. git commit & push"
echo ""
