// /types/doc-management.ts

/**
 * プロジェクトのコードマップ（ドキュメント）の一要素
 */
export interface CodeMapEntry {
    path: string; // ファイルパス (例: /src/components/ProductModal/FullFeaturedModal.tsx)
    title: string; // ファイルの簡潔な名称
    description_level_h: string; // 高校生レベルで理解できる機能説明
    last_updated: string; // 最終更新日 (YYYY-MM-DD形式)
}