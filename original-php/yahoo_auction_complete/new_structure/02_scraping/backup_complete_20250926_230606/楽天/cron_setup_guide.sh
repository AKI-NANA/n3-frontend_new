# ===============================================
# 02_scraping 在庫管理 cron設定ガイド
# ===============================================

# crontab編集
# crontab -e

# ===============================================
# 基本的な定期実行設定
# ===============================================

# 2時間毎の在庫チェック（メイン処理）
0 */2 * * * php /path/to/02_scraping/scripts/inventory_cron.php >> /path/to/logs/inventory_cron.log 2>&1

# 日次レポート生成（毎朝9時）
0 9 * * * php /path/to/02_scraping/scripts/inventory_report.php >> /path/to/logs/inventory_report.log 2>&1

# 週次クリーンアップ（毎週月曜日3時）
0 3 * * 1 php /path/to/02_scraping/scripts/inventory_cleanup.php >> /path/to/logs/inventory_cleanup.log 2>&1

# ===============================================
# 高頻度監視設定（必要に応じて）
# ===============================================

# 1時間毎の在庫チェック（優先商品のみ）
0 * * * * php /path/to/02_scraping/scripts/inventory_cron.php --priority-only >> /path/to/logs/inventory_priority.log 2>&1

# 30分毎のURL生存確認（軽量チェック）
*/30 * * * * php /path/to/02_scraping/scripts/url_health_check.php >> /path/to/logs/url_check.log 2>&1

# ===============================================
# メンテナンス用設定
# ===============================================

# 深夜のデータベース最適化（毎日2時）
0 2 * * * php /path/to/02_scraping/scripts/db_optimize.php >> /path/to/logs/db_optimize.log 2>&1

# 古いログファイル削除（毎日4時）
0 4 * * * find /path/to/logs/inventory/ -name "*.log" -mtime +30 -delete

# 月次統計レポート（毎月1日10時）
0 10 1 * * php /path/to/02_scraping/scripts/monthly_report.php >> /path/to/logs/monthly_report.log 2>&1

# ===============================================
# エラー処理・監視設定
# ===============================================

# プロセス監視（5分毎）
*/5 * * * * php /path/to/02_scraping/scripts/process_monitor.php >> /path/to/logs/process_monitor.log 2>&1

# デッドロック解除（1時間毎）
0 * * * * php /path/to/02_scraping/scripts/deadlock_resolver.php >> /path/to/logs/deadlock.log 2>&1

# ===============================================
# 環境変数設定例
# ===============================================

# cron実行時の環境変数
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=admin@example.com

# PHP設定
PHP_INI_SCAN_DIR=/etc/php/8.0/cli/conf.d

# ===============================================
# ログローテーション設定
# ===============================================

# /etc/logrotate.d/inventory-management
/path/to/logs/inventory/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        # 必要に応じてサービス再起動
    endscript
}

# ===============================================
# 手動実行用スクリプト
# ===============================================

#!/bin/bash
# run_inventory_check.sh - 手動実行用

# 基本チェック
echo "在庫チェック開始: $(date)"
php /path/to/02_scraping/scripts/inventory_cron.php
echo "在庫チェック完了: $(date)"

# 特定商品のみチェック
# php /path/to/02_scraping/scripts/inventory_cron.php --product-ids=123,456,789

# 強制フルスキャン
# php /path/to/02_scraping/scripts/inventory_cron.php --force-full-scan

# ===============================================
# 監視・アラート設定
# ===============================================

# プロセス失敗検知（cron実行結果監視）
*/10 * * * * if ! pgrep -f "inventory_cron.php" > /dev/null; then echo "在庫管理プロセス停止検知: $(date)" | mail -s "ALERT: 在庫管理プロセス停止" admin@example.com; fi

# ディスク容量監視
0 * * * * df -h /path/to/logs | awk 'NR==2 {if($5+0 > 90) print "Disk usage: " $5}' | mail -s "ALERT: ディスク容量警告" admin@example.com

# ===============================================
# パフォーマンス調整設定
# ===============================================

# 低負荷時間帯の集中処理（深夜1-5時）
0 1 * * * php /path/to/02_scraping/scripts/intensive_check.php >> /path/to/logs/intensive.log 2>&1

# 営業時間外の重い処理（22時）
0 22 * * * php /path/to/02_scraping/scripts/heavy_analysis.php >> /path/to/logs/analysis.log 2>&1

# ===============================================
# デバッグ・開発用設定
# ===============================================

# 開発環境での詳細ログ出力
# */5 * * * * php /path/to/02_scraping/scripts/inventory_cron.php --debug --verbose >> /path/to/logs/debug.log 2>&1

# テスト商品のみチェック（開発時）
# */15 * * * * php /path/to/02_scraping/scripts/inventory_cron.php --test-mode >> /path/to/logs/test.log 2>&1

# ===============================================
# 設定確認コマンド
# ===============================================

# 現在のcron設定確認
# crontab -l

# cron サービス状態確認
# systemctl status cron
# service cron status

# cron ログ確認
# tail -f /var/log/cron
# grep -i cron /var/log/syslog

# ===============================================
# トラブルシューティング
# ===============================================

# 1. cron が実行されない場合
#    - cron サービス起動確認: systemctl start cron
#    - 権限確認: chmod +x script.php
#    - パス確認: which php

# 2. PHP エラーが発生する場合  
#    - PHP設定確認: php -m (モジュール確認)
#    - メモリ制限: php -d memory_limit=512M script.php
#    - エラーログ確認: tail -f /var/log/php_errors.log

# 3. データベース接続エラー
#    - 接続テスト: php -r "new PDO('pgsql:host=localhost;dbname=nagano3_db', 'user', 'pass');"
#    - プロセス確認: ps aux | grep postgres

# ===============================================
# セキュリティ考慮事項
# ===============================================

# 1. cron スクリプトの権限設定
# chmod 750 /path/to/02_scraping/scripts/*.php
# chown www-data:www-data /path/to/02_scraping/scripts/*.php

# 2. ログファイルの権限
# chmod 640 /path/to/logs/inventory/*.log

# 3. 機密情報の環境変数化
# export DB_PASSWORD="your_password"
# export API_KEYS="your_api_keys"