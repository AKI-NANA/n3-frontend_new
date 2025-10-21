# n3-frontend_new 完全プロジェクトマップ

**最終更新**: 2025-10-21  
**プロジェクト種別**: Next.js 14 (App Router) マルチツール統合開発環境  
**デプロイ予定**: VPS (将来的)  
**データベース**: Supabase (PostgreSQL)

---

## 📐 アーキテクチャ概要

### **技術スタック**
- **フロントエンド**: Next.js 14 (App Router), React 18, TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
- **状態管理**: React Context API (`contexts/`)
- **データベース**: Supabase (PostgreSQL)
- **認証**: カスタム認証システム (`contexts/AuthContext.tsx`)
- **API**: Next.js API Routes (`app/api/`)

### **アプリケーション構造**
cat > /Users/aritahiroaki/n3-frontend_new/PROJECT_MAP.md << 'EOF'
# n3-frontend_new 完全プロジェクトマップ

**最終更新**: 2025-10-21  
**プロジェクト種別**: Next.js 14 (App Router) マルチツール統合開発環境  
**デプロイ予定**: VPS (将来的)  
**データベース**: Supabase (PostgreSQL)

---

## 📐 アーキテクチャ概要

### **技術スタック**
- **フロントエンド**: Next.js 14 (App Router), React 18, TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
- **状態管理**: React Context API (`contexts/`)
- **データベース**: Supabase (PostgreSQL)
- **認証**: カスタム認証システム (`contexts/AuthContext.tsx`)
- **API**: Next.js API Routes (`app/api/`)

### **アプリケーション構造**
```
┌─────────────────────────────────────┐
│        Header (共通ヘッダー)           │ ← ユーザー情報、ログアウト
├──────┬──────────────────────────────┤
│      │                              │
│ Side │                              │
│ bar  │      メインコンテンツ領域       │ ← 各ツール画面
│      │                              │
│ (左) │                              │
├──────┴──────────────────────────────┤
│         Footer (共通フッター)          │
└─────────────────────────────────────┘
```

---

## 🗂️ ディレクトリ構造の詳細分析

### **1. `app/` - Next.js 14 App Router**

#### **認証関連**
```
app/login/
├── page.tsx          # ログイン画面（メール・パスワード入力）
└── layout.tsx        # ログイン専用レイアウト

app/api/auth/
├── login/route.ts    # ログインAPI（未実装 - 要作成）
├── logout/route.ts   # ログアウトAPI
└── me/route.ts       # 現在のユーザー情報取得API
```

**現状の問題点**:
- `app/login/page.tsx` は `alert()` だけで認証処理がない
- APIエンドポイントが未実装
- ユーザー登録画面が存在しない → `app/register/page.tsx` を作成予定

---

#### **管理画面**
```
app/admin/
└── outsourcer-management/
    └── page.tsx      # 外注スタッフのアクセス権限管理画面（未実装）
```

**実装予定機能**:
- 外注スタッフのアカウント作成
- ツールごとのアクセス権限設定（読み取り/編集）
- ログイン履歴の確認

---

#### **ダッシュボード**
```
app/dashboard/
└── page.tsx          # 全ツールの統合ダッシュボード
```

**役割**: 
- 各ツールへのクイックアクセス
- 最近の活動履歴
- 統計情報の表示

---

#### **eBay連携ツール群**
```
app/ebay/
├── page.tsx                      # eBayメイン画面
├── ddp-surcharge-matrix/page.tsx # DDP追加料金マトリクス
├── rate-tables/page.tsx          # 配送料金テーブル
└── rate-tables-detail/page.tsx   # 配送料金詳細

app/ebay-api-test/
└── page.tsx                      # eBay API接続テスト画面

app/api/ebay/
├── create-listing/route.ts       # eBay出品API
├── inventory/route.ts            # 在庫管理API
├── search/route.ts               # 商品検索API
├── check-token/route.ts          # トークン検証API
├── get-token/route.ts            # トークン取得API
└── ... (他多数のAPIエンドポイント)
```

**機能**: 
- eBay APIとの完全連携
- 商品出品・在庫管理
- 配送ポリシーの自動生成
- 料金計算

---

#### **商品編集ツール**
```
app/tools/editing/
├── page.tsx                      # メイン編集画面
├── components/
│   ├── EditingTable.tsx          # 商品一覧テーブル
│   ├── ProductModal.tsx          # 商品詳細モーダル
│   ├── CSVUploadModal.tsx        # CSV一括アップロード
│   ├── HTMLPublishModal.tsx      # HTML公開モーダル
│   ├── MarketplaceSelector.tsx   # マーケットプレイス選択
│   └── ToolPanel.tsx             # ツールパネル
├── hooks/
│   ├── useProductData.ts         # 商品データ管理Hook
│   └── useBatchProcess.ts        # 一括処理Hook
└── types/
    └── product.ts                # 商品型定義
```

