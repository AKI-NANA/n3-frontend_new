// /lib/doc-processor.ts

import { CodeMapEntry } from '@/types/doc-management';

// 💡 実行環境に依存するファイルシステム操作は、ここでは仮の関数として定義します。
// 実際には、fsモジュールや外部ストレージ連携を実装する必要があります。
function getCodeMapJson(): CodeMapEntry[] {
    // 実際には /project-root/code_map.json を読み込むロジック
    console.log("Reading current code_map.json...");
    return [
        // 初期状態のモックデータ（LLMに渡す現在の説明データ）
        {
            "path": "/src/components/ProductModal/components/Tabs/TabMirror.tsx",
            "title": "類似商品レコメンド画面",
            "description_level_h": "商品詳細画面で、似ている商品を見つけるための画面です。",
            "last_updated": "2025-11-01"
        }
    ];
}

const SYSTEM_INSTRUCTION = `あなたはコードベースのドキュメント作成者です。依頼内容に基づき、コードの説明を高校生でも理解できる具体的かつ平易な言葉で更新・追加してください。必ずJSON形式で応答してください。応答はJSON配列のみとし、コメントや追加の説明文は含めないでください。`;

/**
 * LLMに渡すプロンプトを生成する
 * @param codeChanges 新規追加または変更されたコードの差分/内容 (文字列)
 * @returns LLM実行用の完全なプロンプト文字列
 */
export function generateUpdatePrompt(codeChanges: string): string {
    const currentMap = getCodeMapJson();
    const currentMapJson = JSON.stringify(currentMap, null, 2);

    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // トークン効率化プロンプト（更新用）
    const prompt = `
**[依頼内容]**
以下の「現在の説明データ」をレビューし、「新規/変更されたコード」の内容に基づいて更新・追加してください。

- **'description_level_h'** フィールドは、**高校生でも理解できる、具体的かつ平易な言葉**で、そのファイルの機能（役割）を説明してください。
- ファイルが新規の場合は、新しいオブジェクトを追加してください。
- ファイルが変更された場合は、既存のオブジェクトの 'description_level_h' を更新し、'last_updated' を今日の日付（${todayDate}）に更新してください。
- 応答は修正・追加後の完全なJSON配列のみを返却してください。

---
**【現在の説明データ (code_map.json)】**
\`\`\`json
${currentMapJson}
\`\`\`

---
**【新規/変更されたコード】**
\`\`\`
${codeChanges}
\`\`\`
`;
    return prompt;
}

// 💡 実際には、LLM APIを呼び出す関数（callLLMForDocUpdate）もここに実装されます。
// function callLLMForDocUpdate(prompt: string): Promise<string> { ... }