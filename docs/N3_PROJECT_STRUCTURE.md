# N3 プロジェクト構造マップ

## ディレクトリ構造

```
n3-frontend_new/
├── app/
│   ├── api/                    # APIルート
│   │   ├── products/           # 商品関連API
│   │   ├── scraping/           # スクレイピングAPI
│   │   └── tools/              # ツールAPI
│   └── tools/                  # ツールページ
│       └── editing/            # 編集ツール
├── components/
│   ├── ProductModal/           # 商品モーダル
│   │   └── components/Tabs/   # タブコンポーネント
│   │       └── TabData.tsx    # データ確認タブ
│   └── ui/                     # shadcn/ui
├── lib/                        # ユーティリティ
└── types/                      # TypeScript型定義
    └── product.ts
```

## 主要ファイルパス一覧

- 編集ツール: `/app/tools/editing/page.tsx`
- 商品モーダル: `/components/ProductModal/FullFeaturedModal.tsx`
- データタブ: `/components/ProductModal/components/Tabs/TabData.tsx`
- CSS Modules: `/components/ProductModal/FullFeaturedModal.module.css`
- 商品型定義: `/types/product.ts`
