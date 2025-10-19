<?php
/**
 * ジェミナイカテゴリー手数料データベース格納システム
 * 20,757カテゴリーの正確な手数料データを格納
 */

echo "🎯 ジェミナイカテゴリー手数料データ格納開始\n";
echo "==========================================\n";

try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";

    // CSVファイル読み込み
    $csvFile = '2024_利益計算表 最新  Category.csv';
    if (!file_exists($csvFile)) {
        throw new Exception("CSVファイルが見つかりません: {$csvFile}");
    }

    echo "📁 CSVファイル読み込み中: {$csvFile}\n";
    
    // 既存テーブル削除・再作成
    echo "\n🗑️ 既存テーブルクリア中...\n";
    $pdo->exec("DROP TABLE IF EXISTS gemini_category_fees CASCADE");
    
    echo "🏗️ 新テーブル作成中...\n";
    $pdo->exec("
        CREATE TABLE gemini_category_fees (
            id SERIAL PRIMARY KEY,
            ebay_category_id VARCHAR(20) NOT NULL UNIQUE,
            category_path TEXT NOT NULL,
            final_value_fee_percent DECIMAL(5,2) NOT NULL,
            final_value_fee_decimal DECIMAL(7,4) NOT NULL,
            fee_group VARCHAR(50),
            is_special_rate BOOLEAN DEFAULT FALSE,
            data_source VARCHAR(50) DEFAULT 'Gemini_2024',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    ");

    // インデックス作成
    $pdo->exec("CREATE INDEX idx_gemini_fees_category_id ON gemini_category_fees(ebay_category_id)");
    $pdo->exec("CREATE INDEX idx_gemini_fees_fee_percent ON gemini_category_fees(final_value_fee_percent)");
    $pdo->exec("CREATE INDEX idx_gemini_fees_fee_group ON gemini_category_fees(fee_group)");

    // CSVファイル解析・挿入
    echo "📊 CSVデータ解析・挿入中...\n";
    
    $handle = fopen($csvFile, 'r');
    if (!$handle) {
        throw new Exception("CSVファイルを開けません");
    }

    // ヘッダー行スキップ
    $headers = fgetcsv($handle);
    echo "📋 ヘッダー: " . implode(', ', $headers) . "\n";

    $insertCount = 0;
    $errorCount = 0;
    $batchSize = 1000;
    $batch = [];

    while (($row = fgetcsv($handle)) !== FALSE) {
        try {
            if (count($row) >= 3) {
                $categoryId = trim($row[0]);
                $categoryPath = trim($row[1]);
                $fvfString = trim($row[2]);
                
                // パーセンテージを数値に変換
                $fvfPercent = (float)str_replace('%', '', $fvfString);
                $fvfDecimal = $fvfPercent / 100;
                
                // 手数料グループ判定
                $feeGroup = determineFeeGroup($fvfPercent, $categoryPath);
                $isSpecialRate = ($fvfPercent <= 6.35 || $fvfPercent >= 14.95);
                
                $batch[] = [
                    'category_id' => $categoryId,
                    'category_path' => $categoryPath,
                    'fee_percent' => $fvfPercent,
                    'fee_decimal' => $fvfDecimal,
                    'fee_group' => $feeGroup,
                    'is_special' => $isSpecialRate
                ];
                
                // バッチ挿入
                if (count($batch) >= $batchSize) {
                    insertBatch($pdo, $batch);
                    $insertCount += count($batch);
                    $batch = [];
                    echo "  ✅ {$insertCount}件処理完了\n";
                }
            }
        } catch (Exception $e) {
            $errorCount++;
            if ($errorCount <= 10) {
                echo "  ⚠️ 行エラー: " . implode(',', $row) . " - " . $e->getMessage() . "\n";
            }
        }
    }

    // 残りのバッチ挿入
    if (!empty($batch)) {
        insertBatch($pdo, $batch);
        $insertCount += count($batch);
    }

    fclose($handle);

    echo "\n📊 データ挿入完了\n";
    echo "=================\n";
    echo "総処理件数: " . number_format($insertCount) . "件\n";
    echo "エラー件数: " . number_format($errorCount) . "件\n";

    // 統計表示
    displayStatistics($pdo);

    // 既存カテゴリーテーブルとの同期
    echo "\n🔄 既存カテゴリーテーブル同期中...\n";
    syncWithExistingTables($pdo);

    echo "\n🎉 ジェミナイカテゴリー手数料データ格納完了!\n";

} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    echo "スタック: " . $e->getTraceAsString() . "\n";
}

/**
 * 手数料グループ判定
 */
