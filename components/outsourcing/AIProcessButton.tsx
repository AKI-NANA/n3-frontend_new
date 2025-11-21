/**
 * AI投入ボタンコンポーネント
 * 外注作業者がGemini AIに商品を投入するためのアクションボタン
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIProcessButtonProps {
  sku: string;
  status: string;
  onProcessComplete?: () => void;
}

export function AIProcessButton({ sku, status, onProcessComplete }: AIProcessButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ボタンの活性化条件: status が '優先度決定済'
  const isEnabled = status === '優先度決定済';

  const handleAIProcess = async () => {
    if (!isEnabled || isProcessing) return;

    setIsProcessing(true);
    setProcessStatus('processing');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/ai/process-sku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sku }),
      });

      const data = await response.json();

      if (data.success) {
        setProcessStatus('success');
        // 2秒後にステータスをリセット
        setTimeout(() => {
          setProcessStatus('idle');
          onProcessComplete?.();
        }, 2000);
      } else {
        throw new Error(data.error || 'AI処理に失敗しました');
      }
    } catch (error) {
      console.error('AI Process Error:', error);
      setProcessStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '不明なエラー');
      // 5秒後にエラーをクリア
      setTimeout(() => {
        setProcessStatus('idle');
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  // ボタンの表示内容を決定
  const getButtonContent = () => {
    switch (processStatus) {
      case 'processing':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            AI処理中...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            処理完了！
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            エラー
          </>
        );
      default:
        return (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            AI (Gemini) 投入
          </>
        );
    }
  };

  // ボタンの色を決定
  const getButtonVariant = () => {
    switch (processStatus) {
      case 'success':
        return 'default'; // 緑色
      case 'error':
        return 'destructive'; // 赤色
      default:
        return 'default';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleAIProcess}
        disabled={!isEnabled || isProcessing}
        variant={getButtonVariant()}
        className={cn(
          'min-w-[180px]',
          processStatus === 'success' && 'bg-green-600 hover:bg-green-700',
          !isEnabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {getButtonContent()}
      </Button>

      {errorMessage && (
        <span className="text-xs text-red-500">{errorMessage}</span>
      )}

      {!isEnabled && status !== '優先度決定済' && (
        <span className="text-xs text-muted-foreground">
          現在のステータス: {status}
        </span>
      )}
    </div>
  );
}
