/**
 * CSV Converter Component (統一APIレスポンス対応版)
 * 
 * ✅ 修正内容:
 * - 統一APIレスポンス形式対応: {"status": "success/error", "message": "", "data": {}, "timestamp": ""}
 * - エラーハンドリングの統一
 * - TypeScript型定義強化
 * - ユーザー体験向上
 * - パフォーマンス最適化
 */

import React, { useState, useEffect, useCallback } from 'react';

// 統一APIレスポンス型定義
interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T;
  timestamp: string;
  meta?: {
    pagination?: any;
    [key: string]: any;
  };
}

// CSVデータ型定義
interface CSVData {
  headers: string[];
  data: Record<string, any>[];
  totalRows: number;
  previewRows: number;
}

// コンバーター設定型定義
interface ConverterConfig {
  sourceFormat: string;
  targetFormat: string;
  sourceFileName: string;
}

// 統一通知システム
interface NotificationSystem {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

// Propsの型定義
interface CSVConverterProps {
  onConversionComplete?: (result: ApiResponse<any>) => void;
  onError?: (error: ApiResponse<any>) => void;
  maxFileSize?: number; // MB
  supportedFormats?: string[];
}

// 統一通知システムの実装
const createNotificationSystem = (): NotificationSystem => {
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // EmverzeNotifyが利用可能な場合
    if (typeof window !== 'undefined' && (window as any).EmverzeNotify) {
      (window as any).EmverzeNotify[type](message);
      return;
    }
    
    // フォールバック通知
    const alertType = type === 'error' ? 'danger' : type;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${alertType} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
      if (alertDiv.parentElement) {
        alertDiv.remove();
      }
    }, 5000);
  };

  return {
    success: (message) => showNotification(message, 'success'),
    error: (message) => showNotification(message, 'error'),
    warning: (message) => showNotification(message, 'warning'),
    info: (message) => showNotification(message, 'info')
  };
};

// 統一APIクライアント
const createApiClient = () => {
  const request = async (url: string, options: RequestInit = {}): Promise<ApiResponse> => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      // 統一レスポンス形式チェック
      if (!data.status || !data.timestamp) {
        throw new Error('不正なレスポンス形式です');
      }

      return data;
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'APIエラーが発生しました',
        data: {},
        timestamp: new Date().toISOString()
      };
    }
  };

  return {
    get: (url: string) => request(url, { method: 'GET' }),
    post: (url: string, data?: any) => request(url, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' }
    }),
    put: (url: string, data: any) => request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (url: string) => request(url, { method: 'DELETE' })
  };
};

