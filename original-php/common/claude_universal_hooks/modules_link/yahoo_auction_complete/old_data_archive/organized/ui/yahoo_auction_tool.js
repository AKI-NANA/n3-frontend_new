/**
 * Yahoo Auction Tool - 既存機能保持+新機能統合版
 * 既存の出品システムを維持し、タブ管理・API連携機能を追加
 */

// 既存のグローバル変数・設定を維持
let currentCSVData = [];
let selectedPreset = "premium";
let listingInProgress = false;
let currentListingResults = null;

// 新機能用変数追加
let yaController = null;
let currentTab = "dashboard";

// 設定オブジェクト（既存）
const CONFIG = {
  api: {
    baseUrl: window.location.pathname,
    timeout: 30000,
    retryAttempts: 3,
  },
  ui: {
    progressUpdateInterval: 1000,
    animationDuration: 300,
  },
  listing: {
    defaultDelay: 2000,
    maxBatchSize: 20,
    templateTypes: ["premium", "clean", "luxury"],
  },
};

// ===============================================
// 既存のユーティリティ関数（保持）
// ===============================================
const Utils = {
  log: (message, level = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    console.log(logEntry);

    const logSection = document.getElementById("logSection");
    if (logSection) {
      const logElement = document.createElement("div");
      logElement.className = "log-entry";
      logElement.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-level ${level}">${level.toUpperCase()}</span>
                <span>${message}</span>
            `;
      logSection.appendChild(logElement);
      logSection.scrollTop = logSection.scrollHeight;
    }
  },

  formatNumber: (num) => {
    return new Intl.NumberFormat().format(num);
  },

  formatTime: (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },

  escapeHtml: (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  toggleElement: (elementId, show) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = show ? "block" : "none";
    }
  },

  animateToggle: (elementId, show, className = "fade-slide-in") => {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (show) {
      element.style.display = "block";
      element.classList.add(className);
      setTimeout(
        () => element.classList.remove(className),
        CONFIG.ui.animationDuration
      );
    } else {
      element.classList.add("fade-out");
      setTimeout(() => {
        element.style.display = "none";
        element.classList.remove("fade-out");
      }, CONFIG.ui.animationDuration);
    }
  },
};

// ===============================================
// 【新機能】タブ管理システム
// ===============================================
const TabManager = {
  init() {
    this.setupTabEventListeners();
    this.initializeDefaultTab();
  },

  setupTabEventListeners() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tabName = btn.getAttribute("data-tab");
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  },

  switchTab(tabName) {
    if (currentTab === tabName) return;

    Utils.log(`タブ切り替え: ${currentTab} → ${tabName}`);
    currentTab = tabName;

    // タブボタンの状態更新
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");

    // タブコンテンツの表示切り替え
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    document.getElementById(tabName)?.classList.add("active");

    // タブ切り替え時のデータ読み込み
    this.loadTabData(tabName);
  },

  async loadTabData(tabName) {
    try {
      switch (tabName) {
        case "dashboard":
          await APIManager.loadDashboardStats();
          break;
        case "approval":
          await APIManager.loadApprovalQueue();
          break;
        case "listing":
          // 出品タブは既存システムを使用
          break;
      }
    } catch (error) {
      Utils.log(
        `タブデータ読み込みエラー (${tabName}): ${error.message}`,
        "error"
      );
      ToastManager.showError(`${tabName}タブのデータ読み込みに失敗しました`);
    }
  },

  initializeDefaultTab() {
    const defaultTab = "dashboard";
    this.switchTab(defaultTab);
  },
};

// ===============================================
// 【新機能】API管理システム
// ===============================================
const APIManager = {
  async makeRequest(endpoint, method = "GET", data = null) {
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    };

    if (data && method !== "GET") {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(endpoint, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Utils.log(`API請求錯誤: ${error.message}`, "error");
      throw error;
    }
  },

  async loadDashboardStats() {
    try {
      const response = await this.makeRequest("?action=get_dashboard_stats");

      if (response.success && response.data) {
        this.updateDashboardDisplay(response.data);
        Utils.log("ダッシュボード統計更新完了");
      }
    } catch (error) {
      Utils.log("ダッシュボード統計エラー: " + error.message, "error");
    }
  },

  async loadApprovalQueue() {
    try {
      const response = await this.makeRequest("?action=get_approval_queue");

      if (response.success && response.data) {
        this.updateApprovalDisplay(response.data);
        Utils.log(`承認キュー更新: ${response.data.length}件`);
      }
    } catch (error) {
      Utils.log("承認キューエラー: " + error.message, "error");
    }
  },

  updateDashboardDisplay(data) {
    const statsMapping = {
      totalRecords: data.total_records || 0,
      scrapedCount: data.scraped_count || 0,
      readyCount: data.ready_count || 0,
      listedCount: data.listed_count || 0,
    };

    Object.entries(statsMapping).forEach(([elementId, value]) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = Utils.formatNumber(value);
      }
    });
  },

  updateApprovalDisplay(data) {
    // 承認キュー表示更新ロジック
    const container = document.getElementById("approvalQueueContainer");
    if (!container || !Array.isArray(data)) return;

    if (data.length === 0) {
      container.innerHTML =
        '<div class="no-data-message">承認待ちの商品はありません</div>';
      return;
    }

    const itemsHTML = data
      .map(
        (item) => `
            <div class="approval-item" data-id="${item.id}">
                <div class="item-info">
                    <h4>${Utils.escapeHtml(item.title || "")}</h4>
                    <p class="item-price">¥${Utils.formatNumber(
                      item.price || 0
                    )}</p>
                </div>
                <div class="item-actions">
                    <button class="btn btn-success btn-sm" onclick="approveItem(${
                      item.id
                    })">承認</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectItem(${
                      item.id
                    })">拒否</button>
                </div>
            </div>
        `
      )
      .join("");

    container.innerHTML = itemsHTML;
  },
};

// ===============================================
// 【新機能】トースト通知システム
// ===============================================
const ToastManager = {
  show(message, type = "info", duration = 5000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getIcon(type)}"></i>
                <span>${Utils.escapeHtml(message)}</span>
            </div>
        `;

    document.body.appendChild(toast);

    // 表示アニメーション
    setTimeout(() => toast.classList.add("show"), 100);

    // 自動削除
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  getIcon(type) {
    const icons = {
      success: "check-circle",
      error: "exclamation-triangle",
      warning: "exclamation-circle",
      info: "info-circle",
    };
    return icons[type] || "info-circle";
  },

  showSuccess(message) {
    this.show(message, "success");
  },
  showError(message) {
    this.show(message, "error");
  },
  showWarning(message) {
    this.show(message, "warning");
  },
  showInfo(message) {
    this.show(message, "info");
  },
};

