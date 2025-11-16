// scripts/generateKeywords.ts

import { GoogleGenAI, Type } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';

// --- 設定 ---
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const MAX_CONCURRENT_REQUESTS = 5; // 同時リクエスト数の上限
const RATE_LIMIT_DELAY_MS = 2000; // API制限時の待機時間 (2秒)
const MAX_RETRIES = 3; // 最大リトライ回数

// 💡 実際にはDBから取得するか、CSVリーダーを使用
interface HsInput {
    hs_code: string;
    description_ja: string;
    description_en: string;
}

interface KeywordOutput {
    hs_code: string;
    keywords_ja: string[];
    keywords_en: string[];
}

// 構造化出力スキーマ (JSON)
const outputSchema = {
    type: Type.OBJECT,
    properties: {
        hs_code: {
            type: Type.STRING,
            description: "The 6-digit HS code provided in the input."
        },
        keywords_ja: {
            type: Type.ARRAY,
            description: "10 to 20 relevant keywords in Japanese.",
            items: { type: Type.STRING }
        },
        keywords_en: {
            type: Type.ARRAY,
            description: "10 to 20 relevant keywords in English.",
            items: { type: Type.STRING }
        }
    },
    required: ["hs_code", "keywords_ja", "keywords_en"]
};

// システム命令 (System Instruction)
const SYSTEM_INSTRUCTION = `You are an expert international trade and customs classification specialist. Your task is to generate a comprehensive list of search keywords for a given 6-digit Harmonized System (HS) code description. These keywords must be highly relevant for identifying goods in real-world shipping documents and commercial invoices.

Generate 10 to 20 keywords in Japanese.

Generate 10 to 20 keywords in English.

Keywords must include common synonyms, specific product types, components, and typical industry jargon related to the classification.

The output must be a single JSON object conforming to the provided schema.`;

// --- LLM API クライアント初期化 ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


/**
 * 4. LLM API呼び出し要件 に基づくキーワード生成関数
 * @param input HSコードと説明文
 * @param retryCount 現在のリトライ回数
 */
async function generateKeywordsForHs(input: HsInput, retryCount: number = 0): Promise<KeywordOutput | null> {
    const userPrompt = `Generate keywords for the following HS code:
HS Code: ${input.hs_code}
Japanese Description: ${input.description_ja}
English Description: ${input.description_en}`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: userPrompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: outputSchema,
            },
        });

        // 構造化出力の解析
        const jsonText = response.text.trim();
        const output: KeywordOutput = JSON.parse(jsonText);
        
        // 生成されたキーワードを小文字に統一し、不要な空白を削除
        output.keywords_en = output.keywords_en.map(k => k.toLowerCase().trim());
        output.keywords_ja = output.keywords_ja.map(k => k.trim());

        console.log(`✅ Success: HS ${input.hs_code}. Keywords generated.`);
        return output;

    } catch (error: any) {
        console.error(`❌ Error on HS ${input.hs_code}:`, error.message);

        // 5. 実装要件: レート制限/エラーハンドリング
        if (retryCount < MAX_RETRIES && (error.message.includes('429') || error.message.includes('rate limit'))) {
            const delay = RATE_LIMIT_DELAY_MS * Math.pow(2, retryCount); // 指数バックオフ
            console.log(`⚠️ Rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateKeywordsForHs(input, retryCount + 1);
        }

        return null; // 最大リトライ回数を超えた場合は失敗として終了
    }
}

/**
 * メイン処理：インプットデータを処理し、非同期でキーワード生成を実行する
 */
async function processAllHsCodes(inputData: HsInput[]) {
    const outputSql: string[] = [];
    const outputCsv: string[] = ['hs_code,language,keyword\n'];

    const total = inputData.length;
    let completed = 0;

    // 5. 実装要件: 非同期処理の実装 (Promiseによる並列処理制御)
    const queue: Promise<void>[] = [];

    for (const input of inputData) {
        const task = async () => {
            const result = await generateKeywordsForHs(input);
            completed++;
            console.log(`[Progress] ${completed}/${total} completed.`);
            
            if (result) {
                // SQL INSERT文とCSV行の生成
                
                // 英語キーワード
                for (const keyword of result.keywords_en) {
                    // SQL形式
                    outputSql.push(`INSERT INTO keyword_to_hs_code (hs_code, keyword, language) VALUES ('${result.hs_code}', '${keyword.replace(/'/g, "''")}', 'en');`);
                    // CSV形式
                    outputCsv.push(`"${result.hs_code}","en","${keyword.replace(/"/g, '""')}"\n`);
                }

                // 日本語キーワード
                for (const keyword of result.keywords_ja) {
                    // SQL形式
                    outputSql.push(`INSERT INTO keyword_to_hs_code (hs_code, keyword, language) VALUES ('${result.hs_code}', '${keyword.replace(/'/g, "''")}', 'ja');`);
                    // CSV形式
                    outputCsv.push(`"${result.hs_code}","ja","${keyword.replace(/"/g, '""')}"\n`);
                }
            }
        };

        // キューにタスクを追加し、同時実行数を制御
        const p = task().then(() => {
            // タスク完了後、キューから削除
            queue.splice(queue.indexOf(p), 1);
        });
        queue.push(p);

        // 同時実行数が上限に達したら、いずれかのタスクが完了するのを待つ
        if (queue.length >= MAX_CONCURRENT_REQUESTS) {
            await Promise.race(queue);
        }
    }

    // 残っているすべてのタスクが完了するのを待つ
    await Promise.all(queue);

    // 最終出力
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(__dirname, `output/keywords_insert_${timestamp}.sql`), outputSql.join('\n'));
    fs.writeFileSync(path.join(__dirname, `output/keywords_export_${timestamp}.csv`), outputCsv.join(''));
    
    console.log(`\n🎉 All processing complete! Total keywords generated: ${outputSql.length} records.`);
}

// ----------------------------------------------------
// --- 実行部 (ダミーデータ) ---
// ----------------------------------------------------

// 💡 実際には4000件以上のHSコードと説明文をDBから取得する
const dummyHsData: HsInput[] = [
    { hs_code: '854160', description_ja: '集積回路', description_en: 'Electronic integrated circuits' },
    { hs_code: '950300', description_ja: 'その他のおもちゃ', description_en: 'Other toys' },
    { hs_code: '010121', description_ja: '生きている馬、純粋種', description_en: 'Live horses, pure-bred' },
];

if (process.env.NODE_ENV !== 'production') {
    // 開発/テスト時は同時実行数を減らす
    // processAllHsCodes(dummyHsData); 
}

// export { processAllHsCodes };