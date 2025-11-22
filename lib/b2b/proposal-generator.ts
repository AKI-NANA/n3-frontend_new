/**
 * NAGANO-3 B2B Partnership - 提案書自動生成
 *
 * 目的: Gemini Proを使用して企業案件の提案書を自動生成
 */

import type {
  CompanyResearchData,
  PartnershipProposal,
  PersonaMaster,
  SiteConfigMaster,
  InfluenceProof,
  ProposalType,
  PlatformPlans,
} from '@/types/b2b-partnership';

/**
 * 提案書生成用のプロンプトテンプレート
 */
const PROPOSAL_PROMPT_TEMPLATES = {
  /**
   * フル提案書生成（企業情報、ペルソナ情報、影響力証明を元に包括的な提案を生成）
   */
  FULL_PROPOSAL: (
    company: CompanyResearchData,
    persona: PersonaMaster,
    influenceProof: InfluenceProof,
    targetProduct?: string
  ) => `
あなたは経験豊富なB2Bマーケティングの専門家です。以下の情報を基に、企業タイアップの提案書を作成してください。

# 企業情報
- 企業名: ${company.company_name}
- 業種: ${company.industry}
- 企業規模: ${company.size}
- 事業内容: ${company.description}
${company.recent_campaigns ? `- 最近のキャンペーン:\n${company.recent_campaigns.map((c) => `  - ${c}`).join('\n')}` : ''}

# ペルソナ情報
- ペルソナ名: ${persona.persona_name}
- 専門分野: ${persona.expertise_areas?.join(', ') || 'N/A'}
- 強み: ${persona.unique_selling_points?.join(', ') || 'N/A'}
- 自己紹介: ${persona.bio || 'N/A'}

# 影響力証明
- 総フォロワー数: ${influenceProof.total_followers?.toLocaleString() || 'N/A'} 人
- 月間リーチ: ${influenceProof.monthly_reach?.toLocaleString() || 'N/A'} 人
- 平均エンゲージメント率: ${influenceProof.avg_engagement_rate?.toFixed(1) || 'N/A'}%
- プラットフォーム: ${influenceProof.platforms?.join(', ') || 'N/A'}

${targetProduct ? `# ターゲット商品\n${targetProduct}\n` : ''}

# タスク
以下のJSON形式で、タイアップ提案書を生成してください：

\`\`\`json
{
  "title": "提案のタイトル（魅力的で具体的に）",
  "proposal_summary": "提案の概要（2-3文で）",
  "proposal_type": "sponsored_content | affiliate | product_review | brand_ambassador",
  "platform_plans": {
    "tiktok": {
      "video_count": 5,
      "estimated_reach": 50000,
      "format": "具体的な動画形式",
      "description": "企画の詳細説明"
    },
    "youtube": {
      "video_count": 1,
      "estimated_reach": 10000,
      "format": "具体的な動画形式",
      "description": "企画の詳細説明"
    },
    "blog": {
      "article_count": 2,
      "estimated_pageviews": 8000,
      "format": "具体的な記事形式",
      "description": "企画の詳細説明"
    }
  },
  "estimated_reach": 68000,
  "estimated_engagement": 3400,
  "estimated_conversions": 170,
  "proposed_price_jpy": 500000,
  "key_benefits": [
    "企業にとってのメリット1",
    "企業にとってのメリット2",
    "企業にとってのメリット3"
  ],
  "deliverables": [
    "成果物1",
    "成果物2",
    "成果物3"
  ],
  "timeline": "提案するスケジュール（例：1ヶ月、2ヶ月等）"
}
\`\`\`

# 重要なポイント
1. **企業の最近のキャンペーンと親和性の高い提案**にすること
2. **ペルソナの専門分野と強み**を最大限活かした企画にすること
3. **プラットフォームごとに具体的な企画内容**を提示すること
4. **推定リーチ、エンゲージメント、コンバージョン**は影響力証明データに基づいて現実的な数値にすること
5. **価格設定**は影響力と成果に見合った適切な金額にすること

JSONのみを返してください。説明文は不要です。
`,

  /**
   * 簡易提案書生成（基本情報のみで迅速に生成）
   */
  QUICK_PROPOSAL: (
    companyName: string,
    industry: string,
    personaName: string,
    expertiseAreas: string[]
  ) => `
企業名: ${companyName}
業種: ${industry}
ペルソナ: ${personaName}
専門分野: ${expertiseAreas.join(', ')}

上記の情報を基に、シンプルなタイアップ提案書をJSON形式で生成してください。

\`\`\`json
{
  "title": "提案タイトル",
  "proposal_summary": "提案概要",
  "proposal_type": "sponsored_content",
  "platform_plans": {},
  "estimated_reach": 0,
  "proposed_price_jpy": 0
}
\`\`\`
`,

  /**
   * プラットフォーム別企画のみ生成
   */
  PLATFORM_PLAN: (
    platforms: string[],
    companyDescription: string,
    targetProduct?: string
  ) => `
企業: ${companyDescription}
${targetProduct ? `ターゲット商品: ${targetProduct}` : ''}
使用プラットフォーム: ${platforms.join(', ')}

上記のプラットフォームごとの具体的な企画案をJSON形式で生成してください。

\`\`\`json
{
  "platform_plans": {
    "tiktok": { "video_count": 0, "format": "", "description": "" },
    "youtube": { "video_count": 0, "format": "", "description": "" },
    "blog": { "article_count": 0, "format": "", "description": "" }
  }
}
\`\`\`
`,
};

