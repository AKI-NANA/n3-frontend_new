// ファイル: /lib/research/cf-scraper.ts

import { CrowdfundingProject } from '@/types/ai';

/**
 * 特定のプラットフォームから進行中/成功したプロジェクトのデータを取得する
 * @param platform クラウドファンディングプラットフォーム名
 * @returns プロジェクトデータのリスト
 */
export async function fetchCrowdfundingProjects(platform: string): Promise<CrowdfundingProject[]> {
    // TODO: Puppeteerや特定のCF APIを使用して、プロジェクトのタイトル、達成率、説明文を抽出するロジックを実装
    console.log(`Scraping projects from: ${platform}`);

    // 現在はモックデータ
    return [
        {
            platform: platform,
            project_title: `【AI自動運転対応】超軽量折りたたみ電動バイク Z-1`,
            project_url: `https://${platform}.com/z1_bike`,
            funding_amount_actual: 52000000, // 5,200万円達成
            backers_count: 1200,
            description_snippet: '都市生活者向けの未来型モビリティ。バッテリー交換式で環境に優しい。競合の重い製品との差別化に成功。',
        },
        {
            platform: platform,
            project_title: `ノイズキャンセリング搭載 瞑想専用ヘッドフォン Calm-Pro`,
            project_url: `https://${platform}.com/calm-pro`,
            funding_amount_actual: 4500000, // 450万円達成
            backers_count: 350,
            description_snippet: '特定の周波数帯のノイズを完全に遮断。自宅で集中したいリモートワーカー向け。ニッチだが根強い需要あり。',
        }
    ];
}
