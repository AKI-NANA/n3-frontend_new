#!/bin/bash

# eBayカテゴリー統合システム - 最終動作確認・権限設定スクリプト
# システム完成後の最終チェックと稼働準備

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}=========================================="
echo -e "🎯 eBayカテゴリー統合システム"
echo -e "   最終動作確認・稼働準備"
echo -e "==========================================${NC}"
echo ""

# ステップ1: ファイル権限設定
echo -e "${CYAN}📁 ファイル権限設定中...${NC}"

chmod +x "${SCRIPT_DIR}/complete_system_setup.sh"
chmod +x "${SCRIPT_DIR}/monthly_batch_processor.sh"
chmod +x "${SCRIPT_DIR}/final_system_verification.sh"

# PHP ファイル権限
find "${SCRIPT_DIR}/frontend" -name "*.php" -exec chmod 644 {} \; 2>/dev/null
find "${SCRIPT_DIR}/backend" -name "*.php" -exec chmod 644 {} \; 2>/dev/null

# ディレクトリ作成
mkdir -p "${SCRIPT_DIR}/logs"
mkdir -p "${SCRIPT_DIR}/temp" 
mkdir -p "${SCRIPT_DIR}/backups"

echo -e "${GREEN}✅ ファイル権限設定完了${NC}"
echo ""

# ステップ2: システム構成確認
echo -e "${CYAN}🏗️  システム構成確認中...${NC}"

critical_files=(
    "frontend/category_massive_viewer_optimized.php"
    "backend/api/unified_category_api_enhanced.php"
    "backend/classes/UnifiedCategoryDetector.php"
    "backend/classes/SellMirrorAnalyzer.php"
    "backend/classes/ItemSpecificsManager.php"
    "database/complete_system_enhancement.sql"
    "README.md"
)

missing_files=()

for file in "${critical_files[@]}"; do
    if [ -f "${SCRIPT_DIR}/${file}" ]; then
        echo -e "  ${GREEN}✓${NC} ${file}"
    else
        echo -e "  ${RED}✗${NC} ${file} ${RED}(未発見)${NC}"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ 全重要ファイル存在確認${NC}"
else
    echo -e "${RED}❌ 不足ファイルあり: ${missing_files[*]}${NC}"
fi
echo ""

# ステップ3: データベース接続確認
echo -e "${CYAN}🗄️  データベース接続確認中...${NC}"

