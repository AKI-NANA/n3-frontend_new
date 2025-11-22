// ファイル: /lib/ai/gemini-client.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LPProposalJson, CrowdfundingProject, N3InternalData } from '@/types/ai';

// Gemini AIインスタンスを初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * クラウドファンディングプロジェクトの機会を分析し、LP構成案を生成する
 * @param project CFプロジェクトデータ
 * @param internalData N3の既存の高利益商品データ
 * @returns LP構成案と評価の詳細 (LPProposalJson)
 */
export async function analyzeCrowdfundingOpportunity(
  project: CrowdfundingProject,
  internalData: N3InternalData
): Promise<LPProposalJson> {

  const prompt = `
    あなたは、日本の輸入販売事業「N3」のチーフアナリストです。
    提供された【クラウドファンディングプロジェクトデータ】と【N3の内部データ】に基づき、このプロジェクトに輸入代理権を取得する価値があるか、厳密に評価し、成功のためのランディングページ（LP）構成案をJSON形式で出力してください。

    ---
    【プロジェクトデータ】:
    - タイトル: ${project.project_title}
    - 達成額: ${project.funding_amount_actual} 円
    - 支援者数: ${project.backers_count} 人
    - 概要: ${project.description_snippet}

    【N3の内部データ (既存の高利益商品事例)】:
    ${JSON.stringify(internalData)}

    ---
    【評価のルール】
    1. 総合スコア (overall_score) は、市場規模、競合の少なさ、N3の既存顧客との親和性から算出すること。
    2. LP構成案は、日本のECサイトで最もコンバージョン率が高いとされる「共感→問題提起→解決策提示→権威性証明→限定性」のフローで設計すること。
    3. JSONスキーマに厳密に従うこと。

    【出力形式】
    以下のJSON形式で出力してください:
    {
      "overall_score": <0.00-10.00の数値>,
      "market_insight": "<なぜこの商品がCFで成功したか、市場の深層的な洞察>",
      "n3_advantage": "<N3が輸入代理権を取得し、EC販売した場合の独自の優位性>",
      "lp_structure": [
        {
          "section_title": "<セクションタイトル>",
          "content_focus": "<そのセクションで伝えるべき主要なメッセージ>",
          "image_prompt": "<Midjourney/DALL-E向けのキービジュアル生成プロンプト>"
        }
      ]
    }
    ---
  `;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3, // 堅実な評価のため、低めに設定
        responseMimeType: 'application/json',
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim();

    return JSON.parse(jsonText) as LPProposalJson;

  } catch (error) {
    console.error('Gemini API Error (CF Analysis):', error);
    throw new Error('Failed to analyze CF opportunity from AI.');
  }
}
