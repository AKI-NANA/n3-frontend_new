// app/research/components/CSVExportButton.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import type { ResearchProduct } from '@/types/research';

interface CSVExportButtonProps {
  products: ResearchProduct[];
}

export function CSVExportButton({ products }: CSVExportButtonProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [csvData, setCsvData] = useState('');

  const generateCSV = () => {
    // CSVヘッダー
    const headers = [
      'eBay Item ID',
      'Title',
      'Price (USD)',
      'Shipping',
      'Total Cost',
      'Category',
      'Condition',
      'Seller',
      'Seller Rating (%)',
      'Seller Feedback',
      'Country',
      'Profit Rate (%)',
      'Risk Level',
      'Risk Score',
      'eBay URL'
    ];

    // CSVデータ行
    const rows = products.map(p => [
      p.ebay_item_id,
      `"${p.title.replace(/"/g, '""')}"`, // ダブルクオートエスケープ
      p.current_price.toFixed(2),
      p.shipping_cost.toFixed(2),
      (p.current_price + p.shipping_cost).toFixed(2),
      `"${p.category_name}"`,
      p.condition,
      p.seller_username,
      p.seller_positive_percentage?.toFixed(1) || '0',
      p.seller_feedback_score || '0',
      p.seller_country,
      p.profit_rate?.toFixed(1) || '0',
      p.risk_level,
      p.risk_score || '0',
      p.item_url
    ]);

    // CSV組み立て
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  };

  const downloadCSV = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ebay-research-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateAIPrompt = () => {
    const csv = generateCSV();
    setCsvData(csv);

    const prompt = `以下のeBay商品データを分析して、各商品に詳細なスコアを付けてください：

【評価項目】
1. 総合スコア (0-100点) - 全体的な投資価値
2. 利益ポテンシャル (0-100点) - 利益を得られる可能性
3. 市場魅力度 (0-100点) - 市場での人気度・需要
4. リスクスコア (0-100点) - 投資リスク（低いほど良い）
5. 推奨度 (STRONG_BUY/BUY/CONSIDER/PASS)
6. 売れる理由 (箇条書き3-5個)
7. リスク要因 (箇条書き2-4個)
8. 推奨アクション (具体的な行動提案)

【分析の観点】
- 価格設定の妥当性
- セラーの信頼性
- 商品カテゴリの人気度
- 競合状況の推測
- 季節性・トレンド
- 利益率の実現可能性

【出力形式】
結果はJSON形式で、各商品ごとに上記項目を含めてください。

【CSVデータ】
${csv}

【注意事項】
- 実際の市場データとトレンドを考慮してください
- 保守的な評価を心がけてください
- リスクは包括的に評価してください`;

    return prompt;
  };

  const copyPromptToClipboard = () => {
    const prompt = generateAIPrompt();
    navigator.clipboard.writeText(prompt);
    alert('AI分析用プロンプトをクリップボードにコピーしました！\n\nClaude.aiに貼り付けて分析してください。');
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={downloadCSV}
        className="mr-2"
      >
        <i className="fas fa-download mr-2"></i>
        CSV ダウンロード
      </Button>

      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogTrigger asChild>
          <Button variant="default" className="bg-gradient-to-r from-purple-600 to-blue-600">
            <i className="fas fa-brain mr-2"></i>
            AI分析用データ生成
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="fas fa-robot text-2xl text-purple-600"></i>
              AI分析用プロンプト
            </DialogTitle>
            <DialogDescription>
              以下のプロンプトをClaude.ai、ChatGPT、Geminiなどにコピー&ペーストして分析してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 使い方 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <i className="fas fa-info-circle"></i>
                使い方
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>下の「プロンプトをコピー」ボタンをクリック</li>
                <li>Claude.ai（https://claude.ai）にアクセス</li>
                <li>新しいチャットを開始</li>
                <li>コピーしたプロンプトを貼り付けて送信</li>
                <li>AI分析結果を待つ（1-2分）</li>
                <li>結果をコピーしてSupabaseに保存（手動）</li>
              </ol>
            </div>

            {/* プロンプトプレビュー */}
            <div>
              <label className="block text-sm font-medium mb-2">
                プロンプトプレビュー（{products.length}件の商品データ）
              </label>
              <Textarea
                value={generateAIPrompt()}
                readOnly
                className="font-mono text-xs h-64 resize-none"
              />
            </div>

            {/* アクションボタン */}
            <div className="flex gap-2">
              <Button
                onClick={copyPromptToClipboard}
                className="flex-1"
                size="lg"
              >
                <i className="fas fa-copy mr-2"></i>
                プロンプトをコピー
              </Button>
              <Button
                onClick={() => window.open('https://claude.ai', '_blank')}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <i className="fas fa-external-link-alt mr-2"></i>
                Claude.aiを開く
              </Button>
            </div>

            {/* ヒント */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                <i className="fas fa-lightbulb"></i>
                💡 ヒント
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                <li>無料版のClaude.aiでも分析可能です</li>
                <li>データ量が多い場合は10件ずつ分割して分析すると精度が上がります</li>
                <li>分析結果はJSON形式で返ってくるので、コピーして保存しておきましょう</li>
                <li>定期的に再分析することで市場トレンドの変化を把握できます</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