**機能**:
- 商品データの一括編集
- CSV入出力
- 商品承認ワークフロー
- 複数マーケットプレイス対応

---

#### **価格計算ツール**
```
app/tools/profit-calculator/
├── page.tsx                      # 利益計算画面
└── layout.tsx                    # 計算ツール専用レイアウト

lib/ebay-pricing/
├── usa-price-calculator.ts       # アメリカ向け価格計算
├── ddp-calculator.ts             # DDP計算
├── shipping-calculator-v2.ts     # 配送料計算v2
├── tariff-calculator.ts          # 関税計算
└── ... (多数の計算エンジン)
```

**機能**:
- 利益率計算
- 送料計算（複数キャリア対応）
- 関税計算（HTS Code対応）
- DDP/DDU計算

---

#### **HTMLエディタ**
```
app/tools/html-editor/
├── page.tsx                      # HTMLエディタメイン画面
├── constants/index.ts            # 定数定義
├── types/index.ts                # 型定義
└── README.md                     # HTMLエディタ仕様書

app/api/html-editor/
├── preview/route.ts              # プレビュー生成API
└── templates/route.ts            # テンプレート管理API

app/api/html-templates/
├── route.ts                      # テンプレート一覧取得
├── [id]/route.ts                 # 個別テンプレート操作
├── get-defaults/route.ts         # デフォルトテンプレート取得
└── set-default/route.ts          # デフォルト設定API
```

**機能**:
- 商品説明HTML自動生成
- テンプレート管理（保存・読込・削除）
- 多言語対応（日本語・英語・韓国語・中国語）
- リアルタイムプレビュー

---

#### **承認システム**
```
app/approval/
└── page.tsx                      # 承認画面

app/tools/approval/
└── page.tsx                      # ツール版承認画面

components/approval/
├── ApprovalActions.tsx           # 承認アクション（承認/却下ボタン）
├── ApprovalFilters.tsx           # フィルタ機能
├── ApprovalStats.tsx             # 統計表示
├── ProductCard.tsx               # 商品カード表示
└── ProductGrid.tsx               # 商品グリッド表示
```

**機能**:
- 商品承認フロー
- 一括承認・却下
- フィルタ機能（ステータス別）
- 承認統計

---

#### **リサーチツール**
```
app/research/
├── ebay-research/
│   ├── page.tsx                  # eBayリサーチメイン画面
│   └── page-simple.tsx           # シンプル版
├── market-research/page.tsx      # 市場調査画面
└── scoring/page.tsx              # スコアリング画面

app/api/research/
└── analyze-lowest-price/route.ts # 最安値分析API

lib/research/
├── ebay-api-client.ts            # eBay API クライアント
├── ebay-search-client.ts         # 検索クライアント
├── profit-analyzer.ts            # 利益分析
├── scoring-engine.ts             # スコアリングエンジン
├── api-call-tracker.ts           # API呼び出し追跡
└── research-db.ts                # リサーチDB操作

components/research/
├── ApiStatusBanner.tsx           # API状態表示バナー
├── ResearchCharts.tsx            # グラフ表示
├── ResearchSummary.tsx           # サマリー表示
├── ResultsFilter.tsx             # 結果フィルタ
└── ScoringWeightAdjuster.tsx     # スコア重み調整
```

**機能**:
- eBay商品リサーチ
- 競合分析
- 利益率スコアリング
- API呼び出し制限管理

---

#### **配送管理**
```
app/shipping-calculator/
├── page.tsx                      # 配送料計算画面
└── layout.tsx                    # 配送計算専用レイアウト

app/shipping-policy-manager/
└── page.tsx                      # 配送ポリシー管理画面

app/api/shipping/
├── calculate/route.ts            # 配送料計算API
├── carriers/route.ts             # 配送業者一覧API
├── countries/route.ts            # 国一覧API
├── generate-policies/route.ts    # ポリシー自動生成API
├── policies/route.ts             # ポリシー管理API
└── ... (多数のAPIエンドポイント)

lib/shipping/
├── ebay-policy-generator.ts      # eBayポリシー生成
├── rate-calculator.ts            # 料金計算
├── zone-api.ts                   # ゾーン管理API
└── ... (多数の配送関連ライブラリ)

components/shipping-policy/
├── EbayPolicyCreatorComplete.tsx # ポリシー作成画面
├── PolicyMatrixViewer.tsx        # マトリクス表示
├── RateTableViewer.tsx           # 料金テーブル表示
├── ShippingPolicyForm.tsx        # ポリシーフォーム
└── ... (多数のコンポーネント)
```

