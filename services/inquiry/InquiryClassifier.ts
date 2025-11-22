// 📁 格納パス: services/inquiry/InquiryClassifier.ts
// 依頼内容: モールからのメッセージを自動分類するAIサービス

/**
 * メッセージ分類カテゴリ
 * - urgent: 緊急対応（ペナルティ回避） - ダッシュボードに表示
 * - standard: 標準対応（顧客質問） - 通常の問い合わせ管理ツールで対応
 * - ignore: 無視/アーカイブ（システム通知） - 自動アーカイブ
 */
export type MessageCategory = "urgent" | "standard" | "ignore";

/**
 * メッセージデータの型
 */
export interface InquiryMessage {
  id: string;
  title: string;
  senderEmail: string;
  body: string;
  marketplace: string; // eBay, Amazon, Shopee, Qoo10 など
  receivedAt: string;
  category?: MessageCategory; // AI分類結果
  userCorrectedCategory?: MessageCategory; // ユーザーによる修正
}

/**
 * 教師データ（ユーザーフィードバック）の型
 */
export interface TrainingData {
  id: string;
  title: string;
  keywords: string[];
  senderDomain: string;
  correctCategory: MessageCategory;
  createdAt: string;
}

/**
 * 緊急対応が必要なキーワードパターン
 * モールからのペナルティや制限に関連するキーワード
 */
const URGENT_KEYWORDS = [
  // アカウント制限・警告
  "account limited",
  "account restriction",
  "account suspended",
  "アカウント制限",
  "アカウント停止",
  "seller performance",
  "performance notification",
  "パフォーマンス低下",
  "ODR",
  "defect rate",
  "not as described",
  "significantly not as described",
  "SNAD",

  // ケース・クレーム
  "case opened",
  "case escalated",
  "buyer protection",
  "バイヤー保護",
  "ケースがオープン",
  "dispute",
  "紛争",
  "refund required",
  "返金要求",

  // ポリシー違反
  "policy violation",
  "listing removed",
  "出品削除",
  "prohibited item",
  "禁止商品",
  "intellectual property",
  "知的財産権",
  "copyright",
  "trademark",

  // 緊急返信期限
  "respond within 24 hours",
  "24時間以内",
  "immediate action required",
  "至急対応",
  "urgent",
  "緊急",
];

/**
 * 無視すべきキーワードパターン
 * システム通知や自動メッセージ
 */
const IGNORE_KEYWORDS = [
  // システム通知
  "shipping label created",
  "配送ラベル作成",
  "tracking number",
  "追跡番号",
  "order confirmation",
  "注文確認",
  "payment received",
  "支払い完了",
  "item dispatched",
  "商品発送完了",

  // プロモーション・マーケティング
  "promotion",
  "プロモーション",
  "marketing",
  "マーケティング",
  "sale opportunity",
  "セール機会",
  "seller update",
  "セラーアップデート",
  "new feature",
  "新機能",

  // レポート・統計
  "monthly report",
  "月次レポート",
  "sales report",
  "売上レポート",
  "performance summary",
  "パフォーマンスサマリー",
];

/**
 * 無視すべき送信元ドメイン
 */
const IGNORE_SENDER_DOMAINS = [
  "noreply@ebay.com",
  "marketing@ebay.com",
  "promo@shopee.com",
  "newsletter@amazon.com",
  "updates@qoo10.com",
];

/**
 * InquiryClassifier クラス
 * メッセージを自動分類し、ユーザーフィードバックから学習する
 */
export class InquiryClassifier {
  private trainingDataCache: TrainingData[] = [];

  constructor() {
    this.loadTrainingData();
  }

