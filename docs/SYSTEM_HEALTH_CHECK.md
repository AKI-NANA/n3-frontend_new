# 🏥 システムヘルスチェック機能

## 📍 場所

**サイドバー**: システム管理 → 🏥 システムヘルスチェック  
**URL**: `/system-health`

---

## ✨ 機能概要

n3-frontendシステムの全機能をリアルタイムで監視・テストするダッシュボードです。

### チェック項目

1. **Supabase接続** - データベース接続テスト
2. **在庫監視システム** - 在庫・価格監視APIの動作確認  
3. **価格計算エンジン** - 価格戦略・計算ロジックの確認
4. **スコアリングシステム** - 商品スコアリングの動作確認
5. **eBay API** - eBay Trading/Browse API接続
6. **SellerMirror連携** - 競合分析API接続
7. **配送計算** - 配送料・関税計算エンジン
8. **HTMLテンプレート** - テンプレートエンジンの動作
9. **フィルターシステム** - 商品フィルター機能
10. **バッチ処理** - 一括リスティング機能

---

## 🎯 使い方

### 1. ページを開く

```
サイドバー → システム管理 → 🏥 システムヘルスチェック
```

### 2. 自動チェック開始

ページを開くと自動的に全機能のヘルスチェックが開始されます。

### 3. 結果の確認

- **✅ 正常**: 緑色、機能は正常に動作中
- **⚠️ 警告**: 黄色、一部に問題がある可能性
- **❌ エラー**: 赤色、機能が動作していない

### 4. 再チェック

右上の「再チェック」ボタンで再度テストを実行できます。

---

## 📊 表示情報

### サマリー

- 総チェック数
- 正常な機能数
- 警告がある機能数
- エラーがある機能数
- 全体の成功率（プログレスバー）

### 詳細カード（各機能ごと）

- **ステータスバッジ**: 正常/警告/エラー
- **応答時間**: API応答時間（ミリ秒）
- **メッセージ**: エラーや警告の詳細
- **エンドポイント**: テストしたAPIパス

---

## 🔧 トラブルシューティング

### エラーが出た場合

1. **Supabase接続エラー**
   ```bash
   # 環境変数を確認
   cat .env.local | grep SUPABASE
   ```

2. **eBay APIエラー**
   ```bash
   # トークンを確認
   curl http://localhost:3000/api/ebay/check-token
   ```

3. **その他のエラー**
   ```bash
   # ログを確認
   pm2 logs n3-frontend --lines 50
   
   # アプリを再起動
   pm2 restart n3-frontend
   ```

### 警告が出た場合

- データベースに商品が登録されていない可能性
- 一部の環境変数が未設定
- API接続は正常だが、データが不足

---

## 🛠️ 開発者向け

### ヘルスチェックAPIの追加

新しい機能のヘルスチェックを追加する場合：

#### 1. API作成

```typescript
// app/api/health/[feature]/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // テストロジック
    return NextResponse.json({
      success: true,
      message: "正常に動作しています"
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
```

#### 2. ページに追加

```typescript
// app/system-health/page.tsx
const healthChecks = [
  // 既存のチェック...
  {
    name: "新機能",
    description: "新機能の説明",
    icon: YourIcon,
    endpoint: "/api/health/your-feature"
  }
]
```

---

## 📝 API仕様

### レスポンス形式

#### 成功時

```json
{
  "success": true,
  "message": "正常に動作しています",
  "data": {
    // オプション: 追加情報
  }
}
```

#### エラー時

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "status": "error"
}
```

### ステータスコード

- `200`: 成功
- `500`: エラー

---

## 🎨 UI特徴

- **リアルタイム更新**: チェック中は自動的に更新
- **レスポンシブデザイン**: モバイル・デスクトップ両対応
- **アニメーション**: スムーズな状態遷移
- **カラーコーディング**: 状態を直感的に理解
- **詳細情報**: エンドポイントと応答時間を表示

---

## 🚀 今後の拡張

- [ ] 自動定期チェック（5分ごと）
- [ ] 履歴保存（過去24時間の状態）
- [ ] アラート通知（Discord/Slack連携）
- [ ] パフォーマンスグラフ
- [ ] カスタムチェック追加UI

---

## 📄 関連ファイル

```
/app/system-health/page.tsx              # メインページ
/app/api/health/supabase/route.ts        # Supabaseチェック
/components/layout/SidebarConfig.ts       # サイドバー設定
/docs/SYSTEM_HEALTH_CHECK.md             # このドキュメント
```

---

## ✅ チェックリスト（開発完了時）

- [x] ヘルスチェックページ作成
- [x] サイドバーに追加
- [x] Supabase接続チェックAPI
- [ ] 価格計算チェックAPI
- [ ] スコアリングチェックAPI
- [ ] SellerMirrorチェックAPI
- [ ] 配送計算チェックAPI
- [ ] バッチ処理チェックAPI
- [ ] 自動定期チェック機能
- [ ] アラート通知機能

---

**作成日**: 2025-11-03  
**最終更新**: 2025-11-03  
**バージョン**: 1.0.0
