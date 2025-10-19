<?php
/**
 * 📁 ファイル一覧API
 * Claude Hooks PHP統合 - セキュリティ重視設計
 */

require_once '../config/config.php';

// CORSヘッダー設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// GETリクエストのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Method not allowed', 405);
}

// レート制限チェック
if (!checkRateLimit('file_list', 60)) {
    errorResponse('Rate limit exceeded', 429);
}

try {
    // パラメータ取得・検証
    $path = $_GET['path'] ?? '/';
    $search = $_GET['search'] ?? '';
    $sortBy = $_GET['sort'] ?? 'name';
    $sortOrder = $_GET['order'] ?? 'asc';
    
    // セキュリティ: パス検証
    if (strpos($path, '..') !== false || strpos($path, '\\') !== false) {
        errorResponse('Invalid path', 400);
    }
    
    // パス正規化
    $path = '/' . trim($path, '/');
    if ($path !== '/') {
        $path .= '/';
    }
    
    $uploadDir = UPLOAD_DIR;
    $fullPath = $uploadDir . ltrim($path, '/');
    
    // ディレクトリ存在チェック
    if (!is_dir($fullPath)) {
        errorResponse('Directory not found', 404);
    }
    
    // ファイル一覧取得
    $files = [];
    $directories = [];
    $items = scandir($fullPath);
    
    if ($items === false) {
        errorResponse('Cannot read directory', 500);
    }
    
    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || $item === '.htaccess') {
            continue;
        }
        
        $itemPath = $fullPath . $item;
        $relativePath = $path . $item;
        
        // 隠しファイルスキップ（設定で表示可能）
        if (strpos($item, '.') === 0 && !($_GET['show_hidden'] ?? false)) {
            continue;
        }
        
        // 検索フィルター
        if (!empty($search) && stripos($item, $search) === false) {
            continue;
        }
        
        try {
            $stat = stat($itemPath);
            if ($stat === false) {
                continue;
            }
            
            $itemInfo = [
                'name' => $item,
                'path' => $relativePath,
                'size' => $stat['size'],
                'modified' => $stat['mtime'],
                'permissions' => substr(sprintf('%o', fileperms($itemPath)), -4),
                'isDirectory' => is_dir($itemPath)
            ];
            
            if (is_file($itemPath)) {
                // ファイルの詳細情報
                $itemInfo['type'] = mime_content_type($itemPath) ?: 'application/octet-stream';
                $itemInfo['extension'] = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                $itemInfo['isReadable'] = is_readable($itemPath);
                $itemInfo['isWritable'] = is_writable($itemPath);
                
                // 画像の場合は追加情報
                if (strpos($itemInfo['type'], 'image/') === 0) {
                    $imageInfo = @getimagesize($itemPath);
                    if ($imageInfo) {
                        $itemInfo['width'] = $imageInfo[0];
                        $itemInfo['height'] = $imageInfo[1];
                        $itemInfo['aspectRatio'] = round($imageInfo[0] / $imageInfo[1], 2);
                    }
                }
                
                $files[] = $itemInfo;
                
            } elseif (is_dir($itemPath)) {
                // ディレクトリ内のファイル数カウント
                $dirItems = @scandir($itemPath);
                $itemInfo['itemCount'] = $dirItems ? count($dirItems) - 2 : 0; // . と .. を除く
                $itemInfo['type'] = 'directory';
                
                $directories[] = $itemInfo;
            }
            
        } catch (Exception $e) {
            logMessage("ファイル情報取得エラー: {$itemPath} - " . $e->getMessage(), 'ERROR');
            continue;
        }
    }
    
    // ソート処理
    $sortFunction = function($a, $b) use ($sortBy, $sortOrder) {
        $modifier = $sortOrder === 'desc' ? -1 : 1;
        
        switch ($sortBy) {
            case 'size':
                return ($a['size'] <=> $b['size']) * $modifier;
            case 'modified':
                return ($a['modified'] <=> $b['modified']) * $modifier;
            case 'type':
                $aType = $a['type'] ?? '';
                $bType = $b['type'] ?? '';
                return strcasecmp($aType, $bType) * $modifier;
            case 'name':
            default:
                return strcasecmp($a['name'], $b['name']) * $modifier;
        }
    };
    
    usort($files, $sortFunction);
    usort($directories, $sortFunction);
    
    // ディレクトリを先に表示
    $allItems = array_merge($directories, $files);
    
    // 統計情報
    $stats = [
        'totalFiles' => count($files),
        'totalDirectories' => count($directories),
        'totalSize' => array_sum(array_column($files, 'size')),
        'currentPath' => $path,
        'lastModified' => !empty($allItems) ? max(array_column($allItems, 'modified')) : time()
    ];
    
    // パンくずリスト生成
    $breadcrumbs = [];
    if ($path !== '/') {
        $pathParts = explode('/', trim($path, '/'));
        $currentPath = '/';
        
        $breadcrumbs[] = [
            'name' => 'ホーム',
            'path' => '/',
            'icon' => '🏠'
        ];
        
        foreach ($pathParts as $part) {
            if (!empty($part)) {
                $currentPath .= $part . '/';
                $breadcrumbs[] = [
                    'name' => $part,
                    'path' => $currentPath,
                    'icon' => '📁'
                ];
            }
        }
    } else {
        $breadcrumbs[] = [
            'name' => 'ホーム',
            'path' => '/',
            'icon' => '🏠'
        ];
    }
    
    // レスポンス生成
    $response = [
        'files' => $allItems,
        'stats' => $stats,
        'breadcrumbs' => $breadcrumbs,
        'pagination' => [
            'total' => count($allItems),
            'offset' => 0,
            'limit' => count($allItems)
        ],
        'filters' => [
            'search' => $search,
            'sortBy' => $sortBy,
            'sortOrder' => $sortOrder
        ]
    ];
    
    logMessage("ファイル一覧取得成功: {$path} ({$stats['totalFiles']}ファイル, {$stats['totalDirectories']}ディレクトリ)");
    
    successResponse($response, 'Files retrieved successfully');
    
} catch (Exception $e) {
    logMessage("ファイル一覧取得エラー: " . $e->getMessage(), 'ERROR');
    errorResponse('Server error occurred', 500, $e->getMessage());
}
?>
