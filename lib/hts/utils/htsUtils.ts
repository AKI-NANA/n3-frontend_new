// lib/hts/htsUtils.ts

/**
 * HTSコード文字列 (例: "9503.00.00.11") を階層構造にパースする
 * @param htsNumber ドット区切りのHTSコード
 * @returns 階層データオブジェクト
 */
export function parseHTSCode(htsNumber: string): {
    chapter: string;
    heading: string;
    subheading: string;
    full: string;
    display: string;
} {
    if (!htsNumber) {
        return { chapter: '', heading: '', subheading: '', full: '', display: '' };
    }

    // ドットを削除してクリーンな文字列を作成
    const cleaned = htsNumber.replace(/\./g, '');

    // 桁数チェックと抽出
    const chapter = cleaned.substring(0, 2); // 2桁
    const heading = cleaned.substring(0, 4); // 4桁
    const subheading = cleaned.substring(0, 6); // 6桁

    return {
        chapter: chapter,
        heading: heading,
        subheading: subheading,
        full: cleaned, // 10桁 (例: "9503000011")
        display: htsNumber // 元の表示形式 (例: "9503.00.00.11")
    };
}

/**
 * HTS階層を遡って日本語の説明を取得するヘルパー関数
 * UI表示ロジックの改善に使用
 */
export function getDescription(item: any, lang: 'en' | 'ja' = 'ja'): string {
    const jaDesc = item.description_ja || item.chapter_description_ja;
    const enDesc = item.description || item.chapter_description;

    if (lang === 'ja' && jaDesc) {
        return jaDesc;
    }
    // 日本語がない場合は英語を返す
    return enDesc || 'No description available';
}