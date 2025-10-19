<?php
/**
 * フィルター判定API - 統合モーダル用
 * 簡易版エンドポイント
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // リクエストデータ取得
    $input = json_decode(file_get_contents('php://input'), true);
    
    $title = $input['title'] ?? '';
    $description = $input['description'] ?? '';
    $category = $input['category'] ?? '';
    $price = floatval($input['price'] ?? 0);
    
    // 基本的なフィルタリングロジック
    $blockedKeywords = [];
    $score = 100;
    $passed = true;
    
    // NGキーワードチェック（簡易版）
    $ngKeywords = [
        'replica', 'fake', 'counterfeit', 'copy', 'bootleg',
        '偽物', 'コピー', 'レプリカ', '海賊版'
    ];
    
    $searchText = strtolower($title . ' ' . $description);
    
    foreach ($ngKeywords as $keyword) {
        if (stripos($searchText, strtolower($keyword)) !== false) {
            $blockedKeywords[] = $keyword;
            $score -= 30;
        }
    }
    
    // 価格チェック
    if ($price < 100) {
        $score -= 20;
    }
    
    // 最終判定
    if ($score < 50) {
        $passed = false;
    }
    
    $response = [
        'success' => true,
        'data' => [
            'passed' => $passed,
            'score' => max(0, $score),
            'blocked_keywords' => $blockedKeywords,
            'warnings' => [],
            'checked_at' => date('Y-m-d H:i:s')
        ]
    ];
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage()
    ];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
