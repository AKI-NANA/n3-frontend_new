/**
 * 生SQL実行
 */
function executeRawSQL($pdo, $sql) {
    try {
        // SELECT文のみ許可（安全性のため）
        if (!preg_match('/^\s*SELECT\s+/i', trim($sql))) {
            throw new Exception('SELECT文のみ実行可能です');
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (PDOException $e) {
        throw new Exception('SQL実行エラー: ' . $e->getMessage());
    }
}