<?php
/**
 * 既存の06フィルターデータベースにキーワードを投入
 * 場所: modules/yahoo_auction_complete/new_structure/07_filters/insert_keywords.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// 既存のデータベース接続を使用
require_once '../../../shared/core/database.php';

try {
    echo "<h2>既存データベースへの輸出禁止キーワード投入</h2>";
    
    // 1. 既存テーブル構造確認
    echo "<h3>1. テーブル構造確認</h3>";
    
    $stmt = $pdo->query("DESCRIBE filter_keywords");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<pre>";
    foreach ($columns as $column) {
        echo "{$column['Field']} | {$column['Type']} | {$column['Null']} | {$column['Key']}\n";
    }
    echo "</pre>";
    
    // 2. 現在のデータ数確認
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM filter_keywords");
    $currentCount = $stmt->fetchColumn();
    echo "<p>現在のキーワード数: {$currentCount}件</p>";
    
    // 3. 大量キーワードデータ配列
    $keywords = [
        // 偽造・コピー関連 (HIGH PRIORITY)
        ['偽物', 'EXPORT', 'HIGH', '偽造品全般'],
        ['にせもの', 'EXPORT', 'HIGH', '偽造品ひらがな'],
        ['ニセモノ', 'EXPORT', 'HIGH', '偽造品カタカナ'],
        ['fake', 'EXPORT', 'HIGH', '偽造品英語'],
        ['Fake', 'EXPORT', 'HIGH', '偽造品英語大文字'],
        ['FAKE', 'EXPORT', 'HIGH', '偽造品英語全大文字'],
        ['replica', 'EXPORT', 'HIGH', 'レプリカ商品'],
        ['Replica', 'EXPORT', 'HIGH', 'レプリカ商品大文字'],
        ['REPLICA', 'EXPORT', 'HIGH', 'レプリカ商品全大文字'],
        ['レプリカ', 'EXPORT', 'HIGH', 'レプリカ日本語'],
        ['counterfeit', 'EXPORT', 'HIGH', '偽造品英語正式'],
        ['Counterfeit', 'EXPORT', 'HIGH', '偽造品英語正式大文字'],
        ['COUNTERFEIT', 'EXPORT', 'HIGH', '偽造品英語正式全大文字'],
        ['copy', 'EXPORT', 'HIGH', 'コピー商品'],
        ['Copy', 'EXPORT', 'HIGH', 'コピー商品大文字'],
        ['COPY', 'EXPORT', 'HIGH', 'コピー商品全大文字'],
        ['コピー', 'EXPORT', 'HIGH', 'コピー商品日本語'],
        ['こぴー', 'EXPORT', 'HIGH', 'コピー商品ひらがな'],
        ['imitation', 'EXPORT', 'HIGH', '模倣品'],
        ['Imitation', 'EXPORT', 'HIGH', '模倣品大文字'],
        ['IMITATION', 'EXPORT', 'HIGH', '模倣品全大文字'],
        ['模倣', 'EXPORT', 'HIGH', '模倣品日本語'],
        ['海賊版', 'EXPORT', 'HIGH', '海賊版商品'],
        ['かいぞくばん', 'EXPORT', 'HIGH', '海賊版ひらがな'],
        ['pirated', 'EXPORT', 'HIGH', '海賊版英語'],
        ['Pirated', 'EXPORT', 'HIGH', '海賊版英語大文字'],
        ['PIRATED', 'EXPORT', 'HIGH', '海賊版英語全大文字'],
        ['piracy', 'EXPORT', 'HIGH', '海賊行為'],
        ['Piracy', 'EXPORT', 'HIGH', '海賊行為大文字'],
        ['PIRACY', 'EXPORT', 'HIGH', '海賊行為全大文字'],
        ['複製', 'EXPORT', 'HIGH', '複製品'],
        ['ふくせい', 'EXPORT', 'HIGH', '複製品ひらがな'],
        ['duplicate', 'EXPORT', 'HIGH', '複製品英語'],
        ['Duplicate', 'EXPORT', 'HIGH', '複製品英語大文字'],
        ['DUPLICATE', 'EXPORT', 'HIGH', '複製品英語全大文字'],
        ['clone', 'EXPORT', 'HIGH', 'クローン商品'],
        ['Clone', 'EXPORT', 'HIGH', 'クローン商品大文字'],
        ['CLONE', 'EXPORT', 'HIGH', 'クローン商品全大文字'],
        ['クローン', 'EXPORT', 'HIGH', 'クローン商品日本語'],
        ['スーパーコピー', 'EXPORT', 'HIGH', 'スーパーコピー商品'],
        ['super copy', 'EXPORT', 'HIGH', 'スーパーコピー英語'],
        ['Super Copy', 'EXPORT', 'HIGH', 'スーパーコピー英語大文字'],
        ['SUPER COPY', 'EXPORT', 'HIGH', 'スーパーコピー英語全大文字'],
        
        // 危険物・薬物関連 (HIGH PRIORITY)
        ['大麻', 'EXPORT', 'HIGH', '大麻'],
        ['たいま', 'EXPORT', 'HIGH', '大麻ひらがな'],
        ['marijuana', 'EXPORT', 'HIGH', '大麻英語'],
        ['Marijuana', 'EXPORT', 'HIGH', '大麻英語大文字'],
        ['MARIJUANA', 'EXPORT', 'HIGH', '大麻英語全大文字'],
        ['cannabis', 'EXPORT', 'HIGH', 'カンナビス'],
        ['Cannabis', 'EXPORT', 'HIGH', 'カンナビス大文字'],
        ['CANNABIS', 'EXPORT', 'HIGH', 'カンナビス全大文字'],
        ['カンナビス', 'EXPORT', 'HIGH', 'カンナビス日本語'],
        ['hemp', 'EXPORT', 'HIGH', 'ヘンプ'],
        ['Hemp', 'EXPORT', 'HIGH', 'ヘンプ大文字'],
        ['HEMP', 'EXPORT', 'HIGH', 'ヘンプ全大文字'],
        ['weed', 'EXPORT', 'HIGH', '大麻俗語'],
        ['Weed', 'EXPORT', 'HIGH', '大麻俗語大文字'],
        ['WEED', 'EXPORT', 'HIGH', '大麻俗語全大文字'],
        ['麻薬', 'EXPORT', 'HIGH', '麻薬'],
        ['まやく', 'EXPORT', 'HIGH', '麻薬ひらがな'],
        ['drug', 'EXPORT', 'HIGH', '薬物'],
        ['Drug', 'EXPORT', 'HIGH', '薬物大文字'],
        ['DRUG', 'EXPORT', 'HIGH', '薬物全大文字'],
        ['drugs', 'EXPORT', 'HIGH', '薬物複数'],
        ['Drugs', 'EXPORT', 'HIGH', '薬物複数大文字'],
        ['DRUGS', 'EXPORT', 'HIGH', '薬物複数全大文字'],
        ['narcotic', 'EXPORT', 'HIGH', '麻薬英語'],
        ['Narcotic', 'EXPORT', 'HIGH', '麻薬英語大文字'],
        ['NARCOTIC', 'EXPORT', 'HIGH', '麻薬英語全大文字'],
        ['ヘロイン', 'EXPORT', 'HIGH', 'ヘロイン'],
        ['heroin', 'EXPORT', 'HIGH', 'ヘロイン英語'],
        ['Heroin', 'EXPORT', 'HIGH', 'ヘロイン英語大文字'],
        ['HEROIN', 'EXPORT', 'HIGH', 'ヘロイン英語全大文字'],
        ['コカイン', 'EXPORT', 'HIGH', 'コカイン'],
        ['cocaine', 'EXPORT', 'HIGH', 'コカイン英語'],
        ['Cocaine', 'EXPORT', 'HIGH', 'コカイン英語大文字'],
        ['COCAINE', 'EXPORT', 'HIGH', 'コカイン英語全大文字'],
        
        // 武器・兵器関連 (HIGH PRIORITY)
        ['銃', 'EXPORT', 'HIGH', '銃器'],
        ['じゅう', 'EXPORT', 'HIGH', '銃器ひらがな'],
        ['gun', 'EXPORT', 'HIGH', '銃器英語'],
        ['Gun', 'EXPORT', 'HIGH', '銃器英語大文字'],
        ['GUN', 'EXPORT', 'HIGH', '銃器英語全大文字'],
        ['guns', 'EXPORT', 'HIGH', '銃器英語複数'],
        ['Guns', 'EXPORT', 'HIGH', '銃器英語複数大文字'],
        ['GUNS', 'EXPORT', 'HIGH', '銃器英語複数全大文字'],
        ['firearm', 'EXPORT', 'HIGH', '銃器正式英語'],
        ['Firearm', 'EXPORT', 'HIGH', '銃器正式英語大文字'],
        ['FIREARM', 'EXPORT', 'HIGH', '銃器正式英語全大文字'],
        ['firearms', 'EXPORT', 'HIGH', '銃器正式英語複数'],
        ['Firearms', 'EXPORT', 'HIGH', '銃器正式英語複数大文字'],
        ['FIREARMS', 'EXPORT', 'HIGH', '銃器正式英語複数全大文字'],
        ['weapon', 'EXPORT', 'HIGH', '武器'],
        ['Weapon', 'EXPORT', 'HIGH', '武器大文字'],
        ['WEAPON', 'EXPORT', 'HIGH', '武器全大文字'],
        ['weapons', 'EXPORT', 'HIGH', '武器複数'],
        ['Weapons', 'EXPORT', 'HIGH', '武器複数大文字'],
        ['WEAPONS', 'EXPORT', 'HIGH', '武器複数全大文字'],
        ['武器', 'EXPORT', 'HIGH', '武器日本語'],
        ['ぶき', 'EXPORT', 'HIGH', '武器ひらがな'],
        ['爆弾', 'EXPORT', 'HIGH', '爆弾'],
        ['ばくだん', 'EXPORT', 'HIGH', '爆弾ひらがな'],
        ['bomb', 'EXPORT', 'HIGH', '爆弾英語'],
        ['Bomb', 'EXPORT', 'HIGH', '爆弾英語大文字'],
        ['BOMB', 'EXPORT', 'HIGH', '爆弾英語全大文字'],
        ['explosive', 'EXPORT', 'HIGH', '爆発物'],
        ['Explosive', 'EXPORT', 'HIGH', '爆発物大文字'],
        ['EXPLOSIVE', 'EXPORT', 'HIGH', '爆発物全大文字'],
        ['explosives', 'EXPORT', 'HIGH', '爆発物複数'],
        ['Explosives', 'EXPORT', 'HIGH', '爆発物複数大文字'],
        ['EXPLOSIVES', 'EXPORT', 'HIGH', '爆発物複数全大文字'],
        
        // 有害・危険物質 (HIGH PRIORITY)
        ['毒物', 'EXPORT', 'HIGH', '毒物'],
        ['どくぶつ', 'EXPORT', 'HIGH', '毒物ひらがな'],
        ['poison', 'EXPORT', 'HIGH', '毒物英語'],
        ['Poison', 'EXPORT', 'HIGH', '毒物英語大文字'],
        ['POISON', 'EXPORT', 'HIGH', '毒物英語全大文字'],
        ['toxic', 'EXPORT', 'HIGH', '有毒'],
        ['Toxic', 'EXPORT', 'HIGH', '有毒大文字'],
        ['TOXIC', 'EXPORT', 'HIGH', '有毒全大文字'],
        ['放射性物質', 'EXPORT', 'HIGH', '放射性物質'],
        ['radioactive', 'EXPORT', 'HIGH', '放射性英語'],
        ['Radioactive', 'EXPORT', 'HIGH', '放射性英語大文字'],
        ['RADIOACTIVE', 'EXPORT', 'HIGH', '放射性英語全大文字'],
        ['nuclear', 'EXPORT', 'HIGH', '核関連'],
        ['Nuclear', 'EXPORT', 'HIGH', '核関連大文字'],
        ['NUCLEAR', 'EXPORT', 'HIGH', '核関連全大文字'],
        ['uranium', 'EXPORT', 'HIGH', 'ウラン'],
        ['Uranium', 'EXPORT', 'HIGH', 'ウラン大文字'],
        ['URANIUM', 'EXPORT', 'HIGH', 'ウラン全大文字'],
        ['ウラン', 'EXPORT', 'HIGH', 'ウラン日本語'],
        ['plutonium', 'EXPORT', 'HIGH', 'プルトニウム'],
        ['Plutonium', 'EXPORT', 'HIGH', 'プルトニウム大文字'],
        ['PLUTONIUM', 'EXPORT', 'HIGH', 'プルトニウム全大文字'],
        ['プルトニウム', 'EXPORT', 'HIGH', 'プルトニウム日本語'],
        
        // わいせつ・アダルト関連 (HIGH PRIORITY)
        ['児童ポルノ', 'EXPORT', 'HIGH', '児童ポルノ'],
        ['じどうポルノ', 'EXPORT', 'HIGH', '児童ポルノひらがな'],
        ['child porn', 'EXPORT', 'HIGH', '児童ポルノ英語'],
        ['Child Porn', 'EXPORT', 'HIGH', '児童ポルノ英語大文字'],
        ['CHILD PORN', 'EXPORT', 'HIGH', '児童ポルノ英語全大文字'],
        ['child pornography', 'EXPORT', 'HIGH', '児童ポルノ正式英語'],
        ['Child Pornography', 'EXPORT', 'HIGH', '児童ポルノ正式英語大文字'],
        ['CHILD PORNOGRAPHY', 'EXPORT', 'HIGH', '児童ポルノ正式英語全大文字'],
        ['わいせつ', 'EXPORT', 'HIGH', 'わいせつ物'],
        ['わいせつ物', 'EXPORT', 'HIGH', 'わいせつ物'],
        ['obscene', 'EXPORT', 'HIGH', 'わいせつ英語'],
        ['Obscene', 'EXPORT', 'HIGH', 'わいせつ英語大文字'],
        ['OBSCENE', 'EXPORT', 'HIGH', 'わいせつ英語全大文字'],
        
        // 希少動植物関連 (HIGH PRIORITY)
        ['象牙', 'EXPORT', 'HIGH', '象牙'],
        ['ぞうげ', 'EXPORT', 'HIGH', '象牙ひらがな'],
        ['ivory', 'EXPORT', 'HIGH', '象牙英語'],
        ['Ivory', 'EXPORT', 'HIGH', '象牙英語大文字'],
        ['IVORY', 'EXPORT', 'HIGH', '象牙英語全大文字'],
        ['サイの角', 'EXPORT', 'HIGH', 'サイの角'],
        ['rhino horn', 'EXPORT', 'HIGH', 'サイの角英語'],
        ['Rhino Horn', 'EXPORT', 'HIGH', 'サイの角英語大文字'],
        ['RHINO HORN', 'EXPORT', 'HIGH', 'サイの角英語全大文字'],
        ['虎の骨', 'EXPORT', 'HIGH', '虎の骨'],
        ['tiger bone', 'EXPORT', 'HIGH', '虎の骨英語'],
        ['Tiger Bone', 'EXPORT', 'HIGH', '虎の骨英語大文字'],
        ['TIGER BONE', 'EXPORT', 'HIGH', '虎の骨英語全大文字'],
        ['ワシントン条約', 'EXPORT', 'HIGH', 'ワシントン条約'],
        ['CITES', 'EXPORT', 'HIGH', 'ワシントン条約略称'],
        ['cites', 'EXPORT', 'HIGH', 'ワシントン条約略称小文字'],
        
        // ブランド偽造関連 (HIGH PRIORITY)
        ['ブランドコピー', 'EXPORT', 'HIGH', 'ブランドコピー'],
        ['brand copy', 'EXPORT', 'HIGH', 'ブランドコピー英語'],
        ['Brand Copy', 'EXPORT', 'HIGH', 'ブランドコピー英語大文字'],
        ['BRAND COPY', 'EXPORT', 'HIGH', 'ブランドコピー英語全大文字'],
        ['ブランド偽造', 'EXPORT', 'HIGH', 'ブランド偽造'],
        ['brand fake', 'EXPORT', 'HIGH', 'ブランド偽造英語'],
        ['Brand Fake', 'EXPORT', 'HIGH', 'ブランド偽造英語大文字'],
        ['BRAND FAKE', 'EXPORT', 'HIGH', 'ブランド偽造英語全大文字'],
        ['偽ブランド', 'EXPORT', 'HIGH', '偽ブランド'],
        ['にせブランド', 'EXPORT', 'HIGH', '偽ブランドひらがな'],
        ['ニセブランド', 'EXPORT', 'HIGH', '偽ブランドカタカナ'],
        
        // 航空便禁止品 (MEDIUM PRIORITY)
        ['ライター', 'EXPORT', 'MEDIUM', 'ライター'],
        ['lighter', 'EXPORT', 'MEDIUM', 'ライター英語'],
        ['Lighter', 'EXPORT', 'MEDIUM', 'ライター英語大文字'],
        ['LIGHTER', 'EXPORT', 'MEDIUM', 'ライター英語全大文字'],
        ['マッチ', 'EXPORT', 'MEDIUM', 'マッチ'],
        ['match', 'EXPORT', 'MEDIUM', 'マッチ英語'],
        ['Match', 'EXPORT', 'MEDIUM', 'マッチ英語大文字'],
        ['MATCH', 'EXPORT', 'MEDIUM', 'マッチ英語全大文字'],
        ['香水', 'EXPORT', 'MEDIUM', '香水'],
        ['こうすい', 'EXPORT', 'MEDIUM', '香水ひらがな'],
        ['perfume', 'EXPORT', 'MEDIUM', '香水英語'],
        ['Perfume', 'EXPORT', 'MEDIUM', '香水英語大文字'],
        ['PERFUME', 'EXPORT', 'MEDIUM', '香水英語全大文字'],
        ['アルコール', 'EXPORT', 'MEDIUM', 'アルコール'],
        ['alcohol', 'EXPORT', 'MEDIUM', 'アルコール英語'],
        ['Alcohol', 'EXPORT', 'MEDIUM', 'アルコール英語大文字'],
        ['ALCOHOL', 'EXPORT', 'MEDIUM', 'アルコール英語全大文字'],
        ['電池', 'EXPORT', 'MEDIUM', '電池'],
        ['でんち', 'EXPORT', 'MEDIUM', '電池ひらがな'],
        ['battery', 'EXPORT', 'MEDIUM', '電池英語'],
        ['Battery', 'EXPORT', 'MEDIUM', '電池英語大文字'],
        ['BATTERY', 'EXPORT', 'MEDIUM', '電池英語全大文字'],
        ['リチウム電池', 'EXPORT', 'MEDIUM', 'リチウム電池'],
        ['lithium battery', 'EXPORT', 'MEDIUM', 'リチウム電池英語'],
        ['Lithium Battery', 'EXPORT', 'MEDIUM', 'リチウム電池英語大文字'],
        ['LITHIUM BATTERY', 'EXPORT', 'MEDIUM', 'リチウム電池英語全大文字'],
        
        // 規制対象食品 (MEDIUM PRIORITY)
        ['生肉', 'EXPORT', 'MEDIUM', '生肉'],
        ['なまにく', 'EXPORT', 'MEDIUM', '生肉ひらがな'],
        ['raw meat', 'EXPORT', 'MEDIUM', '生肉英語'],
        ['Raw Meat', 'EXPORT', 'MEDIUM', '生肉英語大文字'],
        ['RAW MEAT', 'EXPORT', 'MEDIUM', '生肉英語全大文字'],
        ['生卵', 'EXPORT', 'MEDIUM', '生卵'],
        ['なまたまご', 'EXPORT', 'MEDIUM', '生卵ひらがな'],
        ['raw egg', 'EXPORT', 'MEDIUM', '生卵英語'],
        ['Raw Egg', 'EXPORT', 'MEDIUM', '生卵英語大文字'],
        ['RAW EGG', 'EXPORT', 'MEDIUM', '生卵英語全大文字'],
        ['種子', 'EXPORT', 'MEDIUM', '種子'],
        ['しゅし', 'EXPORT', 'MEDIUM', '種子ひらがな'],
        ['seed', 'EXPORT', 'MEDIUM', '種子英語'],
        ['Seed', 'EXPORT', 'MEDIUM', '種子英語大文字'],
        ['SEED', 'EXPORT', 'MEDIUM', '種子英語全大文字'],
        ['seeds', 'EXPORT', 'MEDIUM', '種子英語複数'],
        ['Seeds', 'EXPORT', 'MEDIUM', '種子英語複数大文字'],
        ['SEEDS', 'EXPORT', 'MEDIUM', '種子英語複数全大文字']
    ];
    
    echo "<h3>2. キーワード投入開始</h3>";
    echo "<p>投入予定数: " . count($keywords) . "件</p>";
    
    // 4. バッチ挿入処理
    $insertSQL = "INSERT INTO filter_keywords (keyword, type, priority, description, is_active, created_at) VALUES (?, ?, ?, ?, TRUE, NOW())";
    $stmt = $pdo->prepare($insertSQL);
    
    $successCount = 0;
    $totalCount = count($keywords);
    
    $pdo->beginTransaction();
    
    foreach ($keywords as $index => $keywordData) {
        try {
            $stmt->execute([
                $keywordData[0], // keyword
                $keywordData[1], // type
                $keywordData[2], // priority
                $keywordData[3]  // description
            ]);
            $successCount++;
        } catch (Exception $e) {
            echo "<div style='color: red;'>エラー: {$keywordData[0]} - {$e->getMessage()}</div>";
        }
        
        // 進捗表示
        if (($index + 1) % 25 == 0 || ($index + 1) == $totalCount) {
            $progress = round((($index + 1) / $totalCount) * 100, 1);
            echo "<div>進捗: {$progress}% ({$index + 1}/{$totalCount})</div>";
        }
    }
    
    $pdo->commit();
    
    // 5. 結果確認・表示
    echo "<h3>3. 投入結果</h3>";
    echo "<p><strong>成功: {$successCount}/{$totalCount}件</strong></p>";
    
    // 優先度別集計
    $stmt = $pdo->query("
        SELECT 
            priority, 
            COUNT(*) as count 
        FROM filter_keywords 
        WHERE type = 'EXPORT' 
        GROUP BY priority 
        ORDER BY CASE priority 
            WHEN 'HIGH' THEN 3 
            WHEN 'MEDIUM' THEN 2 
            ELSE 1 
        END DESC
    ");
    
    echo "<h4>優先度別内訳:</h4><ul>";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "<li>{$row['priority']}: {$row['count']}件</li>";
    }
    echo "</ul>";
    
    // サンプル表示
    $stmt = $pdo->query("
        SELECT keyword, priority, description 
        FROM filter_keywords 
        WHERE type = 'EXPORT' 
        ORDER BY 
            CASE priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END DESC,
            keyword
        LIMIT 15
    ");
    
    echo "<h4>投入されたキーワード（サンプル15件）:</h4>";
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse;'>";
    echo "<tr><th>キーワード</th><th>優先度</th><th>説明</th></tr>";
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $priorityColor = $row['priority'] == 'HIGH' ? 'red' : 
                        ($row['priority'] == 'MEDIUM' ? 'orange' : 'green');
        echo "<tr>";
        echo "<td><strong>{$row['keyword']}</strong></td>";
        echo "<td style='color: {$priorityColor};'><strong>{$row['priority']}</strong></td>";
        echo "<td>{$row['description']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // 総数更新確認
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM filter_keywords");
    $newCount = $stmt->fetchColumn();
    echo "<p><strong>データベース内総キーワード数: {$newCount}件</strong> (前: {$currentCount}件)</p>";
    
    echo "<div style='background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;'>";
    echo "<h3 style='color: #155724;'>✅ キーワード投入完了!</h3>";
    echo "<p style='color: #155724;'>輸出禁止品フィルタリングシステムが使用可能になりました。</p>";
    echo "</div>";
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    echo "<div style='background: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24;'>";
    echo "<h3>❌ エラーが発生しました</h3>";
    echo "<p>エラー: " . $e->getMessage() . "</p>";
    echo "<p>ファイル: " . $e->getFile() . "</p>";
    echo "<p>行: " . $e->getLine() . "</p>";
    echo "</div>";
}
?>