<?php
/**
 * ExportService - データエクスポートサービス
 * 
 * NAGANO-3記帳自動化ツール統合準拠
 * Phase 7-3: データエクスポート機能（重要）
 * 
 * @package NAGANO3\Kicho\Services
 * @version 1.0.0
 * @author NAGANO-3 Development Team
 */

// 既存NAGANO-3システム読み込み
require_once __DIR__ . '/../../../system_core/php/nagano3_unified_core.php';
require_once __DIR__ . '/../models/transaction_model.php';
require_once __DIR__ . '/../models/rule_model.php';
require_once __DIR__ . '/mf_api_service.php';

/**
 * データエクスポートサービスクラス
 * 
 * 機能:
 * - 取引データCSVエクスポート
 * - MFクラウド形式エクスポート
 * - 仕訳帳・総勘定元帳出力
 * - レポート・統計データ出力
 * - バックアップデータ生成
 */
class KichoExportService extends NAGANO3UnifiedCore
{
    /** @var KichoTransactionModel 取引モデル */
    private $transactionModel;
    
    /** @var KichoRuleModel ルールモデル */
    private $ruleModel;
    
    /** @var KichoMFApiService MF APIサービス */
    private $mfApiService;
    
    /** @var string エクスポートディレクトリ */
    private $export_dir;
    
    /** @var array サポートする出力形式 */
    private $supported_formats = ['csv', 'excel', 'json', 'pdf'];
    
    /** @var int エクスポート最大件数 */
    private $max_export_records = 10000;
    
    /** @var int ファイル保持期間（日） */
    private $file_retention_days = 7;
    
    /**
     * コンストラクタ
     */
    public function __construct()
    {
        parent::__construct();
        $this->initializeExportService();
    }
    
