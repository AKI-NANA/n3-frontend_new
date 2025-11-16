// /lib/tariffService.ts

import { createClient } from '@/utils/supabase/server'; // サーバーサイドクライアントのインポート（パスはプロジェクトに合わせて調整）
import { GoogleGenAI } from '@google/genai';

// ----------------------------------------------------
// HTS 候補の型定義
// ----------------------------------------------------
export interface HtsCandidate {
  hts_number: string;
  detail_description: string;
  heading_description: string;
  subheading_description: string;
}

// 環境変数 GEMINI_API_KEY が設定されていることを前提とします
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(); // サーバーサイドSupabaseクライアントの初期化

/**
 * 外部LLM（Gemini API）を使用して、商品タイトルからHTS検索に最適なキーワードを生成する。
 */
export async function generateHtsKeywords(
  productTitle: string,
  material: string,
): Promise<string> {
  const prompt = `
    以下の商品のタイトルと素材を分析し、HSコード分類に特化した最適な検索キーワードを日本語で3〜5つ生成してください。
    回答は、他の説明を一切含めず、カンマ区切りの文字列のみにしてください。
    例: "デジタルカメラ, 光学レンズ, 電子部品, ソニー"
    
    タイトル: ${productTitle}
    素材: ${material || '不明'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // 高速なモデルを選択
      contents: prompt,
    });
    
    // 生成されたテキストから、余分なスペースや引用符を取り除く
    const keywords = response.text.trim().replace(/^['"]|['"]$/g, '');
    return keywords;
  } catch (error) {
    console.error('Gemini API Error during keyword generation:', error);
    // エラー時は、元のタイトルと素材をフォールバックとして使用
    return `${productTitle}, ${material}`;
  }
}

/**
 * 生成されたキーワードを使用して、Supabaseのv_hts_master_dataビューからHTS候補を検索する。
 * PostgreSQLの ilike 検索を使い、関連性の高そうな候補を絞り込む。
 */
export async function lookupHtsCandidates(
  keywords: string,
): Promise<HtsCandidate[]> {
  // キーワードをスペース区切りで扱い、ilike 検索を実行するクエリを構築
  const keywordList = keywords.split(/,\s*|\s+/).filter(k => k.length > 0);
  
  if (keywordList.length === 0) return [];

  const ilikeConditions = keywordList.map(k => `or(detail_description.ilike.%${k}%, heading_description.ilike.%${k}%, subheading_description.ilike.%${k}%, description_ja.ilike.%${k}%)`).join(',');

  try {
    const { data: candidates, error } = await supabase
        .from('v_hts_master_data')
        .select('hts_number, detail_description, heading_description, subheading_description')
        // 構築した OR 検索条件を適用
        .or(ilikeConditions)
        .limit(10);
    
    if (error) {
      console.error('Supabase HTS search error:', error);
      return [];
    }
    
    // ilike 検索ではスコア計算ができないため、単純に取得順で返却
    return (candidates as HtsCandidate[]) || [];

  } catch (error) {
    console.error('Database query exception:', error);
    return [];
  }
}