<?php
/**
 * 各テーブルの役割・重要度分析
 * 本物データ vs サンプルデータの詳細識別
 */

require_once __DIR__ . '/database_query_handler.php';

echo "<h2>🔍 各テーブルの役割・重要度分析</h2>";

try {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        throw new Exception("PostgreSQL接続失敗");
    }

    // テーブルとその想定役割
    $table_analysis = [
        'mystical_japan_treasures_inventory' => [
            'role' => 'メイン商品データベース',
            'purpose' => 'eBay API取得データ + 統合商品管理',
            'critical' => true
        ],
        'ebay_inventory' => [
            'role' => 'eBay API専用データ',
            'purpose' => 'eBay APIから直接取得した商品データ',
            'critical' => true
        ],
        'yahoo_scraped_products' => [
            'role' => 'Yahoo オークション スクレイピングデータ',
            'purpose' => 'Yahoo スクレイピングシステムの取得データ',
            'critical' => true
        ],
        'unified_product_data' => [
            'role' => '統合商品データ（マスターキー管理）',
            'purpose' => '重複防止のマスターキー管理テーブル',
            'critical' => true
        ],
        'unified_product_inventory' => [
            'role' => '統合在庫管理',
            'purpose' => '在庫の管理棚卸しデータベース',
            'critical' => true
        ],
        'inventory_products' => [
            'role' => '物理在庫管理',
            'purpose' => '実際の在庫・棚卸し管理',
            'critical' => true
        ],
        'product_master' => [
            'role' => '商品マスターテーブル',
            'purpose' => 'マスターキー・基幹商品情報管理',
            'critical' => true
        ],
        'products' => [
            'role' => '汎用商品テーブル',
            'purpose' => '不明（要調査）',
            'critical' => false
        ]
    ];

    echo "<h3>📊 各テーブル詳細分析</h3>";
    
    foreach ($table_analysis as $table => $info) {
        echo "<div style='border: 2px solid " . ($info['critical'] ? '#28a745' : '#ffc107') . "; border-radius: 12px; padding: 1.5rem; margin: 1rem 0;'>";
        echo "<div style='display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;'>";
        echo "<h4 style='margin: 0; color: " . ($info['critical'] ? '#28a745' : '#856404') . ";'>";
        echo ($info['critical'] ? '🟢' : '🟡') . " {$table}</h4>";
        echo "<span style='background: " . ($info['critical'] ? '#d4edda' : '#fff3cd') . "; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;'>";
        echo $info['critical'] ? '重要テーブル' : '要調査';
        echo "</span>";
        echo "</div>";
        
        echo "<div style='background: rgba(0,0,0,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;'>";
        echo "<p><strong>役割:</strong> {$info['role']}</p>";
        echo "<p><strong>用途:</strong> {$info['purpose']}</p>";
        echo "</div>";
        
        try {
            // テーブル存在確認
            $check_stmt = $pdo->query("SELECT to_regclass('public.{$table}')");
            if (!$check_stmt->fetchColumn()) {
                echo "<p style='color: #dc3545;'>❌ <strong>テーブルが存在しません</strong></p>";
                echo "</div>";
                continue;
            }
            
            // レコード数とデータ分析
            $count_stmt = $pdo->query("SELECT COUNT(*) FROM \"{$table}\"");
            $total_count = $count_stmt->fetchColumn();
            
            echo "<div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;'>";
            echo "<div style='text-align: center; background: white; padding: 0.75rem; border-radius: 6px;'>";
            echo "<div style='font-size: 1.5rem; font-weight: bold; color: #0066cc;'>{$total_count}</div>";
            echo "<div style='font-size: 0.8rem;'>総レコード数</div>";
            echo "</div>";
            
            // タイトルカラム特定
            $title_cols = ['title', 'active_title', 'product_name', 'name'];
            $title_column = null;
            
            foreach ($title_cols as $col) {
                $col_check = $pdo->query("
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{$table}' AND column_name = '{$col}'
                ");
                if ($col_check->rowCount() > 0) {
                    $title_column = $col;
                    break;
                }
            }
            
            if ($title_column) {
                // サンプルデータ検出
                $sample_query = "
                    SELECT COUNT(*) as sample_count
                    FROM \"{$table}\"
                    WHERE (
                        \"{$title_column}\" LIKE '%サンプル%' OR
                        \"{$title_column}\" LIKE '%テスト%' OR
                        \"{$title_column}\" LIKE '%ヴィンテージ腕時計%' OR
                        \"{$title_column}\" LIKE '%スクレイピング商品%' OR
                        \"{$title_column}\" LIKE '%SEIKO%'
                    )
                ";
                
                $sample_stmt = $pdo->query($sample_query);
                $sample_count = $sample_stmt->fetchColumn();
                
                $real_count = $total_count - $sample_count;
                
                echo "<div style='text-align: center; background: " . ($real_count > 0 ? '#d4edda' : '#f8d7da') . "; padding: 0.75rem; border-radius: 6px;'>";
                echo "<div style='font-size: 1.5rem; font-weight: bold; color: " . ($real_count > 0 ? '#155724' : '#721c24') . ";'>{$real_count}</div>";
                echo "<div style='font-size: 0.8rem;'>実データ</div>";
                echo "</div>";
                
                echo "<div style='text-align: center; background: " . ($sample_count > 0 ? '#fff3cd' : '#d4edda') . "; padding: 0.75rem; border-radius: 6px;'>";
                echo "<div style='font-size: 1.5rem; font-weight: bold; color: " . ($sample_count > 0 ? '#856404' : '#155724') . ";'>{$sample_count}</div>";
                echo "<div style='font-size: 0.8rem;'>サンプルデータ</div>";
                echo "</div>";
                echo "</div>";
                
                // 実際のデータサンプル表示
                if ($real_count > 0) {
                    echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;'>";
                    echo "<h5>✅ 実データサンプル（重要データ - 削除禁止）</h5>";
                    
                    $real_sample_query = "
                        SELECT \"{$title_column}\" as title, created_at, updated_at
                        FROM \"{$table}\"
                        WHERE NOT (
                            \"{$title_column}\" LIKE '%サンプル%' OR
                            \"{$title_column}\" LIKE '%テスト%' OR
                            \"{$title_column}\" LIKE '%ヴィンテージ腕時計%' OR
                            \"{$title_column}\" LIKE '%スクレイピング商品%' OR
                            \"{$title_column}\" LIKE '%SEIKO%'
                        )
                        ORDER BY updated_at DESC
                        LIMIT 3
                    ";
                    
                    try {
                        $real_stmt = $pdo->query($real_sample_query);
                        $real_samples = $real_stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        if (count($real_samples) > 0) {
                            echo "<ul>";
                            foreach ($real_samples as $sample) {
                                echo "<li><strong>" . htmlspecialchars(mb_substr($sample['title'], 0, 50)) . "</strong>";
                                if (isset($sample['updated_at'])) {
                                    echo " <small>(" . htmlspecialchars($sample['updated_at']) . ")</small>";
                                }
                                echo "</li>";
                            }
                            echo "</ul>";
                        }
                    } catch (Exception $e) {
                        echo "<p>実データ取得エラー</p>";
                    }
                    echo "</div>";
                }
                
                if ($sample_count > 0) {
                    echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px;'>";
                    echo "<h5>⚠️ サンプルデータ（削除対象候補）</h5>";
                    
                    $sample_data_query = "
                        SELECT \"{$title_column}\" as title, created_at, updated_at
                        FROM \"{$table}\"
                        WHERE (
                            \"{$title_column}\" LIKE '%サンプル%' OR
                            \"{$title_column}\" LIKE '%テスト%' OR
                            \"{$title_column}\" LIKE '%ヴィンテージ腕時計%' OR
                            \"{$title_column}\" LIKE '%スクレイピング商品%' OR
                            \"{$title_column}\" LIKE '%SEIKO%'
                        )
                        LIMIT 3
                    ";
                    
                    try {
                        $sample_data_stmt = $pdo->query($sample_data_query);
                        $sample_data = $sample_data_stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        if (count($sample_data) > 0) {
                            echo "<ul>";
                            foreach ($sample_data as $sample) {
                                echo "<li style='color: #856404;'><strong>" . htmlspecialchars(mb_substr($sample['title'], 0, 50)) . "</strong>";
                                if (isset($sample['updated_at'])) {
                                    echo " <small>(" . htmlspecialchars($sample['updated_at']) . ")</small>";
                                }
                                echo "</li>";
                            }
                            echo "</ul>";
                        }
                    } catch (Exception $e) {
                        echo "<p>サンプルデータ取得エラー</p>";
                    }
                    echo "</div>";
                }
            } else {
                echo "<div style='text-align: center; background: #e2e3e5; padding: 0.75rem; border-radius: 6px;'>";
                echo "<div style='font-size: 1rem; color: #6c757d;'>タイトルカラムなし</div>";
                echo "<div style='font-size: 0.8rem;'>詳細分析不可</div>";
                echo "</div>";
                echo "</div>";
            }
            
            // 重要度判定
            $importance_score = 0;
            if ($info['critical']) $importance_score += 10;
            if ($total_count > 10) $importance_score += 5;
            if (isset($real_count) && $real_count > 0) $importance_score += 5;
            
            $importance_level = $importance_score >= 15 ? '🔴 極重要' : ($importance_score >= 10 ? '🟡 重要' : '🟢 低重要度');
            
            echo "<div style='text-align: center; margin-top: 1rem; font-weight: bold; color: " . 
                 ($importance_score >= 15 ? '#dc3545' : ($importance_score >= 10 ? '#ffc107' : '#28a745')) . ";'>";
            echo "判定: {$importance_level}";
            echo "</div>";
            
        } catch (Exception $e) {
            echo "<p style='color: #dc3545;'>❌ <strong>分析エラー:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
        }
        
        echo "</div>"; // カード終了
    }
    
    // 推奨アクション
    echo "<h3>🎯 推奨アクション</h3>";
    echo "<div style='background: #e7f3ff; padding: 2rem; border-radius: 12px; margin: 2rem 0;'>";
    echo "<h4>✅ 安全な削除戦略</h4>";
    
    echo "<div style='background: #d4edda; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h5>🔒 保護すべき重要データ</h5>";
    echo "<ul>";
    echo "<li><strong>eBay API データ</strong> - 再取得に時間・コストがかかる</li>";
    echo "<li><strong>スクレイピングデータ</strong> - 手動取得した貴重なデータ</li>";
    echo "<li><strong>在庫・棚卸しデータ</strong> - ビジネス運営に直結</li>";
    echo "<li><strong>マスターキー管理</strong> - 重複防止の基幹システム</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "<div style='background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h5>🗑️ 安全に削除可能なデータ</h5>";
    echo "<ul>";
    echo "<li><strong>テスト用サンプルデータ</strong> - 「サンプル」「テスト」を含む</li>";
    echo "<li><strong>APIサーバーが生成したダミーデータ</strong> - 「ヴィンテージ腕時計」「スクレイピング商品1」など</li>";
    echo "<li><strong>重複したテストSKU</strong> - SCRAPED_ プレフィックスのテストデータ</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px; margin: 1rem 0;'>";
    echo "<h5>⚠️ 注意すべきポイント</h5>";
    echo "<ul>";
    echo "<li><strong>部分削除の実行</strong> - テーブル全体ではなく、条件指定削除</li>";
    echo "<li><strong>バックアップの実行</strong> - 削除前の完全バックアップ</li>";
    echo "<li><strong>段階的削除</strong> - 1テーブルずつ慎重に実行</li>";
    echo "<li><strong>削除後確認</strong> - 機能動作の検証</li>";
    echo "</ul>";
    echo "</div>";
    
    echo "<div style='margin-top: 2rem; text-align: center;'>";
    echo "<a href='selective_sample_cleanup.php' style='background: #28a745; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 1rem;'>🧹 選択的サンプルデータ削除</a>";
    echo "<a href='create_database_backup.php' style='background: #007bff; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;'>💾 事前バックアップ作成</a>";
    echo "</div>";
    echo "</div>";
    
} catch (Exception $e) {
    echo "<div style='background: #f8d7da; padding: 1rem; border-radius: 8px;'>";
    echo "<h4>❌ エラー発生</h4>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    echo "</div>";
}
?>

<style>
.role-card { 
    transition: transform 0.2s ease;
}
.role-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
</style>
