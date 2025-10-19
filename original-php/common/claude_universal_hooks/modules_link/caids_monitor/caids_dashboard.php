<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 CAIDS統合監視システム v3.0</title>
    <style>
        /* ===== 基本設定 ===== */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
            overflow-x: hidden;
        }
        
        /* ===== 3段階表示レベル制御 ===== */
        .display-level-1 .level-2-content,
        .display-level-1 .level-3-content {
            display: none !important;
        }
        
        .display-level-2 .level-3-content {
            display: none !important;
        }
        
        /* ===== ヘッダー ===== */
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            padding: 20px 0;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-title {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .header-controls {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .display-toggle {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .display-toggle:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        .display-toggle.active {
            background: linear-gradient(135deg, #ff6b6b, #feca57);
        }
        
        /* ===== メインコンテナ ===== */
        .main-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 30px;
            display: grid;
            gap: 30px;
            grid-template-columns: 1fr;
        }
        
        /* ===== レベル1: 超コンパクト表示 ===== */
        .level-1-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 25px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }
        
        .compact-status {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .compact-title {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .compact-divisions {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .division-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 15px;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .division-completed {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
        }
        
        .division-in-progress {
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            animation: pulse 2s infinite;
        }
        
        .division-pending {
            background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
            color: #666;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        /* ===== レベル2: 標準表示 ===== */
        .level-2-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        
        .progress-section,
        .hooks-section {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .current-phase {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
        }
        
        .phase-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .phase-name {
            font-size: 18px;
            font-weight: 600;
        }
        
        .phase-progress {
            font-size: 24px;
            font-weight: 700;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 4px;
            transition: width 0.5s ease;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: white;
        }
        
        .stat-label {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 5px;
        }
        
        /* ===== Hook表示 ===== */
        .hooks-status {
            margin-bottom: 25px;
        }
        
        .hooks-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .hooks-count {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .hooks-progress {
            font-size: 16px;
            color: #667eea;
            font-weight: 600;
        }
        
        .tier-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .tier-item {
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .tier-item.tier-completed {
            border-color: #4CAF50;
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(69, 160, 73, 0.05));
        }
        
        .tier-item.tier-in-progress {
            border-color: #2196F3;
            background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(25, 118, 210, 0.05));
            animation: borderPulse 2s infinite;
        }
        
        @keyframes borderPulse {
            0%, 100% { border-color: #2196F3; }
            50% { border-color: #1976D2; }
        }
        
        .tier-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .tier-name {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .tier-status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .tier-status.completed {
            background: #4CAF50;
            color: white;
        }
        
        .tier-status.in-progress {
            background: #2196F3;
            color: white;
        }
        
        .tier-status.pending {
            background: #f5f5f5;
            color: #666;
        }
        
        .tier-progress-bar {
            width: 100%;
            height: 6px;
            background: #f0f0f0;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .tier-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 3px;
            transition: width 0.5s ease;
        }
        
        /* ===== レベル3: 詳細表示 ===== */
        .level-3-container {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
        }
        
        .detailed-panel {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }
        
        .tabs-container {
            display: flex;
            border-bottom: 2px solid #f0f0f0;
            margin-bottom: 25px;
        }
        
        .tab-button {
            padding: 15px 25px;
            border: none;
            background: none;
            cursor: pointer;
            font-weight: 600;
            color: #666;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
        }
        
        .tab-button.active {
            color: #667eea;
            border-bottom-color: #667eea;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .hook-detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .hook-detail-item {
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.5);
        }
        
        .hook-detail-item.loaded {
            border-color: #4CAF50;
            background: rgba(76, 175, 80, 0.05);
        }
        
        .hook-detail-item.loading {
            border-color: #2196F3;
            background: rgba(33, 150, 243, 0.05);
            animation: loadingShimmer 1.5s infinite;
        }
        
        @keyframes loadingShimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .hook-name {
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 8px;
        }
        
        .hook-description {
            font-size: 12px;
            color: #666;
            line-height: 1.4;
        }
        
        .hook-status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
        }
        
        .hook-status-indicator.loaded {
            background: #4CAF50;
        }
        
        .hook-status-indicator.loading {
            background: #2196F3;
            animation: pulse 1s infinite;
        }
        
        .hook-status-indicator.pending {
            background: #ccc;
        }
        
        /* ===== ログセクション ===== */
        .log-container {
            max-height: 400px;
            overflow-y: auto;
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
        }
        
        .log-entry {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .log-entry:last-child {
            border-bottom: none;
        }
        
        .log-time {
            font-size: 11px;
            color: #666;
            min-width: 60px;
        }
        
        .log-type {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            min-width: 60px;
            text-align: center;
        }
        
        .log-type.success {
            background: #4CAF50;
            color: white;
        }
        
        .log-type.info {
            background: #2196F3;
            color: white;
        }
        
        .log-type.warning {
            background: #ff9800;
            color: white;
        }
        
        .log-message {
            flex: 1;
            font-size: 13px;
            color: #333;
        }
        
        /* ===== レスポンシブ ===== */
        @media (max-width: 1024px) {
            .level-2-container,
            .level-3-container {
                grid-template-columns: 1fr;
            }
            
            .compact-status {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .hook-detail-grid {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 768px) {
            .main-container {
                padding: 15px;
            }
            
            .header-content {
                padding: 0 15px;
                flex-direction: column;
                gap: 15px;
            }
            
            .header-controls {
                width: 100%;
                justify-content: center;
            }
        }
        
        /* ===== アニメーション ===== */
        .fade-in {
            animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .slide-in {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    </style>
</head>
<body class="display-level-2" id="mainBody">
    <!-- ヘッダー -->
    <header class="header">
        <div class="header-content">
            <h1 class="header-title">
                <span>🎯</span>
                CAIDS統合監視システム v3.0
            </h1>
            <div class="header-controls">
                <button class="display-toggle" onclick="switchDisplayLevel(1)" data-level="1">
                    コンパクト表示
                </button>
                <button class="display-toggle active" onclick="switchDisplayLevel(2)" data-level="2">
                    標準表示
                </button>
                <button class="display-toggle" onclick="switchDisplayLevel(3)" data-level="3">
                    詳細表示
                </button>
            </div>
        </div>
    </header>

    <!-- メインコンテナ -->
    <main class="main-container">
        
        <!-- レベル1: 超コンパクト表示 -->
        <section class="level-1-container fade-in">
            <div class="compact-status">
                <div class="compact-title">CAIDS監視</div>
                <div class="compact-divisions">
                    <div class="division-item division-completed">
                        <span>✅</span>
                        <span>基盤構築</span>
                    </div>
                    <div class="division-item division-in-progress">
                        <span>🔄</span>
                        <span>フロント構築 75%</span>
                    </div>
                    <div class="division-item division-pending">
                        <span>⏳</span>
                        <span>バック・QA</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- レベル2: 標準表示 -->
        <section class="level-2-content">
            <div class="level-2-container fade-in">
                
                <!-- 進捗セクション -->
                <div class="progress-section">
                    <h2 class="section-title">
                        <span>📊</span>
                        開発進捗状況
                    </h2>
                    
                    <div class="current-phase">
                        <div class="phase-info">
                            <div class="phase-name">Phase 3/4: CSS統合システム</div>
                            <div class="phase-progress">75%</div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 75%"></div>
                        </div>
                        
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value" id="loadedHooks">34</div>
                                <div class="stat-label">読み込み済み</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="totalHooks">54</div>
                                <div class="stat-label">総Hooks数</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="elapsedTime">02:15</div>
                                <div class="stat-label">経過時間</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="estimatedRemaining">01:45</div>
                                <div class="stat-label">残り推定</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Hooksセクション -->
                <div class="hooks-section">
                    <h2 class="section-title">
                        <span>🪝</span>
                        Hook読み込み状況
                    </h2>
                    
                    <div class="hooks-status">
                        <div class="hooks-summary">
                            <div class="hooks-count">Hooks: <span id="currentHooks">34/54</span></div>
                            <div class="hooks-progress">63%完了</div>
                        </div>
                    </div>
                    
                    <div class="tier-list" id="tierList">
                        <div class="tier-item tier-completed">
                            <div class="tier-header">
                                <div class="tier-name">Tier1 Essential (20/20)</div>
                                <div class="tier-status completed">完了</div>
                            </div>
                            <div class="tier-progress-bar">
                                <div class="tier-progress-fill" style="width: 100%"></div>
                            </div>
                        </div>
                        
                        <div class="tier-item tier-in-progress">
                            <div class="tier-header">
                                <div class="tier-name">Tier2 CSS (7/9)</div>
                                <div class="tier-status in-progress">進行中</div>
                            </div>
                            <div class="tier-progress-bar">
                                <div class="tier-progress-fill" style="width: 78%"></div>
                            </div>
                        </div>
                        
                        <div class="tier-item">
                            <div class="tier-header">
                                <div class="tier-name">Tier3 JavaScript (0/45)</div>
                                <div class="tier-status pending">待機中</div>
                            </div>
                            <div class="tier-progress-bar">
                                <div class="tier-progress-fill" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </section>

        <!-- レベル3: 詳細表示 -->
        <section class="level-3-content">
            <div class="level-3-container fade-in">
                
                <!-- 詳細Hook表示 -->
                <div class="detailed-panel">
                    <div class="tabs-container">
                        <button class="tab-button active" onclick="switchTab('overview')">概要</button>
                        <button class="tab-button" onclick="switchTab('hooks')">Hook詳細</button>
                        <button class="tab-button" onclick="switchTab('log')">ログ</button>
                    </div>
                    
                    <div class="tab-content active" id="tab-overview">
                        <h3>🎯 開発分割進捗</h3>
                        <div style="margin: 20px 0;">
                            <div style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>1. 基盤構築</span>
                                    <span style="color: #4CAF50; font-weight: 600;">100% ✅</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px;">
                                    <div style="width: 100%; height: 100%; background: #4CAF50; border-radius: 4px;"></div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>2. フロント構築</span>
                                    <span style="color: #2196F3; font-weight: 600;">75% 🔄</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px;">
                                    <div style="width: 75%; height: 100%; background: #2196F3; border-radius: 4px;"></div>
                                </div>
                            </div>
                            
                            <div style="margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span>3. バック・QA</span>
                                    <span style="color: #ccc; font-weight: 600;">0% ⏳</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px;">
                                    <div style="width: 0%; height: 100%; background: #ccc; border-radius: 4px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-hooks">
                        <h3>🪝 Hook読み込み詳細</h3>
                        <div class="hook-detail-grid" id="hookDetailGrid">
                            <!-- Hook詳細はJavaScriptで動的生成 -->
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-log">
                        <h3>📋 リアルタイムログ</h3>
                        <div class="log-container" id="logContainer">
                            <div class="log-entry">
                                <div class="log-time">18:45</div>
                                <div class="log-type success">SUCCESS</div>
                                <div class="log-message">レスポンシブデザインHook読み込み完了</div>
                            </div>
                            <div class="log-entry">
                                <div class="log-time">18:44</div>
                                <div class="log-type info">INFO</div>
                                <div class="log-message">CSS最適化Hook開始</div>
                            </div>
                            <div class="log-entry">
                                <div class="log-time">18:43</div>
                                <div class="log-type success">SUCCESS</div>
                                <div class="log-message">BEM準拠Hook読み込み完了</div>
                            </div>
                            <div class="log-entry">
                                <div class="log-time">18:42</div>
                                <div class="log-type success">SUCCESS</div>
                                <div class="log-message">CSS外部化Hook読み込み完了</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- サイド情報パネル -->
                <div class="detailed-panel">
                    <h3>⚡ 最新アクティビティ</h3>
                    <div style="margin: 20px 0;">
                        <div style="padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 10px; margin-bottom: 15px;">
                            <div style="font-weight: 600; color: #4CAF50; margin-bottom: 5px;">✅ 完了</div>
                            <div style="font-size: 14px;">Tier1 Essential Hooks (20個) 全読み込み完了</div>
                        </div>
                        
                        <div style="padding: 15px; background: rgba(33, 150, 243, 0.1); border-radius: 10px; margin-bottom: 15px;">
                            <div style="font-weight: 600; color: #2196F3; margin-bottom: 5px;">🔄 進行中</div>
                            <div style="font-size: 14px;">Tier2 CSS統合システム (7/9完了)</div>
                        </div>
                        
                        <div style="padding: 15px; background: rgba(255, 152, 0, 0.1); border-radius: 10px;">
                            <div style="font-weight: 600; color: #ff9800; margin-bottom: 5px;">⏳ 待機中</div>
                            <div style="font-size: 14px;">Tier3 JavaScript統合システム (45個)</div>
                        </div>
                    </div>
                    
                    <h3>💾 生成ファイル状況</h3>
                    <div style="margin: 20px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>完成ファイル</span>
                            <span style="font-weight: 600;">3/5</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>総ファイルサイズ</span>
                            <span style="font-weight: 600;">67KB/95KB</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: #f0f0f0; border-radius: 3px;">
                            <div style="width: 70%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 3px;"></div>
                        </div>
                    </div>
                </div>
                
            </div>
        </section>

    </main>

    <script>
        // ===== グローバル変数 ===== 
        let currentDisplayLevel = 2;
        let hooksData = {};
        let sessionData = {};
        
        // ===== 表示レベル切り替え =====
        function switchDisplayLevel(level) {
            currentDisplayLevel = level;
            const body = document.getElementById('mainBody');
            
            // 全てのレベルクラスを削除
            body.classList.remove('display-level-1', 'display-level-2', 'display-level-3');
            
            // 新しいレベルクラスを追加
            body.classList.add(`display-level-${level}`);
            
            // ボタンのアクティブ状態更新
            document.querySelectorAll('.display-toggle').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.level == level) {
                    btn.classList.add('active');
                }
            });
            
            console.log(`🔄 表示レベル${level}に切り替え`);
        }
        
        // ===== タブ切り替え =====
        function switchTab(tabName) {
            // 全てのタブを非アクティブに
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // 選択されたタブをアクティブに
            event.target.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // Hook詳細タブの場合は動的生成
            if (tabName === 'hooks') {
                generateHookDetails();
            }
        }
        
        // ===== Hook詳細動的生成 =====
        function generateHookDetails() {
            const container = document.getElementById('hookDetailGrid');
            
            // サンプルHookデータ
            const hookCategories = {
                'Tier1 Essential': [
                    { name: '🔸 ⚠️ エラー処理_h', status: 'loaded', description: 'エラー表示・処理・グローバルエラーハンドリング' },
                    { name: '🔸 ⏳ 読込管理_h', status: 'loaded', description: 'ローディング表示・進捗管理・複数処理対応' },
                    { name: '🔸 💬 応答表示_h', status: 'loaded', description: 'ユーザーフィードバック・通知・アクション付きメッセージ' },
                    { name: '🔸 🔄 Ajax統合_h', status: 'loaded', description: 'Ajax通信・API統合・自動エラー処理' }
                ],
                'Tier2 CSS': [
                    { name: 'CSS外部化hooks', status: 'loaded', description: 'HTML内style属性を外部CSSに移行' },
                    { name: 'BEM命名規則完全準拠検証', status: 'loaded', description: 'BEM規則の完全準拠チェック' },
                    { name: 'レスポンシブデザイン自動実装', status: 'loading', description: 'レスポンシブ対応の自動生成' },
                    { name: 'CSS最適化・圧縮', status: 'pending', description: 'CSS最適化とファイル圧縮' }
                ]
            };
            
            let html = '';
            
            Object.keys(hookCategories).forEach(category => {
                html += `<div style="grid-column: 1/-1; font-weight: 600; color: #667eea; margin: 20px 0 10px 0;">${category}</div>`;
                
                hookCategories[category].forEach(hook => {
                    html += `
                        <div class="hook-detail-item ${hook.status}">
                            <div class="hook-name">
                                <span class="hook-status-indicator ${hook.status}"></span>
                                ${hook.name}
                            </div>
                            <div class="hook-description">${hook.description}</div>
                        </div>
                    `;
                });
            });
            
            container.innerHTML = html;
        }
        
        // ===== データ取得・更新 =====
        async function fetchCAIDSData() {
            try {
                const response = await fetch('/modules/caids_monitor/api/get_progress.php');
                const data = await response.json();
                
                if (data.success) {
                    updateUIWithData(data);
                }
            } catch (error) {
                console.warn('⚠️ CAIDS API接続失敗:', error);
                // フォールバック表示を維持
            }
        }
        
        function updateUIWithData(data) {
            // Hook統計更新
            if (data.hooks_statistics) {
                const stats = data.hooks_statistics;
                document.getElementById('totalHooks').textContent = stats.total_files || 54;
                document.getElementById('loadedHooks').textContent = stats.hissu_count || 34;
                document.getElementById('currentHooks').textContent = `${stats.hissu_count || 34}/${stats.total_files || 54}`;
            }
            
            console.log('✅ CAIDS UIデータ更新完了');
        }
        
        // ===== リアルタイム更新 =====
        function startRealTimeUpdates() {
            // 3秒ごとにデータ取得
            setInterval(fetchCAIDSData, 3000);
            
            // ログ更新シミュレーション
            setInterval(addRandomLogEntry, 5000);
        }
        
        function addRandomLogEntry() {
            const logContainer = document.getElementById('logContainer');
            const currentTime = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            
            const logTypes = ['success', 'info', 'warning'];
            const messages = [
                'Hook読み込み完了',
                'フェーズ進行中',
                'ファイル生成中',
                'データ同期完了',
                'システム状況更新'
            ];
            
            const randomType = logTypes[Math.floor(Math.random() * logTypes.length)];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            const newEntry = document.createElement('div');
            newEntry.className = 'log-entry slide-in';
            newEntry.innerHTML = `
                <div class="log-time">${currentTime}</div>
                <div class="log-type ${randomType}">${randomType.toUpperCase()}</div>
                <div class="log-message">${randomMessage}</div>
            `;
            
            logContainer.insertBefore(newEntry, logContainer.firstChild);
            
            // 古いログエントリを削除（最新20件まで保持）
            while (logContainer.children.length > 20) {
                logContainer.removeChild(logContainer.lastChild);
            }
        }
        
        // ===== 初期化 =====
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🎯 CAIDS統合監視システム v3.0 初期化開始');
            
            // 初期データ取得
            fetchCAIDSData();
            
            // リアルタイム更新開始
            startRealTimeUpdates();
            
            // Hook詳細初期生成
            generateHookDetails();
            
            console.log('✅ CAIDS監視システム初期化完了');
        });
    </script>
</body>
</html>