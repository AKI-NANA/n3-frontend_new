# Advanced Tariff Calculator - 新アクセスURL

## 📍 移動先URL (05_rieki)

### メインツール
```
http://localhost:8081/new_structure/05_rieki/advanced_tariff_calculator.php
```

### API
```
http://localhost:8081/new_structure/05_rieki/advanced_tariff_api_fixed.php?action=health
http://localhost:8081/new_structure/05_rieki/tariff_settings_api.php?action=health
```

### データベース確認
```
http://localhost:8081/new_structure/05_rieki/check_database_tariff.php
```

## 🔄 変更理由

- **旧配置**: 09_shipping (送料計算)
- **新配置**: 05_rieki (利益計算) 
- **理由**: 主機能が利益・ROI・関税計算のため

## 🔗 統合メニュー更新

yahoo_auction_complete_11tools.html のリンクを以下に変更:
```
new_structure/05_rieki/advanced_tariff_calculator.php
```
