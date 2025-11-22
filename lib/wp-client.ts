// ファイル: /lib/wp-client.ts
// WordPress REST APIを通じて記事を自動投稿するクライアント

import { ContentQueue, SiteConfig } from '@/types/ai';

/**
 * Markdown記事をHTMLに変換（簡易版）
 * 実際は marked.js などのライブラリを使用
 */
const markdownToHtml = (markdown: string): string => {
    // 簡易的なMarkdown to HTML変換ロジック。本番ではセキュリティと互換性の高いライブラリを使う
    return markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\n/gim, '<br>');
};

/**
 * WordPressに記事を自動投稿する
 * @param queueItem 投稿キューアイテム
 * @param siteConfig サイト設定（認証情報を含む）
 * @returns 投稿された記事のURL
 */
export async function postToWordPress(
    queueItem: ContentQueue,
    siteConfig: SiteConfig
): Promise<string> {
    const wordpressDomain = siteConfig.domain;
    const { article_markdown, content_title } = queueItem;

    const postData = {
        title: content_title,
        content: markdownToHtml(article_markdown),
        status: 'publish',
        // カテゴリ、タグ、カスタムフィールドの挿入ロジックはカスタムプラグイン経由で実現
    };

    // 認証情報（通常はアプリパスワードを使用）
    const token = Buffer.from(`admin:${siteConfig.api_key_encrypted}`).toString('base64');

    const response = await fetch(`https://${wordpressDomain}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${token}`,
        },
        body: JSON.stringify(postData),
    });

    if (!response.ok) {
        throw new Error(`WordPress投稿失敗: ${response.statusText}`);
    }

    const json = await response.json();
    return json.link; // 投稿された記事のURL
}
