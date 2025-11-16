// 開発指示書管理システムの型定義

export type InstructionStatus = '未着手' | '開発中' | '使用済み' | '完了' | '保留';

export type Priority = '最高' | '高' | '中' | '低';

export type ToolCategory = 
  | '在庫管理'
  | '価格計算'
  | 'API統合'
  | 'UI/UX'
  | '分析・レポート'
  | 'データベース'
  | '認証・セキュリティ'
  | 'スクレイピング'
  | 'バッチ処理'
  | 'デバッグ・テスト'
  | 'その他';

export const CategoryIcons: Record<ToolCategory, string> = {
  '在庫管理': '📦',
  '価格計算': '💰',
  'API統合': '🔌',
  'UI/UX': '🎨',
  '分析・レポート': '📊',
  'データベース': '🗄️',
  '認証・セキュリティ': '🔒',
  'スクレイピング': '🕷️',
  'バッチ処理': '⚙️',
  'デバッグ・テスト': '🐛',
  'その他': '📝',
};

export interface CodeSnippet {
  id: string;
  language: string;
  filename: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface DevInstruction {
  id: string;
  title: string; // ツール/機能名
  category: ToolCategory;
  status: InstructionStatus;
  priority: Priority; // 優先順位
  description: string; // 指示書の内容（プレーンテキスト）
  memo: string; // 進行状況メモ
  images: InstructionImage[]; // スクリーンショット等
  codeSnippets: CodeSnippet[]; // コードスニペット
  relatedFiles: string[]; // 関連ファイルパス
  createdAt: string;
  updatedAt: string;
}

export interface InstructionImage {
  id: string;
  filename: string;
  base64Data: string;
  description: string;
  uploadedAt: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export type SortOption = 'status' | 'priority' | 'createdAt' | 'updatedAt';