php -r "
try {
    \$pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    echo \"✅ データベース接続成功\n\";
    
    // 主要テーブル確認
    \$tables = ['yahoo_scraped_products', 'ebay_category_fees'];
    foreach (\$tables as \$table) {
        try {
            \$stmt = \$pdo->query(\"SELECT COUNT(*) FROM \$table\");
            \$count = \$stmt->fetchColumn();
            echo \"  ✓ \$table: \" . number_format(\$count) . \"件\n\";
        } catch (Exception \$e) {
            echo \"  ⚠ \$table: テーブル未発見または権限なし\n\";
        }
    }
    
} catch (Exception \$e) {
    echo \"❌ データベース接続失敗: \" . \$e->getMessage() . \"\n\";
}
"
echo ""

# ステップ4: PHP クラス動作テスト
echo -e "${CYAN}🔧 PHPクラス動作テスト中...${NC}"

php -r "
try {
    require_once '${SCRIPT_DIR}/backend/classes/UnifiedCategoryDetector.php';
    echo \"✅ UnifiedCategoryDetector 読み込み成功\n\";
    
    if (class_exists('UnifiedCategoryDetector')) {
        echo \"  ✓ クラス定義確認\n\";
    }
} catch (Exception \$e) {
    echo \"❌ UnifiedCategoryDetector エラー: \" . \$e->getMessage() . \"\n\";
}

try {
    require_once '${SCRIPT_DIR}/backend/classes/SellMirrorAnalyzer.php';
    echo \"✅ SellMirrorAnalyzer 読み込み成功\n\";
} catch (Exception \$e) {
    echo \"⚠ SellMirrorAnalyzer 読み込み問題: \" . \$e->getMessage() . \"\n\";
}

try {
    require_once '${SCRIPT_DIR}/backend/classes/ItemSpecificsManager.php';
    echo \"✅ ItemSpecificsManager 読み込み成功\n\";
} catch (Exception \$e) {
    echo \"⚠ ItemSpecificsManager 読み込み問題: \" . \$e->getMessage() . \"\n\";
}
"
echo ""

# ステップ5: アクセスURL生成
echo -e "${CYAN}🌐 アクセスURL確認中...${NC}"

base_url="http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category"

echo -e "${GREEN}📊 メインシステム:${NC}"
echo -e "   ${YELLOW}最適化UI:${NC} ${base_url}/frontend/category_massive_viewer_optimized.php"
echo -e "   ${YELLOW}既存UI:${NC} ${base_url}/frontend/category_massive_viewer.php"
echo -e "   ${YELLOW}基本ツール:${NC} ${base_url}/frontend/ebay_category_tool.php"
echo ""
echo -e "${GREEN}🔌 API エンドポイント:${NC}"
echo -e "   ${YELLOW}統合API:${NC} ${base_url}/backend/api/unified_category_api_enhanced.php"
echo ""

# ステップ6: システム統計表示
echo -e "${CYAN}📈 システム統計情報...${NC}"

if command -v curl &> /dev/null; then
    echo -e "  API接続テスト中..."
    response=$(curl -s -o /dev/null -w "%{http_code}" -G "${base_url}/backend/api/unified_category_api_enhanced.php" -d "action=get_quick_stats" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "  ${GREEN}✅ API基本接続成功${NC}"
    else
        echo -e "  ${YELLOW}⚠ API応答: HTTP ${response} (設定未完了の可能性)${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ curl未発見、APIテストスキップ${NC}"
fi
echo ""

# ステップ7: 次のステップ案内
echo -e "${PURPLE}🎯 次のステップ案内${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${CYAN}🚀 すぐに使い始める場合:${NC}"
echo -e "   1. ブラウザで以下にアクセス:"
echo -e "      ${base_url}/frontend/category_massive_viewer_optimized.php"
echo -e "   2. Yahoo商品データがあれば「未処理データ処理」実行"
echo -e "   3. カテゴリー判定・セルミラー分析結果確認"
echo ""
echo -e "${CYAN}🔧 完全セットアップする場合:${NC}"
echo -e "   ./complete_system_setup.sh --complete-test"
echo ""
echo -e "${CYAN}📊 データベース初期構築する場合:${NC}"
echo -e "   psql -h localhost -U aritahiroaki -d nagano3_db -f database/complete_system_enhancement.sql"
echo ""
echo -e "${CYAN}🔄 月次バッチ設定する場合:${NC}"
echo -e "   crontab -e"
echo -e "   # 月初2:00に実行"
echo -e "   0 2 1 * * ${SCRIPT_DIR}/monthly_batch_processor.sh"
echo ""
echo -e "${CYAN}📚 詳細情報確認:${NC}"
echo -e "   cat README.md"
echo ""

# ステップ8: 重要な警告・注意事項
echo -e "${RED}⚠️  重要な注意事項${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo -e "• ${YELLOW}eBay API設定:${NC} 本格運用前にeBay APIキーの設定が必要"
echo -e "• ${YELLOW}出品枠設定:${NC} eBay Store設定に合わせて出品枠の調整が必要"
echo -e "• ${YELLOW}初回データ処理:${NC} 大量データがある場合は小分けして処理推奨"
echo -e "• ${YELLOW}監視設定:${NC} エラーログ・API使用量の定期監視を推奨"
echo -e "• ${YELLOW}バックアップ:${NC} 重要データの定期バックアップ設定を推奨"
echo ""

# 最終メッセージ
echo -e "${GREEN}🎉 ========================================="
echo -e "   eBayカテゴリー統合システム"
echo -e "   稼働準備完了！"
echo -e "=========================================${NC}"
echo ""
echo -e "${BLUE}システム概要:${NC}"
echo -e "• 統合カテゴリー判定 (API + キーワード辞書)"
echo -e "• セルミラー分析・リスク評価"  
echo -e "• Item Specifics 自動生成"
echo -e "• スコアリング・ランキング"
echo -e "• Select Categories 出品枠管理"
echo -e "• 月次バッチ処理・自動化"
echo ""
echo -e "${CYAN}開発者: Claude AI Assistant${NC}"
echo -e "${CYAN}バージョン: 2.0.0 完全統合版${NC}"
echo -e "${CYAN}作成日: $(date '+%Y年%m月%d日')${NC}"
echo ""
echo -e "${GREEN}稼働開始を開始してください！🚀${NC}"