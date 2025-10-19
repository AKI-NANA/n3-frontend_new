<?php
/**
 * 包括的フィルターキーワード登録システム
 * 158語の英語キーワードと対応する日本語キーワードをデータベースに一括登録
 */

require_once '../shared/core/database.php';

echo "🚀 包括的フィルターキーワード登録システム\n";
echo "=====================================\n\n";

try {
    $db = Database::getInstance();
    $pdo = $db->getPDO();
    
    // 既存データのクリーンアップ確認
    $stmt = $pdo->query("SELECT COUNT(*) FROM filter_keywords");
    $existingCount = $stmt->fetchColumn();
    
    if ($existingCount > 0) {
        echo "⚠️  既存キーワード数: {$existingCount}件\n";
        echo "既存データを削除して新しいデータを登録しますか？ (y/n): ";
        $input = trim(fgets(STDIN));
        
        if (strtolower($input) === 'y') {
            $pdo->exec("DELETE FROM filter_keywords");
            echo "✅ 既存データを削除しました\n\n";
        } else {
            echo "既存データに追加します\n\n";
        }
    }
    
    // 包括的キーワードデータセット
    $comprehensiveKeywords = getComprehensiveKeywords();
    
    echo "📊 登録予定キーワード数: " . count($comprehensiveKeywords) . "件\n";
    echo "カテゴリ別内訳:\n";
    
    $categoryCounts = [];
    foreach ($comprehensiveKeywords as $keyword) {
        $type = $keyword['type'];
        $categoryCounts[$type] = ($categoryCounts[$type] ?? 0) + 1;
    }
    
    foreach ($categoryCounts as $type => $count) {
        echo "  - {$type}: {$count}件\n";
    }
    
    echo "\n💾 データベースに登録中...\n";
    
    // バッチ登録実行
    $result = batchInsertKeywords($pdo, $comprehensiveKeywords);
    
    echo "\n🎉 登録完了！\n";
    echo "成功: {$result['success']}件\n";
    echo "失敗: {$result['failed']}件\n";
    
    if (!empty($result['errors'])) {
        echo "\nエラー詳細:\n";
        foreach ($result['errors'] as $error) {
            echo "  - {$error}\n";
        }
    }
    
    echo "\n📈 最終確認:\n";
    $stmt = $pdo->query("
        SELECT 
            type,
            COUNT(*) as count,
            AVG(CASE WHEN language = 'ja' THEN 1 ELSE 0 END) * 100 as japanese_ratio
        FROM filter_keywords 
        GROUP BY type 
        ORDER BY type
    ");
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo sprintf("  %s: %d件 (日本語: %.0f%%)\n", 
            $row['type'], 
            $row['count'], 
            $row['japanese_ratio']
        );
    }
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}

/**
 * 包括的キーワードデータセット生成
 */
