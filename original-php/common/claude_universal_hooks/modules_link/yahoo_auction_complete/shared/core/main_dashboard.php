<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Yahoo Auction Complete</title>
</head>
<body>
    <h1>📁 Yahoo Auction Complete - 整理済み</h1>
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem;">
        <?php for($i = 1; $i <= 10; $i++): ?>
        <div style="border: 1px solid #ddd; padding: 1rem; text-align: center;">
            <h3><?= sprintf('%02d', $i) ?>_module</h3>
            <a href="../../<?= sprintf('%02d', $i) ?>_<?= ['dashboard','scraping','approval','analysis','editing','calculation','filters','listing','inventory','reports'][$i-1] ?>/">開く</a>
        </div>
        <?php endfor; ?>
    </div>
    <hr>
    <p><a href="../../old_data_archive/">📦 古いデータアーカイブ</a></p>
</body>
</html>
