<?php
/**
 * Wisdom Core クラス
 * コードベース分析・分類エンジン
 */

require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/ApiResponse.php';

class WisdomCore {
    private $db;
    private $config;
    private $tableName = 'code_map';
    private $historyTable = 'code_map_history';
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->config = require __DIR__ . '/../config.php';
    }
    
    /**
     * プロジェクト全体をスキャン
     */
    public function scanProject() {
        $basePath = $this->config['scan']['base_path'];
        $stats = [
            'scanned' => 0,
            'new' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => 0
        ];
        
        try {
            $files = $this->scanDirectory($basePath);
            
            foreach ($files as $filePath) {
                $stats['scanned']++;
                
                try {
                    $result = $this->processFile($filePath);
                    
                    if ($result === 'new') {
                        $stats['new']++;
                    } elseif ($result === 'updated') {
                        $stats['updated']++;
                    } else {
                        $stats['skipped']++;
                    }
                } catch (Exception $e) {
                    $stats['errors']++;
                    error_log("Error processing file {$filePath}: " . $e->getMessage());
                }
            }
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("Scan project error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * ディレクトリを再帰的にスキャン
     */
    private function scanDirectory($dir) {
        $files = [];
        $excludeDirs = $this->config['scan']['exclude_dirs'];
        $excludeFiles = $this->config['scan']['exclude_files'];
        $targetExtensions = $this->config['scan']['target_extensions'];
        
        if (!is_dir($dir)) {
            return $files;
        }
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $path = $file->getPathname();
                $filename = $file->getFilename();
                
                // 除外ファイルチェック
                if (in_array($filename, $excludeFiles)) {
                    continue;
                }
                
                // 除外ディレクトリチェック
                $skip = false;
                foreach ($excludeDirs as $excludeDir) {
                    if (strpos($path, '/' . $excludeDir . '/') !== false) {
                        $skip = true;
                        break;
                    }
                }
                if ($skip) continue;
                
                // 拡張子チェック
                $ext = '.' . $file->getExtension();
                if (!in_array($ext, $targetExtensions)) {
                    continue;
                }
                
                // ファイルサイズチェック
                if ($file->getSize() > $this->config['scan']['max_file_size']) {
                    continue;
                }
                
                $files[] = $path;
            }
        }
        
        return $files;
    }
    
    /**
     * 個別ファイルを処理
     */
    private function processFile($filePath) {
        $basePath = $this->config['scan']['base_path'];
        $relativePath = str_replace($basePath, '', $filePath);
        $filename = basename($filePath);
        $lastModified = filemtime($filePath);
        $fileSize = filesize($filePath);
        
        // 既存レコードチェック
        $existing = $this->db->select($this->tableName, ['path' => $relativePath]);
        
        if (!empty($existing)) {
            $existing = $existing[0];
            
            // 更新日時比較
            $existingTimestamp = strtotime($existing['last_modified']);
            if ($existingTimestamp >= $lastModified) {
                return 'skipped'; // 変更なし
            }
            
            // 更新処理
            return $this->updateFile($existing['id'], $filePath, $relativePath, $filename, $lastModified, $fileSize);
            
        } else {
            // 新規登録
            return $this->insertFile($filePath, $relativePath, $filename, $lastModified, $fileSize);
        }
    }
    
    /**
     * 新規ファイル登録
     */
    private function insertFile($filePath, $relativePath, $filename, $lastModified, $fileSize) {
        $content = file_get_contents($filePath);
        $analysis = $this->analyzeFile($filePath, $content);
        
        $data = [
            'project_name' => 'n3-frontend',
            'path' => $relativePath,
            'file_name' => $filename,
            'tool_type' => $analysis['tool_type'],
            'category' => $analysis['category'],
            'description_simple' => $analysis['description_simple'],
            'description_detailed' => $analysis['description_detailed'],
            'main_features' => json_encode($analysis['main_features']),
            'tech_stack' => $analysis['tech_stack'],
            'ui_location' => $analysis['ui_location'],
            'dependencies' => json_encode($analysis['dependencies']),
            'content' => $content,
            'file_size' => $fileSize,
            'last_modified' => date('Y-m-d H:i:s', $lastModified),
            'last_analyzed' => date('Y-m-d H:i:s')
        ];
        
        $this->db->insert($this->tableName, $data);
        return 'new';
    }
    
    /**
     * ファイル更新
     */
    private function updateFile($id, $filePath, $relativePath, $filename, $lastModified, $fileSize) {
        $content = file_get_contents($filePath);
        $analysis = $this->analyzeFile($filePath, $content);
        
        // 既存の説明を取得（履歴用）
        $existing = $this->db->select($this->tableName, ['id' => $id])[0];
        
        $data = [
            'tool_type' => $analysis['tool_type'],
            'category' => $analysis['category'],
            'description_simple' => $analysis['description_simple'],
            'description_detailed' => $analysis['description_detailed'],
            'main_features' => json_encode($analysis['main_features']),
            'tech_stack' => $analysis['tech_stack'],
            'ui_location' => $analysis['ui_location'],
            'dependencies' => json_encode($analysis['dependencies']),
            'content' => $content,
            'file_size' => $fileSize,
            'last_modified' => date('Y-m-d H:i:s', $lastModified),
            'last_analyzed' => date('Y-m-d H:i:s')
        ];
        
        $this->db->update($this->tableName, $data, ['id' => $id]);
        
        // 履歴記録
        if ($existing['description_simple'] !== $analysis['description_simple']) {
            $this->db->insert($this->historyTable, [
                'code_map_id' => $id,
                'old_description' => $existing['description_simple'],
                'new_description' => $analysis['description_simple'],
                'changed_by' => 'auto',
                'change_reason' => 'File modified'
            ]);
        }
        
        return 'updated';
    }
    
    /**
     * ファイル分析（AI風の自動分類）
     */
    private function analyzeFile($filePath, $content) {
        $filename = basename($filePath);
        $ext = pathinfo($filePath, PATHINFO_EXTENSION);
        $relativePath = str_replace($this->config['scan']['base_path'], '', $filePath);
        
        $analysis = [
            'tool_type' => '不明',
            'category' => 'unknown',
            'description_simple' => '',
            'description_detailed' => '',
            'main_features' => [],
            'tech_stack' => '',
            'ui_location' => '',
            'dependencies' => []
        ];
        
        // カテゴリ判定
        if (strpos($relativePath, '/01_dashboard/') !== false) {
            $analysis['category'] = 'dashboard';
            $analysis['tool_type'] = 'ダッシュボード';
            $analysis['description_simple'] = 'メインダッシュボード画面';
        } elseif (strpos($relativePath, '/02_scraping/') !== false) {
            $analysis['category'] = 'scraping';
            $analysis['tool_type'] = 'データ収集ツール';
            $analysis['description_simple'] = 'Yahoo Auctionからデータを収集するツール';
        } elseif (strpos($relativePath, '/07_editing/') !== false) {
            $analysis['category'] = 'editing';
            $analysis['tool_type'] = 'データ編集ツール';
            $analysis['description_simple'] = '商品データを編集・削除・出力するツール';
        } elseif (strpos($relativePath, '/08_wisdom_core/') !== false) {
            $analysis['category'] = 'wisdom_core';
            $analysis['tool_type'] = 'コードベース理解システム';
            $analysis['description_simple'] = 'プロジェクトのコードを分析・理解するツール';
        } elseif (strpos($relativePath, '/api/') !== false) {
            $analysis['category'] = 'api';
            $analysis['tool_type'] = 'APIエンドポイント';
        } elseif (strpos($relativePath, '/includes/') !== false || strpos($relativePath, '/class/') !== false) {
            $analysis['category'] = 'class';
            $analysis['tool_type'] = 'ロジッククラス';
        } elseif (strpos($relativePath, '/shared/') !== false) {
            $analysis['category'] = 'shared';
            $analysis['tool_type'] = '共有ライブラリ';
        } elseif ($filename === 'config.php') {
            $analysis['category'] = 'config';
            $analysis['tool_type'] = '設定ファイル';
        }
        
        // 技術スタック判定
        if ($ext === 'php') {
            $analysis['tech_stack'] = 'PHP';
            if (strpos($content, 'class ') !== false) {
                $analysis['tech_stack'] .= ' (Class)';
            }
        } elseif ($ext === 'js' || $ext === 'jsx') {
            $analysis['tech_stack'] = 'JavaScript';
        } elseif ($ext === 'css') {
            $analysis['tech_stack'] = 'CSS';
        } elseif ($ext === 'sql') {
            $analysis['tech_stack'] = 'SQL';
        } elseif ($ext === 'md') {
            $analysis['tech_stack'] = 'Markdown';
        }
        
        // 機能抽出（簡易版）
        if (strpos($content, 'function ') !== false || strpos($content, 'public function') !== false) {
            preg_match_all('/(?:public |private |protected )?function\s+(\w+)/i', $content, $matches);
            if (!empty($matches[1])) {
                $analysis['main_features'] = array_slice(array_unique($matches[1]), 0, 10);
            }
        }
        
        // 依存関係抽出
        if (strpos($content, 'require') !== false || strpos($content, 'include') !== false) {
            preg_match_all('/(?:require|include)(?:_once)?\s+[\'"]([^\'"]+)[\'"]/i', $content, $matches);
            if (!empty($matches[1])) {
                $analysis['dependencies'] = array_unique($matches[1]);
            }
        }
        
        return $analysis;
    }
    
    /**
     * ファイル一覧取得
     */
    public function getFiles($filters = [], $page = 1, $limit = 50) {
        try {
            $offset = ($page - 1) * $limit;
            $conditions = [];
            
            if (!empty($filters['category'])) {
                $conditions['category'] = $filters['category'];
            }
            
            if (!empty($filters['keyword'])) {
                // 全文検索
                $keyword = '%' . $filters['keyword'] . '%';
                $sql = "SELECT * FROM {$this->tableName} 
                       WHERE (path ILIKE ? OR file_name ILIKE ? OR description_simple ILIKE ? OR content ILIKE ?)
                       ORDER BY last_modified DESC 
                       LIMIT ? OFFSET ?";
                
                $stmt = $this->db->query($sql, [$keyword, $keyword, $keyword, $keyword, $limit, $offset]);
                $files = $stmt->fetchAll();
                
                $countSql = "SELECT COUNT(*) as total FROM {$this->tableName} 
                            WHERE (path ILIKE ? OR file_name ILIKE ? OR description_simple ILIKE ? OR content ILIKE ?)";
                $countStmt = $this->db->query($countSql, [$keyword, $keyword, $keyword, $keyword]);
                $total = $countStmt->fetch()['total'];
                
            } else {
                $files = $this->db->select($this->tableName, $conditions, [
                    'order' => 'last_modified DESC',
                    'limit' => $limit,
                    'offset' => $offset
                ]);
                
                $total = $this->db->count($this->tableName, $conditions);
            }
            
            return [
                'files' => $files,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ];
            
        } catch (Exception $e) {
            error_log("Get files error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * ファイル詳細取得
     */
    public function getFile($id) {
        try {
            $file = $this->db->select($this->tableName, ['id' => $id]);
            
            if (empty($file)) {
                throw new Exception('File not found');
            }
            
            return $file[0];
            
        } catch (Exception $e) {
            error_log("Get file error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * フォルダツリー構造取得
     */
    public function getTreeStructure() {
        try {
            $files = $this->db->select($this->tableName, [], ['order' => 'path ASC']);
            
            $tree = [];
            foreach ($files as $file) {
                $parts = explode('/', trim($file['path'], '/'));
                $this->addToTree($tree, $parts, $file);
            }
            
            return $tree;
            
        } catch (Exception $e) {
            error_log("Get tree structure error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * ツリー構造に追加
     */
    private function addToTree(&$tree, $parts, $file) {
        if (empty($parts)) {
            return;
        }
        
        $current = array_shift($parts);
        
        if (!isset($tree[$current])) {
            $tree[$current] = [
                'name' => $current,
                'type' => empty($parts) ? 'file' : 'folder',
                'children' => [],
                'data' => empty($parts) ? $file : null
            ];
        }
        
        if (!empty($parts)) {
            $this->addToTree($tree[$current]['children'], $parts, $file);
        }
    }
    
    /**
     * JSON形式でエクスポート
     */
    public function exportToJson() {
        try {
            $files = $this->db->select($this->tableName, [], ['order' => 'path ASC']);
            
            $export = [];
            foreach ($files as $file) {
                $export[] = [
                    'path' => $file['path'],
                    'title' => $file['tool_type'],
                    'description_level_h' => $file['description_simple'],
                    'last_updated' => $file['last_analyzed']
                ];
            }
            
            return json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            
        } catch (Exception $e) {
            error_log("Export to JSON error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 統計情報取得
     */
    public function getStats() {
        try {
            $total = $this->db->count($this->tableName);
            
            $sql = "SELECT category, COUNT(*) as count FROM {$this->tableName} GROUP BY category";
            $stmt = $this->db->query($sql);
            $byCategory = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            $sql = "SELECT tech_stack, COUNT(*) as count FROM {$this->tableName} GROUP BY tech_stack";
            $stmt = $this->db->query($sql);
            $byTech = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            return [
                'total' => $total,
                'by_category' => $byCategory,
                'by_tech' => $byTech
            ];
            
        } catch (Exception $e) {
            error_log("Get stats error: " . $e->getMessage());
            return [
                'total' => 0,
                'by_category' => [],
                'by_tech' => []
            ];
        }
    }
}
?>
