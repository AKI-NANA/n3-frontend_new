<?php
/**
 * ダッシュボードメイン画面 - header, sidebarは含まずlayout経由で統合
 * JSで動的データ取得する枠を用意
 */
?>

<!-- 外部リンク帯（BEM準拠） -->
<div class="dashboard__external-links">
    <div class="dashboard__external-links-container" id="externalLinksContainer">
        <a href="https://www.amazon.co.jp" class="dashboard__link-item" target="_blank">
            <div class="dashboard__link-icon">
                <img src="https://www.amazon.co.jp/favicon.ico" alt="Amazon">
            </div>
            <span class="dashboard__link-text">Amazon</span>
        </a>
        <a href="https://www.ebay.com" class="dashboard__link-item" target="_blank">
            <div class="dashboard__link-icon">
                <img src="https://www.ebay.com/favicon.ico" alt="eBay">
            </div>
            <span class="dashboard__link-text">eBay</span>
        </a>
        <a href="https://www.shopify.com" class="dashboard__link-item" target="_blank">
            <div class="dashboard__link-icon">
                <img src="https://www.shopify.com/favicon.ico" alt="Shopify">
            </div>
            <span class="dashboard__link-text">Shopify</span>
        </a>
        <a href="https://www.rakuten.co.jp" class="dashboard__link-item" target="_blank">
            <div class="dashboard__link-icon">
                <img src="https://www.rakuten.co.jp/favicon.ico" alt="楽天">
            </div>
            <span class="dashboard__link-text">楽天</span>
        </a>
        <a href="https://shopping.yahoo.co.jp" class="dashboard__link-item" target="_blank">
            <div class="dashboard__link-icon">
                <img src="https://shopping.yahoo.co.jp/favicon.ico" alt="Yahoo!">
            </div>
            <span class="dashboard__link-text">Yahoo!</span>
        </a>
    </div>
    <div class="header__actions-right">
        <button class="btn" id="linkManagerButton">
            <i class="fas fa-edit"></i>
            リンク管理
        </button>
        <button class="btn btn--primary">
            <i class="fas fa-cog"></i>
            設定
        </button>
    </div>
</div>

<!-- 統計カード（BEM準拠・動的データ読み込み対応） -->
<div class="dashboard__stats-grid" id="statsGrid">
    <!-- JavaScriptで動的に生成される統計カード -->
    <div class="loading-placeholder">
        <i class="fas fa-spinner fa-spin"></i>
        統計データを読み込み中...
    </div>
</div>

<!-- 本日の必須タスク（BEM準拠） -->
<div class="dashboard__daily-tasks" id="dailyTasksSection">
    <div class="dashboard__daily-tasks-header">
        <h3 class="dashboard__daily-tasks-title">
            <i class="fas fa-tasks" style="color: var(--accent-blue); margin-right: var(--space-2)"></i>
            本日の必須タスク
        </h3>
        <div class="dashboard__tasks-progress">
            <span class="tasks-completed" id="tasksCompleted">0</span>/<span class="tasks-total" id="tasksTotal">0</span>
            完了
        </div>
    </div>
    <div class="dashboard__task-list" id="taskList">
        <!-- JavaScriptで動的に生成されるタスクリスト -->
        <div class="loading-placeholder">
            <i class="fas fa-spinner fa-spin"></i>
            タスクデータを読み込み中...
        </div>
    </div>
</div>

<!-- 下部コンテンツ（BEM準拠） -->
<div class="dashboard__bottom-content">
    <!-- 上段：週間カレンダー -->
    <div class="dashboard__weekly-calendar">
        <div class="dashboard__calendar-header">
            <h3>
                <i class="fas fa-calendar-week" style="color: var(--accent-blue)"></i>
                今週のスケジュール
            </h3>
            <button class="btn btn--primary dashboard__calendar-btn" id="openGoogleCalendar">
                <i class="fas fa-external-link-alt"></i>
                カレンダーを開く
            </button>
        </div>
        <div class="dashboard__week-display" id="weeklyCalendar">
            <!-- JavaScriptで動的生成 -->
        </div>
    </div>

    <!-- 下段：3分割コンテンツ -->
    <div class="dashboard__three-column">
        <!-- 左：お知らせ -->
        <div class="dashboard__content-section">
            <div class="dashboard__section-header">
                <h3>
                    <i class="fas fa-bullhorn" style="color: var(--accent-blue)"></i>
                    プラスポート物販部からのお知らせ
                </h3>
            </div>
            <div class="dashboard__news-list" id="newsList">
                <!-- JavaScriptで動的生成 -->
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    お知らせを読み込み中...
                </div>
            </div>
        </div>

        <!-- 中央：今月の実績 -->
        <div class="dashboard__content-section">
            <div class="dashboard__section-header">
                <h3>
                    <i class="fas fa-chart-pie" style="color: var(--accent-blue)"></i>
                    今月の実績
                </h3>
            </div>
            <div class="dashboard__monthly-stats" id="monthlyStats">
                <!-- JavaScriptで動的生成 -->
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    実績データを読み込み中...
                </div>
            </div>
        </div>

        <!-- 右：月次カレンダー -->
        <div class="dashboard__content-section">
            <div class="dashboard__section-header">
                <h3>
                    <i class="fas fa-calendar-alt" style="color: var(--accent-blue)"></i>
                    <?php echo date('n'); ?>月カレンダー
                </h3>
            </div>
            <div class="dashboard__monthly-calendar" id="monthlyCalendar">
                <!-- JavaScriptで動的生成 -->
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    カレンダーを読み込み中...
                </div>
            </div>
        </div>
    </div>

    <!-- 売上推移グラフ -->
    <div class="dashboard__chart-section">
        <div class="dashboard__chart-header">
            <h3>
                <i class="fas fa-chart-line" style="color: var(--accent-blue)"></i>
                月次売上推移
            </h3>
            <div class="dashboard__chart-controls">
                <button class="dashboard__chart-btn" data-period="daily">日別</button>
                <button class="dashboard__chart-btn dashboard__chart-btn--active" data-period="weekly">週別</button>
                <button class="dashboard__chart-btn" data-period="monthly">月別</button>
            </div>
        </div>
        <div class="dashboard__chart-container">
            <canvas id="salesChart"></canvas>
        </div>
    </div>
