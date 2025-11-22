// ファイル: /lib/note-client.ts

import { NotePostData } from '@/types/ai';

/**
 * Note APIを通じて記事を自動投稿する
 * @param postData 投稿データ
 * @param token Note APIトークン
 * @returns 投稿された記事のURL
 */
export async function postToNote(postData: NotePostData, token: string): Promise<string> {
    // TODO: Note Developer APIを使用して記事をPOSTするロジックを実装

    // 認証ヘッダーの準備
    // const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // APIエンドポイント
    // const response = await fetch('https://note.com/api/v2/creators/me/posts', { ... });

    if (!token) {
        console.warn('Note API token is missing. Skipping actual Note post.');
        return 'https://note.com/mock_post/draft';
    }

    console.log(`[Note] Posting: ${postData.title}`);
    return `https://note.com/autopilot/${Date.now()}`;
}
