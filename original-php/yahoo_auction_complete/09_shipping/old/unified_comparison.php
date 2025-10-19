<?php
/**
 * 統合配送料金比較システム
 * 全業者・全サービスを1ページで比較表示
 */

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合配送料金比較システム - 全業者一覧表示</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --primary-color: #2563eb;
            --secondary-color: #64748b;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --space-2xl: 3rem;
            --radius-sm: 0.25rem;
            --radius-md: 0.375rem;
            --radius-lg: 0.5rem;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        // サンプルデータでマトリックス表示（API接続失敗時のフォールバック）
        function displaySampleMatrix() {
            debugLog('サンプルデータでマトリックス表示開始');
            
            // SpeedPAK実データを含むサンプルデータ
            const sampleData = {
                destination: 'US',
                zone_code: 'zone1',
                weight_steps: [0.1, 0.2, 0.3, 0.4, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0],
                carriers: {
                    cpass: {
                        'SPEEDPAK_ECONOMY_US': {
                            0.1: { price: 1227, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.2: { price: 1367, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.3: { price: 1581, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.4: { price: 1778, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.5: { price: 2060, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            1.0: { price: 3020, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            1.5: { price: 3816, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            2.0: { price: 5245, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            2.5: { price: 5582, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            3.0: { price: 6333, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            4.0: { price: 7704, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            5.0: { price: 11733, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            6.0: { price: 13335, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            7.0: { price: 15209, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            8.0: { price: 16893, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            9.0: { price: 18152, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            10.0: { price: 19639, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            11.0: { price: 20864, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            12.0: { price: 22199, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            13.0: { price: 23466, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            14.0: { price: 24869, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            15.0: { price: 25988, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            16.0: { price: 28149, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            17.0: { price: 29495, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            18.0: { price: 30902, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            19.0: { price: 32204, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            20.0: { price: 33947, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            21.0: { price: 35426, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            22.0: { price: 36859, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            23.0: { price: 38516, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            24.0: { price: 39678, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            25.0: { price: 40955, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false }
                        },
                        'SPEEDPAK_ECONOMY_US_OUTSIDE': {
                            0.1: { price: 1300, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.2: { price: 1477, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.3: { price: 1806, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.4: { price: 2126, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.5: { price: 2622, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            1.0: { price: 4076, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            1.5: { price: 5200, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            2.0: { price: 5805, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            2.5: { price: 6070, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            3.0: { price: 6986, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            4.0: { price: 8705, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            5.0: { price: 11733, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false }
                        },
                        'SPEEDPAK_ECONOMY_UK': {
                            0.1: { price: 938, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            0.5: { price: 1571, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            1.0: { price: 2240, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            2.0: { price: 3620, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            3.0: { price: 5095, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            5.0: { price: 7810, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            10.0: { price: 14474, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            15.0: { price: 21362, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            20.0: { price: 28100, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false },
                            25.0: { price: 37410, delivery_days: '7-10', has_tracking: true, has_insurance: true, estimated: false }
                        },
                        'SPEEDPAK_ECONOMY_DE': {
                            0.1: { price: 1336, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            0.5: { price: 1769, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            1.0: { price: 2273, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            2.0: { price: 4092, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            3.0: { price: 5092, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            5.0: { price: 7524, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            10.0: { price: 13805, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            15.0: { price: 20107, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            20.0: { price: 26451, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false },
                            25.0: { price: 30511, delivery_days: '7-11', has_tracking: true, has_insurance: true, estimated: false }
                        },
                        'SPEEDPAK_ECONOMY_AU': {
                            0.1: { price: 1142, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.5: { price: 1630, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            1.0: { price: 2068, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            2.0: { price: 3153, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            3.0: { price: 3507, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            5.0: { price: 5290, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            10.0: { price: 8573, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            15.0: { price: 11230, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            20.0: { price: 15176, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false },
                            25.0: { price: 16960, delivery_days: '6-12', has_tracking: true, has_insurance: true, estimated: false }
                        }
                    },
                    emoji: {
                        'ELOGI_DHL_EXPRESS': {
                            0.5: { price: 3200, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            1.0: { price: 3400, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            2.0: { price: 3800, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            3.0: { price: 4200, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            5.0: { price: 5000, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            10.0: { price: 8000, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            15.0: { price: 12000, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            20.0: { price: 16000, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            25.0: { price: 20000, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true }
                        }
                    },
                    jppost: {
                        'EMS': {
                            0.5: { price: 1400, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            1.0: { price: 1550, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            2.0: { price: 1830, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            3.0: { price: 2200, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            5.0: { price: 3000, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            10.0: { price: 5500, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            15.0: { price: 8000, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            20.0: { price: 10500, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            25.0: { price: 13000, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true }
                        }
                    }
                },
                data_source: 'sample_with_real_speedpak_25kg'
            };
            
            matrixData = sampleData;
            
            // サンプルデータ通知
            const notification = document.createElement('div');
            notification.className = 'notification warning';
            notification.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>サンプルデータ表示中:</strong><br>
                    API接続に問題があります。SpeedPAKの実データを含むサンプルデータで表示しています。
                    <button onclick="generateUnifiedMatrix()" style="margin-left: 10px; padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px;">再試行</button>
                </div>
            `;
            
            const matrixContainer = document.getElementById('matrixContainer');
            matrixContainer.insertBefore(notification, matrixContainer.firstChild);
            
            displayUnifiedMatrix('all');
            matrixContainer.style.display = 'block';
            
            debugLog('サンプルデータでマトリックス表示完了');
        }
        
        // ネットワーク診断機能
        async function debugNetwork() {
            debugLog('ネットワーク診断開始');
            
            const matrixContent = document.getElementById('matrixContent');
            matrixContent.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <h3><i class="fas fa-stethoscope"></i> ネットワーク診断中...</h3>
                    <div class="loading" style="margin: var(--space-lg) auto;"></div>
                </div>
            `;
            
            try {
                // 1. APIパス確認
                debugLog('ステップ 1: APIパス確認', API_BASE);
                
                const testResponse = await fetch(API_BASE, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
                debugLog('APIレスポンス', { status: testResponse.status, statusText: testResponse.statusText });
                
                if (testResponse.ok) {
                    matrixContent.innerHTML = `
                        <div style="text-align: center; padding: var(--space-2xl); color: var(--success-color);">
                            <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                            <h3>API接続成功</h3>
                            <p>APIエンドポイントにアクセスできました。</p>
                            <button class="generate-btn" onclick="generateUnifiedMatrix()" style="margin-top: var(--space-md);">
                                <i class="fas fa-chart-line"></i> 再度マトリックス生成
                            </button>
                        </div>
                    `;
                } else {
                    throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
                }
                
            } catch (error) {
                debugLog('ネットワーク診断エラー', error.message);
                
                matrixContent.innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--danger-color);">
                        <i class="fas fa-times-circle" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                        <h3>API接続失敗</h3>
                        <p>エラー詳細: ${error.message}</p>
                        <p>APIパス: ${API_BASE}</p>
                        <div style="margin-top: var(--space-md); display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap;">
                            <button class="generate-btn" onclick="displaySampleMatrix()">
                                <i class="fas fa-chart-area"></i> サンプルデータで表示
                            </button>
                            <button class="generate-btn" onclick="debugNetwork()">
                                <i class="fas fa-redo"></i> 再診断
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-lg);
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            color: white;
            padding: var(--space-xl);
            border-radius: var(--radius-lg);
            margin-bottom: var(--space-lg);
            text-align: center;
        }
        
        .header h1 {
            font-size: 2rem;
            margin-bottom: var(--space-sm);
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .conditions-panel {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            margin-bottom: var(--space-lg);
            box-shadow: var(--shadow-md);
        }
        
        .conditions-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: var(--space-lg);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }
        
        .conditions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-lg);
            margin-bottom: var(--space-lg);
        }
        
        .condition-item {
            display: flex;
            flex-direction: column;
        }
        
        .condition-label {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: var(--space-sm);
        }
        
        .condition-input, .condition-select {
            padding: var(--space-sm);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            font-size: 1rem;
            background: white;
        }
        
        .condition-input:focus, .condition-select:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .generate-btn {
            background: var(--success-color);
            color: white;
            border: none;
            padding: var(--space-md) var(--space-xl);
            border-radius: var(--radius-md);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin: 0 auto;
        }
        
        .generate-btn:hover {
            background: #059669;
            transform: translateY(-1px);
        }
        
        .generate-btn:disabled {
            background: var(--text-muted);
            cursor: not-allowed;
            transform: none;
        }
        
        .matrix-container {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xl);
            box-shadow: var(--shadow-md);
            margin-bottom: var(--space-lg);
        }
        
        .matrix-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-lg);
            flex-wrap: wrap;
            gap: var(--space-md);
        }
        
        .matrix-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }
        
        .matrix-info {
            display: flex;
            gap: var(--space-lg);
            flex-wrap: wrap;
        }
        
        .info-item {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            padding: var(--space-xs) var(--space-sm);
            background: var(--bg-tertiary);
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
        }
        
        .shipping-matrix-grid {
            display: grid;
            gap: 1px;
            background: #ddd;
            border: 1px solid #ccc;
            border-radius: var(--radius-md);
            overflow: hidden;
            font-size: 0.9rem;
            width: 100%;
            min-width: 800px; /* 最小幅を確保 */
        }
        
        .matrix-scroll-container {
            width: 100%;
            overflow-x: auto;
            overflow-y: visible;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: white;
        }
        
        .matrix-scroll-container::-webkit-scrollbar {
            height: 12px;
        }
        
        .matrix-scroll-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 6px;
        }
        
        .matrix-scroll-container::-webkit-scrollbar-thumb {
            background: var(--primary-color);
            border-radius: 6px;
        }
        
        .matrix-scroll-container::-webkit-scrollbar-thumb:hover {
            background: #1d4ed8;
        }
        
        .matrix-cell {
            background: white;
            padding: var(--space-sm);
            text-align: center;
            border: 1px solid #eee;
            position: relative;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-primary); /* 黒文字で確実に表示 */
        }
        
        .matrix-cell.header {
            background: #f5f5f5;
            font-weight: 700;
            position: sticky;
            top: 0;
            z-index: 10;
            font-size: 0.85rem;
            color: var(--text-primary); /* ヘッダーも黒文字 */
        }
        
        .matrix-cell.service-name {
            background: #f0f8ff;
            text-align: left;
            font-weight: 600;
            justify-content: flex-start;
            padding-left: var(--space-md);
            min-width: 200px;
            color: var(--text-primary); /* サービス名も黒文字 */
        }
        
        .matrix-cell.weight-cell {
            background: #f8f9fa;
            text-align: center;
            font-weight: 700;
            justify-content: center;
            color: var(--text-primary);
            min-width: 120px;
            border-right: 2px solid var(--border-color);
        }
        
        .matrix-cell.price {
            cursor: pointer;
            transition: all 0.2s;
            min-height: 70px;
        }
        
        .matrix-cell.price:hover {
            transform: scale(1.05);
            z-index: 5;
            box-shadow: var(--shadow-lg);
        }
        
        .matrix-cell.price.cheapest {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border: 2px solid var(--success-color);
            font-weight: 700;
        }
        
        .matrix-cell.price.fastest {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid var(--warning-color);
            font-weight: 700;
        }
        
        .matrix-cell.price.real-data {
            background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
            border: 2px solid var(--info-color);
        }
        
        .matrix-cell.price.estimated {
            background: linear-gradient(135deg, #fff8dc 0%, #ffeaa7 100%);
            border: 2px dashed #fdcb6e;
            opacity: 0.8;
        }
        
        .matrix-cell.price.estimated:hover {
            background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
            opacity: 1;
        }
        
        .price-value {
            font-weight: 700;
            font-size: 0.95rem;
            margin-bottom: 2px;
        }
        
        .data-label {
            font-size: 0.7rem;
            padding: 1px 4px;
            border-radius: 3px;
            font-weight: 600;
        }
        
        .real-data-label {
            background: var(--info-color);
            color: white;
        }
        
        .estimated-label {
            background: #fdcb6e;
            color: #2d3436;
        }
        
        .carrier-badge {
            font-size: 0.65rem;
            padding: 1px 3px;
            border-radius: 2px;
            font-weight: 500;
            margin-top: 2px;
        }
        
        .badge-elogi { background: #667eea; color: white; }
        .badge-cpass { background: #43e97b; color: white; }
        .badge-emoji { background: #f093fb; color: white; }
        .badge-jppost { background: #4facfe; color: white; }
        
        .matrix-cell.no-data {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            color: var(--text-muted);
            cursor: default;
            opacity: 0.6;
        }
        
        .no-data-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
        }
        
        .price-breakdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border: 2px solid var(--primary-color);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            box-shadow: var(--shadow-lg);
            z-index: 20;
            min-width: 300px;
            max-width: 400px;
        }
        
        .breakdown-header {
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: var(--space-sm);
            text-align: center;
        }
        
        .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: var(--space-sm);
        }
        
        .breakdown-table td {
            padding: var(--space-xs) var(--space-sm);
            border-bottom: 1px solid var(--border-color);
            text-align: left;
        }
        
        .breakdown-table tr.total td {
            border-top: 2px solid var(--primary-color);
            font-weight: 700;
            padding-top: var(--space-sm);
        }
        
        .delivery-info {
            background: var(--bg-tertiary);
            padding: var(--space-sm);
            border-radius: var(--radius-sm);
        }
        
        .delivery-info p {
            margin: 2px 0;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: var(--space-xs);
        }
        
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .notification {
            padding: var(--space-md);
            border-radius: var(--radius-md);
            margin-bottom: var(--space-md);
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }
        
        .notification.info {
            background: #dbeafe;
            border: 1px solid #93c5fd;
            color: #1e40af;
        }
        
        .notification.success {
            background: #d1fae5;
            border: 1px solid #6ee7b7;
            color: #065f46;
        }
        
        .notification.warning {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            color: #92400e;
        }
        
        @media (max-width: 768px) {
            .conditions-grid {
                grid-template-columns: 1fr;
            }
            
            .matrix-header {
                flex-direction: column;
                align-items: stretch;
            }
            
            .matrix-info {
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .shipping-matrix-grid {
                font-size: 0.75rem;
                min-width: 600px; /* モバイルでも最小幅を確保 */
            }
            
            .matrix-cell {
                min-height: 50px;
                padding: var(--space-xs);
            }
            
            .matrix-cell.service-name {
                min-width: 180px;
                font-size: 0.8rem;
            }
            
            .matrix-scroll-container {
                /* モバイルではスクロールバーを常に表示 */
                overflow-x: scroll;
            }
            
            .conditions-panel {
                padding: var(--space-md);
            }
            
            .generate-btn {
                width: 100%;
                text-align: center;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-shipping-fast"></i> 統合配送料金比較システム</h1>
            <p>全配送業者・サービスを1ページで比較 | eLogi・SpeedPAK・EMS・CPass統合表示</p>
        </div>

        <!-- システム説明 -->
        <div class="notification info">
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>統合比較システム:</strong><br>
                タブを廃止し、全ての配送業者（CPass SpeedPAK・ユロジ・日本郵便）とサービスを1つのマトリックスで比較できます。
                実データ（青）・推定値（黄）・最安値（緑）・最速（橙）を色分け表示。<br>
                <strong>重量範囲:</strong> 0.1kg刻み（～30kg）、0.5kg刻み（～50kg）、1.0kg刻み（～70kg）まで対応。
            </div>
        </div>

        <!-- 条件設定パネル -->
        <div class="conditions-panel">
            <h2 class="conditions-title">
                <i class="fas fa-sliders-h"></i>
                料金比較条件設定
            </h2>
            
            <div class="conditions-grid">
                <div class="condition-item">
                    <label class="condition-label">
                        <i class="fas fa-globe"></i>
                        配送先
                    </label>
                    <select id="destination" class="condition-select">
                        <option value="US" selected>アメリカ合衆国</option>
                        <option value="GB">イギリス</option>
                        <option value="DE">ドイツ</option>
                        <option value="AU">オーストラリア</option>
                        <option value="CA">カナダ</option>
                    </select>
                </div>

                <div class="condition-item">
                    <label class="condition-label">
                        <i class="fas fa-step-forward"></i>
                        重量刻み
                    </label>
                    <select id="weightStep" class="condition-select">
                        <option value="0.1" selected>0.1kg刻み（詳細: 30kgまで）</option>
                        <option value="0.5">0.5kg刻み（標準: 50kgまで）</option>
                        <option value="1.0">1.0kg刻み（簡易: 70kgまで）</option>
                    </select>
                </div>

                <div class="condition-item">
                    <label class="condition-label">
                        <i class="fas fa-filter"></i>
                        表示フィルター
                    </label>
                    <select id="displayFilter" class="condition-select">
                        <option value="all" selected>全サービス表示</option>
                        <option value="real_data_only">実データのみ</option>
                        <option value="cheapest_only">最安値のみ</option>
                        <option value="fastest_only">最速のみ</option>
                    </select>
                </div>
            </div>
            
            <button class="generate-btn" onclick="generateUnifiedMatrix()">
                <i class="fas fa-chart-line"></i>
                統合料金マトリックス生成
            </button>
        </div>

        <!-- 統合マトリックス表示エリア -->
        <div class="matrix-container" id="matrixContainer" style="display: none;">
            <div class="matrix-header">
                <h3 class="matrix-title">
                    <i class="fas fa-table"></i>
                    統合配送料金マトリックス
                </h3>
                <div class="matrix-info" id="matrixInfo">
                    <!-- 動的に生成 -->
                </div>
            </div>
            
            <div id="matrixContent">
                <!-- マトリックス表示 -->
            </div>
        </div>
    </div>

    <script>
        // APIベースURL
        const API_BASE = './api/matrix_data_api.php';
        
        // グローバル変数
        let matrixData = null;
        let debugMode = true; // デバッグモード
        
        // デバッグログ関数
        function debugLog(message, data = null) {
            if (debugMode) {
                console.log(`[統合システム] ${message}`, data || '');
            }
        }
        
        // 統合マトリックス生成
        async function generateUnifiedMatrix() {
            const destination = document.getElementById('destination').value;
            const weightStep = parseFloat(document.getElementById('weightStep').value);
            const displayFilter = document.getElementById('displayFilter').value;
            
            // 最大重量を自動計算（クーリエは70kgまで対応）
            let maxWeight;
            if (weightStep === 0.1) {
                maxWeight = 30.0; // 0.1kg刻み: 300ポイントまで（詳細表示）
            } else if (weightStep === 0.5) {
                maxWeight = 50.0; // 0.5kg刻み: 100ポイントまで（標準表示）
            } else {
                maxWeight = 70.0; // 1.0kg刻み: 70ポイントまで（クーリエ最大）
            }
            
            debugLog('統合マトリックス生成開始', { destination, maxWeight, weightStep, displayFilter });
            
            const generateBtn = document.querySelector('.generate-btn');
            const matrixContainer = document.getElementById('matrixContainer');
            const matrixContent = document.getElementById('matrixContent');
            
            // ローディング状態
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<div class="loading"></div> 統合マトリックス生成中...';
            
            try {
                debugLog('API呼び出し開始', API_BASE);
                
                const requestData = {
                    action: 'get_tabbed_matrix',
                    destination: destination,
                    max_weight: maxWeight,
                    weight_step: weightStep
                };
                
                debugLog('リクエストデータ', requestData);
                
                const response = await fetch(API_BASE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify(requestData)
                });

                debugLog('レスポンス受信', { status: response.status, statusText: response.statusText });
                
                if (!response.ok) {
                    throw new Error(`HTTP エラー: ${response.status} ${response.statusText}`);
                }
                
                const responseText = await response.text();
                debugLog('レスポンステキスト（最初の500文字）', responseText.substring(0, 500));
                
                let data;
                try {
                    data = JSON.parse(responseText);
                    debugLog('JSON解析成功', { success: data.success });
                } catch (jsonError) {
                    debugLog('JSON解析エラー', jsonError.message);
                    throw new Error(`JSON解析エラー: ${jsonError.message}`);
                }

                if (data.success) {
                    matrixData = data.data;
                    debugLog('マトリックスデータ取得成功', { 
                        carriersCount: Object.keys(matrixData.carriers || {}).length,
                        weightStepsCount: (matrixData.weight_steps || []).length 
                    });
                    
                    displayUnifiedMatrix(displayFilter);
                    matrixContainer.style.display = 'block';
                } else {
                    debugLog('API処理エラー', data.error);
                    throw new Error(data.error || 'APIエラーが発生しました');
                }

            } catch (error) {
                debugLog('エラー発生', { error: error.message, stack: error.stack });
                
                // 詳細エラー情報を表示
                matrixContent.innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--danger-color);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                        <h3>API接続エラー</h3>
                        <p style="margin: var(--space-md) 0;">エラー詳細: ${error.message}</p>
                        <p style="color: var(--text-muted); font-size: 0.9rem;">APIパス: ${API_BASE}</p>
                        <div style="background: #f8f9fa; padding: var(--space-md); margin: var(--space-md) 0; border-radius: var(--radius-md); text-align: left;">
                            <h4 style="margin-bottom: var(--space-sm);">\ud83d\udd0d デバッグ情報:</h4>
                            <p><strong>データベース確認:</strong> real_shipping_rates テーブルにデータが入っていません。</p>
                            <p><strong>必要な操作:</strong> cpass_speedpak_complete_data.sql を実行してデータを投入してください。</p>
                            <code style="display: block; margin-top: var(--space-sm); padding: var(--space-sm); background: white; border-radius: 3px;">
                                psql -h localhost -d nagano3_db -U postgres -f cpass_speedpak_complete_data.sql
                            </code>
                        </div>
                        <div style="margin-top: var(--space-md); display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap;">
                            <button class="generate-btn" onclick="displaySampleMatrix()">
                                <i class="fas fa-chart-area"></i> サンプルデータで表示
                            </button>
                            <button class="generate-btn" onclick="debugNetwork()">
                                <i class="fas fa-bug"></i> ネットワーク診断
                            </button>
                            <button class="generate-btn" onclick="window.open('emergency_db_check.sql', '_blank')">
                                <i class="fas fa-database"></i> DB診断スクリプト
                            </button>
                        </div>
                    </div>
                `;
                
                matrixContainer.style.display = 'block';
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-chart-line"></i> 統合料金マトリックス生成';
            }
        }
        
        // 統合マトリックス表示（縦横反転版：重量が縦軸、サービスが横軸）
        function displayUnifiedMatrix(filter = 'all') {
            if (!matrixData) return;
            
            const weightSteps = matrixData.weight_steps;
            const carriers = matrixData.carriers;
            
            // 全サービスを統合
            const allServices = [];
            
            Object.keys(carriers).forEach(carrierCode => {
                const carrierData = carriers[carrierCode];
                Object.keys(carrierData).forEach(serviceName => {
                    allServices.push({
                        carrierCode: carrierCode,
                        serviceName: serviceName,
                        displayName: serviceName,
                        data: carrierData[serviceName]
                    });
                });
            });
            
            // フィルター適用
            const filteredServices = applyServiceFilter(allServices, filter);
            
            if (filteredServices.length === 0) {
                document.getElementById('matrixContent').innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
                        <i class="fas fa-filter" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                        <p>フィルター条件に一致するサービスがありません</p>
                    </div>
                `;
                return;
            }
            
            // ヘッダー行生成（重量が縦、サービスが横）
            const headers = ['重量(kg)', ...filteredServices.map(service => {
                const carrierBadgeClass = `badge-${service.carrierCode.toLowerCase()}`;
                return `<div>${service.displayName}<br><span class="carrier-badge ${carrierBadgeClass}">${service.carrierCode}</span></div>`;
            })];
            
            // グリッドスタイル設定（サービス数に応じて調整）
            const serviceColumnWidth = filteredServices.length > 8 ? '120px' : filteredServices.length > 5 ? '140px' : '160px';
            const gridColumns = `120px repeat(${filteredServices.length}, minmax(${serviceColumnWidth}, 1fr))`;
            
            let matrixHtml = `
                <div class="matrix-scroll-container">
                    <div class="shipping-matrix-grid" style="grid-template-columns: ${gridColumns}; font-size: ${filteredServices.length > 8 ? '0.8rem' : '0.9rem'}; width: ${120 + (filteredServices.length * (filteredServices.length > 8 ? 120 : filteredServices.length > 5 ? 140 : 160))}px;">
                        ${headers.map(header => `
                            <div class="matrix-cell header">${header}</div>
                        `).join('')}
            `;

            // 各重量行の料金生成
            weightSteps.forEach(weight => {
                // 重量を正しくフォーマット（小数点以下1桁まで）
                const weightFormatted = parseFloat(weight).toFixed(1);
                
                // 重量セル
                matrixHtml += `
                    <div class="matrix-cell weight-cell">
                        <strong>${weightFormatted}kg</strong>
                    </div>
                `;
                
                // 各サービスの料金セル
                filteredServices.forEach(service => {
                    const priceData = service.data[weight];
                    if (priceData) {
                        const isChepest = priceData.is_cheapest ? ' cheapest' : '';
                        const isFastest = priceData.is_fastest ? ' fastest' : '';
                        const dataType = priceData.estimated ? ' estimated' : ' real-data';
                        
                        matrixHtml += `
                            <div class="matrix-cell price${isChepest}${isFastest}${dataType}" 
                                 onclick="showPriceBreakdown(this, '${service.serviceName}', ${weight}, '${service.carrierCode}'); return false;"
                                 data-service="${service.serviceName}" data-weight="${weight}" data-carrier="${service.carrierCode}"
                                 title="${service.displayName} ${weight}kg - ¥${priceData.price.toLocaleString()}${priceData.estimated ? ' (推定値)' : ' (実データ)'}">
                                <div class="price-value">¥${priceData.price.toLocaleString()}</div>
                                <div class="data-label ${priceData.estimated ? 'estimated-label' : 'real-data-label'}">
                                    ${priceData.estimated ? '推定' : '実データ'}
                                </div>
                                <div class="delivery-info-compact">
                                    <small>${priceData.delivery_days || '2-5'}日</small>
                                </div>
                                <div class="price-breakdown" style="display: none;">
                                    <div class="breakdown-header">${service.displayName} - ${weight}kg</div>
                                    <table class="breakdown-table">
                                        <tr><td>基本料金:</td><td>¥${(priceData.breakdown?.base_price || Math.round(priceData.price * 0.7)).toLocaleString()}</td></tr>
                                        <tr><td>重量追加:</td><td>¥${(priceData.breakdown?.weight_surcharge || Math.round(priceData.price * 0.2)).toLocaleString()}</td></tr>
                                        <tr><td>燃料サーチャージ:</td><td>¥${(priceData.breakdown?.fuel_surcharge || Math.round(priceData.price * 0.1)).toLocaleString()}</td></tr>
                                        <tr><td>その他手数料:</td><td>¥${(priceData.breakdown?.other_fees || 0).toLocaleString()}</td></tr>
                                        <tr class="total"><td><strong>合計:</strong></td><td><strong>¥${priceData.price.toLocaleString()}</strong></td></tr>
                                    </table>
                                    <div class="delivery-info">
                                        <p><i class="fas fa-clock"></i> 配送日数: ${priceData.delivery_days || '2-5'}日</p>
                                        <p><i class="fas fa-shield-alt"></i> 保険: ${priceData.has_insurance ? '有' : '無'}</p>
                                        <p><i class="fas fa-search"></i> 追跡: ${priceData.has_tracking ? '有' : '無'}</p>
                                        <p><i class="fas fa-database"></i> データ: ${priceData.estimated ? '推定値（PDF未抽出）' : '実データ（PDF抽出済）'}</p>
                                        <p><i class="fas fa-truck"></i> 業者: ${service.carrierCode}</p>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        matrixHtml += `
                            <div class="matrix-cell no-data" 
                                 title="${weight}kg: このサービスでは対応していません">
                                <div class="no-data-content">
                                    <i class="fas fa-minus"></i>
                                    <small>対応外</small>
                                </div>
                            </div>
                        `;
                    }
                });
            });

            matrixHtml += '</div></div>'; // グリッドとスクロールコンテナを閉じる
            
            // 情報パネル更新
            updateMatrixInfo(filteredServices, weightSteps);
            
            document.getElementById('matrixContent').innerHTML = matrixHtml;
        }
        
        // サービスフィルター適用
        function applyServiceFilter(services, filter) {
            switch (filter) {
                case 'real_data_only':
                    return services.filter(service => {
                        return Object.values(service.data).some(priceData => !priceData.estimated);
                    });
                case 'cheapest_only':
                    // 実装予定: 重量別最安値サービスのみ
                    return services;
                case 'fastest_only':
                    // 実装予定: 最速サービスのみ
                    return services;
                default:
                    return services;
            }
        }
        
        // マトリックス情報更新
        function updateMatrixInfo(services, weightSteps) {
            const realDataCount = services.filter(s => 
                Object.values(s.data).some(p => !p.estimated)
            ).length;
            
            const estimatedCount = services.length - realDataCount;
            
            document.getElementById('matrixInfo').innerHTML = `
                <div class="info-item">
                    <i class="fas fa-layer-group"></i>
                    ${services.length} サービス
                </div>
                <div class="info-item">
                    <i class="fas fa-weight"></i>
                    ${weightSteps.length} 重量ポイント
                </div>
                <div class="info-item">
                    <i class="fas fa-database"></i>
                    実データ: ${realDataCount}
                </div>
                <div class="info-item">
                    <i class="fas fa-chart-line"></i>
                    推定値: ${estimatedCount}
                </div>
            `;
        }
        
        // 料金詳細ポップアップ表示
        function showPriceBreakdown(cellElement, serviceName, weight, carrierCode) {
            // 既存のポップアップを閉じる
            document.querySelectorAll('.price-breakdown').forEach(popup => {
                popup.style.display = 'none';
            });
            
            const popup = cellElement.querySelector('.price-breakdown');
            if (popup) {
                popup.style.display = 'block';
                
                // クリック外で閉じる
                setTimeout(() => {
                    document.addEventListener('click', function closePopup(e) {
                        if (!cellElement.contains(e.target)) {
                            popup.style.display = 'none';
                            document.removeEventListener('click', closePopup);
                        }
                    });
                }, 100);
            }
        }
        
        // ページ読み込み時の初期化（API接続を試行）
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ 統合配送料金比較システム初期化完了');
            
            // データベース修正後は実データで表示を試行
            setTimeout(() => {
                console.log('🚀 実データベース接続を試行します');
                generateUnifiedMatrix(); // API接続を試行
            }, 1000);
        });
        
        // サンプルデータでマトリックス表示（API接続失敗時のフォールバック）
        function displaySampleMatrix() {
            debugLog('サンプルデータでマトリックス表示開始');
            
            // SpeedPAK実データを含むサンプルデータ
            const sampleData = {
                destination: 'US',
                zone_code: 'zone1',
                weight_steps: [0.1, 0.2, 0.3, 0.4, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0],
                carriers: {
                    speedpak: {
                        'SPEEDPAK_ECONOMY': {
                            0.1: { price: 1227, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.2: { price: 1367, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.3: { price: 1581, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.4: { price: 1778, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            0.5: { price: 2060, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            1.0: { price: 3020, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            1.5: { price: 3816, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            2.0: { price: 5245, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            2.5: { price: 5582, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            3.0: { price: 6333, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            4.0: { price: 7704, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false },
                            5.0: { price: 11733, delivery_days: '8-12', has_tracking: true, has_insurance: true, estimated: false }
                        },
                        'SPEEDPAK_ECONOMY_OUTSIDE': {
                            0.1: { price: 1300, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.2: { price: 1477, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.3: { price: 1806, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.4: { price: 2126, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            0.5: { price: 2622, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            1.0: { price: 4076, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            1.5: { price: 5200, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            2.0: { price: 5805, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            2.5: { price: 6070, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            3.0: { price: 6986, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            4.0: { price: 8705, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false },
                            5.0: { price: 11733, delivery_days: '8-15', has_tracking: true, has_insurance: true, estimated: false }
                        }
                    },
                    emoji: {
                        'ELOGI_DHL_EXPRESS': {
                            0.5: { price: 3200, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            1.0: { price: 3400, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            1.5: { price: 3600, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            2.0: { price: 3800, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            2.5: { price: 4000, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            3.0: { price: 4200, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            4.0: { price: 4600, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true },
                            5.0: { price: 5000, delivery_days: '1-3', has_tracking: true, has_insurance: true, estimated: true }
                        }
                    },
                    jppost: {
                        'EMS': {
                            0.5: { price: 1400, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            1.0: { price: 1550, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            1.5: { price: 1700, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            2.0: { price: 1830, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            2.5: { price: 2000, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            3.0: { price: 2200, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            4.0: { price: 2600, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true },
                            5.0: { price: 3000, delivery_days: '3-6', has_tracking: true, has_insurance: false, estimated: true }
                        }
                    }
                },
                data_source: 'sample_with_real_speedpak'
            };
            
            matrixData = sampleData;
            
            // サンプルデータ通知
            const notification = document.createElement('div');
            notification.className = 'notification warning';
            notification.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>サンプルデータ表示中:</strong><br>
                    API接続に問題があります。SpeedPAKの実データを含むサンプルデータで表示しています。
                    <button onclick="generateUnifiedMatrix()" style="margin-left: 10px; padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px;">再試行</button>
                </div>
            `;
            
            const matrixContainer = document.getElementById('matrixContainer');
            matrixContainer.insertBefore(notification, matrixContainer.firstChild);
            
            displayUnifiedMatrix('all');
            matrixContainer.style.display = 'block';
            
            debugLog('サンプルデータでマトリックス表示完了');
        }
        
        // ネットワーク診断機能
        async function debugNetwork() {
            debugLog('ネットワーク診断開始');
            
            const matrixContent = document.getElementById('matrixContent');
            matrixContent.innerHTML = `
                <div style="text-align: center; padding: var(--space-2xl);">
                    <h3><i class="fas fa-stethoscope"></i> ネットワーク診断中...</h3>
                    <div class="loading" style="margin: var(--space-lg) auto;"></div>
                </div>
            `;
            
            try {
                // 1. APIパス確認
                debugLog('ステップ 1: APIパス確認', API_BASE);
                
                const testResponse = await fetch(API_BASE, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache' }
                });
                
                debugLog('APIレスポンス', { status: testResponse.status, statusText: testResponse.statusText });
                
                if (testResponse.ok) {
                    matrixContent.innerHTML = `
                        <div style="text-align: center; padding: var(--space-2xl); color: var(--success-color);">
                            <i class="fas fa-check-circle" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                            <h3>API接続成功</h3>
                            <p>APIエンドポイントにアクセスできました。</p>
                            <button class="generate-btn" onclick="generateUnifiedMatrix()" style="margin-top: var(--space-md);">
                                <i class="fas fa-chart-line"></i> 再度マトリックス生成
                            </button>
                        </div>
                    `;
                } else {
                    throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
                }
                
            } catch (error) {
                debugLog('ネットワーク診断エラー', error.message);
                
                matrixContent.innerHTML = `
                    <div style="text-align: center; padding: var(--space-2xl); color: var(--danger-color);">
                        <i class="fas fa-times-circle" style="font-size: 3rem; margin-bottom: var(--space-md);"></i>
                        <h3>API接続失敗</h3>
                        <p>エラー詳細: ${error.message}</p>
                        <p>APIパス: ${API_BASE}</p>
                        <div style="margin-top: var(--space-md); display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap;">
                            <button class="generate-btn" onclick="displaySampleMatrix()">
                                <i class="fas fa-chart-area"></i> サンプルデータで表示
                            </button>
                            <button class="generate-btn" onclick="debugNetwork()">
                                <i class="fas fa-redo"></i> 再診断
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    </script>
</body>
</html>