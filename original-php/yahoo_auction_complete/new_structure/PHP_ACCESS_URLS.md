# 🚀 Yahoo Auction Complete - PHP版ツール 正しいアクセスURL

## 📍 現在のサーバー設定
- **サーバーURL**: http://localhost:8080
- **ドキュメントルート**: `/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete`

## ✅ 正しいアクセスURL

### メインインデックス（PHP版ツール一覧）
```
http://localhost:8080/new_structure/advanced_tools_php_index.php
```

### 個別ツール
```
# 高度統合利益計算システム
http://localhost:8080/new_structure/05_rieki/advanced_tariff_calculator.php

# 送料計算システム（4層選択）
http://localhost:8080/new_structure/09_shipping/complete_4layer_shipping_ui.php

# 高速動作版利益計算
http://localhost:8080/new_structure/05_rieki/working_calculator.php

# eBayカテゴリー自動判定
http://localhost:8080/new_structure/06_ebay_category_system/frontend/ebay_category_tool.php
```

### 既存システム
```
# 24ツール統合システム（既存）
http://localhost:8080/yahoo_auction_complete_24tools.html

# メインダッシュボード
http://localhost:8080/index.php
```

## 🔧 ファイル確認コマンド
```bash
# サーバー起動確認
lsof -i :8080

# ファイル存在確認
ls -la /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/
```

## ⚠️ トラブルシューティング
1. **サーバーが起動していない場合**:
   ```bash
   cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete
   ./start_server.sh
   ```

2. **ファイルが見つからない場合**:
   - new_structure/ ディレクトリ内にファイルが正しく配置されているか確認

3. **権限エラーの場合**:
   ```bash
   chmod +x /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/start_server.sh
   ```
