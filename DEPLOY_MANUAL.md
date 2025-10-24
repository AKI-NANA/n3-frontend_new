# VPSデプロイ手順（標準手順）

## 🚨 重要：必ずこの手順でデプロイしてください

ビルドキャッシュの不整合を防ぐため、**必ずクリーンビルド**を実行します。

## デプロイコマンド（VPS上で実行）

### 方法1: 一括実行（推奨）

VPSにSSHでログインして、以下を一行で実行：

```bash
cd ~/n3-frontend_new && git fetch origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz && git pull origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz && rm -rf .next && npm install && npm run build && pm2 restart n3-frontend && pm2 logs n3-frontend --lines 20
```

### 方法2: ステップごとに実行

```bash
# 1. プロジェクトディレクトリに移動
cd ~/n3-frontend_new

# 2. 最新コードを取得
git fetch origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz
git pull origin claude/inventory-scraping-sync-011CUMaeWipViad45zaNRUXz

# 3. ビルドキャッシュを削除（重要！）
rm -rf .next

# 4. 依存関係を更新（package.jsonが変更された場合）
npm install

# 5. クリーンビルド
npm run build

# 6. PM2を再起動
pm2 restart n3-frontend

# 7. ログを確認
pm2 logs n3-frontend --lines 20
```

---

## なぜビルドキャッシュを削除する必要があるのか？

### 問題の原因

Next.jsは高速化のために`.next/`ディレクトリにビルドキャッシュを保存します。

**新しいコードをpullしただけでは：**
- 新しいコードが取得される
- しかし**古いビルドキャッシュが残る**
- 新しいコード + 古いキャッシュ = **不整合エラー**

**典型的なエラー：**
```
Cannot access 'l' before initialization
```

### 解決方法

デプロイ前に**必ず**以下を実行：

```bash
rm -rf .next
```

これで古いキャッシュが削除され、クリーンビルドが実行されます。

---

## トラブルシューティング

### エラー: "Cannot access 'l' before initialization"

**原因**: ビルドキャッシュの不整合

**解決**:
```bash
cd ~/n3-frontend_new
rm -rf .next
rm -rf node_modules
npm install
npm run build
pm2 restart n3-frontend
```

### エラー: "Module not found"

**原因**: 新しい依存関係が追加されたが、node_modulesが更新されていない

**解決**:
```bash
cd ~/n3-frontend_new
npm install
npm run build
pm2 restart n3-frontend
```

### Puppeteerが動かない

**原因**: Chromiumの依存関係が不足

**解決**:
```bash
sudo apt-get update
sudo apt-get install -y chromium-browser
```

---

## デプロイ後の確認

### 1. PM2ステータス確認
```bash
pm2 status
```

**正常な状態:**
- `n3-frontend` が `online`
- `cpu` が安定している（100%でない）

### 2. ログ確認
```bash
pm2 logs n3-frontend --lines 30
```

**正常なログ:**
```
✅ Supabase初期化: https://...
✓ Ready in XXXms
```

**エラーログ:**
```
[Scraping] エラー: ...
```

### 3. ブラウザで動作確認

- https://n3.emverze.com/tools/data-collection にアクセス
- スクレイピングを実行
- エラーが出ないか確認

---

## 注意事項

### ⚠️ 絶対にやってはいけないこと

1. **ビルドせずにPM2を再起動**
   ```bash
   # ❌ NG
   git pull && pm2 restart n3-frontend

   # ✅ OK
   git pull && rm -rf .next && npm run build && pm2 restart n3-frontend
   ```

2. **本番環境で直接コード編集**
   - 必ずローカルで編集 → git push → VPSでpull

3. **.envファイルを削除**
   - 環境変数が失われます

### ✅ 推奨事項

1. **デプロイ前にローカルでビルド確認**
   ```bash
   npm run build
   ```

2. **デプロイ後は必ずログ確認**
   ```bash
   pm2 logs n3-frontend --lines 30
   ```

3. **エラーが出たらすぐにロールバック**
   ```bash
   git checkout [前のコミット]
   rm -rf .next
   npm run build
   pm2 restart n3-frontend
   ```

---

## クイックリファレンス

| 操作 | コマンド |
|------|----------|
| VPSにログイン | `ssh ubuntu@tk2-236-27682.vs.sakura.ne.jp` |
| 最新コード取得 | `cd ~/n3-frontend_new && git pull origin [branch]` |
| クリーンビルド | `rm -rf .next && npm run build` |
| PM2再起動 | `pm2 restart n3-frontend` |
| ログ確認 | `pm2 logs n3-frontend --lines 30` |
| PM2ステータス | `pm2 status` |
| ビルドキャッシュ削除 | `rm -rf .next` |
| 依存関係再インストール | `rm -rf node_modules && npm install` |

---

## 最終チェックリスト

デプロイ前に確認：

- [ ] ローカルで `npm run build` が成功している
- [ ] git push が完了している
- [ ] VPSにログインしている
- [ ] 正しいブランチにいる (`git branch` で確認)

デプロイ後に確認：

- [ ] `pm2 status` で `online` になっている
- [ ] `pm2 logs` でエラーが出ていない
- [ ] ブラウザでアクセスできる
- [ ] 主要機能（スクレイピング）が動作する

---

## 更新履歴

- 2025-01-XX: 初版作成 - クリーンビルド手順を標準化