**機能**:
- 配送料自動計算
- 配送ポリシー自動生成
- 複数キャリア対応（FedEx, USPS, DHL等）
- ゾーン別料金管理

---

#### **在庫管理**
```
app/inventory/
└── page.tsx                      # 在庫管理画面

app/inventory-monitoring/
└── page.tsx                      # 在庫監視画面
```

**機能**:
- 在庫追跡
- 在庫アラート
- 在庫レポート

---

#### **出品管理**
```
app/listing-tool/
└── page.tsx                      # 出品ツール

app/bulk-listing/
└── page.tsx                      # 一括出品画面

app/listing-management/
└── page.tsx                      # 出品管理画面

app/api/listing/
├── route.ts                      # 出品API
├── execute/route.ts              # 出品実行API
└── now/route.ts                  # 即時出品API

app/api/listings/
└── generate/route.ts             # 出品データ生成API
```

**機能**:
- 単品出品
- 一括出品
- 出品スケジュール管理
- 出品履歴

---

#### **その他ツール**
```
app/data-collection/
└── page.tsx                      # データ収集画面

app/filter-management/
└── page.tsx                      # フィルタ管理画面

app/tools-hub/
└── page.tsx                      # ツールハブ（ツール一覧）

app/tools/[slug]/
└── page.tsx                      # 動的ツールルーティング

app/tools/scraping/
└── page.tsx                      # スクレイピングツール

app/tools/workflow-engine/
└── page.tsx                      # ワークフローエンジン
```

---

### **2. `components/` - 共通コンポーネント**

#### **レイアウトコンポーネント**
```
components/layout/
├── Header.tsx                    # グローバルヘッダー
├── Sidebar.tsx                   # 左サイドバー
├── Footer.tsx                    # フッター
├── LayoutWrapper.tsx             # レイアウトラッパー
├── RightSidebar.tsx              # 右サイドバー（将来実装予定）
└── MainContent.tsx               # メインコンテンツエリア
```

**Header.tsx の役割**:
- ユーザー情報表示（アイコンクリックでメニュー表示）
- ログアウトボタン
- 通知機能（将来実装予定）

**Sidebar.tsx の役割**:
- ツール一覧ナビゲーション
- 現在のツールをハイライト
- 階層的メニュー構造

---

#### **UIコンポーネント（shadcn/ui）**
```
components/ui/
├── button.tsx                    # ボタン
├── input.tsx                     # 入力フィールド
├── select.tsx                    # セレクトボックス
├── dialog.tsx                    # ダイアログ
├── table.tsx                     # テーブル
├── card.tsx                      # カード
├── tabs.tsx                      # タブ
└── ... (50以上のUIコンポーネント)
```

---

### **3. `contexts/` - 状態管理**
```
contexts/
└── AuthContext.tsx               # 認証状態管理（要作成）
```

**AuthContext.tsx の役割**:
- ログイン状態の管理
- ユーザー情報の保持
- 認証APIとの連携
- ログアウト処理

**実装予定の状態**:
```typescript
{
  user: User | null,              // ユーザー情報
  isAuthenticated: boolean,       // ログイン状態
  isLoading: boolean,             // ロード中フラグ
  login: (email, password) => Promise<void>,
  logout: () => void
}
```

---

### **4. `lib/` - ビジネスロジック**
```
lib/
├── auth/                         # 認証ライブラリ
│   ├── jwt.ts                    # JWT処理
│   ├── permissions.ts            # 権限管理
│   ├── roles.ts                  # ロール定義
│   └── supabase.ts               # Supabase認証
├── ebay/                         # eBay連携
│   ├── oauth.ts                  # OAuth処理
│   ├── token.ts                  # トークン管理
│   └── ...
├── supabase/                     # Supabase操作
│   ├── client.ts                 # クライアント
│   ├── server.ts                 # サーバーサイド
│   └── products.ts               # 商品操作
├── utils/                        # ユーティリティ
│   ├── templates.ts              # テンプレート操作
│   └── vero-checker.ts           # VeROチェック
└── ... (多数のライブラリ)
```

---

### **5. `database/` - データベース設定**
```
database/
├── README.md                     # DB概要
├── QUICK_START.md                # クイックスタート
├── SUPABASE_SETUP_GUIDE.md       # Supabase設定ガイド
└── migrations/                   # マイグレーションファイル
```

**使用データベース**: Supabase (PostgreSQL)

