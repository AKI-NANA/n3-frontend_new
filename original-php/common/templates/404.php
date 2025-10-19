<?php
/**
 * NAGANO-3 404エラーページ
 */

// セキュリティチェック
require_once __DIR__ . '/../../common/includes/security.php';
initializeSystem();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>404 - ページが見つかりません - NAGANO-3</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            text-align: center; 
            padding: 2rem; 
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        .error-container { 
            max-width: 600px; 
            margin: 0 auto;
            background: white;
            padding: 3rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .error-code { 
            font-size: 6rem; 
            color: #dc3545;
            margin-bottom: 1rem;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .error-message { 
            font-size: 1.5rem; 
            margin-bottom: 2rem;
            color: #343a40;
        }
        .error-details {
            color: #6c757d;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .back-link { 
            display: inline-block; 
            padding: 1rem 2rem; 
            background: #007bff; 
            color: white; 
            text-decoration: none; 
            border-radius: 0.5rem;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        .back-link:hover {
            background: #0056b3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">😢</div>
        <div class="error-code">404</div>
        <div class="error-message">ページが見つかりません</div>
        <div class="error-details">
            申し訳ありません。お探しのページは存在しないか、移動された可能性があります。<br>
            URLが正しいかご確認ください。
        </div>
        <a href="/index.php" class="back-link">🏠 ダッシュボードに戻る</a>
    </div>
</body>
</html> 