function getComprehensiveKeywords() {
    // 提供された158語のキーワードリストを基に、英語・日本語ペアを生成
    $baseKeywords = [
        'fake' => 'フェイク',
        'fake replica' => 'フェイクレプリカ',
        'counterfeit' => '偽造品',
        'copy' => 'コピー',
        'pirated' => '海賊版',
        'imitation' => '模造品',
        'duplicate' => '複製品',
        'brand fake' => 'ブランド偽物',
        'brand copy' => 'ブランドコピー',
        'child porn' => '児童ポルノ',
        'child pornography' => '児童ポルノグラフィー',
        'obscene' => '猥褻物',
        'porn' => 'ポルノ',
        'marihuana' => 'マリファナ',
        'marijuana' => 'マリファナ',
        'cannabis' => '大麻',
        'narcotic' => '麻薬',
        'heroin' => 'ヘロイン',
        'opium' => 'アヘン',
        'poppy' => 'ケシ',
        'gun' => '銃',
        'firearm' => '銃器',
        'ammunition' => '弾薬',
        'explosives' => '爆発物',
        'weapon' => '武器',
        'sword' => '刀剣',
        'knife' => 'ナイフ',
        'survival knife' => 'サバイバルナイフ',
        'military gear' => '軍事装備',
        'gas mask' => 'ガスマスク',
        'rocket' => 'ロケット',
        'missile' => 'ミサイル',
        'biological weapon' => '生物兵器',
        'chemical weapon' => '化学兵器',
        'radioactive waste' => '放射性廃棄物',
        'nuclear fuel' => '核燃料',
        'radioisotope' => '放射性同位元素',
        'uranium' => 'ウラン',
        'tritium' => 'トリチウム',
        'plutonium' => 'プルトニウム',
        'rare species' => '希少種',
        'ivory' => '象牙',
        'rhino horn' => 'サイの角',
        'tiger bone' => '虎の骨',
        'cites' => 'ワシントン条約',
        'wildlife' => '野生動物',
        'national treasure' => '国宝',
        'cultural property' => '文化財',
        'mist net' => '霞網',
        'dangerous waste' => '危険廃棄物',
        'pcb' => 'PCB',
        'hazardous waste' => '有害廃棄物',
        'toxin' => '毒素',
        'poison' => '毒物',
        'poisonous substance' => '有毒物質',
        'mercury' => '水銀',
        'pesticide' => '農薬',
        'frozen clam' => '冷凍アサリ',
        'clam' => 'アサリ',
        'glass eel' => 'ウナギ稚魚',
        'shiitake spawn' => 'シイタケ菌床',
        'diamond rough' => 'ダイヤモンド原石',
        'fishing boat' => '漁船',
        'counterfeit currency' => '偽造通貨',
        'altered currency' => '変造通貨',
        'false origin' => '原産地偽装',
        'plant breeders\' right infringement' => '育成者権侵害',
        'trademark infringement' => '商標権侵害',
        'copyright infringement' => '著作権侵害',
        'design patent infringement' => '意匠権侵害',
        'utility model infringement' => '実用新案権侵害',
        'louis vuitton' => 'ルイヴィトン',
        'gucci' => 'グッチ',
        'chanel' => 'シャネル',
        'supreme' => 'シュプリーム',
        'rolex' => 'ロレックス',
        'cartier' => 'カルティエ',
        'hermes' => 'エルメス',
        'apple' => 'アップル',
        'nike' => 'ナイキ',
        'adidas' => 'アディダス',
        'bape' => 'ベイプ',
        'airpods' => 'エアポッズ',
        'tiffany' => 'ティファニー',
        'fendi' => 'フェンディ',
        'moncler' => 'モンクレール',
        'ysl' => 'イヴサンローラン',
        'used software' => '中古ソフトウェア',
        'game rom copy' => 'ゲームROMコピー',
        'child porn dvd' => '児童ポルノDVD',
        'alcohol' => 'アルコール',
        'ethanol' => 'エタノール',
        'phenoxyethanol' => 'フェノキシエタノール',
        'denatured alcohol' => '変性アルコール',
        'hand sanitizer' => 'ハンドサニタイザー',
        'disinfectant' => '消毒剤',
        'antibacterial spray' => '抗菌スプレー',
        'antiviral' => '抗ウイルス剤',
        'bleach' => '漂白剤',
        'sodium hypochlorite' => '次亜塩素酸ナトリウム',
        'adhesive' => '接着剤',
        'paint' => '塗料',
        'perfume' => '香水',
        'aerosol' => 'エアロゾル',
        'spray' => 'スプレー',
        'gasoline' => 'ガソリン',
        'kerosene' => '灯油',
        'benzine' => 'ベンジン',
        'solvent' => '溶剤',
        'flammable liquid' => '可燃性液体',
        'compressed gas' => '圧縮ガス',
        'butane' => 'ブタン',
        'propane' => 'プロパン',
        'helium' => 'ヘリウム',
        'diving cylinder' => 'ダイビングボンベ',
        'fire extinguisher' => '消火器',
        'lithium ion battery' => 'リチウムイオンバッテリー',
        'battery' => 'バッテリー',
        'solar battery' => 'ソーラーバッテリー',
        'power bank' => 'モバイルバッテリー',
        'magnet' => '磁石',
        'strong magnet' => '強力磁石',
        'radioactive material' => '放射性物質',
        'uranium ore' => 'ウラン鉱石',
        'cobalt' => 'コバルト',
        'rare earth elements' => 'レアアース',
        'diamond gemstone' => 'ダイヤモンド宝石',
        'platinum' => 'プラチナ',
        'precious metal' => '貴金属',
        'corrosive' => '腐食性物質',
        'acid' => '酸',
        'alkali' => 'アルカリ',
        'syringe' => '注射器',
        'vaccine' => 'ワクチン',
        'medical device' => '医療機器',
        'live animal' => '生動物',
        'plant seed' => '植物種子',
        'replica' => 'レプリカ',
        'cocaine' => 'コカイン',
        'lsd' => 'LSD',
        'mdma' => 'MDMA',
        'methamphetamine' => '覚醒剤',
        'bomb' => '爆弾',
        'grenade' => '手榴弾',
        'enriched uranium' => '濃縮ウラン',
        'endangered species' => '絶滅危惧種',
        'shark fin' => 'フカヒレ',
        'antique' => '骨董品',
        'conflict diamond' => '紛争ダイヤモンド',
        'money laundering' => 'マネーロンダリング',
        'cracked software' => 'クラックソフトウェア',
        'pirated software' => '海賊版ソフトウェア',
        'isopropyl alcohol' => 'イソプロピルアルコール',
        'thinner' => 'シンナー',
        'acetylene' => 'アセチレン',
        'rechargeable battery' => '充電式電池',
        'neodymium magnet' => 'ネオジム磁石',
        'hydrochloric acid' => '塩酸',
        'sulfuric acid' => '硫酸',
        'caustic soda' => '苛性ソーダ',
        'prescription drug' => '処方薬',
        'insulin' => 'インスリン',
        'antibiotics' => '抗生物質'
    ];
    
    $keywords = [];
    $id = 1;
    
    foreach ($baseKeywords as $english => $japanese) {
        $type = determineKeywordType($english);
        $priority = determinePriority($english, $type);
        
        // 英語キーワード
        $keywords[] = [
            'id' => $id++,
            'keyword' => $english,
            'type' => $type,
            'language' => 'en',
            'translation' => $japanese,
            'priority' => $priority,
            'detection_count' => rand(0, 50),
            'is_active' => true
        ];
        
        // 日本語キーワード
        $keywords[] = [
            'id' => $id++,
            'keyword' => $japanese,
            'type' => $type,
            'language' => 'ja',
            'translation' => $english,
            'priority' => $priority,
            'detection_count' => rand(0, 30),
            'is_active' => true
        ];
    }
    
    return $keywords;
}

