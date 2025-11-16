# 📦 v0フォルダ移行計画書

> **作成日**: 2025-11-16  
> **ステータス**: 計画中  
> **方針**: コピーして段階的統合（v0は保持）

---

## 🎯 基本方針

### ✅ やること
- v0フォルダの内容を**コピー**して本体appフォルダに統合
- 段階的に統合し、動作確認後にサイドバーリンク追加
- **v0フォルダは削除せず保持**（参照用・バックアップ）

### ❌ やらないこと
- v0フォルダの削除
- 一括移動（リスクが高い）
- テストなしでのリンク追加

---

## 📊 v0フォルダ構成分析

### 🌟 優先度S（即座に統合すべき）

#### 1. 棚卸しツール
**場所**: `v0/棚卸しツール/`  
**統合先**: `app/zaiko/tanaoroshi/`  
**完成度**: ⭐⭐⭐⭐⭐ (95%)  
**リンク**: ✅ 追加済み（`/zaiko/tanaoroshi`）

**内容**:
- 完全なNext.jsアプリケーション
- Supabase連携済み
- API routes完備
- UIコンポーネント完成

**移行手順**:
```bash
# 1. コピー
cp -r v0/棚卸しツール/app/tools/inventory app/zaiko/
cp -r v0/棚卸しツール/components/inventory components/zaiko/

# 2. API routes統合
cp -r v0/棚卸しツール/app/api/products/* app/api/products/
```

---

### 🔥 優先度A（1週間以内に統合）

#### 2. 多販路マッパー群
**場所**: `v0/多販路系/`  
**統合先**: `lib/mappers/` (新規作成)  
**完成度**: ⭐⭐⭐⭐ (80%)

**含まれるマッパー**:
- Amazon Global (`AmazonGlobalMapper.js`)
- BUYMA (`BUYMAMapper.js`)
- Shopee (`ShopeeMapper.js`)
- 楽天台湾 (`RakutenGlobalMapper.js`)
- その他20+マッパー

**移行計画**:
```
lib/
  mappers/
    amazon/
      AmazonGlobalMapper.ts (変換)
    buyma/
      BUYMAMapper.ts
    shopee/
      ShopeeMapper.ts
    ... (各プラットフォーム)
```

**タスク**:
1. JavaScriptをTypeScriptに変換
2. 共通インターフェース定義
3. テストケース作成
4. API統合

---

#### 3. Amazon刈り取りツール
**場所**: `v0/リサーチ系/Amazon刈り取り/`  
**統合先**: `app/tools/amazon-research/`  
**完成度**: ⭐⭐⭐⭐ (85%)

**内容**:
- スコアリングシステム
- 自動判定ロジック
- UI (React)

**統合手順**:
```bash
# コンポーネント移行
cp v0/リサーチ系/Amazon刈り取り/page.tsx app/tools/amazon-research/

# APIルート移行
cp v0/リサーチ系/Amazon刈り取り/route.ts app/api/amazon/arbitrage/

# スコアリングロジック
cp v0/リサーチ系/Amazon刈り取り/scorer.ts lib/scoring/amazon/
```

---

### 📝 優先度B（2週間以内に統合）

#### 4. 受注・出荷管理システム
**場所**: `v0/管理系/受注管理システム＿自動注文/`  
**統合先**: `app/management/orders/`  
**完成度**: ⭐⭐⭐ (70%)

**含まれるコンポーネント**:
- `OrderManager_V2.jsx` → 受注管理
- `ShippingManager_V1.jsx` → 出荷管理
- `IntegratedDashboard_V1.jsx` → 統合ダッシュボード
- `CashFlowForecaster_V1.jsx` → キャッシュフロー予測

**統合タスク**:
1. JSX → TSX変換
2. 状態管理をRedux/Zustandに統合
3. APIエンドポイント作成
4. 認証・権限チェック追加

---

#### 5. HTS階層システム再構築
**場所**: `v0/HTS階層システム 修正・再構築計画書/`  
**統合先**: `lib/hts/`  
**完成度**: ⭐⭐⭐ (60%)

**内容**:
- HTSユーティリティ (`htsUtils.ts`)
- 翻訳スクリプト (`translateDescriptions.ts`)
- マイグレーションSQL

**統合タスク**:
1. ユーティリティ関数を既存HTSシステムに統合
2. 翻訳機能の動作確認
3. データベースマイグレーション実行

---

### 🔮 優先度C（検討中・将来統合）

#### 6. プロンプト系AI連携
**場所**: `v0/プロンプト系/`  
**統合先**: 未定  
**完成度**: ⭐⭐ (40%)

**含まれる機能**:
- 二段階リサーチフロー
- Claude分析サービス
- Gemini画像分析

**統合判断**: AIサービスの利用状況を見て判断

---

#### 7. eBay強化ツール
**場所**: `v0/ebay強化/SEO:リスティング健全性マネージャー/`  
**統合先**: `app/tools/ebay-seo/`  
**完成度**: ⭐⭐ (50%)

**統合判断**: eBay出品機能が安定してから

---

## 🗂️ ファイル命名規則

### v0での命名 → 本体での命名

```
v0/棚卸しツール/               → app/zaiko/tanaoroshi/
v0/多販路系/Amazon/            → lib/mappers/amazon/
v0/リサーチ系/Amazon刈り取り/  → app/tools/amazon-arbitrage/
v0/管理系/受注ページ/          → app/management/orders/
```

### 変換ルール
1. **ディレクトリ名**: 日本語 → 英語小文字（ケバブケース）
2. **ファイル名**: `.jsx` → `.tsx`、`.js` → `.ts`
3. **コンポーネント名**: PascalCase維持

---

## 📅 移行スケジュール

| 週 | 作業内容 | 担当項目 |
|---|---|---|
| Week 1 | 棚卸しツール統合完了 | 優先度S |
| Week 2 | Amazon刈り取り統合 | 優先度A |
| Week 3 | 多販路マッパー統合開始 | 優先度A |
| Week 4 | 受注・出荷管理統合 | 優先度B |
| Week 5+ | HTS再構築、その他 | 優先度B/C |

---

## ✅ チェックリスト（各移行時）

### 移行前
- [ ] v0フォルダのバックアップ確認
- [ ] 依存関係の確認
- [ ] データベーススキーマ確認

### 移行中
- [ ] ファイルをコピー（移動ではない）
- [ ] TypeScript変換
- [ ] インポートパス修正
- [ ] 型定義追加

### 移行後
- [ ] ローカルでビルド成功
- [ ] 機能テスト実施
- [ ] サイドバーリンク追加
- [ ] 本番デプロイ

---

## 🎨 v0フォルダの今後の扱い

### 保持する理由
1. **参照用**: 元の実装を確認できる
2. **バックアップ**: 統合失敗時のロールバック
3. **ドキュメント**: `.ini`ファイルに開発意図が記載

### 整理方法
```
v0/
  _archived/          # 統合済みのものを移動
  _in_progress/       # 統合作業中
  _pending/           # 統合待ち
  README.md           # このフォルダの説明
```

---

## 💡 次のアクション

1. **今すぐ**: 棚卸しツールのページを作成
2. **今週中**: Amazon刈り取りツール統合
3. **来週**: 多販路マッパー統合開始

---

## 📞 質問・相談

移行作業中に不明点があれば、この計画書を参照してください。
