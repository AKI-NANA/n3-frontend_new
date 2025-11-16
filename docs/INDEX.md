# n3-frontend プロジェクト INDEX

## 🤖 AI開発ルール（最優先）

### 1. MCP Filesystem ツール優先使用
- **必須**: すべてのファイル操作は MCP Filesystem ツールを使用すること
- **禁止**: bash経由のファイル操作、手動でのファイル編集指示

### 2. MCP接続エラー時の対応
MCPツールが応答しない場合:

1. **ファイル保存先**: `/Users/aritahiroaki/n3-frontend_new/temp_outputs/`
2. **ファイル名形式**: `YYYYMMDD_HHMMSS_<機能名>.ts` (例: `20251103_160530_ebay_api.ts`)
3. **必ず提示するコマンド**:
```bash
# テキストエディタで開く
open -a "Visual Studio Code" /Users/aritahiroaki/n3-frontend_new/temp_outputs/20251103_160530_ebay_api.ts

# または標準エディタ
open -t /Users/aritahiroaki/n3-frontend_new/temp_outputs/20251103_160530_ebay_api.ts
```

### 3. ファイル作成の流れ
```
1. MCP Filesystem:write_file を試行
   ↓ エラー
2. temp_outputs/ にファイル保存
   ↓
3. openコマンドを提示
   ↓
4. ユーザーが手動で正しい場所にコピー
```

### 4. 禁止事項
- ❌ 「手動でファイルを作成してください」のみの指示
- ❌ コードブロックのみ提示して終わり
- ❌ bash経由のファイル作成（Dockerコンテナ内で動作するため無効）

---

## 📁 プロジェクト構造

### 主要ディレクトリ
```
/Users/aritahiroaki/n3-frontend_new/
├── app/                    # Next.js App Router
│   ├── api/               # バックエンドAPI
│   │   ├── cron/         # 定期実行ジョブ
│   │   ├── ebay/         # eBay連携
│   │   ├── inventory-monitoring/
│   │   ├── pricing/      # 価格調整
│   │   └── listing/      # 出品管理
│   ├── inventory-monitoring/  # 在庫監視UI
│   └── listing-management/    # 出品管理UI
├── lib/                   # 共通ライブラリ
├── components/            # Reactコンポーネント
├── database/              # SQLマイグレーション
├── docs/                  # ドキュメント
├── scripts/               # 運用スクリプト
└── temp_outputs/          # AI作業用一時ファイル（⭐重要）
```

### 重要ファイル
- `引き継ぎ書.md` - プロジェクト完全引き継ぎ情報
- `.env.local` - 環境変数設定
- `package.json` - 依存関係
- `vercel.json` - Cron設定

---

## 🎯 現在の開発状況

### 完成度: 95%

### ✅ 完成済み
- データベース構造（全テーブル）
- 在庫監視システム（UI + API）
- 価格調整15ルール（13/15実装）
- 出品管理UI
- スケジュール実行システム

### 🔴 最優先実装
1. **eBay Trading API実装** (現在スタブ)
   - `/app/api/ebay/listings/update-price/route.ts`
   - `/app/api/ebay/listings/update-inventory/route.ts`
   - `/app/api/ebay/listings/end/route.ts`

2. **ルール10: 競合信頼度プレミアム** (0%実装)
   - `/app/api/pricing/competitor-premium/route.ts`

---

## 🔧 開発ワークフロー

### AI開発セッション開始時
1. `引き継ぎ書.md` を確認
2. INDEX.md（このファイル）でルール確認
3. MCPツール接続テスト
4. 実装開始

### コード修正時
1. MCP `Filesystem:read_file` でファイル読み込み
2. MCP `Filesystem:edit_file` で編集
3. 動作確認指示

### 新規ファイル作成時
1. MCP `Filesystem:write_file` で作成
2. エラー時は `temp_outputs/` に保存
3. `open -a "Visual Studio Code"` コマンド提示

---

## 📊 データベース

### Supabase
- URL: `https://zdzfpucdyxdlavkgrvil.supabase.co`
- 接続: `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` 使用

### 主要テーブル
- `products_master` - 商品マスター
- `global_pricing_strategy` - 価格戦略
- `unified_changes` - 変動履歴
- `product_sources` - 仕入れ元
- `ebay_listing_metrics` - パフォーマンス

---

## 🚀 運用コマンド

### 開発サーバー
```bash
cd /Users/aritahiroaki/n3-frontend_new
npm run dev
# → http://localhost:3000
```

### API テスト
```bash
# 在庫監視実行
curl http://localhost:3000/api/inventory-monitoring/execute

# 価格調整（dry-run）
curl -X POST http://localhost:3000/api/pricing/follow-lowest \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### キャッシュクリア
```bash
rm -rf .next
npm run dev
```

---

## 📞 問題発生時

### MCPツールが応答しない
1. Claude Desktop アプリを再起動
2. それでもダメなら `temp_outputs/` 経由で対応

### ファイルが見つからない
```bash
# ファイル検索
find /Users/aritahiroaki/n3-frontend_new -name "*.ts" -path "*/api/ebay/*"
```

### データベース確認
- Supabase Dashboard: https://supabase.com/dashboard/project/zdzfpucdyxdlavkgrvil
- SQL Editor で直接確認

---

**最終更新**: 2025-11-03
**AI担当**: Claude (Anthropic)
**開発者**: aritahiroaki