  /**
   * 教師データをローカルストレージまたはデータベースから読み込む
   */
  private async loadTrainingData(): Promise<void> {
    try {
      // 実際にはSupabaseやローカルストレージから読み込む
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("inquiry_training_data");
        if (stored) {
          this.trainingDataCache = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error("Failed to load training data:", error);
    }
  }

  /**
   * 教師データを保存する
   */
  private async saveTrainingData(): Promise<void> {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "inquiry_training_data",
          JSON.stringify(this.trainingDataCache)
        );
      }
      // 実際にはSupabaseにも保存
      // await supabase.from('inquiry_training_data').upsert(this.trainingDataCache)
    } catch (error) {
      console.error("Failed to save training data:", error);
    }
  }

  /**
   * メッセージからキーワードを抽出する
   */
  private extractKeywords(text: string): string[] {
    // シンプルな実装: スペースと句読点で分割して小文字化
    return text
      .toLowerCase()
      .split(/[\s,、。！？\(\)\[\]]+/)
      .filter((word) => word.length > 2);
  }

  /**
   * 送信元のドメインを抽出する
   */
  private extractDomain(email: string): string {
    const match = email.match(/@(.+)$/);
    return match ? match[1] : "";
  }

  /**
   * キーワードマッチングによる基本分類
   */
  private classifyByKeywords(message: InquiryMessage): MessageCategory {
    const textToAnalyze = `${message.title} ${message.body}`.toLowerCase();
    const domain = this.extractDomain(message.senderEmail);

    // 1. 無視すべき送信元ドメインをチェック
    if (IGNORE_SENDER_DOMAINS.some((ignoreDomain) => domain.includes(ignoreDomain))) {
      return "ignore";
    }

    // 2. 緊急キーワードをチェック
    const hasUrgentKeyword = URGENT_KEYWORDS.some((keyword) =>
      textToAnalyze.includes(keyword.toLowerCase())
    );
    if (hasUrgentKeyword) {
      return "urgent";
    }

    // 3. 無視キーワードをチェック
    const hasIgnoreKeyword = IGNORE_KEYWORDS.some((keyword) =>
      textToAnalyze.includes(keyword.toLowerCase())
    );
    if (hasIgnoreKeyword) {
      return "ignore";
    }

    // 4. デフォルトは標準対応
    return "standard";
  }

  /**
   * 教師データを使った学習ベースの分類
   */
  private classifyByTrainingData(message: InquiryMessage): MessageCategory | null {
    if (this.trainingDataCache.length === 0) {
      return null; // 教師データがない場合はnull
    }

    const messageKeywords = this.extractKeywords(
      `${message.title} ${message.body}`
    );
    const messageDomain = this.extractDomain(message.senderEmail);

    // 教師データとのマッチング度を計算
    const scores: Record<MessageCategory, number> = {
      urgent: 0,
      standard: 0,
      ignore: 0,
    };

    for (const training of this.trainingDataCache) {
      // タイトルの類似度
      if (
        message.title.toLowerCase().includes(training.title.toLowerCase()) ||
        training.title.toLowerCase().includes(message.title.toLowerCase())
      ) {
        scores[training.correctCategory] += 3;
      }

      // キーワードの一致数
      const matchingKeywords = messageKeywords.filter((keyword) =>
        training.keywords.includes(keyword)
      );
      scores[training.correctCategory] += matchingKeywords.length;

      // ドメインの一致
      if (messageDomain === training.senderDomain) {
        scores[training.correctCategory] += 2;
      }
    }

    // 最もスコアの高いカテゴリを返す
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return null; // マッチなし

    const category = Object.entries(scores).find(
      ([_, score]) => score === maxScore
    )?.[0] as MessageCategory;

    return category || null;
  }

  /**
   * メッセージを分類する（メインメソッド）
   */
  public classify(message: InquiryMessage): MessageCategory {
    // 1. まず教師データベースの分類を試みる
    const learnedCategory = this.classifyByTrainingData(message);
    if (learnedCategory) {
      return learnedCategory;
    }

    // 2. 教師データでマッチしない場合はキーワードベースで分類
    return this.classifyByKeywords(message);
  }

  /**
   * ユーザーがAIの分類を修正した場合、教師データとして記録する
   */
  public recordUserFeedback(
    message: InquiryMessage,
    correctedCategory: MessageCategory
  ): void {
    const keywords = this.extractKeywords(`${message.title} ${message.body}`);
    const domain = this.extractDomain(message.senderEmail);

    const trainingData: TrainingData = {
      id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: message.title,
      keywords: keywords.slice(0, 20), // 上位20キーワードを保存
      senderDomain: domain,
      correctCategory: correctedCategory,
      createdAt: new Date().toISOString(),
    };

    this.trainingDataCache.push(trainingData);
    this.saveTrainingData();

    console.log(`[InquiryClassifier] Feedback recorded:`, trainingData);
  }

  /**
   * 複数のメッセージを一括分類する
   */
  public classifyBatch(messages: InquiryMessage[]): InquiryMessage[] {
    return messages.map((message) => ({
      ...message,
      category: this.classify(message),
    }));
  }

  /**
   * 緊急対応が必要なメッセージのみを抽出
   */
  public filterUrgentMessages(messages: InquiryMessage[]): InquiryMessage[] {
    return messages.filter((msg) => this.classify(msg) === "urgent");
  }

  /**
   * 教師データの統計を取得
   */
  public getTrainingStats(): {
    total: number;
    byCategory: Record<MessageCategory, number>;
  } {
    const stats = {
      total: this.trainingDataCache.length,
      byCategory: {
        urgent: 0,
        standard: 0,
        ignore: 0,
      },
    };

    for (const data of this.trainingDataCache) {
      stats.byCategory[data.correctCategory]++;
    }

    return stats;
  }
}

// シングルトンインスタンス
let classifierInstance: InquiryClassifier | null = null;

/**
 * InquiryClassifierのシングルトンインスタンスを取得
 */
export function getInquiryClassifier(): InquiryClassifier {
  if (!classifierInstance) {
    classifierInstance = new InquiryClassifier();
  }
  return classifierInstance;
}
