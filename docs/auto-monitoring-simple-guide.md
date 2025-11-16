# 🚀 自動監視の設定方法 - 簡単ガイド

## 🤔 どれを使えばいい？

### ケース別の選び方

| あなたの状況 | おすすめの方法 | 難易度 | 費用 |
|------------|--------------|--------|------|
| **初めてデプロイする** | Vercel Cron | ★☆☆ | 無料 |
| **既にVPSがある** | Linux Cron | ★★☆ | 無料 |
| **複雑な制御をしたい** | Node.js Scheduler | ★★★ | 無料 |
| **テスト環境** | GitHub Actions | ★☆☆ | 無料 |

---

## 🌟 方法1: Vercel Cron（初心者におすすめ）

### Vercelって何？
- **VPSではない**別のサービスです
- Next.jsアプリを簡単にデプロイできる
- サーバー管理が不要
- 無料プランで十分使える

### 設定手順（5分）

1. **vercel.jsonを作成**
```json
{
  "crons": [
    {
      "path": "/api/cron/inventory-monitoring",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

2. **Vercelにデプロイ**
```bash
npm install -g vercel
vercel login
vercel --prod
```

3. **完了！**
自動で12時間ごとに監視が実行されます。

---

## 💻 方法2: Linux Cron（VPS所有者向け）

### こんな人におすすめ
- すでにVPSを契約している
- Linuxコマンドが使える
- 完全に自分で管理したい

### 設定手順（10分）

1. **スクリプト作成**
```bash
nano ~/monitoring-script.sh
```

内容:
```bash
#!/bin/bash
curl -X POST https://your-domain.com/api/inventory-monitoring/execute \
  -H "Content-Type: application/json"
```

2. **実行権限付与**
```bash
chmod +x ~/monitoring-script.sh
```

3. **Cron設定**
```bash
crontab -e
```

追加:
```cron
# 12時間ごとに実行（推奨）
0 */12 * * * ~/monitoring-script.sh

# または1日1回（毎朝9時）
0 9 * * * ~/monitoring-script.sh
```

---

## ⚠️ 重要：スクレイピング頻度について

### 推奨設定
- ✅ **12時間ごと**（最もバランスが良い）
- ✅ **1日1回**（安全重視）

### 避けるべき設定
- ❌ 1-2時間ごと
- ❌ 毎時実行

### 理由
Yahooオークションなどは頻繁なアクセスを**ロボット**と判定し、IPをブロックする可能性があります。

### ベストプラクティス
```
デフォルト設定タブで「12時間ごと」を選択
→ 安全で効率的
→ ロボット検知のリスクが低い
```

---

## 🎯 VPSとVercelの違い

| 項目 | VPS | Vercel |
|-----|-----|--------|
| サーバー管理 | 自分で行う | 不要 |
| コスト | 月額500-3000円 | 無料（基本） |
| 設定の難易度 | 高い | 低い |
| スケーラビリティ | 手動 | 自動 |
| SSL証明書 | 自分で設定 | 自動 |
| Cron設定 | 自分で設定 | vercel.jsonで完結 |

---

## 📊 推奨設定まとめ

### 初心者の方
```
1. Vercelを使う
2. vercel.jsonで12時間ごとに設定
3. GitHubと連携して自動デプロイ
```

### VPS経験者の方
```
1. Linux Cronを使う
2. 12時間ごとまたは1日1回に設定
3. ログファイルで監視
```

---

## ✅ 設定後の確認方法

### UIで確認
```
http://your-domain.com/inventory-monitoring
→ 実行履歴タブ
→ 自動実行の記録を確認
```

### データベースで確認
```sql
SELECT * FROM inventory_monitoring_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🆘 よくある質問

### Q: Vercelは本当に無料？
A: はい、Hobby（個人）プランは無料です。商用利用は月額$20のProプランが必要です。

### Q: VPSとVercelを両方使える？
A: いいえ、どちらか一つを選んでください。Vercelにデプロイした場合、VPSは不要です。

### Q: 2時間ごとではダメ？
A: ロボット検知のリスクが高いため、**推奨しません**。12時間ごとまたは1日1回が安全です。

### Q: どのくらいの監視対象数なら大丈夫？
A: 12時間ごとの頻度なら、1000商品程度まで問題ありません。

### Q: エラーが出たら？
A: 実行履歴タブでエラー内容を確認し、必要に応じて頻度を下げてください。

---

## 🎉 まとめ

**迷ったらVercel！**

理由:
- 設定が簡単（5分で完了）
- 無料で使える
- サーバー管理不要
- 自動スケーリング
- SSL自動設定

まずはVercelで試して、後でVPSに移行することも可能です。
