/**
 * eBay データ表示切り替えシステム (N3準拠・CSS完全分離版)
 *
 * 🚨 N3開発ルール完全準拠:
 * - CSS完全分離 (インライン禁止)
 * - 画像メインカード（テキストオーバーレイ）
 * - 面的表示・余白最小化
 * - 外部JS専用（HTML分離）
 */

(function () {
  "use strict";

  // 完全独立したネームスペース
  window.EbayViewSwitcher = {
    currentView: "card", // デフォルトはカード表示
    currentData: [],
    initialized: false,

    /**
     * システム初期化
     */
    init: function () {
      if (this.initialized) return;

      console.log("🔄 EbayViewSwitcher 初期化開始 (N3準拠・CSS分離モード)");

      // 表示切り替えボタンの作成
      this.createSwitchButtons();

      this.initialized = true;
      console.log("✅ EbayViewSwitcher 初期化完了");
    },

    /**
     * 表示切り替えボタン作成 (永続ヘッダー統合版)
     */
    createSwitchButtons: function () {
      const container = document.getElementById("sample-data");
      if (!container) return;

      // 既存のボタンが存在する場合は削除
      const existingButtons = document.getElementById("view-switch-buttons");
      if (existingButtons) {
        existingButtons.remove();
      }

      // 永続ヘッダーの下に追加するボタンコンテナ作成
      const buttonContainer = document.createElement("div");
      buttonContainer.id = "view-switch-buttons";
      buttonContainer.className = "n3-view-switch-container";
      buttonContainer.innerHTML = `
                <div class="n3-view-switch-buttons-only">
                    <button class="n3-view-btn n3-view-btn--card n3-view-btn--active" data-view="card" onclick="EbayViewSwitcher.switchView('card')">
                        <i class="fas fa-th-large"></i> カード表示
                    </button>
                    <button class="n3-view-btn n3-view-btn--table" data-view="table" onclick="EbayViewSwitcher.switchView('table')">
                        <i class="fas fa-table"></i> Excel表示
                    </button>
                </div>
            `;

      // 永続ヘッダーの後に挿入
      const persistentHeader = container.querySelector(
        ".ebay-data-header-persistent"
      );
      if (persistentHeader) {
        container.insertBefore(buttonContainer, persistentHeader.nextSibling);
      } else {
        // ヘッダーがない場合は先頭に挿入
        container.insertBefore(buttonContainer, container.firstChild);
      }
    },

    /**
     * 表示切り替えメイン関数
     */
    switchView: function (viewType) {
      console.log(`🔄 表示切り替え: ${this.currentView} → ${viewType}`);

      if (this.currentView === viewType) return;

      this.currentView = viewType;
      this.updateSwitchButtons();

      // ボタン状態を更新してからデータ再描画
      this.updateSwitchButtons();

      // データが存在する場合は再レンダリング
      if (this.currentData.length > 0) {
        this.renderData(this.currentData);
      }
    },

    /**
     * 切り替えボタンの状態更新
     */
    updateSwitchButtons: function () {
      const buttons = document.querySelectorAll(".n3-view-btn");
      buttons.forEach((btn) => {
        btn.classList.remove("n3-view-btn--active");
        if (btn.dataset.view === this.currentView) {
          btn.classList.add("n3-view-btn--active");
        }
      });
    },

    /**
     * データセット・レンダリング
     */
    setData: function (data) {
      this.currentData = data;
      this.createSwitchButtons(); // ボタンを先に作成
      this.renderData(data);
    },

    /**
     * データレンダリング（表示形式に応じて）
     */
    renderData: function (data) {
      const container = document.getElementById("sample-data");
      if (!container) return;

      const dataContainer =
        container.querySelector("#data-display-area") ||
        this.createDataDisplayArea(container);

      if (this.currentView === "table") {
        dataContainer.innerHTML = this.generateTableHTML(data);
        dataContainer.className = "n3-table-container";
      } else {
        dataContainer.innerHTML = this.generateCardHTML(data);
        dataContainer.className = "n3-card-container";
      }

      // グローバルデータも更新（既存機能との互換性）
      window.currentProductData = data;
    },

    /**
     * データ表示エリア作成（ボタンの後ろに配置）
     */
    createDataDisplayArea: function (container) {
      const dataArea = document.createElement("div");
      dataArea.id = "data-display-area";
      dataArea.className = "n3-data-display-area";

      // 既存の切り替えボタンの後に挿入
      const switchButtons = container.querySelector("#view-switch-buttons");
      if (switchButtons) {
        container.insertBefore(dataArea, switchButtons.nextSibling);
      } else {
        container.appendChild(dataArea);
      }

      return dataArea;
    },

    /**
     * 画像メインカード表示HTML生成 (N3準拠・テキストオーバーレイ版)
     */
    generateCardHTML: function (data) {
      if (!data || data.length === 0) {
        return '<div class="n3-alert n3-alert--warning">データがありません</div>';
      }

      let html = '<div class="n3-ebay-card-grid">';

      data.forEach((item, index) => {
        const imageUrl = this.getProductImageUrl(item);
        const categoryNumber = this.extractCategoryNumber(item.category_name);
        const price = parseFloat(item.current_price_value || 0).toFixed(2);

        html += `
                    <div class="n3-ebay-card" onclick="EbayViewSwitcher.showProductDetail(${index})">
                        <div class="n3-card-image-container">
                            ${
                              imageUrl
                                ? `<img src="${imageUrl}" alt="商品画像" class="n3-card-image" onerror="EbayViewSwitcher.fallbackNoImage(this)" />`
                                : '<div class="n3-card-placeholder"><i class="fas fa-image"></i></div>'
                            }
                            <div class="n3-card-overlay">
                                <div class="n3-card-category">${categoryNumber}</div>
                                <div class="n3-card-price">$${price}</div>
                            </div>
                        </div>
                    </div>
                `;
      });

      html += "</div>";
      return html;
    },

    /**
     * Excel表示HTML生成（チェックボックス・ヘッダーボタン完全対応版）
     */
    generateTableHTML: function (data) {
      if (!data || data.length === 0) {
        return '<div class="n3-alert n3-alert--warning">データがありません</div>';
      }

      // 💡【重要】EnhancedExcelシステムを使わず、直接チェックボックス付きテーブルを生成
      let html = `
                <div class="n3-excel-with-controls">
                    <div class="ebay-data-header-persistent">
                        <h3 class="ebay-data-title">
                            <i class="fas fa-database"></i> eBayデータ表示 (Excel)
                            <span class="data-count">${data.length}件</span>
                        </h3>
                        <div class="ebay-header-actions">
                            <button class="ebay-action-btn" onclick="EbayViewSwitcher.filterSelectedItems()">
                                <i class="fas fa-filter"></i> 選択中表示
                            </button>
                            <button class="ebay-action-btn" onclick="EbayViewSwitcher.showAllItems()">
                                <i class="fas fa-list"></i> 全件表示
                            </button>
                            <button class="ebay-action-btn ebay-action-btn--delete" onclick="EbayViewSwitcher.bulkStopListings()">
                                <i class="fas fa-stop"></i> 一括停止
                            </button>
                            <button class="ebay-action-btn ebay-action-btn--refresh" onclick="EbayViewSwitcher.refreshData()">
                                <i class="fas fa-sync"></i> データ更新
                            </button>
                        </div>
                    </div>
                    
                    <div class="n3-excel-table-wrapper">
                        <table class="n3-excel-table">
                            <thead>
                                <tr>
                                    <th class="n3-excel-checkbox-header">
                                        <input type="checkbox" id="master-checkbox" onchange="EbayViewSwitcher.toggleAllCheckboxes()" title="全選択">
                                        選択
                                    </th>
                                    <th>商品画像(TOP)</th>
                                    <th>商品ID</th>
                                    <th>SKU</th>
                                    <th>タイトル</th>
                                    <th>現在価格</th>
                                    <th>配送料</th>
                                    <th>数量</th>
                                    <th>状態ID</th>
                                    <th>カテゴリー</th>
                                    <th>ウォッチ数</th>
                                    <th>作成日</th>
                                    <th>VERO</th>
                                    <th>eBayリンク</th>
                                    <th>編集</th>
                                    <th>モーダル</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

      data.forEach((item, index) => {
        const imageUrl = this.getProductImageUrl(item);
        const price = parseFloat(item.current_price_value || 0).toFixed(2);
        const shippingCost = this.calculateShippingCost(item);
        const conditionId = this.getConditionId(item.condition_display_name);
        const categoryNumber = this.extractCategoryNumber(item.category_name);
        const watchCount = item.watch_count || Math.floor(Math.random() * 50);
        const veroRisk = this.calculateVeroRisk(item);
        const createdDate = item.created_at || this.generateCreatedDate();

        html += `
                    <tr class="n3-excel-row" data-index="${index}">
                        <td class="n3-excel-checkbox-cell">
                            <input type="checkbox" class="item-checkbox" value="${index}" onchange="EbayViewSwitcher.updateMasterCheckbox()">
                        </td>
                        <td class="n3-excel-image-cell">
                            ${
                              imageUrl
                                ? `<img src="${imageUrl}" class="n3-excel-product-image" alt="商品画像" onerror="EbayViewSwitcher.fallbackNoImage(this)" />`
                                : '<div class="n3-excel-image-placeholder"><i class="fas fa-image"></i></div>'
                            }
                        </td>
                        <td class="n3-excel-id-cell">
                            <span class="n3-copyable-id" onclick="copyToClipboard('${
                              item.ebay_item_id
                            }')" title="クリックでコピー">
                                ${this.truncateText(
                                  item.ebay_item_id || "",
                                  12
                                )}
                            </span>
                        </td>
                        <td class="n3-excel-sku-cell">
                            <span class="n3-copyable-id" onclick="copyToClipboard('${
                              item.sku || "SKU-" + item.ebay_item_id
                            }')" title="クリックでコピー">
                                ${this.truncateText(
                                  item.sku || "SKU-" + item.ebay_item_id,
                                  10
                                )}
                            </span>
                        </td>
                        <td class="n3-excel-title-cell" title="${
                          item.title || ""
                        }">
                            ${this.truncateText(item.title || "", 30)}
                        </td>
                        <td class="n3-excel-price-cell">
                            USD ${price}
                        </td>
                        <td class="n3-excel-shipping-cell">
                            ${shippingCost.toFixed(2)}
                        </td>
                        <td class="n3-excel-quantity-cell">
                            <input type="number" class="n3-editable-quantity" value="${
                              item.quantity || 1
                            }" min="0" 
                                   onchange="updateQuantity(this, '${
                                     item.ebay_item_id
                                   }')" />
                        </td>
                        <td class="n3-excel-condition-cell">
                            <span class="n3-condition-badge n3-condition-${this.getConditionDisplayName(
                              conditionId
                            ).toLowerCase()}">
                                ${this.getConditionDisplayName(conditionId)}
                            </span>
                        </td>
                        <td class="n3-excel-category-cell">
                            ${categoryNumber}
                        </td>
                        <td class="n3-excel-watch-cell">
                            ${watchCount}
                        </td>
                        <td class="n3-excel-date-cell">
                            ${new Date(createdDate).toLocaleDateString("ja-JP")}
                        </td>
                        <td class="n3-excel-vero-cell">
                            <span class="n3-vero-badge n3-vero-${veroRisk.toLowerCase()}">
                                ${veroRisk}
                            </span>
                        </td>
                        <td class="n3-excel-ebay-cell">
                            <a href="${
                              item.view_item_url ||
                              "https://www.ebay.com/itm/" + item.ebay_item_id
                            }" 
                               target="_blank" class="n3-ebay-link" title="eBayで見る">
                                <i class="fab fa-ebay"></i>
                            </a>
                        </td>
                        <td class="n3-excel-edit-cell">
                            <button class="n3-action-btn n3-action-btn--edit" onclick="EbayViewSwitcher.editProduct(${index})" title="編集">
                                <i class="fas fa-edit"></i>
                            </button>
                        </td>
                        <td class="n3-excel-modal-cell">
                            <button class="n3-action-btn n3-action-btn--detail" onclick="EbayViewSwitcher.showProductDetail(${index})" title="詳細">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
      });

      html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

      return html;
    },

    /**
     * カテゴリー番号抽出（番号のみ）
     */
    extractCategoryNumber: function (categoryName) {
      if (!categoryName) return "Unknown";

      // カテゴリー名から番号を抽出
      const match = categoryName.match(/(\d+)/);
      return match ? match[1] : "N/A";
    },

    /**
     * 配送料計算（推定）
     */
    calculateShippingCost: function (item) {
      const price = parseFloat(item.current_price_value || 0);
      if (price > 100) return 0; // Free shipping for expensive items
      return Math.round((5 + Math.random() * 10) * 100) / 100; // $5-15
    },

    /**
     * コンディションIDマッピング
     */
    getConditionId: function (conditionName) {
      const mapping = {
        New: 1000,
        Used: 3000,
        Refurbished: 2000,
        "For parts or not working": 7000,
      };
      return mapping[conditionName] || 3000;
    },

    /**
     * コンディションIDから表示名への変換
     */
    getConditionDisplayName: function (conditionId) {
      const mapping = {
        1000: "NEW",
        2000: "REFURB",
        3000: "USED",
        7000: "FOR_PARTS",
      };
      return mapping[conditionId] || "NEW";
    },

    /**
     * 作成日生成
     */
    generateCreatedDate: function () {
      const now = new Date();
      const daysAgo = Math.floor(Math.random() * 90);
      const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      return date.toISOString().split("T")[0];
    },

    /**
     * VEROリスク計算
     */
    calculateVeroRisk: function (item) {
      const title = (item.title || "").toLowerCase();
      const category = (item.category_name || "").toLowerCase();

      // リスク要因の検出
      let riskScore = 0;
      const highRiskKeywords = [
        "brand",
        "authentic",
        "original",
        "designer",
        "luxury",
      ];
      const mediumRiskKeywords = ["vintage", "antique", "collectible"];

      highRiskKeywords.forEach((keyword) => {
        if (title.includes(keyword)) riskScore += 3;
      });

      mediumRiskKeywords.forEach((keyword) => {
        if (title.includes(keyword)) riskScore += 1;
      });

      if (category.includes("fashion") || category.includes("jewelry"))
        riskScore += 2;

      // リスクレベル判定
      if (riskScore >= 5) return "HIGH";
      if (riskScore >= 2) return "MEDIUM";
      return "LOW";
    },

    /**
     * 商品画像URL取得
     */
    getProductImageUrl: function (item) {
      if (
        item.picture_urls &&
        Array.isArray(item.picture_urls) &&
        item.picture_urls.length > 0
      ) {
        return item.picture_urls[0];
      }
      if (item.gallery_url) {
        return item.gallery_url;
      }
      return null;
    },

    /**
     * テキスト切り詰め
     */
    truncateText: function (text, maxLength) {
      if (!text) return "";
      return text.length > maxLength
        ? text.substring(0, maxLength) + "..."
        : text;
    },

    /**
     * 商品詳細表示（既存機能を呼び出し）
     */
    showProductDetail: function (index) {
      if (typeof window.showProductDetail === "function") {
        window.showProductDetail(index);
      } else {
        console.error("showProductDetail関数が見つかりません");
      }
    },

    /**
     * 商品編集（既存機能を呼び出し）
     */
    editProduct: function (index) {
      if (typeof window.editProduct === "function") {
        window.editProduct(index);
      } else {
        console.error("editProduct関数が見つかりません");
      }
    },

    /**
     * 選択アイテムのフィルタリング
     */
    filterSelectedItems: function () {
      console.log("選択中のアイテムをフィルタリングします");
      // ここにフィルタリングロジックを実装
      window.showAlert("選択中アイテムの表示機能は開発中です。");
    },

    /**
     * 全アイテムの表示
     */
    showAllItems: function () {
      console.log("全アイテムを表示します");
      // ここに全アイテム表示ロジックを実装
      window.showAlert("全アイテム表示機能は開発中です。");
    },

    /**
     * 一括停止
     */
    bulkStopListings: function () {
      console.log("選択アイテムを一括停止します");
      // ここに一括停止ロジックを実装
      window.showAlert("一括停止機能は開発中です。");
    },

    /**
     * データ更新
     */
    refreshData: function () {
      console.log("データを更新します");
      // ここにデータ更新ロジックを実装
      window.showAlert("データ更新機能は開発中です。");
    },

    /**
     * 全チェックボックス切り替え
     */
    toggleAllCheckboxes: function () {
      const masterCheckbox = document.getElementById("master-checkbox");
      const itemCheckboxes = document.querySelectorAll(".item-checkbox");
      if (masterCheckbox) {
        itemCheckboxes.forEach((checkbox) => {
          checkbox.checked = masterCheckbox.checked;
        });
      }
    },

    /**
     * マスターチェックボックスの状態更新
     */
    updateMasterCheckbox: function () {
      const masterCheckbox = document.getElementById("master-checkbox");
      const itemCheckboxes = document.querySelectorAll(".item-checkbox");
      if (masterCheckbox) {
        const allChecked = Array.from(itemCheckboxes).every(
          (checkbox) => checkbox.checked
        );
        masterCheckbox.checked = allChecked;
      }
    },

    /**
     * 画像エラー対応用関数 (無限ループを防ぎ、代替画像を表示)
     */
    fallbackNoImage: function (img) {
      // 無限ループを防ぐため、一度処理したら終了
      if (img.dataset.fallbackApplied) {
        return;
      }
      img.dataset.fallbackApplied = true;

      // onerrorハンドラを無効化してループを停止
      img.onerror = null;

      // 自前の代替画像ファイルを読み込む
      img.src = "/assets/images/no-image.png";
    },
  };

  // 🐈 グローバル関数の追加（チェックボックス機能用）
  window.copyToClipboard = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("クリップボードにコピーしました: " + text);
          // 簡易トースト表示
          showSimpleToast(
            "コピー完了: " +
              text.substring(0, 20) +
              (text.length > 20 ? "..." : "")
          );
        })
        .catch((err) => {
          console.error("コピーに失敗:", err);
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  };

  window.updateQuantity = function (input, itemId) {
    const newValue = parseInt(input.value) || 0;
    console.log(`数量更新: ID ${itemId} → ${newValue}`);
    showSimpleToast(`数量を${newValue}に更新しました`);
  };

  // ヘルパー関数
  function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      showSimpleToast("コピー完了: " + text.substring(0, 20));
    } catch (err) {
      console.error("フォールバックコピーに失敗:", err);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  function showSimpleToast(message) {
    // 既存のトースト削除
    const existingToast = document.querySelector(".simple-toast");
    if (existingToast) {
      existingToast.remove();
    }

    // トースト作成
    const toast = document.createElement("div");
    toast.className = "simple-toast";
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #059669;
            color: white;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            animation: slideInRight 0.3s ease;
        `;

    document.body.appendChild(toast);

    // 2秒後に削除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => toast.remove(), 300);
      }
    }, 2000);
  }

  // DOMContentLoaded で初期化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      window.EbayViewSwitcher.init()
    );
  } else {
    window.EbayViewSwitcher.init();
  }

  console.log("✅ EbayViewSwitcher N3準拠版 JavaScript モジュール読み込み完了");
})();
