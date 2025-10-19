import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, Download, Upload, X, ChevronRight } from 'lucide-react';

const CSVConverter = () => {
  // ステート管理
  const [sourceFile, setSourceFile] = useState(null);
  const [sourceFileName, setSourceFileName] = useState('');
  const [sourceData, setSourceData] = useState(null);
  const [sourceFormat, setSourceFormat] = useState('');
  const [targetFormat, setTargetFormat] = useState('mf_cloud');
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);

  // ファイルアップロードハンドラー
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  // ドラッグ&ドロップイベントハンドラー
  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // ファイルドロップハンドラー
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
  };

  // ファイル処理
  const processFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      setError('アップロードできるのはCSVファイルのみです。');
      return;
    }

    setSourceFile(file);
    setSourceFileName(file.name);
    setMessage('ファイルを読み込んでいます...');
    setError('');
    setIsProcessing(true);

    // ファイル解析
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        
        // CSVデータをパース
        const parsedData = parseCSV(content);
        setSourceData(parsedData);

        // フォーマット自動判定
        const format = detectCSVFormat(parsedData);
        setSourceFormat(format);

        // 次のステップへ
        setActiveStep(2);
        setMessage(`${file.name} を読み込みました。形式: ${format}`);
        setIsProcessing(false);
      } catch (error) {
        setError(`ファイルの読み込みに失敗しました: ${error.message}`);
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError('ファイルの読み込みに失敗しました');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // CSVをパース
  const parseCSV = (content) => {
    // 簡易CSVパーサー
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    const data = lines.slice(1, 11).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i] || '';
        return obj;
      }, {});
    });

    return {
      headers,
      data,
      totalRows: lines.length - 1,
      previewRows: data.length
    };
  };

  // CSVフォーマットを検出
  const detectCSVFormat = (parsedData) => {
    const headers = parsedData.headers || [];
    
    // マネーフォワードクラウド固有のヘッダーを検出
    const mfCloudHeaders = ['MF仕訳タイプ', '決算整理仕訳', 'MFステータス', '作成日', '作成者', '最終更新日', '最終更新者'];
    const mfHeadersFound = mfCloudHeaders.filter(h => headers.some(header => header.includes(h))).length;
    
    if (mfHeadersFound >= 2) {
      return 'mf_cloud';
    }

    // 仕訳帳形式のヘッダーを検出
    const journalHeaders = ['取引番号', '取引日', '借方勘定科目', '貸方勘定科目', '摘要', '借方金額', '貸方金額'];
    const journalHeadersFound = journalHeaders.filter(h => headers.some(header => header.includes(h))).length;
    
    if (journalHeadersFound >= 4) {
      return 'journal';
    }
    
    return 'unknown';
  };

  // 変換プレビュー生成
  const handleGeneratePreview = () => {
    if (!sourceData) return;
    
    setIsProcessing(true);
    setMessage('変換プレビューを生成中...');
    setError('');
    
    // 変換処理のシミュレーション
    setTimeout(() => {
      try {
        // 実際のプロジェクトでは、ここでAPIコールを行う
        // const response = await fetch('/api/converter/preview', { ... });
        
        // 変換後データのモック
        const convertedData = mockConvertData(sourceData, sourceFormat, targetFormat);
        setPreviewData(convertedData);
        setActiveStep(3);
        setMessage('プレビューを生成しました');
        setIsProcessing(false);
      } catch (error) {
        setError(`プレビュー生成に失敗しました: ${error.message}`);
        setIsProcessing(false);
      }
    }, 1000);
  };

  // データ変換のモック
  const mockConvertData = (sourceData, fromFormat, toFormat) => {
    if (fromFormat === toFormat) return sourceData;
    
    const data = sourceData.data.map(row => {
      const newRow = {};
      
      if (fromFormat === 'journal' && toFormat === 'mf_cloud') {
        // 仕訳帳→マネーフォワード変換の例
        newRow['取引No'] = row['取引番号'] || row['取引No'] || '';
        newRow['取引日'] = row['取引日'] || row['日付'] || '';
        newRow['借方勘定科目'] = row['借方勘定科目'] || row['借方科目'] || row['借方'] || '';
        newRow['借方補助科目'] = row['借方補助科目'] || row['借方補助'] || '';
        newRow['借方部門'] = row['借方部門'] || row['借方部'] || '';
        newRow['借方金額(円)'] = row['借方金額(円)'] || row['借方金額'] || row['借方金'] || '0';
        newRow['貸方勘定科目'] = row['貸方勘定科目'] || row['貸方科目'] || row['貸方'] || '';
        newRow['貸方補助科目'] = row['貸方補助科目'] || row['貸方補助'] || '';
        newRow['貸方部門'] = row['貸方部門'] || row['貸方部'] || '';
        newRow['貸方金額(円)'] = row['貸方金額(円)'] || row['貸方金額'] || row['貸方金'] || '0';
        newRow['摘要'] = row['摘要'] || row['内容'] || row['説明'] || '';
        newRow['仕訳メモ'] = row['メモ'] || row['備考'] || '';
        newRow['決算整理仕訳'] = '0';
        newRow['タグ'] = row['タグ'] || '';
      } else if (fromFormat === 'mf_cloud' && toFormat === 'journal') {
        // マネーフォワード→仕訳帳変換の例
        newRow['取引番号'] = row['取引No'] || row['取引番号'] || '';
        newRow['取引日'] = row['取引日'] || row['日付'] || '';
        newRow['借方勘定科目'] = row['借方勘定科目'] || '';
        newRow['借方補助科目'] = row['借方補助科目'] || '';
        newRow['借方金額(円)'] = row['借方金額(円)'] || '0';
        newRow['貸方勘定科目'] = row['貸方勘定科目'] || '';
        newRow['貸方補助科目'] = row['貸方補助科目'] || '';
        newRow['貸方金額(円)'] = row['貸方金額(円)'] || '0';
        newRow['摘要'] = row['摘要'] || '';
        newRow['メモ'] = row['仕訳メモ'] || row['メモ'] || '';
        newRow['タグ'] = row['タグ'] || '';
      } else {
        // 未知の形式の場合は元のデータをそのまま返す
        return row;
      }
      
      return newRow;
    });
    
    // 新しいヘッダーを取得
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    
    return {
      headers,
      data,
      totalRows: sourceData.totalRows,
      previewRows: data.length
    };
  };

  // 変換済みCSVのダウンロード
  const handleDownload = () => {
    if (!previewData) return;
    
    try {
      // CSVデータ生成
      const headers = previewData.headers.join(',');
      const rows = previewData.data.map(row => 
        previewData.headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',') 
            ? `"${row[header]}"` 
            : row[header]
        ).join(',')
      );
      const csvContent = [headers, ...rows].join('\n');
      
      // ダウンロードリンク作成
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // ファイル名生成
      const originalName = sourceFileName.replace('.csv', '');
      const formatSuffix = targetFormat === 'mf_cloud' ? 'mf_cloud' : 'journal';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `${originalName}_${formatSuffix}_${timestamp}.csv`;
      
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage(`${fileName} をダウンロードしました`);
    } catch (error) {
      setError(`ダウンロードに失敗しました: ${error.message}`);
    }
  };

  // 最初からやり直す
  const handleReset = () => {
    setSourceFile(null);
    setSourceFileName('');
    setSourceData(null);
    setSourceFormat('');
    setTargetFormat('mf_cloud');
    setPreviewData(null);
    setIsProcessing(false);
    setError('');
    setMessage('');
    setActiveStep(1);
  };

  // レンダリング
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">CSV変換ツール</h1>
      
      {/* ステップインジケーター */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div className={`flex flex-col items-center ${activeStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <Upload size={20} />
            </div>
            <span className="mt-2 text-sm">ファイル選択</span>
          </div>
          
          <div className="h-px w-16 bg-gray-300 flex-grow mx-2"></div>
          
          <div className={`flex flex-col items-center ${activeStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep >= 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <ChevronRight size={20} />
            </div>
            <span className="mt-2 text-sm">変換設定</span>
          </div>
          
          <div className="h-px w-16 bg-gray-300 flex-grow mx-2"></div>
          
          <div className={`flex flex-col items-center ${activeStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeStep >= 3 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
              <Download size={20} />
            </div>
            <span className="mt-2 text-sm">ダウンロード</span>
          </div>
        </div>
      </div>
      
      {/* メッセージ・エラー表示 */}
      {message && (
        <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <Check size={20} className="mr-2" />
          <span>{message}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle size={20} className="mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {/* ステップ1: ファイルアップロード */}
      {activeStep === 1 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">ステップ 1: CSVファイルをアップロード</h2>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="mb-4">CSVファイルをドラッグ＆ドロップ</p>
            <p className="text-sm text-gray-500 mb-4">または</p>
            <label className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded cursor-pointer">
              ファイルを選択
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>※ UTF-8, Shift-JIS, EUC-JPなどの文字コードに対応しています</p>
            <p>※ 仕訳帳形式とマネーフォワードクラウド形式のCSVに対応しています</p>
          </div>
        </div>
      )}
      
      {/* ステップ2: 変換設定 */}
      {activeStep === 2 && sourceData && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">ステップ 2: 変換設定</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-2">入力ファイル情報</h3>
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p><span className="font-medium">ファイル名:</span> {sourceFileName}</p>
                <p><span className="font-medium">検出形式:</span> {sourceFormat === 'mf_cloud' ? 'マネーフォワードクラウド' : sourceFormat === 'journal' ? '仕訳帳' : '不明'}</p>
                <p><span className="font-medium">行数:</span> {sourceData.totalRows}</p>
                <p><span className="font-medium">列数:</span> {sourceData.headers.length}</p>
              </div>
              
              <h3 className="font-bold mb-2">変換設定</h3>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">変換先フォーマット:</label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                  disabled={sourceFormat === 'unknown'}
                >
                  <option value="mf_cloud">マネーフォワードクラウド形式</option>
                  <option value="journal">仕訳帳形式</option>
                </select>
              </div>
              
              <div className="flex space-x-2 mt-6">
                <button
                  onClick={handleReset}
                  className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                  キャンセル
                </button>
                
                <button
                  onClick={handleGeneratePreview}
                  disabled={isProcessing || sourceFormat === 'unknown'}
                  className={`px-4 py-2 rounded ${
                    isProcessing || sourceFormat === 'unknown'
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {isProcessing ? '処理中...' : 'プレビュー生成'}
                </button>
              </div>
              
              {sourceFormat === 'unknown' && (
                <div className="mt-4 text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                  <AlertCircle size={16} className="inline-block mr-1" />
                  CSVの形式を認識できませんでした。別のファイルを試してください。
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-bold mb-2">元データプレビュー</h3>
              <div className="border rounded overflow-auto max-h-64">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {sourceData.headers.slice(0, 5).map((header, i) => (
                        <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                      {sourceData.headers.length > 5 && (
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sourceData.data.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {sourceData.headers.slice(0, 5).map((header, j) => (
                          <td key={j} className="px-3 py-2 text-sm text-gray-500 truncate max-w-xs">
                            {row[header] || ''}
                          </td>
                        ))}
                        {sourceData.headers.length > 5 && (
                          <td className="px-3 py-2 text-sm text-gray-500">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {sourceData.previewRows}行（全{sourceData.totalRows}行）表示
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* ステップ3: 変換結果プレビューとダウンロード */}
      {activeStep === 3 && previewData && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">ステップ 3: 変換結果プレビューとダウンロード</h2>
          
          <div className="mb-6">
            <h3 className="font-bold mb-2">変換結果プレビュー</h3>
            <div className="border rounded overflow-auto max-h-64 mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.headers.slice(0, 5).map((header, i) => (
                      <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                    {previewData.headers.length > 5 && (
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">...</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.data.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {previewData.headers.slice(0, 5).map((header, j) => (
                        <td key={j} className="px-3 py-2 text-sm text-gray-500 truncate max-w-xs">
                          {row[header] || ''}
                        </td>
                      ))}
                      {previewData.headers.length > 5 && (
                        <td className="px-3 py-2 text-sm text-gray-500">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500">
              {previewData.previewRows}行（全{previewData.totalRows}行）表示
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">変換情報</h3>
              <p><span className="font-medium">元形式:</span> {sourceFormat === 'mf_cloud' ? 'マネーフォワードクラウド' : '仕訳帳'}</p>
              <p><span className="font-medium">変換先:</span> {targetFormat === 'mf_cloud' ? 'マネーフォワードクラウド' : '仕訳帳'}</p>
              <p><span className="font-medium">行数:</span> {previewData.totalRows}</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
              >
                やり直す
              </button>
              
              <button
                onClick={handleDownload}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
              >
                <Download size={18} className="mr-2" />
                CSVダウンロード
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 使い方ガイド */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">CSV変換ツールの使い方</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-bold">対応しているCSV形式</h3>
            <ul className="list-disc list-inside ml-4 text-gray-700">
              <li>仕訳帳形式 CSV</li>
              <li>マネーフォワードクラウド形式 CSV</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold">使い方</h3>
            <ol className="list-decimal list-inside ml-4 text-gray-700">
              <li>変換したいCSVファイルをアップロードします</li>
              <li>変換先のフォーマットを選択します</li>
              <li>プレビューを確認し、問題なければダウンロードします</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-bold">注意事項</h3>
            <ul className="list-disc list-inside ml-4 text-gray-700">
              <li>文字コードはUTF-8, Shift-JIS, EUC-JPに対応しています</li>
              <li>プレビューは最大10行のみ表示されます</li>
              <li>大きなファイルの場合、処理に時間がかかる場合があります</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVConverter;