/**
 * Gemini APIを呼び出して提案書を生成
 */
export async function generateProposalWithGemini(
  company: CompanyResearchData,
  persona: PersonaMaster,
  influenceProof: InfluenceProof,
  targetProduct?: string
): Promise<Partial<PartnershipProposal>> {
  const prompt = PROPOSAL_PROMPT_TEMPLATES.FULL_PROPOSAL(
    company,
    persona,
    influenceProof,
    targetProduct
  );

  console.log('[B2B] Generating proposal with Gemini...');

  try {
    // Gemini API呼び出し
    const response = await callGeminiAPI(prompt);

    // JSONを抽出
    const proposalData = extractJSONFromResponse(response);

    console.log('[B2B] Proposal generated successfully');

    return {
      title: proposalData.title,
      proposal_summary: proposalData.proposal_summary,
      proposal_type: proposalData.proposal_type as ProposalType,
      platform_plans: proposalData.platform_plans as PlatformPlans,
      estimated_reach: proposalData.estimated_reach,
      estimated_engagement: proposalData.estimated_engagement,
      estimated_conversions: proposalData.estimated_conversions,
      proposed_price_jpy: proposalData.proposed_price_jpy,
      ai_generated: true,
      ai_prompt_used: prompt,
      ai_generation_date: new Date().toISOString(),

      // 追加データ
      key_benefits: proposalData.key_benefits,
      deliverables: proposalData.deliverables,
      timeline: proposalData.timeline,
    };
  } catch (error) {
    console.error('[B2B] Error generating proposal:', error);
    throw error;
  }
}

/**
 * Gemini APIを呼び出す
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response from Gemini API');
  }

  const text = data.candidates[0].content.parts[0].text;

  return text;
}

/**
 * レスポンスからJSONを抽出
 */
function extractJSONFromResponse(response: string): any {
  // ``` で囲まれたJSONを抽出
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);

  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }

  // マークダウンなしの場合はそのままパース
  try {
    return JSON.parse(response);
  } catch {
    // JSONが見つからない場合はエラー
    throw new Error('Could not extract JSON from Gemini response');
  }
}

/**
 * 提案書をMarkdown形式でフォーマット
 */
export function formatProposalAsMarkdown(
  proposal: PartnershipProposal,
  company: CompanyResearchData,
  persona: PersonaMaster
): string {
  const sections: string[] = [];

  // ヘッダー
  sections.push(`# タイアップ提案書`);
  sections.push(`## ${proposal.title}\n`);

  // 基本情報
  sections.push(`### 提案概要`);
  sections.push(proposal.proposal_summary);
  sections.push('');

  // ペルソナ紹介
  sections.push(`### 提案者`);
  sections.push(`**${persona.persona_name}**`);
  if (persona.bio) {
    sections.push(persona.bio);
  }
  sections.push('');

  // 企業向けメリット
  if (proposal.key_benefits && proposal.key_benefits.length > 0) {
    sections.push(`### ${company.company_name}様へのメリット`);
    proposal.key_benefits.forEach((benefit) => {
      sections.push(`- ${benefit}`);
    });
    sections.push('');
  }

  // プラットフォーム別企画
  sections.push(`### プラットフォーム別企画\n`);

  if (proposal.platform_plans) {
    Object.entries(proposal.platform_plans).forEach(([platform, plan]) => {
      if (!plan) return;

      sections.push(`#### ${platform.toUpperCase()}`);
      if (plan.video_count) {
        sections.push(`- 動画本数: ${plan.video_count}本`);
      }
      if (plan.article_count) {
        sections.push(`- 記事数: ${plan.article_count}本`);
      }
      if (plan.post_count) {
        sections.push(`- 投稿数: ${plan.post_count}件`);
      }
      if (plan.format) {
        sections.push(`- フォーマット: ${plan.format}`);
      }
      if (plan.estimated_reach) {
        sections.push(`- 推定リーチ: ${plan.estimated_reach.toLocaleString()}人`);
      }
      if (plan.description) {
        sections.push(`\n${plan.description}`);
      }
      sections.push('');
    });
  }

  // 期待効果
  sections.push(`### 期待効果`);
  sections.push(`- **総リーチ**: ${proposal.estimated_reach?.toLocaleString() || 'N/A'} 人`);
  sections.push(
    `- **推定エンゲージメント**: ${proposal.estimated_engagement?.toLocaleString() || 'N/A'} 回`
  );
  if (proposal.estimated_conversions) {
    sections.push(`- **推定コンバージョン**: ${proposal.estimated_conversions.toLocaleString()} 件`);
  }
  sections.push('');

  // 成果物
  if (proposal.deliverables && proposal.deliverables.length > 0) {
    sections.push(`### 成果物`);
    proposal.deliverables.forEach((deliverable) => {
      sections.push(`- ${deliverable}`);
    });
    sections.push('');
  }

  // スケジュール
  if (proposal.timeline) {
    sections.push(`### スケジュール`);
    sections.push(proposal.timeline);
    sections.push('');
  }

  // 価格
  sections.push(`### 提案価格`);
  sections.push(
    `**¥${proposal.proposed_price_jpy?.toLocaleString() || 'N/A'}** (${proposal.currency || 'JPY'})`
  );
  sections.push('');

  // フッター
  sections.push(`---`);
  sections.push(`*ご不明点やカスタマイズのご要望がございましたら、お気軽にお問い合わせください。*`);

  return sections.join('\n');
}
