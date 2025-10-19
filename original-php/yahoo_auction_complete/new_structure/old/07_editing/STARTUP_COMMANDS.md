# Yahoo Auction 編集システム - クイック起動コマンド

## 方法1: 直接ディレクトリでPHPサーバー起動
cd "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_editing" && php -S localhost:8080

## 方法2: スクリプトを使用して起動
bash "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_editing/run_editing_system.sh"

## 方法3: ポート8888で起動（ポート競合回避）
cd "/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/05_editing" && php -S localhost:8888

## アクセスURL:
# ポート8080: http://localhost:8080/editing.php
# ポート8888: http://localhost:8888/editing.php