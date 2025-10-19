# Next.js Configuration - 重要な注意事項

## ⚠️ 絶対にやってはいけないこと

### 1. next.config.ts の不正なパス設定
❌ **絶対に追加しないでください：**
```typescript
experimental: {
  turbo: {
    root: '/Users/...' // 絶対パスを指定しない
  }
}
```

✅ **正しい設定：**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 必要な設定のみ */
};

export default nextConfig;
```

### 2. 実行前のチェックリスト

サーバー起動前に必ず確認：
- [ ] next.config.ts に不要な設定がないか
- [ ] .next ディレクトリが存在する場合は削除
- [ ] node_modules/.cache が残っていないか

### 3. トラブル時の標準手順

```bash
# 1. プロセスを停止
pkill -9 -f "next"

# 2. キャッシュをクリア
rm -rf .next node_modules/.cache

# 3. 起動
npm run dev
```

## 問題が起きた時の診断手順

1. **SWC警告が出た場合**
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   npm run dev
   ```

2. **接続拒否エラーの場合**
   - next.config.ts を確認
   - コンポーネントの構文エラーを確認
   - ターミナルのエラーログを確認

3. **404エラーの場合**
   - ファイル構造を確認
   - app/ディレクトリのpage.tsxが存在するか確認

## バックアップ戦略

重要なファイルは定期的にバックアップ：
- app/
- components/
- lib/
- next.config.ts
- package.json
- tsconfig.json