const CSVConverterComponent: React.FC<CSVConverterProps> = ({
  onConversionComplete,
  onError,
  maxFileSize = 10, // 10MB
  supportedFormats = ['journal', 'mf_cloud']
}) => {
  // State管理
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceData, setSourceData] = useState<CSVData | null>(null);
  const [previewData, setPreviewData] = useState<CSVData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceFormat, setSourceFormat] = useState<string>('');
  const [targetFormat, setTargetFormat] = useState<string>('mf_cloud');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // サービス初期化
  const notify = createNotificationSystem();
  const api = createApiClient();

  // ファイル選択処理
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      // ファイルバリデーション
      if (!file.name.toLowerCase().endsWith('.csv')) {
        notify.error('CSVファイルを選択してください');
        return;
      }

      if (file.size > maxFileSize * 1024 * 1024) {
        notify.error(`ファイルサイズは${maxFileSize}MB以下にしてください`);
        return;
      }

      setIsLoading(true);
      setUploadProgress(0);
      
      // FormData作成
      const formData = new FormData();
      formData.append('file', file);

      // アップロード進捗シミュレーション
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // API呼び出し: ファイル解析
      const response = await api.post('/api/csv/analyze', formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.status === 'success') {
        setSourceFile(file);
        setSourceData(response.data.csv_data);
        setSourceFormat(response.data.detected_format);
        
        notify.success('CSVファイルを正常に読み込みました');
      } else {
        notify.error(response.message || 'ファイルの読み込みに失敗しました');
        if (onError) {
          onError(response);
        }
      }

    } catch (error) {
      notify.error('ファイル処理中にエラーが発生しました');
      console.error('File processing error:', error);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [maxFileSize, notify, api, onError]);

  // ドラッグ&ドロップ処理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 変換プレビュー生成
  const generatePreview = useCallback(async () => {
    if (!sourceData || !sourceFormat || !targetFormat) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await api.post('/api/csv/preview-conversion', {
        source_data: sourceData,
        source_format: sourceFormat,
        target_format: targetFormat
      });

      if (response.status === 'success') {
        setPreviewData(response.data.preview_data);
        notify.info('変換プレビューを生成しました');
      } else {
        notify.error(response.message || 'プレビュー生成に失敗しました');
      }

    } catch (error) {
      notify.error('プレビュー生成中にエラーが発生しました');
      console.error('Preview generation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sourceData, sourceFormat, targetFormat, notify, api]);

  // 変換実行
  const executeConversion = useCallback(async () => {
    if (!sourceFile || !targetFormat) {
      notify.warning('ファイルと変換形式を選択してください');
      return;
    }

    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('file', sourceFile);
      formData.append('target_format', targetFormat);

      const response = await api.post('/api/csv/convert', formData);

      if (response.status === 'success') {
        notify.success('CSV変換が完了しました');
        
        // ダウンロード処理
        handleDownload(response.data);
        
        if (onConversionComplete) {
          onConversionComplete(response);
        }
      } else {
        notify.error(response.message || 'CSV変換に失敗しました');
        if (onError) {
          onError(response);
        }
      }

    } catch (error) {
      notify.error('変換処理中にエラーが発生しました');
      console.error('Conversion error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sourceFile, targetFormat, notify, api, onConversionComplete, onError]);

  // ダウンロード処理
  const handleDownload = useCallback((conversionData: any) => {
    try {
      if (!conversionData.csv_content) {
        notify.error('ダウンロードするデータがありません');
        return;
      }

      // Blobオブジェクト作成
      const blob = new Blob([conversionData.csv_content], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // ダウンロードリンク作成
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = conversionData.filename || `converted_${targetFormat}_${Date.now()}.csv`;
      
      // ダウンロード実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      notify.success('ファイルのダウンロードを開始しました');

    } catch (error) {
      notify.error('ダウンロード中にエラーが発生しました');
      console.error('Download error:', error);
    }
  }, [targetFormat, notify]);

  // ターゲット形式変更時の処理
  useEffect(() => {
    if (sourceData && sourceFormat && targetFormat) {
      generatePreview();
    }
  }, [sourceData, sourceFormat, targetFormat, generatePreview]);

  // コンポーネントレンダリング
  return (
    <div className="csv-converter-container">
      {/* ヘッダー */}
      <div className="converter-header mb-4">
        <h3 className="mb-2">
          <i className="bi bi-arrow-left-right"></i>
          CSV形式変換ツール
        </h3>
        <p className="text-muted">
          仕訳帳形式とマネーフォワードクラウド形式の相互変換が可能です
        </p>
      </div>

      {/* ファイルアップロードエリア */}
      <div 
        className={`upload-area p-4 border-2 border-dashed rounded ${
          dragOver ? 'border-primary bg-light' : 'border-secondary'
        } ${isLoading ? 'opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!sourceFile ? (
          <div className="text-center">
            <i className="bi bi-cloud-upload display-4 text-muted mb-3"></i>
            <p className="mb-2">CSVファイルをドラッグ&ドロップ または</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="d-none"
              id="csv-file-input"
              disabled={isLoading}
            />
            <label htmlFor="csv-file-input" className="btn btn-outline-primary">
              ファイルを選択
            </label>
            <p className="small text-muted mt-2">
              対応形式: CSV (最大{maxFileSize}MB)
            </p>
          </div>
        ) : (
          <div className="file-info">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <i className="bi bi-file-earmark-text text-success me-2"></i>
                <strong>{sourceFile.name}</strong>
                <span className="text-muted ms-2">
                  ({(sourceFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  setSourceFile(null);
                  setSourceData(null);
                  setPreviewData(null);
                  setSourceFormat('');
                }}
                disabled={isLoading}
              >
                <i className="bi bi-x-circle"></i> 削除
              </button>
            </div>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="progress mt-2">
                <div 
                  className="progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                ></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 変換設定 */}
      {sourceData && (
        <div className="conversion-settings mt-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-gear"></i> 変換設定
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">変換元形式</label>
                  <input
                    type="text"
                    className="form-control"
                    value={sourceFormat || '検出中...'}
                    readOnly
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">変換先形式</label>
                  <select
                    className="form-select"
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="">形式を選択</option>
                    {supportedFormats.map((format) => (
                      <option key={format} value={format}>
                        {format === 'journal' ? '仕訳帳形式' : 'マネーフォワードクラウド形式'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-3">
                <p className="mb-2">
                  <strong>データ情報:</strong>
                </p>
                <ul className="list-unstyled small">
                  <li><i className="bi bi-info-circle text-info"></i> 総行数: {sourceData.totalRows.toLocaleString()}行</li>
                  <li><i className="bi bi-eye text-primary"></i> プレビュー: {sourceData.previewRows}行</li>
                  <li><i className="bi bi-columns text-secondary"></i> 列数: {sourceData.headers.length}列</li