**主要テーブル（予測）**:
- `users` - ユーザー情報
- `products` - 商品データ
- `listings` - 出品データ
- `shipping_policies` - 配送ポリシー
- `html_templates` - HTMLテンプレート
- `approval_queue` - 承認キュー
- `research_results` - リサーチ結果
- `vero_filters` - VeROフィルタ

---

### **6. `types/` - TypeScript型定義**
```
types/
├── product.ts                    # 商品型
├── marketplace.ts                # マーケットプレイス型
├── approval.ts                   # 承認型
├── fullModal.ts                  # モーダル型
└── shipping/
    └── index.ts                  # 配送型
```

---

### **7. `scripts/` - ユーティリティスクリプト**
```
scripts/
├── check-env.ts                  # 環境変数チェック
├── ebay-oauth-setup.ts           # eBay OAuth設定
├── test-ebay-api.ts              # eBay APIテスト
├── sync-ebay-policies-from-api.ts # ポリシー同期
└── ... (30以上のスクリプト)
```

---

### **8. `original-php/` - 旧PHPシステム**
```
original-php/
├── common/                       # 共通ファイル
├── yahoo_auction_complete/       # Yahoo!オークションシステム（旧）
└── ...
```

**役割**: 
- 旧システムの参考資料
- 移行対象のコード
- **開発には直接使用しない**

---

## 🔐 認証システムの詳細設計

### **現在のログインフロー（未完成）**
```
1. ユーザーがapp/login/page.tsxにアクセス
2. メール・パスワード入力
3. alert()で表示するだけ ← ここが問題
```

### **実装予定の完全なログインフロー**
```
1. ユーザーがapp/login/page.tsxにアクセス
2. メール・パスワード入力
3. フロントエンド: AuthContext.login()を呼び出し
4. API: POST /api/auth/login でバックエンド認証
5. DB: Supabaseでユーザー照合
6. 成功時:
   - JWTトークン発行
   - localStorageにユーザー情報保存
   - AuthContext.userを更新
   - ダッシュボードにリダイレクト
7. 失敗時:
   - エラーメッセージ表示
```

### **実装予定のログアウトフロー**
```
1. Header.tsxのアイコンクリック
2. ドロップダウンメニュー表示
3. 「ログアウト」ボタンクリック
4. AuthContext.logout()を呼び出し
5. localStorageをクリア
6. AuthContext.userをnullに設定
7. ログイン画面にリダイレクト
```

---

## 🎯 優先実装タスク

### **Phase 1: 認証システム完成（最優先）**
- [ ] `contexts/AuthContext.tsx` 作成
- [ ] `app/api/auth/login/route.ts` 実装
- [ ] `components/layout/Header.tsx` ユーザーメニュー実装
- [ ] `app/register/page.tsx` 作成（ユーザー登録画面）
- [ ] Supabase `users` テーブル作成

### **Phase 2: 外注管理機能**
- [ ] `app/admin/outsourcer-management/page.tsx` 実装
- [ ] 権限管理システム構築
- [ ] アクセス制御実装

### **Phase 3: VPSデプロイ準備**
- [ ] 環境変数設定
- [ ] Docker設定
- [ ] CI/CDパイプライン構築

---

## 🖥️ VPSデプロイ計画

### **デプロイ構成（予定）**
```
VPS (Ubuntu 22.04)
├── Nginx (リバースプロキシ)
├── Node.js 18+
├── Next.js アプリケーション (PM2で管理)
└── SSL証明書 (Let's Encrypt)

外部サービス:
└── Supabase (PostgreSQL) - クラウドホスティング
```

### **必要な環境変数**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# eBay API
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_DEV_ID=
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=

# 認証
JWT_SECRET=
NEXT_PUBLIC_APP_URL=
```

---

## 📚 重要ドキュメント

| ファイル | 説明 |
|---------|------|
| `PROJECT_MAP.md` | このファイル（完全プロジェクトマップ） |
| `docs/PROJECT_OVERVIEW.md` | プロジェクト概要 |
| `README.md` | プロジェクトREADME |
| `database/SUPABASE_SETUP_GUIDE.md` | DB設定ガイド |
| `IMPORTANT_NOTES.md` | 重要な注意事項 |

---

## 🔄 このドキュメントの更新ルール

1. **新しいツールを追加したとき**: 該当セクションに追記
2. **API エンドポイントを追加したとき**: APIセクションに追記
3. **主要な機能を実装したとき**: チェックボックスを更新
4. **アーキテクチャを変更したとき**: 該当箇所を更新

**このドキュメントは開発の設計図です。常に最新状態を保ってください。**

---

**作成者**: Claude + Arita  
**最終更新日**: 2025-10-21