function determineFeeGroup($feePercent, $categoryPath) {
    if ($feePercent <= 2.50) {
        return 'business_industrial_heavy';
    } elseif ($feePercent <= 5.00) {
        return 'nft_categories';
    } elseif ($feePercent <= 6.35) {
        return 'musical_instruments';
    } elseif ($feePercent <= 7.35) {
        return 'video_games_computers';
    } elseif ($feePercent <= 9.35) {
        return 'electronics_cameras';
    } elseif ($feePercent <= 10.00) {
        return 'clothing_accessories';
    } elseif ($feePercent <= 11.35) {
        return 'motors_automotive';
    } elseif ($feePercent <= 12.50) {
        return 'standard_categories';
    } elseif ($feePercent <= 13.00) {
        return 'jewelry_watches';
    } else {
        return 'books_movies_music';
    }
}

/**
 * バッチ挿入
 */
function insertBatch($pdo, $batch) {
    $sql = "
        INSERT INTO gemini_category_fees (
            ebay_category_id, category_path, final_value_fee_percent, 
            final_value_fee_decimal, fee_group, is_special_rate
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (ebay_category_id) DO UPDATE SET
            category_path = EXCLUDED.category_path,
            final_value_fee_percent = EXCLUDED.final_value_fee_percent,
            final_value_fee_decimal = EXCLUDED.final_value_fee_decimal,
            fee_group = EXCLUDED.fee_group,
            is_special_rate = EXCLUDED.is_special_rate,
            updated_at = NOW()
    ";
    
    $stmt = $pdo->prepare($sql);
    
    foreach ($batch as $row) {
        $stmt->execute([
            $row['category_id'],
            $row['category_path'],
            $row['fee_percent'],
            $row['fee_decimal'],
            $row['fee_group'],
            $row['is_special']
        ]);
    }
}

/**
 * 統計表示
 */
function displayStatistics($pdo) {
    echo "\n💰 手数料分布統計\n";
    echo "=================\n";
    
    $stats = $pdo->query("
        SELECT 
            final_value_fee_percent,
            fee_group,
            COUNT(*) as category_count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM gemini_category_fees
        GROUP BY final_value_fee_percent, fee_group
        ORDER BY final_value_fee_percent ASC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($stats as $stat) {
        echo sprintf(
            "  %.2f%% (%s): %s件 (%.1f%%)\n",
            $stat['final_value_fee_percent'],
            $stat['fee_group'],
            number_format($stat['category_count']),
            $stat['percentage']
        );
    }

    // 特殊料金カテゴリー
    echo "\n🔥 特殊料金カテゴリー:\n";
    $special = $pdo->query("
        SELECT final_value_fee_percent, COUNT(*) as count
        FROM gemini_category_fees
        WHERE is_special_rate = TRUE
        GROUP BY final_value_fee_percent
        ORDER BY final_value_fee_percent
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($special as $s) {
        echo "  {$s['final_value_fee_percent']}%: " . number_format($s['count']) . "件\n";
    }
}

/**
 * 既存テーブル同期
 */
function syncWithExistingTables($pdo) {
    // ebay_category_fees テーブルの手数料を更新
    $updateSql = "
        UPDATE ebay_category_fees 
        SET 
            final_value_fee_percent = gcf.final_value_fee_percent,
            fee_group = gcf.fee_group,
            fee_group_note = CONCAT('Gemini Verified: ', gcf.fee_group, ' (', gcf.final_value_fee_percent, '%)'),
            last_updated = NOW()
        FROM gemini_category_fees gcf
        WHERE ebay_category_fees.category_id = gcf.ebay_category_id
    ";
    
    $updatedRows = $pdo->exec($updateSql);
    echo "  ✅ 既存カテゴリー更新: " . number_format($updatedRows) . "件\n";
    
    // 新しいカテゴリーを挿入
    $insertSql = "
        INSERT INTO ebay_category_fees (
            category_id, category_name, category_path,
            final_value_fee_percent, fee_group, fee_group_note
        )
        SELECT 
            gcf.ebay_category_id,
            gcf.category_path,
            gcf.category_path,
            gcf.final_value_fee_percent,
            gcf.fee_group,
            CONCAT('Gemini Verified: ', gcf.fee_group, ' (', gcf.final_value_fee_percent, '%)')
        FROM gemini_category_fees gcf
        LEFT JOIN ebay_category_fees ecf ON gcf.ebay_category_id = ecf.category_id
        WHERE ecf.category_id IS NULL
    ";
    
    $insertedRows = $pdo->exec($insertSql);
    echo "  ✅ 新規カテゴリー追加: " . number_format($insertedRows) . "件\n";
}
?>