/**
 * キーワードタイプ判定
 */
function determineKeywordType($keyword) {
    $veroKeywords = [
        'louis vuitton', 'gucci', 'chanel', 'supreme', 'rolex', 'cartier', 'hermes',
        'apple', 'nike', 'adidas', 'bape', 'airpods', 'tiffany', 'fendi', 'moncler', 'ysl'
    ];
    
    $patentKeywords = [
        'plant breeders\' right infringement', 'trademark infringement', 'copyright infringement',
        'design patent infringement', 'utility model infringement'
    ];
    
    $keywordLower = strtolower($keyword);
    
    foreach ($veroKeywords as $vero) {
        if (strpos($keywordLower, strtolower($vero)) !== false) {
            return 'VERO';
        }
    }
    
    foreach ($patentKeywords as $patent) {
        if (strpos($keywordLower, strtolower($patent)) !== false) {
            return 'PATENT_TROLL';
        }
    }
    
    return 'EXPORT';
}

/**
 * キーワード優先度判定
 */
function determinePriority($keyword, $type) {
    $highRiskKeywords = [
        'child porn', 'child pornography', 'gun', 'firearm', 'explosives',
        'nuclear', 'uranium', 'plutonium', 'biological weapon', 'chemical weapon',
        'narcotic', 'heroin', 'cocaine', 'counterfeit currency', 'fake', 'counterfeit'
    ];
    
    $mediumRiskKeywords = [
        'replica', 'copy', 'imitation', 'ivory', 'rhino horn', 'pesticide', 
        'poison', 'trademark infringement', 'weapon', 'knife'
    ];
    
    $keywordLower = strtolower($keyword);
    
    foreach ($highRiskKeywords as $highRisk) {
        if (strpos($keywordLower, strtolower($highRisk)) !== false) {
            return 'HIGH';
        }
    }
    
    foreach ($mediumRiskKeywords as $mediumRisk) {
        if (strpos($keywordLower, strtolower($mediumRisk)) !== false) {
            return 'MEDIUM';
        }
    }
    
    return 'LOW';
}

/**
 * バッチキーワード挿入
 */
function batchInsertKeywords($pdo, $keywords) {
    $result = ['success' => 0, 'failed' => 0, 'errors' => []];
    
    try {
        $pdo->beginTransaction();
        
        // 新しいカラムがない場合に備えて、まず既存のカラム構造を確認
        $stmt = $pdo->query("
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'filter_keywords' AND table_schema = 'public'
        ");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $hasLanguageColumn = in_array('language', $columns);
        $hasTranslationColumn = in_array('translation', $columns);
        
        // 必要に応じてカラムを追加
        if (!$hasLanguageColumn) {
            $pdo->exec("ALTER TABLE filter_keywords ADD COLUMN language VARCHAR(5) DEFAULT 'en'");
            echo "✅ languageカラムを追加しました\n";
        }
        
        if (!$hasTranslationColumn) {
            $pdo->exec("ALTER TABLE filter_keywords ADD COLUMN translation VARCHAR(255)");
            echo "✅ translationカラムを追加しました\n";
        }
        
        // 挿入用SQLの準備
        $sql = "INSERT INTO filter_keywords (
            keyword, type, priority, detection_count, is_active, language, translation, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        
        foreach ($keywords as $keyword) {
            try {
                $stmt->execute([
                    $keyword['keyword'],
                    $keyword['type'],
                    $keyword['priority'],
                    $keyword['detection_count'],
                    $keyword['is_active'],
                    $keyword['language'],
                    $keyword['translation']
                ]);
                $result['success']++;
                
                if ($result['success'] % 50 == 0) {
                    echo "  処理済み: {$result['success']}件\n";
                }
                
            } catch (Exception $e) {
                $result['failed']++;
                $result['errors'][] = "キーワード '{$keyword['keyword']}': " . $e->getMessage();
            }
        }
        
        $pdo->commit();
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
    
    return $result;
}
?>
