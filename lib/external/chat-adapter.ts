// /lib/external/chat-adapter.ts
// 問い合わせツール連携アダプター

/**
 * 問い合わせツールから未処理の新規チャットを取得する
 * @returns 新規メッセージのリスト
 *
 * TODO: 以下の外部システムとの連携を実装する必要があります：
 * - Zendesk API
 * - Freshdesk API
 * - LINE Messaging API
 * - カスタムチャットシステム
 */
export async function fetchNewChatInquiries(): Promise<Array<{
    conversation_id: string;
    message: string;
    platform: 'chat_tool';
}>> {
    console.log("Fetching new chat inquiries from external adapter...");

    // TODO: 外部APIをコールするロジック
    // 例: Zendesk
    // const response = await fetch('https://your-domain.zendesk.com/api/v2/tickets.json', {
    //     headers: {
    //         'Authorization': `Bearer ${process.env.ZENDESK_API_TOKEN}`,
    //     },
    // });
    // const data = await response.json();
    // return data.tickets.map((ticket: any) => ({
    //     conversation_id: ticket.id.toString(),
    //     message: ticket.description,
    //     platform: 'chat_tool' as const,
    // }));

    // 現在はモックデータを返す
    return [
        {
            conversation_id: "CID-45678",
            message: "この前買った商品が壊れていたんだけど、どうしたらいい？写真もあるよ。",
            platform: 'chat_tool'
        },
        {
            conversation_id: "CID-45679",
            message: "SKU: P-901の在庫はいつ入りますか？200個仕入れたいです。",
            platform: 'chat_tool'
        }
    ];
}

/**
 * 最終返信を外部問い合わせツールに送信する
 * @param conversation_id 会話ID
 * @param response_body 返信本文
 * @returns 送信成功の可否
 *
 * TODO: 実際の外部APIへの送信ロジックを実装する必要があります
 */
export async function sendFinalResponse(
    conversation_id: string,
    response_body: string
): Promise<boolean> {
    console.log(`[CHAT ADAPTER] Sending response to conversation ${conversation_id}`);
    console.log(`[RESPONSE BODY] ${response_body.substring(0, 100)}...`);

    // TODO: 外部APIを通じてチャットツールへ返信メッセージをPOST
    // 例: Zendesk
    // const response = await fetch(`https://your-domain.zendesk.com/api/v2/tickets/${conversation_id}.json`, {
    //     method: 'PUT',
    //     headers: {
    //         'Authorization': `Bearer ${process.env.ZENDESK_API_TOKEN}`,
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //         ticket: {
    //             comment: {
    //                 body: response_body,
    //                 public: true,
    //             },
    //             status: 'solved',
    //         },
    //     }),
    // });
    //
    // if (!response.ok) {
    //     console.error(`Failed to send response: ${response.statusText}`);
    //     return false;
    // }

    console.log(`[CHAT SENT] Conversation ${conversation_id}: Response sent successfully.`);
    return true;
}

/**
 * TODO: 追加の連携機能
 * - 会話履歴の取得
 * - 顧客情報の取得
 * - 添付ファイルの処理
 * - ステータス更新
 */
