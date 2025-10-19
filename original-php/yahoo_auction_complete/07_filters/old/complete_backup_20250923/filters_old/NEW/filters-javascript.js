
// CAIDS character_limit Hook
// CAIDS character_limit Hook - 基本実装
console.log('✅ character_limit Hook loaded');

// CAIDS error_handling Hook

// CAIDS エラー処理Hook - 完全実装
window.CAIDS_ERROR_HANDLER = {
    isActive: true,
    errorCount: 0,
    errorHistory: [],
    
    initialize: function() {
        this.setupGlobalErrorHandler();
        this.setupUnhandledPromiseRejection();
        this.setupNetworkErrorHandler();
        console.log('⚠️ CAIDS エラーハンドリングシステム完全初期化');
    },
    
    setupGlobalErrorHandler: function() {
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
    },
    
    setupUnhandledPromiseRejection: function() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack
            });
        });
    },
    
    setupNetworkErrorHandler: function() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    window.CAIDS_ERROR_HANDLER.handleError({
                        type: 'Network Error',
                        message: `HTTP ${response.status}: ${response.statusText}`,
                        url: args[0]
                    });
                }
                return response;
            } catch (error) {
                window.CAIDS_ERROR_HANDLER.handleError({
                    type: 'Network Fetch Error',
                    message: error.message,
                    url: args[0]
                });
                throw error;
            }
        };
    },
    
    handleError: function(errorInfo) {
        this.errorCount++;
        this.errorHistory.push({...errorInfo, timestamp: new Date().toISOString()});
        
        console.error('🚨 CAIDS Error Handler:', errorInfo);
        this.showErrorNotification(errorInfo);
        this.reportError(errorInfo);
    },
    
    showErrorNotification: function(errorInfo) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 10px; right: 10px; z-index: 999999;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white; padding: 15px 20px; border-radius: 8px;
            max-width: 350px; box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            border: 2px solid #ff6666; animation: caids-error-shake 0.5s ease-in-out;
        `;
        errorDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">🚨</span>
                <div>
                    <strong>エラーが発生しました</strong><br>
                    <small style="opacity: 0.9;">${errorInfo.type}: ${errorInfo.message}</small>
                </div>
            </div>
        `;
        
        // CSS Animation
        if (!document.getElementById('caids-error-styles')) {
            const style = document.createElement('style');
            style.id = 'caids-error-styles';
            style.textContent = `
                @keyframes caids-error-shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 7000);
    },
    
    reportError: function(errorInfo) {
        // エラーレポート生成・送信（将来の拡張用）
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            errorCount: this.errorCount,
            sessionId: this.getSessionId(),
            ...errorInfo
        };
        
        console.log('📋 CAIDS Error Report:', report);
        localStorage.setItem('caids_last_error', JSON.stringify(report));
    },
    
    getSessionId: function() {
        let sessionId = sessionStorage.getItem('caids_session_id');
        if (!sessionId) {
            sessionId = 'caids_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('caids_session_id', sessionId);
        }
        return sessionId;
    },
    
    getErrorStats: function() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errorHistory.slice(-10),
            sessionId: this.getSessionId()
        };
    }
};

window.CAIDS_ERROR_HANDLER.initialize();

/*
=====================================================
📋 フィルタールール管理システム JavaScript
=====================================================

🎯 設計思想:
├── 最小限のタブ切り替え機能
├── ダミー関数群（将来実装用）
├── エラー回避のプレースホルダ
└── 拡張可能な構造

📁 外部化想定: common/js/modules/filters.js

🔧 含有機能:
├── タブシステム制御
├── フォーム操作プレースホルダ
├── 検索・フィルタリング
└── AJAX通信プレースホルダ

📚 参照: NAGANO3 JavaScript統合管理システム
=====================================================
*/

// ===== タブシステム =====
document.addEventListener('DOMContentLoaded', function() {
  // タブボタンにイベントリスナー追加
  const tabButtons = document.querySelectorAll('.filter__tab-button');
  const tabContents = document.querySelectorAll('.filter__tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // 全タブボタンの active クラスを削除
      tabButtons.forEach(btn => btn.classList.remove('filter__tab-button--active'));
      // クリックされたタブボタンに active クラスを追加
      this.classList.add('filter__tab-button--active');
      
      // 全タブコンテンツを非表示
      tabContents.forEach(content => {
        content.classList.remove('filter__tab-content--active');
      });
      
      // 対象タブコンテンツを表示
      const targetContent = document.getElementById(targetTab + '-tab');
      if (targetContent) {
        targetContent.classList.add('filter__tab-content--active');
      }
    });
  });

  console.log('✅ フィルタータブシステム初期化完了');
});

// ===== AIルール管理関数群（プレースホルダ） =====
function saveAIRule() {
  const ruleName = document.getElementById('aiRuleName').value;
  const category = document.getElementById('aiRuleCategory').value;
  const ruleText = document.getElementById('aiRuleText').value;
  
  if (!ruleName || !ruleText) {
    alert('ルール名とAI学習テキストは必須です。');
    return;
  }
  
  console.log('AIルール保存:', { ruleName, category, ruleText });
  alert('AIルールを保存しました。（実装予定）');
}

function testAIRule() {
  console.log('AIルールテスト実行');
  alert('AIルールのテストを実行します。（実装予定）');
}

function searchAIRules(query) {
  console.log('AIルール検索:', query);
}

function toggleAllAIRules(checked) {
  const checkboxes = document.querySelectorAll('#aiRulesTableBody input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = checked);
}

function updateAIRule(element) {
  console.log('AIルール更新:', element.value);
}

function updateAIRuleStatus(element) {
  console.log('AIルール状態更新:', element.value);
}

function editAIRule(element) {
  console.log('AIルール編集');
  alert('AIルール編集モーダルを表示します。（実装予定）');
}

// ===== テキストルール管理関数群（プレースホルダ） =====
function addTextRule() {
  const keyword = document.getElementById('textRuleKeyword').value;
  const type = document.getElementById('textRuleType').value;
  const priority = document.getElementById('textRulePriority').value;
  const reason = document.getElementById('textRuleReason').value;
  
  if (!keyword || !reason) {
    alert('キーワードとブロック理由は必須です。');
    return;
  }
  
  console.log('テキストルール追加:', { keyword, type, priority, reason });
  alert('テキストルールを追加しました。（実装予定）');
}

function addNewTextRule() {
  console.log('新規テキストルール追加');
}

function deleteSelectedTextRules() {
  const selected = document.querySelectorAll('#textRulesTableBody input[type="checkbox"]:checked');
  if (selected.length === 0) {
    alert('削除する項目を選択してください。');
    return;
  }
  if (confirm(`選択した${selected.length}件のルールを削除しますか？`)) {
    console.log('選択テキストルール削除:', selected.length);
    alert('選択したルールを削除しました。（実装予定）');
  }
}

function toggleSelectedTextRules() {
  console.log('選択テキストルール有効/無効切替');
}

function filterTextRulesByStatus(status) {
  console.log('テキストルール状態フィルター:', status);
  const rows = document.querySelectorAll('#textRulesTableBody tr');
  
  rows.forEach(row => {
    if (status === 'all') {
      row.style.display = '';
    } else {
      const rowStatus = row.getAttribute('data-status');
      row.style.display = rowStatus === status ? '' : 'none';
    }
  });
  
  updateTextRulesDisplayInfo(status);
}

function updateTextRulesDisplayInfo(status) {
  const info = document.getElementById('textRulesDisplayInfo');
  if (info) {
    if (status === 'inactive') {
      info.textContent = '無効データ: 3件表示 / 全2,847件';
    } else if (status === 'active') {
      info.textContent = '有効データ: 2,844件表示 / 全2,847件';
    } else {
      info.textContent = '全データ: 2,847件表示';
    }
  }
}

function filterTextRulesByCategory(category) {
  console.log('テキストルールカテゴリフィルター:', category);
}

function searchTextRules(query) {
  console.log('テキストルール検索:', query);
}

function exportTextRules() {
  console.log('テキストルールエクスポート');
  alert('テキストルールをエクスポートします。（実装予定）');
}

function toggleAllTextRules(checked) {
  const checkboxes = document.querySelectorAll('#textRulesTableBody input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = checked);
}

function updateTextRule(element) {
  console.log('テキストルール更新:', element.value);
}

function updateTextRuleStatus(element) {
  console.log('テキストルール状態更新:', element.value);
}

function deleteTextRule(element) {
  if (confirm('このテキストルールを削除しますか？')) {
    console.log('テキストルール削除');
    element.closest('tr').remove();
  }
}

// ===== モール設定関数群（プレースホルダ） =====
function updateMallRuleSetting(mall, rule, checked) {
  console.log('モール設定更新:', { mall, rule, checked });
}

function selectAllMallRules() {
  const checkboxes = document.querySelectorAll('.filter__rule-checkbox input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = true);
  console.log('全モール・全ルール有効化');
}

function clearAllMallRules() {
  const checkboxes = document.querySelectorAll('.filter__rule-checkbox input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
  console.log('全モール・全ルール無効化');
}

function copyMallSettings() {
  console.log('設定コピー');
  alert('設定コピー機能（実装予定）');
}

function searchMallRules(query) {
  console.log('モールルール検索:', query);
}

function exportMallSettings() {
  console.log('モール設定エクスポート');
  alert('モール設定をエクスポートします。（実装予定）');
}

function saveMallSettings() {
  console.log('モール設定保存');
  alert('モール別設定を保存しました。（実装予定）');
}

function resetMallSettings() {
  if (confirm('モール設定をリセットしますか？')) {
    console.log('モール設定リセット');
    alert('設定をリセットしました。（実装予定）');
  }
}

// ===== CSV管理関数群（プレースホルダ） =====
function handleFileUpload(input) {
  const file = input.files[0];
  if (file) {
    console.log('ファイルアップロード:', file.name);
    alert(`ファイル "${file.name}" をアップロードします。（実装予定）`);
  }
}

function downloadTemplate() {
  console.log('テンプレートダウンロード');
  alert('CSVテンプレートをダウンロードします。（実装予定）');
}

function uploadCSV() {
  console.log('CSVアップロード');
  alert('CSVデータをアップロードします。（実装予定）');
}

function exportAllData() {
  console.log('全データエクスポート');
  alert('全データをエクスポートします。（実装予定）');
}

function importExternalData() {
  console.log('外部データ取得');
  alert('外部データを取得します。（実装予定）');
}

function addExternalSource() {
  const name = document.getElementById('externalSourceName').value;
  const url = document.getElementById('externalSourceURL').value;
  
  if (!name || !url) {
    alert('データソース名とURLは必須です。');
    return;
  }
  
  console.log('外部データソース追加:', { name, url });
  alert('外部データソースを追加しました。（実装予定）');
}

function updateExternalSource(sourceId) {
  console.log('外部データソース更新:', sourceId);
  alert('データソースを更新します。（実装予定）');
}

// ===== ブロック結果関数群（プレースホルダ） =====
function refreshBlockedResults() {
  console.log('ブロック結果更新');
  alert('ブロック結果を更新します。（実装予定）');
}

function deleteSelectedBlocked() {
  console.log('選択ブロック結果削除');
}

function filterByMall(mall) {
  console.log('モールフィルター:', mall);
}

function filterByMethod(method) {
  console.log('判定方法フィルター:', method);
}

function searchBlockedResults(query) {
  console.log('ブロック結果検索:', query);
}

function exportBlockedResults() {
  console.log('ブロック結果エクスポート');
  alert('ブロック結果をエクスポートします。（実装予定）');
}

function toggleAllBlocked(checked) {
  const checkboxes = document.querySelectorAll('#blockedResultsTableBody input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = checked);
}

function viewBlockDetails(element) {
  console.log('ブロック詳細表示');
  alert('ブロック詳細を表示します。（実装予定）');
}

// ===== ページネーション関数群（プレースホルダ） =====
function previousPage() {
  console.log('前のページ');
}

function nextPage() {
  console.log('次のページ');
}

function goToPage(page) {
  console.log('ページ移動:', page);
}

function previousBlockedPage() {
  console.log('ブロック結果前のページ');
}

function nextBlockedPage() {
  console.log('ブロック結果次のページ');
}

function goToBlockedPage(page) {
  console.log('ブロック結果ページ移動:', page);
}

// ===== 初期化 =====
console.log('🎯 フィルタールール管理システム JavaScript読み込み完了');