    /**
     * ExportService初期化
     */
    private function initializeExportService()
    {
        $this->kicho_performance_start('export_service_init');
        
        try {
            // モデル・サービス初期化
            $this->transactionModel = new KichoTransactionModel();
            $this->ruleModel = new KichoRuleModel();
            $this->mfApiService = new KichoMFApiService();
            
            // エクスポートディレクトリ設定
            $this->export_dir = __DIR__ . '/../../../data/exports';
            $this->ensureExportDirectory();
            
            // 古いファイルのクリーンアップ
            $this->cleanupOldFiles();
            
            kicho_log('info', 'ExportService初期化完了', [
                'export_dir' => $this->export_dir,
                'supported_formats' => $this->supported_formats,
                'max_export_records' => $this->max_export_records,
                'file_retention_days' => $this->file_retention_days
            ]);
            
        } catch (Exception $e) {
            kicho_log('error', 'ExportService初期化失敗', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        } finally {
            $this->kicho_performance_end('export_service_init');
        }
    }
    
    /**
     * 取引データCSVエクスポート
     * 
     * @param array $filters フィルター条件
     * @param array $options オプション
     * @return array エクスポート結果
     */
    public function exportTransactionsCSV($filters = [], $options = [])
    {
        $this->kicho_performance_start('export_transactions_csv');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_read')) {
                throw new Exception('データエクスポート権限がありません');
            }
            
            // フィルター・オプション処理
            $validated_filters = $this->validateFilters($filters);
            $export_options = $this->processExportOptions($options);
            
            // データ取得
            $transactions_result = $this->transactionModel->getTransactions(
                $validated_filters, 
                1, 
                $this->max_export_records
            );
            
            if ($transactions_result['status'] !== 'success') {
                throw new Exception('取引データの取得に失敗しました');
            }
            
            $transactions = $transactions_result['data']['transactions'] ?? [];
            
            if (empty($transactions)) {
                throw new Exception('エクスポート対象のデータがありません');
            }
            
            // CSVファイル生成
            $csv_filename = $this->generateFileName('transactions', 'csv', $export_options);
            $csv_filepath = $this->export_dir . '/' . $csv_filename;
            
            $this->generateTransactionsCSV($transactions, $csv_filepath, $export_options);
            
            // ファイル情報記録
            $export_info = $this->recordExportInfo([
                'filename' => $csv_filename,
                'format' => 'csv',
                'type' => 'transactions',
                'record_count' => count($transactions),
                'filters' => $validated_filters,
                'options' => $export_options,
                'file_size' => filesize($csv_filepath)
            ]);
            
            kicho_log('info', '取引データCSVエクスポート完了', [
                'filename' => $csv_filename,
                'record_count' => count($transactions),
                'file_size' => filesize($csv_filepath),
                'export_id' => $export_info['export_id']
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => '取引データのCSVエクスポートが完了しました',
                'data' => [
                    'filename' => $csv_filename,
                    'file_path' => $csv_filepath,
                    'record_count' => count($transactions),
                    'file_size' => filesize($csv_filepath),
                    'download_url' => $this->generateDownloadUrl($csv_filename),
                    'export_id' => $export_info['export_id']
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', '取引データCSVエクスポート失敗', [
                'error' => $e->getMessage(),
                'filters' => $filters,
                'options' => $options
            ]);
            
            return [
                'status' => 'error',
                'message' => 'CSVエクスポートに失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('export_transactions_csv');
        }
    }
    
    /**
     * MFクラウド形式エクスポート
     * 
     * @param array $transaction_ids 取引ID配列
     * @param array $options オプション
     * @return array エクスポート結果
     */
    public function exportToMFFormat($transaction_ids, $options = [])
    {
        $this->kicho_performance_start('export_mf_format');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_write')) {
                throw new Exception('MFエクスポート権限がありません');
            }
            
            if (empty($transaction_ids) || !is_array($transaction_ids)) {
                throw new Exception('有効な取引IDが指定されていません');
            }
            
            // 取引データ取得・検証
            $transactions = $this->getTransactionsForExport($transaction_ids);
            
            if (empty($transactions)) {
                throw new Exception('エクスポート対象の取引が見つかりません');
            }
            
            // MF形式に変換
            $mf_format_data = $this->convertToMFFormat($transactions, $options);
            
            // ファイル出力
            $export_format = $options['format'] ?? 'csv';
            $filename = $this->generateFileName('mf_export', $export_format, $options);
            $filepath = $this->export_dir . '/' . $filename;
            
            switch ($export_format) {
                case 'csv':
                    $this->generateMFCSV($mf_format_data, $filepath);
                    break;
                case 'json':
                    $this->generateMFJSON($mf_format_data, $filepath);
                    break;
                default:
                    throw new Exception('サポートされていない出力形式です');
            }
            
            // 直接MFクラウドに送信（オプション）
            $send_result = null;
            if (!empty($options['send_to_mf'])) {
                $send_result = $this->mfApiService->sendJournalEntries($mf_format_data);
            }
            
            // エクスポート情報記録
            $export_info = $this->recordExportInfo([
                'filename' => $filename,
                'format' => $export_format,
                'type' => 'mf_format',
                'record_count' => count($transactions),
                'transaction_ids' => $transaction_ids,
                'options' => $options,
                'file_size' => filesize($filepath),
                'sent_to_mf' => !empty($options['send_to_mf'])
            ]);
            
            kicho_log('info', 'MF形式エクスポート完了', [
                'filename' => $filename,
                'record_count' => count($transactions),
                'format' => $export_format,
                'sent_to_mf' => !empty($options['send_to_mf']),
                'export_id' => $export_info['export_id']
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => 'MF形式エクスポートが完了しました',
                'data' => [
                    'filename' => $filename,
                    'file_path' => $filepath,
                    'record_count' => count($transactions),
                    'file_size' => filesize($filepath),
                    'download_url' => $this->generateDownloadUrl($filename),
                    'export_id' => $export_info['export_id'],
                    'mf_send_result' => $send_result
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'MF形式エクスポート失敗', [
                'error' => $e->getMessage(),
                'transaction_ids' => $transaction_ids,
                'options' => $options
            ]);
            
            return [
                'status' => 'error',
                'message' => 'MF形式エクスポートに失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('export_mf_format');
        }
    }
    
    /**
     * 仕訳帳エクスポート
     * 
     * @param string $date_from 開始日
     * @param string $date_to 終了日
     * @param array $options オプション
     * @return array エクスポート結果
     */
    public function exportJournalBook($date_from, $date_to, $options = [])
    {
        $this->kicho_performance_start('export_journal_book');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_read')) {
                throw new Exception('仕訳帳エクスポート権限がありません');
            }
            
            // 日付範囲バリデーション
            $this->validateDateRange($date_from, $date_to);
            
            // 仕訳データ取得
            $journal_data = $this->getJournalBookData($date_from, $date_to, $options);
            
            if (empty($journal_data)) {
                throw new Exception('指定期間の仕訳データがありません');
            }
            
            // 出力形式処理
            $format = $options['format'] ?? 'csv';
            $filename = $this->generateFileName('journal_book', $format, $options);
            $filepath = $this->export_dir . '/' . $filename;
            
            switch ($format) {
                case 'csv':
                    $this->generateJournalBookCSV($journal_data, $filepath, $options);
                    break;
                case 'pdf':
                    $this->generateJournalBookPDF($journal_data, $filepath, $options);
                    break;
                case 'excel':
                    $this->generateJournalBookExcel($journal_data, $filepath, $options);
                    break;
                default:
                    throw new Exception('サポートされていない出力形式です');
            }
            
            // エクスポート情報記録
            $export_info = $this->recordExportInfo([
                'filename' => $filename,
                'format' => $format,
                'type' => 'journal_book',
                'record_count' => count($journal_data),
                'date_from' => $date_from,
                'date_to' => $date_to,
                'options' => $options,
                'file_size' => filesize($filepath)
            ]);
            
            kicho_log('info', '仕訳帳エクスポート完了', [
                'filename' => $filename,
                'date_range' => "{$date_from} - {$date_to}",
                'record_count' => count($journal_data),
                'format' => $format,
                'export_id' => $export_info['export_id']
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => '仕訳帳エクスポートが完了しました',
                'data' => [
                    'filename' => $filename,
                    'file_path' => $filepath,
                    'record_count' => count($journal_data),
                    'file_size' => filesize($filepath),
                    'download_url' => $this->generateDownloadUrl($filename),
                    'export_id' => $export_info['export_id'],
                    'date_range' => "{$date_from} - {$date_to}"
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', '仕訳帳エクスポート失敗', [
                'error' => $e->getMessage(),
                'date_from' => $date_from,
                'date_to' => $date_to,
                'options' => $options
            ]);
            
            return [
                'status' => 'error',
                'message' => '仕訳帳エクスポートに失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('export_journal_book');
        }
    }
    
    /**
     * 統計レポートエクスポート
     * 
     * @param string $report_type レポート種別
     * @param array $parameters パラメータ
     * @return array エクスポート結果
     */
    public function exportStatisticsReport($report_type, $parameters = [])
    {
        $this->kicho_performance_start('export_statistics_report');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_read')) {
                throw new Exception('統計レポートエクスポート権限がありません');
            }
            
            // レポート種別バリデーション
            $valid_report_types = ['monthly_summary', 'automation_analysis', 'rule_performance', 'error_analysis'];
            
            if (!in_array($report_type, $valid_report_types)) {
                throw new Exception('無効なレポート種別です');
            }
            
            // 統計データ取得
            $statistics_data = $this->getStatisticsData($report_type, $parameters);
            
            if (empty($statistics_data)) {
                throw new Exception('統計データが見つかりません');
            }
            
            // レポート生成
            $format = $parameters['format'] ?? 'pdf';
            $filename = $this->generateFileName("report_{$report_type}", $format, $parameters);
            $filepath = $this->export_dir . '/' . $filename;
            
            switch ($format) {
                case 'pdf':
                    $this->generateStatisticsPDF($statistics_data, $filepath, $report_type, $parameters);
                    break;
                case 'excel':
                    $this->generateStatisticsExcel($statistics_data, $filepath, $report_type, $parameters);
                    break;
                case 'csv':
                    $this->generateStatisticsCSV($statistics_data, $filepath, $report_type, $parameters);
                    break;
                default:
                    throw new Exception('サポートされていない出力形式です');
            }
            
            // エクスポート情報記録
            $export_info = $this->recordExportInfo([
                'filename' => $filename,
                'format' => $format,
                'type' => 'statistics_report',
                'report_type' => $report_type,
                'parameters' => $parameters,
                'file_size' => filesize($filepath)
            ]);
            
            kicho_log('info', '統計レポートエクスポート完了', [
                'filename' => $filename,
                'report_type' => $report_type,
                'format' => $format,
                'export_id' => $export_info['export_id']
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => '統計レポートエクスポートが完了しました',
                'data' => [
                    'filename' => $filename,
                    'file_path' => $filepath,
                    'file_size' => filesize($filepath),
                    'download_url' => $this->generateDownloadUrl($filename),
                    'export_id' => $export_info['export_id'],
                    'report_type' => $report_type
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', '統計レポートエクスポート失敗', [
                'error' => $e->getMessage(),
                'report_type' => $report_type,
                'parameters' => $parameters
            ]);
            
            return [
                'status' => 'error',
                'message' => '統計レポートエクスポートに失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('export_statistics_report');
        }
    }
    
    /**
     * バックアップデータ生成
     * 
     * @param array $options バックアップオプション
     * @return array バックアップ結果
     */
    public function createBackup($options = [])
    {
        $this->kicho_performance_start('create_backup');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_admin')) {
                throw new Exception('バックアップ作成権限がありません');
            }
            
            $backup_id = $this->generateBackupId();
            $tenant_id = $this->getCurrentTenantId();
            
            // バックアップ対象データ取得
            $backup_data = [
                'transactions' => $this->getAllTransactionsForBackup($tenant_id),
                'rules' => $this->getAllRulesForBackup($tenant_id),
                'learning_data' => $this->getAllLearningDataForBackup($tenant_id),
                'statistics' => $this->getAllStatisticsForBackup($tenant_id)
            ];
            
            // バックアップファイル生成
            $backup_filename = "backup_{$backup_id}.json";
            $backup_filepath = $this->export_dir . '/' . $backup_filename;
            
            $backup_content = [
                'backup_id' => $backup_id,
                'created_at' => date('Y-m-d H:i:s'),
                'tenant_id' => $tenant_id,
                'version' => '1.0',
                'data' => $backup_data,
                'metadata' => [
                    'total_transactions' => count($backup_data['transactions']),
                    'total_rules' => count($backup_data['rules']),
                    'total_learning_samples' => count($backup_data['learning_data']),
                    'backup_options' => $options
                ]
            ];
            
            file_put_contents($backup_filepath, json_encode($backup_content, JSON_PRETTY_PRINT));
            
            // 圧縮（オプション）
            if (!empty($options['compress'])) {
                $compressed_filepath = $backup_filepath . '.gz';
                $this->compressFile($backup_filepath, $compressed_filepath);
                unlink($backup_filepath);
                $backup_filepath = $compressed_filepath;
                $backup_filename .= '.gz';
            }
            
            // バックアップ情報記録
            $backup_info = $this->recordBackupInfo([
                'backup_id' => $backup_id,
                'filename' => $backup_filename,
                'file_size' => filesize($backup_filepath),
                'record_counts' => $backup_content['metadata'],
                'options' => $options
            ]);
            
            kicho_log('info', 'バックアップ作成完了', [
                'backup_id' => $backup_id,
                'filename' => $backup_filename,
                'file_size' => filesize($backup_filepath),
                'total_records' => array_sum([
                    count($backup_data['transactions']),
                    count($backup_data['rules']),
                    count($backup_data['learning_data']),
                    count($backup_data['statistics'])
                ])
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => 'バックアップが正常に作成されました',
                'data' => [
                    'backup_id' => $backup_id,
                    'filename' => $backup_filename,
                    'file_path' => $backup_filepath,
                    'file_size' => filesize($backup_filepath),
                    'download_url' => $this->generateDownloadUrl($backup_filename),
                    'record_counts' => $backup_content['metadata']
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'バックアップ作成失敗', [
                'error' => $e->getMessage(),
                'options' => $options
            ]);
            
            return [
                'status' => 'error',
                'message' => 'バックアップ作成に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('create_backup');
        }
    }
    
    /**
     * エクスポート履歴取得
     * 
     * @param array $filters フィルター条件
     * @return array エクスポート履歴
     */
    public function getExportHistory($filters = [])
    {
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_read')) {
                throw new Exception('エクスポート履歴閲覧権限がありません');
            }
            
            $tenant_id = $this->getCurrentTenantId();
            
            // 基本条件
            $where_conditions = ['tenant_id = ?'];
            $params = [$tenant_id];
            
            // フィルター追加
            if (!empty($filters['type'])) {
                $where_conditions[] = 'type = ?';
                $params[] = $filters['type'];
            }
            
            if (!empty($filters['format'])) {
                $where_conditions[] = 'format = ?';
                $params[] = $filters['format'];
            }
            
            if (!empty($filters['date_from'])) {
                $where_conditions[] = 'created_at >= ?';
                $params[] = $filters['date_from'] . ' 00:00:00';
            }
            
            if (!empty($filters['date_to'])) {
                $where_conditions[] = 'created_at <= ?';
                $params[] = $filters['date_to'] . ' 23:59:59';
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            $query = "SELECT 
                export_id, filename, format, type, record_count,
                file_size, created_at, created_by, options
            FROM kicho_export_history 
            WHERE {$where_clause}
            ORDER BY created_at DESC
            LIMIT 100";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // ファイル存在確認・ダウンロードURL追加
            foreach ($history as &$record) {
                $file_path = $this->export_dir . '/' . $record['filename'];
                $record['file_exists'] = file_exists($file_path);
                $record['download_url'] = $record['file_exists'] ? 
                    $this->generateDownloadUrl($record['filename']) : null;
                $record['options'] = json_decode($record['options'], true) ?: [];
            }
            
            return [
                'status' => 'success',
                'message' => 'エクスポート履歴を取得しました',
                'data' => [
                    'history' => $history,
                    'total_count' => count($history)
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'エクスポート履歴取得失敗', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            
            return [
                'status' => 'error',
                'message' => 'エクスポート履歴取得に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        }
    }
    
    /**
     * 取引CSVファイル生成
     * 
     * @param array $transactions 取引データ
     * @param string $filepath ファイルパス
     * @param array $options オプション
     */
    private function generateTransactionsCSV($transactions, $filepath, $options)
    {
        $fp = fopen($filepath, 'w');
        
        // BOM付加（Excel対応）
        if (!empty($options['excel_compatible'])) {
            fwrite($fp, "\xEF\xBB\xBF");
        }
        
        // ヘッダー行
        $headers = [
            '取引ID', '取引日', '取引No', '摘要', '金額',
            '借方勘定科目', '借方補助科目', '借方部門',
            '貸方勘定科目', '貸方補助科目', '貸方部門',
            'ステータス', '適用ルール', '信頼度', '作成日時'
        ];
        
        fputcsv($fp, $headers);
        
        // データ行
        foreach ($transactions as $transaction) {
            $row = [
                $transaction['transaction_id'],
                $transaction['transaction_date'],
                $transaction['transaction_no'],
                $transaction['description'],
                $transaction['amount'],
                $transaction['debit_account'],
                $transaction['debit_sub_account'] ?? '',
                $transaction['debit_department'] ?? '',
                $transaction['credit_account'],
                $transaction['credit_sub_account'] ?? '',
                $transaction['credit_department'] ?? '',
                $transaction['status'],
                $transaction['applied_rule_name'] ?? '',
                $transaction['confidence'] ?? '',
                $transaction['created_at']
            ];
            
            fputcsv($fp, $row);
        }
        
        fclose($fp);
    }
    
    /**
     * ファイル名生成
     * 
     * @param string $type ファイル種別
     * @param string $format 出力形式
     * @param array $options オプション
     * @return string ファイル名
     */
    private function generateFileName($type, $format, $options)
    {
        $timestamp = date('Ymd_His');
        $tenant_id = $this->getCurrentTenantId();
        
        $filename = "{$type}_{$tenant_id}_{$timestamp}";
        
        if (!empty($options['suffix'])) {
            $filename .= "_{$options['suffix']}";
        }
        
        return "{$filename}.{$format}";
    }
    
    /**
     * ダウンロードURL生成
     * 
     * @param string $filename ファイル名
     * @return string ダウンロードURL
     */
    private function generateDownloadUrl($filename)
    {
        return "/api/kicho/download?file=" . urlencode($filename) . "&token=" . $this->generateDownloadToken($filename);
    }
    
    /**
     * ダウンロードトークン生成
     * 
     * @param string $filename ファイル名
     * @return string ダウンロードトークン
     */
    private function generateDownloadToken($filename)
    {
        $data = $filename . '|' . $this->getCurrentUserId() . '|' . time();
        return base64_encode($data);
    }
    
    /**
     * エクスポート情報記録
     * 
     * @param array $export_data エクスポートデータ
     * @return array 記録結果
     */
    private function recordExportInfo($export_data)
    {
        $export_id = $this->generateUUID();
        
        $query = "INSERT INTO kicho_export_history (
            export_id, filename, format, type, record_count,
            file_size, options, tenant_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            $export_id,
            $export_data['filename'],
            $export_data['format'],
            $export_data['type'],
            $export_data['record_count'] ?? 0,
            $export_data['file_size'] ?? 0,
            json_encode($export_data['options'] ?? []),
            $this->getCurrentTenantId(),
            $this->getCurrentUserId()
        ]);
        
        return ['export_id' => $export_id];
    }
    
    /**
     * エクスポートディレクトリ確保
     */
    private function ensureExportDirectory()
    {
        if (!is_dir($this->export_dir)) {
            mkdir($this->export_dir, 0755, true);
        }
        
        // .htaccess設置（直接アクセス防止）
        $htaccess_path = $this->export_dir . '/.htaccess';
        if (!file_exists($htaccess_path)) {
            file_put_contents($htaccess_path, "Deny from all\n");
        }
    }
    
    /**
     * 古いファイルクリーンアップ
     */
    private function cleanupOldFiles()
    {
        $cutoff_time = time() - ($this->file_retention_days * 24 * 60 * 60);
        
        $files = glob($this->export_dir . '/*');
        foreach ($files as $file) {
            if (is_file($file) && filemtime($file) < $cutoff_time) {
                unlink($file);
            }
        }
    }
    
    // 簡略化された補助メソッド（実装予定）
    private function validateFilters($filters) { return $filters; }
    private function processExportOptions($options) { return $options; }
    private function getTransactionsForExport($transaction_ids) { return []; }
    private function convertToMFFormat($transactions, $options) { return []; }
    private function generateMFCSV($data, $filepath) { return true; }
    private function generateMFJSON($data, $filepath) { return true; }
    private function validateDateRange($date_from, $date_to) { return true; }
    private function getJournalBookData($date_from, $date_to, $options) { return []; }
    private function generateJournalBookCSV($data, $filepath, $options) { return true; }
    private function generateJournalBookPDF($data, $filepath, $options) { return true; }
    private function generateJournalBookExcel($data, $filepath, $options) { return true; }
    private function getStatisticsData($report_type, $parameters) { return []; }
    private function generateStatisticsPDF($data, $filepath, $report_type, $parameters) { return true; }
    private function generateStatisticsExcel($data, $filepath, $report_type, $parameters) { return true; }
    private function generateStatisticsCSV($data, $filepath, $report_type, $parameters) { return true; }
    private function getAllTransactionsForBackup($tenant_id) { return []; }
    private function getAllRulesForBackup($tenant_id) { return []; }
    private function getAllLearningDataForBackup($tenant_id) { return []; }
    private function getAllStatisticsForBackup($tenant_id) { return []; }
    private function generateBackupId() { return 'backup_' . date('Ymd_His') . '_' . mt_rand(1000, 9999); }
    private function compressFile($source, $destination) { return true; }
    private function recordBackupInfo($backup_data) { return ['backup_id' => $backup_data['backup_id']]; }
    
    /**
     * UUID生成
     * 
     * @return string UUID
     */
    private function generateUUID()
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
    
    /**
     * 現在のテナントID取得
     * 
     * @return string テナントID
     */
    private function getCurrentTenantId()
    {
        return $_SESSION['tenant_id'] ?? 'default';
    }
    
    /**
     * 現在のユーザーID取得
     * 
     * @return string ユーザーID
     */
    private function getCurrentUserId()
    {
        return $_SESSION['user_id'] ?? 'system';
    }
}

?>