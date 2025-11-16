// scripts/hts/translateDescriptions.ts
import { createClient } from '@supabase/supabase-js';
// 💡 ClaudeまたはGemini APIクライアントのインポートを想定
// import { callTranslationAPI } from '@/services/llmTranslationService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 挿入/更新にはサービスロールキーが必要
);

// HTSの4つの階層テーブル
const HTS_TABLES = [
    'hts_chapters',
    'hts_codes_headings',
    'hts_codes_subheadings',
    'hts_codes_details',
];

/**
 * データベースからHTSの説明文を抽出し、CSV形式で出力する (手動翻訳用)
 * @param tableName 抽出対象のテーブル名
 */
async function exportForTranslation(tableName: string) {
    console.log(`\n--- Exporting data from ${tableName} for translation...`);

    const selectFields = (tableName === 'hts_chapters') ? 
        'id, chapter_code, chapter_description' : 
        'id, description';
    
    // 💡 既存データの健全性が不明なため、全件取得を試みる
    const { data, error } = await supabase
        .from(tableName)
        .select(selectFields);

    if (error) {
        console.error('Export Error:', error.message);
        return;
    }

    let csvOutput = 'id,code,description_en\n';

    data.forEach(row => {
        const id = row.id;
        // コードフィールドはテーブルによって異なる (chapter_code, heading_codeなど)
        const code = row.chapter_code || row.heading_code || ''; 
        const description_en = row.chapter_description || row.description;
        
        // CSV形式で出力 (コードは参考情報)
        csvOutput += `${id},${code},"${description_en.replace(/"/g, '""')}"\n`;
    });

    console.log(`Exported ${data.length} rows. Please copy and paste the following content to Claude Desktop for translation:`);
    console.log('--------------------------------------------------');
    console.log(csvOutput.substring(0, 1000) + '...'); // 先頭1000文字のみ表示
    console.log('--------------------------------------------------');
}

/**
 * Claude/Geminiで翻訳されたCSV結果を読み込み、DBに反映する
 * @param tableName 更新対象のテーブル名
 * @param csvData 翻訳済みのCSVデータ文字列 (id,code,description_en,description_ja 形式を想定)
 */
async function importTranslations(tableName: string, csvData: string) {
    console.log(`\n--- Importing translations to ${tableName}...`);
    const rows = csvData.trim().split('\n').slice(1); // ヘッダー行をスキップ

    const updates = rows.map(row => {
        // CSVパース（簡易）
        const [id, code, description_en, description_ja] = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        // 日本語カラム名はテーブルによって異なる
        const jaColumn = (tableName === 'hts_chapters') ? 'chapter_description_ja' : 'description_ja';

        return {
            id: parseInt(id.trim()),
            [jaColumn]: description_ja ? description_ja.replace(/"/g, '').trim() : null // クリーンアップ
        };
    }).filter(update => update.id && update[jaColumn]);

    console.log(`Prepared ${updates.length} updates.`);
    
    // 💡 Supabaseへのバッチ更新 (1000件ずつ推奨)
    for (let i = 0; i < updates.length; i += 1000) {
        const batch = updates.slice(i, i + 1000);
        const { error } = await supabase
            .from(tableName)
            .upsert(batch, { onConflict: 'id' }); // idに基づいて更新
        
        if (error) {
            console.error(`Batch ${i/1000 + 1} Error:`, error.message);
            throw error;
        }
        console.log(`Successfully updated ${batch.length} rows.`);
    }

    console.log('Translation import completed successfully!');
}

// 例: exportForTranslation('hts_chapters');
// 例: importTranslations('hts_chapters', 'id,code,description_en,description_ja\n1,01,"Live animals","生きた動物"');