# 🎯 eBay API連携設定マニュアル

## **📋 概要**

CAIDSシステムで実際のeBay出品を停止するには、eBay Developer Program への登録とAPI認証情報の設定が必要です。

## **🔧 設定手順**

### **1. eBay Developer Program 登録**

1. **eBay Developers へアクセス**
   ```
   https://developer.ebay.com/
   ```

2. **アカウント作成**
   - 既存のeBayアカウントでサインイン
   - Developer Programに参加

3. **アプリケーション作成**
   - 「My Account」→「Application Keysets」
   - 新しいアプリケーションを作成

### **2. API認証情報取得**

以下の情報を取得してください：

```
✅ Dev ID (デベロッパーID)
✅ App ID (アプリケーションID) 
✅ Cert ID (証明書ID)
✅ User Token (ユーザートークン)
```

### **3. 認証情報設定**

#### **方法1: 環境変数設定（推奨・セキュア）**

```bash
# .env ファイル作成
export EBAY_DEV_ID="your_dev_id_here"
export EBAY_APP_ID="your_app_id_here"  
export EBAY_CERT_ID="your_cert_id_here"
export EBAY_USER_TOKEN="your_user_token_here"
```

#### **方法2: 設定ファイル直接編集（テスト用のみ）**

`ebay_api_config.php` を編集：

```php
'sandbox' => [
    'dev_id' => 'your_actual_dev_id',
    'app_id' => 'your_actual_app_id',
    'cert_id' => 'your_actual_cert_id', 
    'user_token' => 'your_actual_user_token'
]
```

### **4. サンドボックステスト**

1. **サンドボックス環境でテスト**
   - 設定: `define('EBAY_ENV', 'sandbox');`
   - テスト商品でAPI動作確認

2. **ログファイル確認**
   ```
   tail -f modules/ebay_test_viewer/ebay_api.log
   ```

### **5. 本番環境移行**

1. **本番認証情報設定**
   - Production Keyset を取得
   - 環境設定を本番に変更

2. **環境切り替え**
   ```php
   define('EBAY_ENV', 'production');
   ```

## **🚨 現在の動作状態**

### **認証情報未設定の場合**
- ✅ **シミュレーションモード**で動作
- ✅ UI上では正常に削除される
- ⚠️ 実際のeBay出品は停止されない
- ✅ ログに「SIMULATION」と記録

### **認証情報設定済みの場合**  
- ✅ **実際のeBay API**で動作
- ✅ 本物のeBay出品が停止される
- ✅ ログに「REAL_EBAY_API」と記録

## **📊 API動作確認**

### **ログ確認方法**
```bash
# API呼び出しログ
tail -f modules/ebay_test_viewer/ebay_api.log

# 削除済み商品ログ  
tail -f modules/ebay_test_viewer/permanently_deleted.log

# CSV記録
cat modules/ebay_test_viewer/deleted_items.csv
```

### **レスポンス例**

#### **シミュレーションモード**
```json
{
  "success": true,
  "api_method": "SIMULATION",
  "note": "eBay API認証情報が未設定のためシミュレーションで実行"
}
```

#### **実API連携**
```json
{
  "success": true, 
  "api_method": "REAL_EBAY_API",
  "api_calls": 1,
  "ended_at": "2025-01-01T10:00:00Z"
}
```

## **🛡️ セキュリティ重要事項**

1. **認証情報の保護**
   - 環境変数使用を強く推奨
   - GitHubにコミットしない
   - ファイル権限を適切に設定

2. **API制限**
   - 1日5000回まで（通常アカウント）
   - レート制限に注意

3. **テスト推奨**
   - サンドボックスで十分テスト
   - 本番移行は慎重に実施

## **❓ トラブルシューティング**

### **「eBay API認証情報が設定されていません」エラー**
→ 上記手順で認証情報を正しく設定してください

### **「eBay APIエラー: Permission denied」** 
→ User Tokenの取得・設定を確認

### **「HTTPエラー: 401」**
→ 認証情報が間違っている可能性があります

---

**✨ 設定完了後は、実際のeBay出品が停止されます！**