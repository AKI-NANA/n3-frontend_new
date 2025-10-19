
// CAIDS processing_capacity_monitoring Hook
// CAIDS processing_capacity_monitoring Hook - 基本実装
console.log('✅ processing_capacity_monitoring Hook loaded');

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

console.log("🔍 フィルター管理モジュール開始 - BEM準拠・ナレッジ統合版");

// ページ情報設定（ナレッジJSとの統合）
window.currentPageInfo = { page: "filters" };

// ===== モックデータ定義 ===== 
const MOCK_DATA = {
  // フィルター統計
  stats: {
    todayProcessed: 1243,
    filteredOut: 127,
    pendingReview: 15,
    accuracy: 99.2
  },
  
  // 段階別統計
  stages: {
    1: { input: 1243, passed: 1180, filtered: 63, accuracy: 99.1, progress: 95 },
    2: { input: 1180, passed: 1142, filtered: 38, accuracy: 98.7, progress: 88 },
    3: { input: 1142, passed: 1120, filtered: 22, accuracy: 97.8, progress: 72 },
    4: { input: 1120, passed: 1105, filtered: 15, accuracy: 99.8, progress: 65 }
  },
  
  // NGワード
  ngWords: [
    "R18", "成人向け", "アダルト", "中古", "電子タバコ", 
    "偽造品", "医薬品", "危険物"
  ],
  
  // 人間確認待ち商品
  pendingReviews: [
    {
      id: 2100,
      sku: "EMV-STOCK-NEW-2100",
      product: "Generic Bluetooth イヤホン",
      reason: "知的財産権の懸念",
      reasonType: "ip",
      confidence: 85,
      stage: 3,
      stageName: "画像AI"
    },
    {
      id: 950,
      sku: "EMV-STOCK-USED-950", 
      product: "中古 電子体温計",
      reason: "医療機器の可能性",
      reasonType: "medical",
      confidence: 92,
      stage: 2,
      stageName: "カテゴリ"
    },
    {
      id: 1800,
      sku: "EMV-STOCK-NEW-1800",
      product: "ハーブティー ダイエットブレンド", 
      reason: "医薬品的効果の表現",
      reasonType: "health",
      confidence: 88,
      stage: 4,
      stageName: "テキストAI"
    }
  ]
};

// ===== フィルター管理クラス =====
class FiltersController {
  constructor() {
    this.isInitialized = false;
    this.settings = {
      stage1: { enabled: true },
      stage2: { enabled: true },
      stage3: { enabled: true, model: 'local', threshold: 85 },
      stage4: { enabled: true, mode: 'balanced', threshold: 95 }
    };
    
    console.log("✅ FiltersController初期化開始");
  }

  // 初期化
  async initialize() {
    try {
      await this.initializeElements();
      await this.loadMockData();
      await this.bindEvents();
      
      this.isInitialized = true;
      console.log("✅ FiltersController初期化完了");
      
      // 初期データ表示
      this.updateStatistics();
      this.updateStageStatistics();
      this.renderPendingReviews();
      
    } catch (error) {
      console.error("❌ FiltersController初期化エラー:", error);
    }
  }

  // 要素初期化
  async initializeElements() {
    this.elements = {
      // 統計要素
      todayProcessed: document.getElementById('todayProcessed'),
      filteredOut: document.getElementById('filteredOut'),
      pendingReview: document.getElementById('pendingReview'),
      accuracy: document.getElementById('accuracy'),
      
      // NGワード管理
      ngwordInput: document.getElementById('ngwordInput'),
      addNgwordBtn: document.getElementById('addNgword'),
      ngwordTags: document.getElementById('ngwordTags'),
      
      // AI設定
      imageThreshold: document.getElementById('imageThreshold'),
      imageThresholdValue: document.getElementById('imageThresholdValue'),
      humanThreshold: document.getElementById('humanThreshold'),
      humanThresholdValue: document.getElementById('humanThresholdValue'),
      textAiMode: document.getElementById('textAiMode'),
      
      // 確認テーブル
      reviewTableBody: document.getElementById('reviewTableBody'),
      selectAllReviews: document.getElementById('selectAllReviews'),
      batchApprove: document.getElementById('batchApprove'),
      
      // ヘッダーアクション
      exportConfig: document.getElementById('exportConfig'),
      runAllFilters: document.getElementById('runAllFilters'),
      
      // トグルスイッチ
      stage1Toggle: document.getElementById('stage1Toggle'),
      stage2Toggle: document.getElementById('stage2Toggle'),
      stage3Toggle: document.getElementById('stage3Toggle'),
      stage4Toggle: document.getElementById('stage4Toggle')
    };

    console.log("✅ フィルター要素初期化完了");
  }

