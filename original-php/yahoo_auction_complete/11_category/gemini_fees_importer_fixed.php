<?php
/**
 * ジェミナイカテゴリー手数料データ修正版
 * boolean型エラー対応済み
 */

echo "🎯 ジェミナイカテゴリー手数料データ格納（修正版）\n";
echo "============================================\n";

try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";

    // CSVファイル確認
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

    // CSVファイル解析・挿入
    echo "📊 CSVデータ解析・挿入中...\n";
    
    $handle = fopen($csvFile, 'r');
    if (!$handle) {
        throw new Exception("CSVファイルを開けません");
    }

    // ヘッダー行読み込み
    $headers = fgetcsv($handle);
    echo "📋 ヘッダー: " . implode(', ', $headers) . "\n";

    $insertCount = 0;
    $errorCount = 0;
    $batchSize = 500;
    $totalProcessed = 0;

    // 準備されたステートメント
    $stmt = $pdo->prepare("
        INSERT INTO gemini_category_fees (
            ebay_category_id, category_path, final_value_fee_percent, 
            final_value_fee_decimal, fee_group, is_special_rate
        ) VALUES (?, ?, ?, ?, ?, ?)
    ");

    echo "  📊 進捗:\n";

    while (($row = fgetcsv($handle)) !== FALSE) {
        try {
            if (count($row) >= 3 && !empty(trim($row[0]))) {
                $categoryId = trim($row[0]);
                $categoryPath = trim($row[1]);
                $fvfString = trim($row[2]);
                
                // パーセンテージを数値に変換
                $fvfPercent = (float)str_replace('%', '', $fvfString);
                $fvfDecimal = $fvfPercent / 100;
                
                // 手数料グループ判定
                $feeGroup = determineFeeGroup($fvfPercent, $categoryPath);
                
                // boolean値を明示的に設定
                $isSpecialRate = ($fvfPercent <= 6.35 || $fvfPercent >= 14.95) ? true : false;
                
                // データ挿入
                $stmt->execute([
                    $categoryId,
                    $categoryPath,
                    $fvfPercent,
                    $fvfDecimal,
                    $feeGroup,
                    $isSpecialRate
                ]);
                
                $insertCount++;
                $totalProcessed++;
                
                // 進捗表示
                if ($totalProcessed % 2000 === 0) {
                    echo "    ✅ {$totalProcessed}件処理完了\n";
                }
            }
        } catch (Exception $e) {
            $errorCount++;
            if ($errorCount <= 5) {
                echo "    ⚠️ 行エラー: " . implode(',', array_slice($row, 0, 3)) . " - " . $e->getMessage() . "\n";
            }
        }
    }

    fclose($handle);

    echo "\n📊 データ挿入完了\n";
    echo "=================\n";
    echo "総処理件数: " . number_format($insertCount) . "件\n";
    echo "エラー件数: " . number_format($errorCount) . "件\n";

    // 実際のデータ確認
    $actualCount = $pdo->query("SELECT COUNT(*) FROM gemini_category_fees")->fetchColumn();
    echo "DB格納件数: " . number_format($actualCount) . "件\n";

    if ($actualCount != $insertCount) {
        echo "⚠️ 警告: 処理件数とDB件数が一致しません\n";
    }

    // 統計表示
    displayStatistics($pdo);

    // サンプルデータ表示
    displaySampleData($pdo);

    echo "\n🎉 ジェミナイカテゴリー手数料データ格納完了!\n";

} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    echo "スタック: " . $e->getTraceAsString() . "\n";
}

/**
 * 手数料グループ判定（簡略版）
 */
function determineFeeGroup($feePercent, $categoryPath) {
    if ($feePercent <= 2.50) {
        return 'business_heavy_equipment';
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

    // 特殊料金の数
    $specialCount = $pdo->query("
        SELECT COUNT(*) FROM gemini_category_fees WHERE is_special_rate = TRUE
    ")->fetchColumn();
    
    echo "\n🔥 特殊料金カテゴリー: " . number_format($specialCount) . "件\n";
}

/**
 * サンプルデータ表示
 */
function displaySampleData($pdo) {
    echo "\n📋 サンプルデータ（各手数料から5件ずつ）:\n";
    echo "=====================================\n";
    
    $samples = $pdo->query("
        SELECT DISTINCT final_value_fee_percent
        FROM gemini_category_fees
        ORDER BY final_value_fee_percent
        LIMIT 10
    ")->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($samples as $feePercent) {
        echo "\n💰 {$feePercent}%カテゴリー例:\n";
        
        $examples = $pdo->prepare("
            SELECT ebay_category_id, category_path
            FROM gemini_category_fees
            WHERE final_value_fee_percent = ?
            LIMIT 3
        ");
        $examples->execute([$feePercent]);
        
        foreach ($examples->fetchAll(PDO::FETCH_ASSOC) as $example) {
            echo "    {$example['ebay_category_id']}: {$example['category_path']}\n";
        }
    }
}
?>