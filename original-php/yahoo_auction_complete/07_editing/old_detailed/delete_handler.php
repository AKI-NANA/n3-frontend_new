<?php
/**
 * 削除機能専用ファイル
 */

header('Content-Type: application/json; charset=UTF-8');

if ($_POST['action'] === 'delete_items') {
    try {
        $item_ids = json_decode($_POST['item_ids'] ?? '[]', true);
        
        if (empty($item_ids) || !is_array($item_ids)) {
            echo json_encode(['success' => false, 'message' => '削除するアイテムIDが指定されていません']);
            exit;
        }
        
        $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'Kn240914');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $placeholders = implode(',', array_fill(0, count($item_ids), '?'));
        $sql = "DELETE FROM yahoo_scraped_products WHERE id IN ($placeholders)";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($item_ids);
        
        if ($result) {
            $deleted_count = $stmt->rowCount();
            echo json_encode([
                'success' => true, 
                'message' => "{$deleted_count}件のアイテムを削除しました",
                'deleted_count' => $deleted_count
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => '削除に失敗しました']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => '削除エラー: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => '無効なアクション']);
}
?>