</div>

<!-- ダッシュボード専用JavaScript -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // 統計データ読み込み
    loadDashboardStats();
    
    // タスクデータ読み込み
    loadDailyTasks();
    
    // お知らせ読み込み
    loadNewsItems();
    
    // 実績データ読み込み
    loadMonthlyStats();
    
    // 週間カレンダー生成
    generateWeeklyCalendar();
    
    // 月次カレンダー生成
    generateMonthlyCalendar();
    
    // 売上チャート初期化
    initializeSalesChart();
});

// 統計データ読み込み関数
async function loadDashboardStats() {
    try {
        const response = await fetch('/controllers/controller_dashboard_status.php');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderStatsCards(data.data.stats);
        }
    } catch (error) {
        console.error('統計データの読み込みエラー:', error);
        document.getElementById('statsGrid').innerHTML = '<div class="error-message">統計データの読み込みに失敗しました</div>';
    }
}

// タスクデータ読み込み関数
async function loadDailyTasks() {
    try {
        const response = await fetch('/controllers/controller_dashboard_status.php?type=tasks');
        const data = await response.json();
        
        if (data.status === 'success') {
            renderTaskList(data.data.tasks);
        }
    } catch (error) {
        console.error('タスクデータの読み込みエラー:', error);
        document.getElementById('taskList').innerHTML = '<div class="error-message">タスクデータの読み込みに失敗しました</div>';
    }
}

// 統計カード描画関数
function renderStatsCards(stats) {
    const statsGrid = document.getElementById('statsGrid');
    let html = '';
    
    stats.forEach(stat => {
        html += `
            <div class="dashboard__stat-card" data-modal="${stat.modal || ''}">
                <div class="dashboard__stat-card-header">
                    <span class="dashboard__stat-card-title">${stat.title}</span>
                    <div class="dashboard__stat-card-icon">
                        <i class="${stat.icon}"></i>
                    </div>
                </div>
                <div class="dashboard__stat-card-value">${stat.value}</div>
                <div class="dashboard__stat-card-trend">
                    ${stat.trend}
                </div>
            </div>
        `;
    });
    
    statsGrid.innerHTML = html;
}

// タスクリスト描画関数
function renderTaskList(tasks) {
    const taskList = document.getElementById('taskList');
    let html = '';
    
    tasks.forEach((task, index) => {
        html += `
            <div class="dashboard__task-item">
                <input type="checkbox" class="dashboard__task-checkbox" id="task${index}" ${task.completed ? 'checked' : ''}>
                <label for="task${index}" class="dashboard__task-text">${task.text}</label>
                <div class="dashboard__task-priority dashboard__task-priority--${task.priority}"></div>
            </div>
        `;
    });
    
    taskList.innerHTML = html;
    updateTaskProgress(tasks);
}

// タスク進捗更新
function updateTaskProgress(tasks) {
    const completed = tasks.filter(task => task.completed).length;
    const total = tasks.length;
    
    document.getElementById('tasksCompleted').textContent = completed;
    document.getElementById('tasksTotal').textContent = total;
}

// 他の関数（お知らせ、実績、カレンダー等）は既存script.jsの機能を利用
function loadNewsItems() {
    // 既存script.jsの機能を活用
    console.log('お知らせデータ読み込み');
}

function loadMonthlyStats() {
    // 既存script.jsの機能を活用
    console.log('月次実績データ読み込み');
}

function generateWeeklyCalendar() {
    // 既存script.jsの週間カレンダー生成機能を利用
    console.log('週間カレンダー生成');
}

function generateMonthlyCalendar() {
    // 既存script.jsの機能を活用
    console.log('月次カレンダー生成');
}

function initializeSalesChart() {
    // 既存script.jsのChart.js初期化機能を利用
    console.log('売上チャート初期化');
}
</script>