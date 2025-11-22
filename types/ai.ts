// ファイル: /types/ai.ts

/**
 * N3の内部データ（既存の高利益商品データ）
 */
export interface N3InternalData {
    high_profit_examples: Array<{
        title: string;
        profit_margin: number;
    }>;
}

/**
 * パートナーシップ提案JSONの構造
 */
export interface PartnershipProposalJson {
    overall_score: number;
    market_analysis: string;
    partnership_benefits: string;
    proposal_structure: Array<{
        section_title: string;
        content_focus: string;
    }>;
}

/**
 * クラウドファンディングプロジェクトの基本情報
 */
export interface CrowdfundingProject {
    platform: string;
    project_title: string;
    project_url: string;
    funding_amount_actual: number;
    backers_count: number;
    description_snippet: string; // LLM分析用に本文を要約
}

/**
 * AIが生成するLP構成案と評価の詳細構造
 */
export interface LPProposalJson {
    /** 総合スコア (0-10) */
    overall_score: number;
    /** 市場性分析（なぜこの商品が売れているかの洞察） */
    market_insight: string;
    /** N3が輸入代理権を取得した場合の優位性 */
    n3_advantage: string;
    /** ランディングページの主要構成要素 */
    lp_structure: Array<{
        section_title: string;
        content_focus: string; // そのセクションで伝えるべき主要なメッセージ
        image_prompt: string; // セクションのキービジュアル生成プロンプト
    }>;
}
