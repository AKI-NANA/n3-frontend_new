# n3-frontend_new プロジェクト概要

## 📋 プロジェクト情報

**プロジェクト名**: n3-frontend_new  
**目的**: マルチツール統合開発環境（eBay出品自動化システム）  
**開始日**: 2024年  
**技術スタック**: Next.js 14, TypeScript, Supabase, Tailwind CSS

---

## 🎯 プロジェクトの目的

このプロジェクトは、**eBayを中心とした越境EC事業**を効率化するための統合ツール群です。

### **主な機能**
1. 商品データ管理・編集
2. 価格・利益計算（送料・関税込み）
3. 商品リサーチ・市場分析
4. 自動HTML生成
5. 配送ポリシー自動作成
6. eBay出品自動化
7. 在庫管理
8. 承認ワークフロー
9. VeROフィルタ管理
10. 外注スタッフ管理

---

## 👥 想定ユーザー

### **管理者（オーナー）**
- 全ツールへのフルアクセス
- 外注スタッフの管理
- システム設定の変更

### **外注スタッフ**
- 制限されたツールへのアクセス
- データ編集・承認作業
- レポート閲覧

---

## 🔧 システム構成

### **フロントエンド**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui

### **バックエンド**
- Next.js API Routes
- Supabase (PostgreSQL)

### **外部API連携**
- eBay API (出品・在庫管理)
- SellerMirror API (市場調査)

---

## 📦 データフロー
```
ユーザー操作
    ↓
Next.js フロントエンド
    ↓
API Routes (/app/api/)
    ↓
ビジネスロジック (/lib/)
    ↓
Supabase (データベース)
    ↓
外部API (eBay, SellerMirror等)
```

---

## 🚀 開発ロードマップ

### **Phase 1: 認証システム（現在）**
- [x] ログイン画面UI
- [ ] 認証API実装
- [ ] ユーザー登録機能
- [ ] パスワードリセット

### **Phase 2: 外注管理**
- [ ] 外注スタッフアカウント作成
- [ ] 権限管理システム
- [ ] アクセス制御

### **Phase 3: ツール統合**
- [ ] 各ツール間のデータ連携
- [ ] 統合ダッシュボード
- [ ] レポート機能

### **Phase 4: VPSデプロイ**
- [ ] Docker化
- [ ] CI/CDパイプライン
- [ ] 本番環境構築

---

## 📂 関連ドキュメント

- [PROJECT_MAP.md](../PROJECT_MAP.md) - 完全プロジェクトマップ
- [SUPABASE_SETUP_GUIDE.md](../database/SUPABASE_SETUP_GUIDE.md) - DB設定
- [IMPORTANT_NOTES.md](../IMPORTANT_NOTES.md) - 重要な注意事項

---

**最終更新**: 2025-10-21