  // モックデータ読み込み
  async loadMockData() {
    // 将来のAPI連携を想定した構造
    try {
      // 現在はMOCK_DATAを使用、将来はAPI呼び出しに変更
      this.data = { ...MOCK_DATA };
      console.log("✅ モックデータ読み込み完了", this.data);
    } catch (error) {
      console.error("❌ データ読み込みエラー:", error);
      // フォールバック処理
      this.data = MOCK_DATA;
    }
  }

  // イベントバインド
  async bindEvents() {
    try {
      // NGワード管理
      this.bindNgWordEvents();
      
      // AI設定
      this.bindAiSettingsEvents();
      
      // 確認テーブル
      this.bindReviewTableEvents();
      
      // ヘッダーアクション
      this.bindHeaderActions();
      
      // フィルタートグル
      this.bindFilterToggles();
      
      console.log("✅ イベントバインド完了");
    } catch (error) {
      console.error("❌ イベントバインドエラー:", error);
    }
  }

  // NGワード管理イベント
  bindNgWordEvents() {
    // NGワード追加
    if (this.elements.addNgwordBtn) {
      this.elements.addNgwordBtn.addEventListener('click', () => {
        this.addNgWord();
      });
    }

    if (this.elements.ngwordInput) {
      this.elements.ngwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addNgWord();
        }
      });
    }

    // NGワード削除（既存タグ）
    this.bindNgWordRemoveEvents();
  }

  // NGワード削除イベントバインド
  bindNgWordRemoveEvents() {
    const removeButtons = document.querySelectorAll('.filters__ngword-remove');
    removeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tag = e.target.closest('.filters__ngword-tag');
        const word = tag.dataset.word;
        this.removeNgWord(word, tag);
      });
    });
  }

  // NGワード追加
  addNgWord() {
    const input = this.elements.ngwordInput;
    if (!input) return;

    const word = input.value.trim();
    if (!word) {
      this.showNotification('NGワードを入力してください', 'warning');
      return;
    }

    if (this.data.ngWords.includes(word)) {
      this.showNotification('このNGワードは既に登録されています', 'warning');
      return;
    }

    // データ更新
    this.data.ngWords.push(word);

    // UI更新
    this.addNgWordTag(word);
    input.value = '';

    this.showNotification(`NGワード「${word}」を追加しました`, 'success');
    console.log("✅ NGワード追加:", word);
  }

  // NGワードタグ追加
  addNgWordTag(word) {
    const container = this.elements.ngwordTags;
    if (!container) return;

    const tag = document.createElement('div');
    tag.className = 'filters__ngword-tag';
    tag.dataset.word = word;
    tag.innerHTML = `
      ${word} <button class="filters__ngword-remove">×</button>
    `;

    // 削除イベント追加
    const removeBtn = tag.querySelector('.filters__ngword-remove');
    removeBtn.addEventListener('click', () => {
      this.removeNgWord(word, tag);
    });

    container.appendChild(tag);
  }

  // NGワード削除
  removeNgWord(word, tagElement) {
    // データ更新
    this.data.ngWords = this.data.ngWords.filter(w => w !== word);

    // UI更新
    tagElement.remove();

    this.showNotification(`NGワード「${word}」を削除しました`, 'info');
    console.log("✅ NGワード削除:", word);
  }

  // AI設定イベント
  bindAiSettingsEvents() {
    // AIモデル選択
    const aiModels = document.querySelectorAll('.filters__ai-model');
    aiModels.forEach(model => {
      model.addEventListener('click', () => {
        this.selectAiModel(model);
      });
    });

    // しきい値スライダー
    if (this.elements.imageThreshold) {
      this.elements.imageThreshold.addEventListener('input', (e) => {
        this.updateThresholdValue('image', e.target.value);
      });
    }

    if (this.elements.humanThreshold) {
      this.elements.humanThreshold.addEventListener('input', (e) => {
        this.updateThresholdValue('human', e.target.value);
      });
    }

    // テキストAIモード
    if (this.elements.textAiMode) {
      this.elements.textAiMode.addEventListener('change', (e) => {
        this.settings.stage4.mode = e.target.value;
        console.log("✅ テキストAIモード変更:", e.target.value);
      });
    }
  }

  // AIモデル選択
  selectAiModel(modelElement) {
    // 他のモデルの選択を解除
    document.querySelectorAll('.filters__ai-model').forEach(model => {
      model.classList.remove('filters__ai-model--selected');
    });

    // 選択されたモデルをアクティブに
    modelElement.classList.add('filters__ai-model--selected');

    const modelType = modelElement.dataset.model;
    this.settings.stage3.model = modelType;

    this.showNotification(`AIモデルを「${modelElement.querySelector('.filters__ai-model-name').textContent}」に変更しました`, 'success');
    console.log("✅ AIモデル選択:", modelType);
  }

  // しきい値更新
  updateThresholdValue(type, value) {
    const valueElement = document.getElementById(`${type}ThresholdValue`);
    if (valueElement) {
      valueElement.textContent = `${value}%`;
    }

    if (type === 'image') {
      this.settings.stage3.threshold = parseInt(value);
    } else if (type === 'human') {
      this.settings.stage4.threshold = parseInt(value);
    }

    console.log(`✅ ${type}しきい値更新:`, value);
  }

  // 確認テーブルイベント
  bindReviewTableEvents() {
    // 全選択チェックボックス
    if (this.elements.selectAllReviews) {
      this.elements.selectAllReviews.addEventListener('change', (e) => {
        this.toggleAllReviews(e.target.checked);
      });
    }

    // 一括承認
    if (this.elements.batchApprove) {
      this.elements.batchApprove.addEventListener('click', () => {
        this.batchApprove();
      });
    }

    // 個別承認・拒否ボタン
    this.bindIndividualReviewButtons();
  }

  // 個別確認ボタンイベント
  bindIndividualReviewButtons() {
    const approveButtons = document.querySelectorAll('.filters__approve-btn');
    const rejectButtons = document.querySelectorAll('.filters__reject-btn');

    approveButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('.filters__approve-btn').dataset.id);
        this.approveReview(id);
      });
    });

    rejectButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const id = parseInt(e.target.closest('.filters__reject-btn').dataset.id);
        this.rejectReview(id);
      });
    });
  }

  // 全選択切り替え
  toggleAllReviews(checked) {
    const checkboxes = document.querySelectorAll('.filters__review-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
    });
    console.log("✅ 全選択切り替え:", checked);
  }

  // 一括承認
  batchApprove() {
    const checkedBoxes = document.querySelectorAll('.filters__review-checkbox:checked');
    if (checkedBoxes.length === 0) {
      this.showNotification('承認する商品を選択してください', 'warning');
      return;
    }

    const count = checkedBoxes.length;
    checkedBoxes.forEach(checkbox => {
      const row = checkbox.closest('.filters__review-row');
      row.remove();
    });

    // 統計更新
    this.data.stats.pendingReview -= count;
    this.updateStatistics();

    this.showNotification(`${count}件の商品を一括承認しました`, 'success');
    console.log("✅ 一括承認:", count);
  }

  // 個別承認
  approveReview(id) {
    const row = document.querySelector(`[data-id="${id}"]`).closest('.filters__review-row');
    const product = row.querySelector('.filters__review-product').textContent;
    
    row.remove();

    // 統計更新
    this.data.stats.pendingReview--;
    this.updateStatistics();

    this.showNotification(`「${product}」を承認しました`, 'success');
    console.log("✅ 商品承認:", id);
  }

  // 個別拒否
  rejectReview(id) {
    const row = document.querySelector(`[data-id="${id}"]`).closest('.filters__review-row');
    const product = row.querySelector('.filters__review-product').textContent;
    
    row.remove();

    // 統計更新
    this.data.stats.pendingReview--;
    this.data.stats.filteredOut++;
    this.updateStatistics();

    this.showNotification(`「${product}」を拒否しました`, 'info');
    console.log("✅ 商品拒否:", id);
  }

  // ヘッダーアクションイベント
  bindHeaderActions() {
    // 設定エクスポート
    if (this.elements.exportConfig) {
      this.elements.exportConfig.addEventListener('click', () => {
        this.exportConfiguration();
      });
    }

    // 全フィルター実行
    if (this.elements.runAllFilters) {
      this.elements.runAllFilters.addEventListener('click', () => {
        this.runAllFilters();
      });
    }
  }

  // 設定エクスポート
  exportConfiguration() {
    const config = {
      settings: this.settings,
      ngWords: this.data.ngWords,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `filters-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);

    this.showNotification('フィルター設定をエクスポートしました', 'success');
    console.log("✅ 設定エクスポート完了");
  }

  // 全フィルター実行
  runAllFilters() {
    this.showNotification('全フィルターを実行中...', 'info');
    
    // モック実行（将来のAPI呼び出しを想定）
    const button = this.elements.runAllFilters;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 実行中...';
    button.disabled = true;

    setTimeout(() => {
      // 実行完了
      button.innerHTML = originalText;
      button.disabled = false;
      
      // 統計を少し変更して実行結果を表現
      this.data.stats.todayProcessed += 15;
      this.data.stats.filteredOut += 2;
      this.updateStatistics();
      
      this.showNotification('全フィルター実行が完了しました', 'success');
      console.log("✅ 全フィルター実行完了");
    }, 3000);
  }

  // フィルタートグルイベント
  bindFilterToggles() {
    const toggles = [
      { element: this.elements.stage1Toggle, stage: 'stage1' },
      { element: this.elements.stage2Toggle, stage: 'stage2' },
      { element: this.elements.stage3Toggle, stage: 'stage3' },
      { element: this.elements.stage4Toggle, stage: 'stage4' }
    ];

    toggles.forEach(({ element, stage }) => {
      if (element) {
        element.addEventListener('change', (e) => {
          this.settings[stage].enabled = e.target.checked;
          const stageNum = stage.replace('stage', '');
          this.showNotification(
            `段階${stageNum}フィルターを${e.target.checked ? '有効' : '無効'}にしました`,
            e.target.checked ? 'success' : 'warning'
          );
          console.log(`✅ ${stage}トグル:`, e.target.checked);
        });
      }
    });
  }

  // 統計表示更新
  updateStatistics() {
    if (this.elements.todayProcessed) {
      this.elements.todayProcessed.textContent = this.data.stats.todayProcessed.toLocaleString();
    }
    if (this.elements.filteredOut) {
      this.elements.filteredOut.textContent = this.data.stats.filteredOut.toLocaleString();
    }
    if (this.elements.pendingReview) {
      this.elements.pendingReview.textContent = this.data.stats.pendingReview.toLocaleString();
    }
    if (this.elements.accuracy) {
      this.elements.accuracy.textContent = this.data.stats.accuracy + '%';
    }
  }

  // 段階別統計更新
  updateStageStatistics() {
    Object.keys(this.data.stages).forEach(stageNum => {
      const stats = this.data.stages[stageNum];
      const stageCard = document.querySelector(`[data-stage="${stageNum}"]`);
      
      if (stageCard) {
        // 統計値更新
        const statValues = stageCard.querySelectorAll('.filters__stage-stat-value');
        if (statValues.length >= 4) {
          statValues[0].textContent = stats.input.toLocaleString();
          statValues[1].textContent = stats.passed.toLocaleString();
          statValues[2].textContent = stats.filtered.toLocaleString();
          statValues[3].textContent = stats.accuracy + '%';
        }

        // プログレスバー更新
        const progressFill = stageCard.querySelector('.filters__progress-fill');
        const progressText = stageCard.querySelector('.filters__progress-text');
        if (progressFill && progressText) {
          progressFill.style.width = stats.progress + '%';
          progressText.textContent = stats.progress + '% 完了';
        }
      }
    });
  }

  // 確認待ち商品レンダリング
  renderPendingReviews() {
    const tbody = this.elements.reviewTableBody;
    if (!tbody) return;

    tbody.innerHTML = '';

    this.data.pendingReviews.forEach(review => {
      const row = this.createReviewRow(review);
      tbody.appendChild(row);
    });

    // イベント再バインド
    this.bindIndividualReviewButtons();
  }

  // 確認行作成
  createReviewRow(review) {
    const row = document.createElement('tr');
    row.className = 'filters__review-row';
    
    const reasonBadgeClass = `filters__reason-badge--${review.reasonType}`;
    const stageBadgeClass = `filters__stage-badge--${review.stage}`;

    row.innerHTML = `
      <td>
        <input type="checkbox" class="filters__review-checkbox" />
      </td>
      <td class="filters__review-sku">${review.sku}</td>
      <td class="filters__review-product">${review.product}</td>
      <td class="filters__review-reason">
        <span class="filters__reason-badge ${reasonBadgeClass}">${review.reason}</span>
      </td>
      <td class="filters__review-confidence">
        <span class="filters__confidence-value">${review.confidence}%</span>
      </td>
      <td class="filters__review-stage">
        <span class="filters__stage-badge ${stageBadgeClass}">${review.stageName}</span>
      </td>
      <td class="filters__review-actions">
        <button class="btn btn--small btn--success filters__approve-btn" data-id="${review.id}">
          <i class="fas fa-check"></i>
          承認
        </button>
        <button class="btn btn--small btn--danger filters__reject-btn" data-id="${review.id}">
          <i class="fas fa-times"></i>
          拒否
        </button>
      </td>
    `;

    return row;
  }

  // 通知表示（ナレッジベースとの統合を想定）
  showNotification(message, type = 'info') {
    // 簡易通知実装（将来はナレッジの通知システムと統合）
    const notification = document.createElement('div');
    notification.className = `filters__notification filters__notification--${type}`;
    notification.textContent = message;
    
    // スタイル設定
    Object.assign(notification.style, {
      position: 'fixed',
      top: '100px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      fontSize: '14px',
      zIndex: '10000',
      opacity: '0',
      transform: 'translateY(-20px)',
      transition: 'all 0.3s ease'
    });

    // 色設定
    const colors = {
      success: '#10b981',
      warning: '#f59e0b', 
      danger: '#ef4444',
      info: '#3b82f6'
    };
    notification.style.background = colors[type] || colors.info;

    document.body.appendChild(notification);

    // アニメーション
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    });

    // 自動削除
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);

    console.log(`📢 通知: ${message} (${type})`);
  }
}

// ===== 初期化処理 =====
document.addEventListener('DOMContentLoaded', async function() {
  console.log("✅ フィルター管理DOM読み込み完了");
  
  try {
    // FiltersController初期化
    const filtersController = new FiltersController();
    await filtersController.initialize();
    
    // グローバルに設定（デバッグ用）
    window.filtersController = filtersController;
    
    console.log("🎯 フィルター管理システム起動完了");
    
  } catch (error) {
    console.error("❌ フィルター管理初期化エラー:", error);
  }
});

// エラーハンドリング
window.addEventListener('error', function(e) {
  console.error('❌ フィルター管理JSエラー:', e.message, 'at', e.filename + ':' + e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('❌ フィルター管理Promise拒否:', e.reason);
});

console.log("🔍 フィルター管理JavaScript読み込み完了");