// ===============================================
// 既存のCSVハンドラー（保持）
// ===============================================
const CSVHandler = {
  async readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || file.type !== "text/csv") {
        reject(new Error("有効なCSVファイルを選択してください。"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const data = this.parseCSV(csvText);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("ファイル読み込みエラー"));
      reader.readAsText(file);
    });
  },

  parseCSV(csvText) {
    const lines = csvText.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSVデータが不正です（ヘッダーとデータが必要）。");
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      if (values.length !== headers.length) continue;

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }

    return data;
  },

  validateData(data) {
    const errors = [];
    const requiredFields = ["Title", "BuyItNowPrice"];

    data.forEach((item, index) => {
      requiredFields.forEach((field) => {
        if (!item[field] || item[field].trim() === "") {
          errors.push(`行 ${index + 2}: ${field} が空です`);
        }
      });

      const price = parseFloat(item["BuyItNowPrice"]);
      if (isNaN(price) || price <= 0) {
        errors.push(`行 ${index + 2}: 価格が無効です`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  },
};

// ===============================================
// 既存のドラッグ&ドロップハンドラー（保持）
// ===============================================
const DragDropHandler = {
  init() {
    const dropAreas = document.querySelectorAll(".drag-drop-area");

    dropAreas.forEach((area) => {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        area.addEventListener(eventName, this.preventDefaults, false);
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        area.addEventListener(eventName, () => this.highlight(area), false);
      });

      ["dragleave", "drop"].forEach((eventName) => {
        area.addEventListener(eventName, () => this.unhighlight(area), false);
      });

      area.addEventListener("drop", (e) => this.handleDrop(e, area), false);
    });
  },

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  highlight(area) {
    area.classList.add("dragover");
  },

  unhighlight(area) {
    area.classList.remove("dragover");
  },

  async handleDrop(e, area) {
    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      await this.handleFiles(files);
    }
  },

  async handleFiles(files) {
    const file = files[0];

    try {
      Utils.log("CSVファイル処理開始: " + file.name);
      this.showUploadStatus("処理中...", "info");

      const data = await CSVHandler.readFile(file);
      const validation = CSVHandler.validateData(data);

      if (!validation.isValid) {
        throw new Error("データ検証エラー:\n" + validation.errors.join("\n"));
      }

      currentCSVData = data;
      this.showUploadStatus(
        `✅ ${data.length}件のデータを読み込みました`,
        "success"
      );
      this.displayDataPreview(data);
      this.enableListingButtons();

      Utils.log(`CSVデータ読み込み完了: ${data.length}件`);
      ToastManager.showSuccess(`CSVファイルを読み込みました: ${data.length}件`);
    } catch (error) {
      Utils.log("CSVファイル処理エラー: " + error.message, "error");
      this.showUploadStatus("❌ " + error.message, "error");
      ToastManager.showError("CSVファイル処理エラー: " + error.message);
    }
  },

  showUploadStatus(message, type) {
    let statusDiv = document.getElementById("uploadStatus");
    if (!statusDiv) {
      statusDiv = document.createElement("div");
      statusDiv.id = "uploadStatus";
      statusDiv.className = "upload-status";

      const dragArea = document.querySelector(".drag-drop-area");
      if (dragArea) {
        dragArea.parentNode.insertBefore(statusDiv, dragArea.nextSibling);
      }
    }

    statusDiv.textContent = message;
    statusDiv.className = `upload-status ${type}`;

    if (type === "info") {
      statusDiv.classList.add("loading-pulse");
    } else {
      statusDiv.classList.remove("loading-pulse");
    }
  },

  displayDataPreview(data) {
    let previewDiv = document.getElementById("dataPreview");
    if (!previewDiv) {
      previewDiv = document.createElement("div");
      previewDiv.id = "dataPreview";
      previewDiv.style.marginTop = "1.5rem";

      const uploadStatus = document.getElementById("uploadStatus");
      if (uploadStatus) {
        uploadStatus.parentNode.insertBefore(
          previewDiv,
          uploadStatus.nextSibling
        );
      }
    }

    const headers = Object.keys(data[0] || {});
    const previewRows = data.slice(0, 5);

    previewDiv.innerHTML = `
            <h4 style="margin-bottom: 1rem;">📊 データプレビュー（最初の5件）</h4>
            <div style="overflow-x: auto;">
                <table class="data-table" style="width: 100%; font-size: 0.8rem;">
                    <thead>
                        <tr>
                            ${headers
                              .map(
                                (header) =>
                                  `<th style="padding: 0.5rem;">${header}</th>`
                              )
                              .join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows
                          .map(
                            (row) => `
                            <tr>
                                ${headers
                                  .map(
                                    (header) =>
                                      `<td style="padding: 0.5rem;">${Utils.escapeHtml(
                                        String(row[header] || "").substring(
                                          0,
                                          50
                                        )
                                      )}${
                                        String(row[header] || "").length > 50
                                          ? "..."
                                          : ""
                                      }</td>`
                                  )
                                  .join("")}
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
            <p style="text-align: center; color: var(--text-muted); font-size: 0.875rem; margin-top: 1rem;">
                総件数: ${data.length}件 | 表示: 最初の${Math.min(
      5,
      data.length
    )}件
            </p>
        `;
  },

  enableListingButtons() {
    const buttons = document.querySelectorAll(".listing-action-btn");
    buttons.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("btn--disabled");
    });
  },
};

// ===============================================
// 既存のプリセット管理システム（保持）
// ===============================================
const PresetManager = {
  presets: {
    premium: {
      title: "🌟 プレミアム出品",
      description: "HTMLテンプレート + 高機能説明文",
      settings: {
        templateType: "Japanese Auction Premium Template",
        enableHTMLTemplate: true,
        delayBetweenItems: 3000,
        batchSize: 10,
        enableValidation: true,
        dryRun: false,
      },
    },
    clean: {
      title: "🎯 クリーン出品",
      description: "シンプルテンプレート + 高速処理",
      settings: {
        templateType: "Simple Clean Template",
        enableHTMLTemplate: true,
        delayBetweenItems: 2000,
        batchSize: 15,
        enableValidation: true,
        dryRun: false,
      },
    },
    test: {
      title: "🧪 テスト実行",
      description: "実際の出品は行わず、処理のみテスト",
      settings: {
        templateType: "Simple Clean Template",
        enableHTMLTemplate: true,
        delayBetweenItems: 1000,
        batchSize: 20,
        enableValidation: true,
        dryRun: true,
      },
    },
  },

  init() {
    this.createPresetUI();
    this.selectPreset("premium");
  },

  createPresetUI() {
    let presetPanel = document.getElementById("presetPanel");
    if (presetPanel) return; // 既に存在する場合はスキップ

    presetPanel = document.createElement("div");
    presetPanel.id = "presetPanel";
    presetPanel.className = "preset-panel";

    const listingSection = document.getElementById("listing");
    if (listingSection) {
      const firstChild = listingSection.querySelector(".section");
      if (firstChild) {
        firstChild.insertBefore(presetPanel, firstChild.firstChild);
      }
    }

    presetPanel.innerHTML = `
            <h4 style="margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-cog"></i>
                出品プリセット選択
            </h4>
            <div class="preset-options">
                ${Object.entries(this.presets)
                  .map(
                    ([key, preset]) => `
                    <div class="preset-option" data-preset="${key}" onclick="PresetManager.selectPreset('${key}')">
                        <div class="preset-title">${preset.title}</div>
                        <div class="preset-description">${preset.description}</div>
                    </div>
                `
                  )
                  .join("")}
            </div>
            <div class="batch-controls" style="margin-top: 1.5rem;">
                <div class="control-item">
                    <label class="control-label">項目間遅延 (ms)</label>
                    <input type="number" id="delayInput" class="control-input" value="3000" min="1000" max="10000" step="500">
                </div>
                <div class="control-item">
                    <label class="control-label">バッチサイズ</label>
                    <input type="number" id="batchSizeInput" class="control-input" value="10" min="1" max="50">
                </div>
                <div class="control-item">
                    <label class="control-label">検証モード</label>
                    <select id="validationSelect" class="control-input">
                        <option value="true">有効</option>
                        <option value="false">無効</option>
                    </select>
                </div>
                <div class="control-item">
                    <label class="control-label">実行モード</label>
                    <select id="dryRunSelect" class="control-input">
                        <option value="false">本番実行</option>
                        <option value="true">テスト実行</option>
                    </select>
                </div>
            </div>
        `;

    this.bindPresetEvents();
  },

  selectPreset(presetKey) {
    selectedPreset = presetKey;
    const preset = this.presets[presetKey];

    if (!preset) return;

    document.querySelectorAll(".preset-option").forEach((option) => {
      option.classList.remove("selected");
    });
    document
      .querySelector(`[data-preset="${presetKey}"]`)
      ?.classList.add("selected");

    const delayInput = document.getElementById("delayInput");
    const batchSizeInput = document.getElementById("batchSizeInput");
    const validationSelect = document.getElementById("validationSelect");
    const dryRunSelect = document.getElementById("dryRunSelect");

    if (delayInput) delayInput.value = preset.settings.delayBetweenItems;
    if (batchSizeInput) batchSizeInput.value = preset.settings.batchSize;
    if (validationSelect)
      validationSelect.value = preset.settings.enableValidation;
    if (dryRunSelect) dryRunSelect.value = preset.settings.dryRun;

    Utils.log(`プリセット選択: ${preset.title}`);
  },

  bindPresetEvents() {
    [
      "delayInput",
      "batchSizeInput",
      "validationSelect",
      "dryRunSelect",
    ].forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.addEventListener("change", () => {
          this.updateCurrentSettings();
        });
      }
    });
  },

  updateCurrentSettings() {
    const delayInput = document.getElementById("delayInput");
    const batchSizeInput = document.getElementById("batchSizeInput");
    const validationSelect = document.getElementById("validationSelect");
    const dryRunSelect = document.getElementById("dryRunSelect");

    if (selectedPreset && this.presets[selectedPreset]) {
      this.presets[selectedPreset].settings = {
        ...this.presets[selectedPreset].settings,
        delayBetweenItems: parseInt(delayInput?.value) || 3000,
        batchSize: parseInt(batchSizeInput?.value) || 10,
        enableValidation: validationSelect?.value === "true",
        dryRun: dryRunSelect?.value === "true",
      };
    }
  },

  getCurrentSettings() {
    this.updateCurrentSettings();
    return (
      this.presets[selectedPreset]?.settings || this.presets.premium.settings
    );
  },
};

// ===============================================
// 既存の出品マネージャー（保持）
// ===============================================
const ListingManager = {
  async executeListing() {
    if (listingInProgress) {
      Utils.log("出品処理が既に実行中です", "warning");
      ToastManager.showWarning("出品処理が既に実行中です");
      return;
    }

    if (!currentCSVData || currentCSVData.length === 0) {
      ToastManager.showError("CSVデータが読み込まれていません。");
      return;
    }

    try {
      listingInProgress = true;
      Utils.log("高機能出品処理開始");
      ToastManager.showInfo("出品処理を開始しています...");

      const settings = PresetManager.getCurrentSettings();
      this.showProgressModal(currentCSVData.length);

      const response = await this.callListingAPI(currentCSVData, settings);
      this.displayResults(response);

      Utils.log("高機能出品処理完了");
      ToastManager.showSuccess("出品処理が完了しました");
    } catch (error) {
      Utils.log("出品処理エラー: " + error.message, "error");
      ToastManager.showError("出品処理エラー: " + error.message);
      this.showError(error.message);
    } finally {
      listingInProgress = false;
    }
  },

  async callListingAPI(csvData, settings) {
    const requestData = {
      action: "execute_ebay_listing_advanced",
      csv_data: csvData,
      platform: "ebay",
      account: "mystical-japan-treasures",
      options: {
        ...settings,
        error_handling: "separate",
      },
    };

    const response = await fetch(CONFIG.api.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "出品処理でエラーが発生しました");
    }

    return result;
  },

  showProgressModal(totalItems) {
    const modalHTML = `
        <div id="advancedListingModal" class="modal advanced-modal">
            <div class="modal-content advanced-modal-content">
                <div class="modal-header">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-rocket"></i>
                        高機能eBay出品進行状況
                    </h2>
                    <button class="modal-close" onclick="document.getElementById('advancedListingModal').remove()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="overall-progress">
                        <h3>総合進行状況</h3>
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="overallProgress" style="width: 0%"></div>
                            </div>
                            <div class="progress-text" id="overallProgressText">0 / ${totalItems} 項目処理済み</div>
                        </div>
                    </div>
                    
                    <div class="status-stats">
                        <div class="stat-card stat-success">
                            <h4>✅ 成功</h4>
                            <div class="stat-value" id="successCount">0</div>
                        </div>
                        <div class="stat-card stat-error">
                            <h4>❌ 失敗</h4>
                            <div class="stat-value" id="errorCount">0</div>
                        </div>
                        <div class="stat-card stat-warning">
                            <h4>⚠️ 検証</h4>
                            <div class="stat-value" id="validationCount">0</div>
                        </div>
                        <div class="stat-card stat-info">
                            <h4>⏳ 処理中</h4>
                            <div class="stat-value" id="processingCount">${totalItems}</div>
                        </div>
                    </div>
                    
                    <div class="results-section">
                        <div class="results-tabs">
                            <button class="tab-btn active" data-tab="success" onclick="switchResultTab('success')">
                                ✅ 成功 (<span id="successTabCount">0</span>)
                            </button>
                            <button class="tab-btn" data-tab="failed" onclick="switchResultTab('failed')">
                                ❌ 失敗 (<span id="failedTabCount">0</span>)
                            </button>
                            <button class="tab-btn" data-tab="validation" onclick="switchResultTab('validation')">
                                ⚠️ 検証 (<span id="validationTabCount">0</span>)
                            </button>
                        </div>
                        
                        <div class="results-content">
                            <div id="successResults" class="result-tab-content active">
                                <div class="result-list" id="successList">
                                    <p class="no-results">まだ成功した出品はありません...</p>
                                </div>
                            </div>
                            
                            <div id="failedResults" class="result-tab-content">
                                <div class="result-list" id="failedList">
                                    <p class="no-results">まだ失敗した出品はありません...</p>
                                </div>
                            </div>
                            
                            <div id="validationResults" class="result-tab-content">
                                <div class="result-list" id="validationList">
                                    <p class="no-results">まだ検証エラーはありません...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn--secondary" onclick="document.getElementById('advancedListingModal').remove()">閉じる</button>
                    <button class="btn btn--primary" id="downloadReportBtn" onclick="downloadListingReport()" disabled>
                        <i class="fas fa-download"></i> レポート出力
                    </button>
                </div>
            </div>
        </div>
        `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  },

  displayResults(response) {
    currentListingResults = response.data;
    const {
      total_items,
      success_count,
      error_count,
      success_items,
      failed_items,
      validation_errors = [],
    } = response.data;

    const processed = success_count + error_count + validation_errors.length;
    const progress = (processed / total_items) * 100;

    const progressFill = document.getElementById("overallProgress");
    const progressText = document.getElementById("overallProgressText");

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText)
      progressText.textContent = `${processed} / ${total_items} 項目処理済み`;

    this.updateStats("successCount", success_count);
    this.updateStats("errorCount", error_count);
    this.updateStats("validationCount", validation_errors.length);
    this.updateStats("processingCount", Math.max(0, total_items - processed));

    this.updateResultsList("success", success_items || []);
    this.updateResultsList("failed", failed_items || []);
    this.updateResultsList("validation", validation_errors);

    this.updateTabCounts(success_count, error_count, validation_errors.length);

    const downloadBtn = document.getElementById("downloadReportBtn");
    if (downloadBtn) downloadBtn.disabled = false;

    Utils.log(
      `結果更新完了 - 成功:${success_count} 失敗:${error_count} 検証:${validation_errors.length}`
    );
  },

  updateStats(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = Utils.formatNumber(value);
    }
  },

  updateTabCounts(success, failed, validation) {
    const successTab = document.getElementById("successTabCount");
    const failedTab = document.getElementById("failedTabCount");
    const validationTab = document.getElementById("validationTabCount");

    if (successTab) successTab.textContent = success;
    if (failedTab) failedTab.textContent = failed;
    if (validationTab) validationTab.textContent = validation;
  },

  updateResultsList(type, items) {
    if (!Array.isArray(items)) return;

    const listElement = document.getElementById(`${type}List`);
    if (!listElement) return;

    if (items.length === 0) {
      listElement.innerHTML = `<p class="no-results">${
        type === "success" ? "成功" : type === "failed" ? "失敗" : "検証エラー"
      }項目はありません</p>`;
      return;
    }

    const itemsHTML = items
      .map((item) => {
        if (type === "success") {
          return `
                <div class="result-item result-success">
                    <div class="result-icon">✅</div>
                    <div class="result-content">
                        <h5>${Utils.escapeHtml(
                          item.item?.Title || "不明な商品"
                        )}</h5>
                        <p>eBay商品ID: <strong>${item.ebay_item_id}</strong></p>
                        ${
                          item.listing_url
                            ? `<a href="${item.listing_url}" target="_blank" class="view-listing-btn">出品確認</a>`
                            : ""
                        }
                    </div>
                </div>`;
        } else if (type === "failed") {
          return `
                <div class="result-item result-error">
                    <div class="result-icon">❌</div>
                    <div class="result-content">
                        <h5>${Utils.escapeHtml(
                          item.item?.Title || "不明な商品"
                        )}</h5>
                        <p class="error-message">${Utils.escapeHtml(
                          item.error_message || "エラー情報なし"
                        )}</p>
                        <div class="error-type">タイプ: ${
                          item.error_type || "unknown"
                        }</div>
                    </div>
                </div>`;
        } else if (type === "validation") {
          return `
                <div class="result-item result-warning">
                    <div class="result-icon">⚠️</div>
                    <div class="result-content">
                        <h5>${Utils.escapeHtml(
                          item.item?.Title || "不明な商品"
                        )}</h5>
                        <p class="error-message">${Utils.escapeHtml(
                          item.error_message || "検証エラー"
                        )}</p>
                        <div class="error-type">検証問題</div>
                    </div>
                </div>`;
        }
      })
      .join("");

    listElement.innerHTML = itemsHTML;
  },

  showError(message) {
    const errorModal = `
        <div id="errorModal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 style="color: #ef4444; margin: 0;">❌ エラー</h2>
                    <button class="modal-close" onclick="document.getElementById('errorModal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${Utils.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn--primary" onclick="document.getElementById('errorModal').remove()">OK</button>
                </div>
            </div>
        </div>
        `;
    document.body.insertAdjacentHTML("beforeend", errorModal);
  },
};

// ===============================================
// グローバル関数（HTML から呼び出し用）
// ===============================================

// 結果タブ切り替え
function switchResultTab(tabName) {
  document.querySelectorAll(".result-tab-content").forEach((content) => {
    content.classList.remove("active");
  });
  document.querySelectorAll(".results-tabs .tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const targetContent = document.getElementById(`${tabName}Results`);
  const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);

  if (targetContent) targetContent.classList.add("active");
  if (targetBtn) targetBtn.classList.add("active");

  Utils.log(`結果タブ切り替え: ${tabName}`);
}

// レポート出力
function downloadListingReport() {
  if (!currentListingResults) {
    ToastManager.showError("出力するレポートデータがありません。");
    return;
  }

  try {
    const report = generateReport(currentListingResults);
    const blob = new Blob([report], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `ebay_listing_report_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.csv`;
    link.click();

    Utils.log("レポート出力完了");
    ToastManager.showSuccess("レポートを出力しました");
  } catch (error) {
    Utils.log("レポート出力エラー: " + error.message, "error");
    ToastManager.showError("レポート出力に失敗しました。");
  }
}

function generateReport(results) {
  const {
    success_items = [],
    failed_items = [],
    validation_errors = [],
  } = results;

  let csvContent =
    "Status,Title,Result,Error Message,eBay Item ID,Listing URL\n";

  success_items.forEach((item) => {
    const title = (item.item?.Title || "").replace(/"/g, '""');
    csvContent += `"Success","${title}","Listed","","${item.ebay_item_id}","${
      item.listing_url || ""
    }"\n`;
  });

  failed_items.forEach((item) => {
    const title = (item.item?.Title || "").replace(/"/g, '""');
    const error = (item.error_message || "").replace(/"/g, '""');
    csvContent += `"Failed","${title}","Error","${error}","",""\n`;
  });

  validation_errors.forEach((item) => {
    const title = (item.item?.Title || "").replace(/"/g, '""');
    const error = (item.error_message || "").replace(/"/g, '""');
    csvContent += `"Validation Error","${title}","Validation Failed","${error}","",""\n`;
  });

  return csvContent;
}

// 出品実行（グローバル関数）
async function executeAdvancedListing() {
  await ListingManager.executeListing();
}

// 【新機能】承認・拒否関数
async function approveItem(itemId) {
  try {
    const response = await APIManager.makeRequest(
      "?action=approve_item",
      "POST",
      { item_id: itemId }
    );

    if (response.success) {
      Utils.log(`商品承認完了: ID ${itemId}`);
      ToastManager.showSuccess("商品が承認されました");
      await APIManager.loadApprovalQueue(); // 承認キュー更新
    } else {
      throw new Error(response.message || "承認処理に失敗しました");
    }
  } catch (error) {
    Utils.log("商品承認エラー: " + error.message, "error");
    ToastManager.showError("商品承認に失敗しました");
  }
}

async function rejectItem(itemId) {
  try {
    const response = await APIManager.makeRequest(
      "?action=reject_item",
      "POST",
      { item_id: itemId }
    );

    if (response.success) {
      Utils.log(`商品拒否完了: ID ${itemId}`);
      ToastManager.showSuccess("商品が拒否されました");
      await APIManager.loadApprovalQueue(); // 承認キュー更新
    } else {
      throw new Error(response.message || "拒否処理に失敗しました");
    }
  } catch (error) {
    Utils.log("商品拒否エラー: " + error.message, "error");
    ToastManager.showError("商品拒否に失敗しました");
  }
}

// 既存タブシステムとの統合維持
function switchTab(tabName) {
  TabManager.switchTab(tabName);
}

// ===============================================
// 初期化処理
// ===============================================
document.addEventListener("DOMContentLoaded", function () {
  Utils.log("Yahoo Auction Tool JavaScript 統合版初期化開始");

  try {
    // 新機能初期化
    TabManager.init();
    ToastManager.showInfo("システムを初期化しています...");

    // 既存システム初期化
    DragDropHandler.init();
    PresetManager.init();

    // 出品ボタンイベント設定
    const listingButton = document.getElementById("executeListingBtn");
    if (listingButton) {
      listingButton.addEventListener("click", executeAdvancedListing);
    }

    // ファイル入力イベント
    const fileInput = document.getElementById("csvFileInput");
    if (fileInput) {
      fileInput.addEventListener("change", async (e) => {
        if (e.target.files.length > 0) {
          await DragDropHandler.handleFiles(e.target.files);
        }
      });
    }

    // 初期データ読み込み
    setTimeout(() => {
      APIManager.loadDashboardStats();
    }, 1000);

    Utils.log("Yahoo Auction Tool JavaScript 統合版初期化完了");
    ToastManager.showSuccess("システムが正常に初期化されました");
  } catch (error) {
    Utils.log("初期化エラー: " + error.message, "error");
    ToastManager.showError("システム初期化でエラーが発生しました");
  }
});

// デバッグ用グローバルオブジェクト
window.YahooAuctionTool = {
  Utils,
  CSVHandler,
  DragDropHandler,
  PresetManager,
  ListingManager,
  TabManager,
  APIManager,
  ToastManager,
  currentCSVData,
  currentListingResults,
};
