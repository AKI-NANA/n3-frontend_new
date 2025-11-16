# 🎯 VPS契約済みの方向けガイド

## 結論：VPSのみ使用がおすすめ

既にVPSを契約している場合、**VPSのみ**で監視を実行することをおすすめします。

---

## ❌ VPS + Vercel 両方使うのはダメ

### なぜダメ？

```
あなたの考え:
VPS    → 12時間ごと
Vercel → 12時間ごと
= 冗長化で安全！

実際の結果:
Yahoo側から見ると...
→ 同じ商品に6時間ごとアクセス
→ 頻繁すぎてロボット検知！
→ IPブロックのリスク増加
```

### 具体例

```
商品A: ポケモンカード

VPS設定:    0:00, 12:00 にチェック
Vercel設定: 6:00, 18:00 にチェック

Yahoo側の視点:
0:00 - アクセス来た
6:00 - また来た（6時間後）
12:00 - また来た（6時間後）
18:00 - また来た（6時間後）

→ 「これはbot（ロボット）だな」
→ IPブロック！
```

---

## ✅ 正しい使い方：VPSのみで実装

### 設定手順

#### 1. Linux Cronスクリプト作成

```bash
# スクリプト作成
nano ~/inventory-monitoring.sh
```

内容:
```bash
#!/bin/bash

# ログディレクトリ
LOG_DIR="$HOME/logs"
mkdir -p $LOG_DIR

# 現在時刻
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="$LOG_DIR/monitoring-$(date '+%Y%m%d').log"

echo "[$TIMESTAMP] Starting inventory monitoring..." >> $LOG_FILE

# APIエンドポイント呼び出し
curl -X POST https://your-domain.com/api/inventory-monitoring/execute \
  -H "Content-Type: application/json" \
  >> $LOG_FILE 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "[$TIMESTAMP] Completed successfully" >> $LOG_FILE
else
  echo "[$TIMESTAMP] Failed with exit code $EXIT_CODE" >> $LOG_FILE
fi

# 古いログ削除（30日以上前）
find $LOG_DIR -name "monitoring-*.log" -mtime +30 -delete

echo "---" >> $LOG_FILE
```

#### 2. 実行権限付与

```bash
chmod +x ~/inventory-monitoring.sh
```

#### 3. Crontab設定（12時間ごと推奨）

```bash
crontab -e
```

追加:
```cron
# 12時間ごとに実行（0時と12時）
0 0,12 * * * ~/inventory-monitoring.sh

# または1日1回（毎朝9時）
# 0 9 * * * ~/inventory-monitoring.sh

# 価格最適化は1日2回（朝8時と夜8時）
0 8,20 * * * ~/price-optimization.sh
```

#### 4. 動作確認

```bash
# Cron設定確認
crontab -l

# ログ確認
tail -f ~/logs/monitoring-$(date '+%Y%m%d').log

# 手動テスト実行
~/inventory-monitoring.sh
```

---

## 🔄 冗長化したい場合の正しい方法

もし本当にバックアップが欲しい場合：

### 方法1: メイン・サブで時間をずらす

```cron
# メインVPS: 毎日9時
0 9 * * * ~/monitoring.sh

# サブVPS: 毎日21時（12時間後）
0 21 * * * ~/monitoring.sh
```

でも...
- **これでも1日2回アクセス**
- 本当に必要か再検討を推奨

### 方法2: 週次交代制（推奨）

```cron
# メインVPS: 月・水・金・日（偶数週）
0 9 * * 1,3,5,0 ~/monitoring.sh

# サブVPS: 火・木・土（奇数週）
0 9 * * 2,4,6 ~/monitoring.sh
```

これなら：
- ✅ 1日1回のアクセス頻度を維持
- ✅ 片方が止まっても2日以内に検知可能

---

## 💡 VPS契約済みなら、追加でVercelは不要

### 理由

1. **コスト面**
   - VPS: 既に払っている
   - Vercel: 無料だが、商用利用は月$20
   - → VPSを有効活用すべき

2. **管理面**
   - VPSのみ: 1箇所で管理
   - VPS+Vercel: 2箇所の管理が必要
   - → 複雑になる

3. **安全性**
   - 両方使う: アクセス頻度が2倍
   - VPSのみ: 適切な間隔を維持
   - → VPSのみが安全

---

## 📊 推奨設定（VPS契約済みの場合）

### 基本設定

```bash
# 在庫監視: 12時間ごと
0 0,12 * * * ~/inventory-monitoring.sh

# 価格最適化: 1日2回
0 8,20 * * * ~/price-optimization.sh

# 日次レポート: 毎朝9時
0 9 * * * ~/daily-report.sh
```

### 監視スクリプトの改善（重要）

リトライ機能を追加:
```bash
#!/bin/bash

MAX_RETRIES=3
RETRY_DELAY=300  # 5分

for i in $(seq 1 $MAX_RETRIES); do
  curl -X POST https://your-domain.com/api/inventory-monitoring/execute \
    -H "Content-Type: application/json" \
    >> $LOG_FILE 2>&1
  
  if [ $? -eq 0 ]; then
    echo "Success on attempt $i"
    exit 0
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "Retry $i failed, waiting ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

echo "All retries failed"
exit 1
```

これで：
- ✅ 一時的なエラーに対応
- ✅ 5分間隔で3回までリトライ
- ✅ Vercel無しでも安定運用

---

## ⚠️ よくある勘違い

### Q: 両方使えば、片方が止まっても安全では？

A: **いいえ。**
- システムの冗長化 ≠ スクレイピングの冗長化
- Yahoo側は「アクセス回数」しか見ていない
- 両方使うと単純に頻度が2倍になるだけ

### Q: でもVercelは無料だから使わないと損？

A: **いいえ。**
- 既にVPSがあるなら不要
- 管理箇所が増えて複雑化
- スクレイピング頻度が増えてリスク増

### Q: VPSが止まったら検知できないのでは？

A: **対策できます。**
```bash
# 監視スクリプト自体の監視
# 失敗時にメール/Discord通知
if [ $EXIT_CODE -ne 0 ]; then
  curl -X POST $DISCORD_WEBHOOK \
    -d '{"content": "Monitoring failed!"}'
fi
```

---

## 🎯 結論

### VPS契約済みなら

```
✅ VPSのLinux Cronのみ使用
✅ 12時間ごとまたは1日1回
✅ リトライ機能を実装
✅ 失敗時の通知を設定

❌ Vercelは追加しない
❌ 複数の実行元を使わない
```

### 設定完了後

1. UIの「デフォルト設定」で監視頻度を「12時間ごと」に設定
2. VPSのCronで同じ頻度を設定
3. 1週間動作を確認
4. 実行履歴タブでログをチェック

これが最も安全で効率的です！
