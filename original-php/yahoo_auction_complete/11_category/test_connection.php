<?php
/**
 * Supabase接続テスト
 */

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/backend/config/supabase.php';
    $pdo = getSupabaseConnection();
    
    // テーブル確認
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM category_keywords WHERE category_id = '183454'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Supabase接続成功',
        'pokemon_keywords_count' => $result['count']
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
