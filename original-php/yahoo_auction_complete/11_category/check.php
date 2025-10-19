<?php
header('Content-Type: ' . (isset($_GET['json']) ? 'application/json' : 'text/html') . '; charset=utf-8');

try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // テーブル存在確認
    $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'fee_matches'");
    $tableExists = $stmt->fetchColumn() > 0;
    
    if ($tableExists) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM fee_matches");
        $totalCount = $stmt->fetchColumn();
        
        $avgConfidence = 0;
        if ($totalCount > 0) {
            $stmt = $pdo->query("SELECT AVG(confidence) FROM fee_matches");
            $avgConfidence = round($stmt->fetchColumn(), 1);
        }
        
        if (isset($_GET['json'])) {
            // JSON応答
            echo json_encode([
                'success' => true,
                'total' => $totalCount,
                'matched' => $totalCount,
                'avg_confidence' => $avgConfidence
            ]);
        } else {
            // HTML応答
            echo "<h1>🏷️ eBay手数料データベース状況</h1>";
            echo "<div style='background: #d1fae5; padding: 15px; border-radius: 8px; margin: 10px 0;'>";
            echo "✅ データベース接続: OK<br>";
            echo "📊 手数料データ: <strong>{$totalCount}件</strong><br>";
            echo "📈 平均信頼度: <strong>{$avgConfidence}%</strong>";
            echo "</div>";
            
            if ($totalCount > 0) {
                echo "<h2>📋 サンプルデータ</h2>";
                echo "<table border='1' style='width:100%; border-collapse: collapse;'>";
                echo "<tr style='background: #f7fafc;'><th>ID</th><th>カテゴリーパス</th><th>手数料率</th><th>信頼度</th></tr>";
                
                $stmt = $pdo->query("SELECT * FROM fee_matches ORDER BY confidence DESC LIMIT 10");
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $confidenceColor = $row['confidence'] >= 80 ? '#d1fae5' : 
                                     ($row['confidence'] >= 60 ? '#fef3c7' : '#fee2e2');
                    echo "<tr>";
                    echo "<td>{$row['id']}</td>";
                    echo "<td>" . htmlspecialchars($row['category_path']) . "</td>";
                    echo "<td style='font-weight: bold;'>{$row['fee_percent']}%</td>";
                    echo "<td style='background: {$confidenceColor}; font-weight: bold;'>{$row['confidence']}%</td>";
                    echo "</tr>";
                }
                echo "</table>";
                
                echo "<h2>📊 統計情報</h2>";
                $stmt = $pdo->query("
                    SELECT 
                        CASE 
                            WHEN confidence >= 80 THEN '高信頼度(80%+)'
                            WHEN confidence >= 60 THEN '中信頼度(60-79%)'
                            ELSE '低信頼度(60%未満)'
                        END as level,
                        COUNT(*) as count
                    FROM fee_matches 
                    GROUP BY 1 
                    ORDER BY MIN(confidence) DESC
                ");
                
                echo "<table border='1' style='margin: 10px 0; border-collapse: collapse;'>";
                echo "<tr style='background: #f7fafc;'><th>信頼度レベル</th><th>件数</th></tr>";
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    echo "<tr><td>{$row['level']}</td><td><strong>{$row['count']}</strong></td></tr>";
                }
                echo "</table>";
            }
            
            echo "<div style='margin: 20px 0;'>";
            echo "<a href='index.html' style='background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;'>← ダッシュボードに戻る</a>";
            echo "</div>";
        }
    } else {
        if (isset($_GET['json'])) {
            echo json_encode([
                'success' => false,
                'error' => 'テーブルが存在しません',
                'total' => 0,
                'matched' => 0,
                'avg_confidence' => 0
            ]);
        } else {
            echo "<h1>⚠️ 手数料データなし</h1>";
            echo "<p>fee_matchesテーブルが存在しません。</p>";
            echo "<p>手数料マッチングを先に実行してください。</p>";
        }
    }
    
} catch (Exception $e) {
    if (isset($_GET['json'])) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'total' => 0,
            'matched' => 0,
            'avg_confidence' => 0
        ]);
    } else {
        echo "<h1>❌ データベースエラー</h1>";
        echo "<p>エラー: " . htmlspecialchars($e->getMessage()) . "</p>";
    }
}
?>