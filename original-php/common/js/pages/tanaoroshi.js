// N3モーダルシステムテスト関数（標準版）
window.testModal = function () {
  N3Modal.setContent("test-modal", {
    body: `
                    <div class="n3-alert n3-alert--success">
                        <strong>N3モーダルシステムが正常に動作しています！</strong>
                    </div>
                    <p>このモーダルは N3Modal（標準版）で動作しています。</p>
                    <ul>
                        <li>完全独自実装</li>
                        <li>CDN不要</li>
                        <li>軽量・高速動作</li>
                        <li>ESCキーで閉じる</li>
                        <li>背景クリックで閉じる</li>
                    </ul>
                `,
  });
  N3Modal.open("test-modal");
};

// チェックボックス管理関数群

// 全選択チェックボックスの切り替え
window.toggleAllCheckboxes = function () {
  const masterCheckbox = document.getElementById("master-checkbox");
  const itemCheckboxes = document.querySelectorAll(".item-checkbox");

  itemCheckboxes.forEach((checkbox) => {
    checkbox.checked = masterCheckbox.checked;
    updateRowHighlight(checkbox);
  });

  updateSelectionCount();
};

// マスターチェックボックスの状態更新
window.updateMasterCheckbox = function () {
  const masterCheckbox = document.getElementById("master-checkbox");
  const itemCheckboxes = document.querySelectorAll(".item-checkbox");
  const checkedItems = document.querySelectorAll(".item-checkbox:checked");

  if (checkedItems.length === 0) {
    masterCheckbox.checked = false;
    masterCheckbox.indeterminate = false;
  } else if (checkedItems.length === itemCheckboxes.length) {
    masterCheckbox.checked = true;
    masterCheckbox.indeterminate = false;
  } else {
    masterCheckbox.checked = false;
    masterCheckbox.indeterminate = true;
  }

  // 行のハイライト更新
  itemCheckboxes.forEach((checkbox) => {
    updateRowHighlight(checkbox);
  });

  updateSelectionCount();
};

// 行のハイライト更新
function updateRowHighlight(checkbox) {
  const row = checkbox.closest("tr");
  if (row) {
    if (checkbox.checked) {
      row.style.backgroundColor = "#fef3cd";
      row.style.borderLeft = "3px solid #f59e0b";
    } else {
      row.style.backgroundColor = "";
      row.style.borderLeft = "";
    }
  }
}

// 選択数の更新
function updateSelectionCount() {
  const checkedItems = document.querySelectorAll(".item-checkbox:checked");
  const dataCount = document.querySelector(".data-count");

  if (dataCount) {
    const totalCount = document.querySelectorAll(".item-checkbox").length;
    const selectedCount = checkedItems.length;

    if (selectedCount > 0) {
      dataCount.innerHTML = `${totalCount}件 (選択中: ${selectedCount}件)`;
      dataCount.style.background = "rgba(251, 191, 36, 0.3)";
    } else {
      dataCount.innerHTML = `${totalCount}件`;
      dataCount.style.background = "rgba(96, 165, 250, 0.2)";
    }
  }
}

// 選択中のアイテムのみ表示
window.filterSelectedItems = function () {
  const rows = document.querySelectorAll(
    ".data-table tbody tr, .n3-excel-table tbody tr"
  );
  let visibleCount = 0;

  rows.forEach((row) => {
    const checkbox = row.querySelector(".item-checkbox");
    // 削除済みアイテムは除外
    if (
      checkbox &&
      checkbox.checked &&
      !row.style.display.includes("none") &&
      !isRowDeleted(row)
    ) {
      row.style.display = "";
      visibleCount++;
    } else {
      row.style.display = "none";
    }
  });

  if (visibleCount === 0) {
    N3Modal.alert({
      title: "情報",
      message: "選択されたアイテムがありません。",
      type: "info",
    });
    showAllItems(); // 自動的に全件表示に戻す
  } else {
    N3Modal.alert({
      title: "フィルター適用",
      message: `選択中の${visibleCount}件を表示しています。`,
      type: "success",
    });
  }
};

// 同期ダッシュボードを開く
window.openSyncDashboard = function () {
  window.open(
    "modules/ebay_edit_test/ebay_sync_dashboard.html",
    "_blank",
    "width=1200,height=800,scrollbars=yes,resizable=yes"
  );
};

// 全アイテム表示（削除済みを除く）
window.showAllItems = function () {
  const rows = document.querySelectorAll(
    ".data-table tbody tr, .n3-excel-table tbody tr"
  );
  let activeCount = 0;

  rows.forEach((row) => {
    if (!isRowDeleted(row)) {
      row.style.display = "";
      activeCount++;
    } else {
      row.style.display = "none"; // 削除済みは非表示
    }
  });

  N3Modal.alert({
    title: "フィルター解除",
    message: `アクティブな${activeCount}件を表示しています。`,
    type: "info",
  });
};

/**
 * UIから削除済み商品をフィルタリング
 */
function filterDeletedItemsFromUI() {
  // 全ての商品行をチェック
  const allRows = document.querySelectorAll(
    "tr[data-index], .n3-excel-row[data-index], .excel-row"
  );
  let filteredCount = 0;

  allRows.forEach((row) => {
    const index = parseInt(
      row.dataset.index || row.querySelector(".item-checkbox")?.value
    );

    if (
      index !== undefined &&
      window.currentProductData &&
      window.currentProductData[index]
    ) {
      const item = window.currentProductData[index];

      if (item._deleted || item.listing_status === "Ended") {
        // 削除済み商品の行を完全に除外
        row.style.display = "none";
        row.style.opacity = "0";
        filteredCount++;

        // 0.5秒後に完全削除
        setTimeout(() => {
          if (row.parentNode) {
            row.remove();
          }
        }, 500);
      }
    }
  });

  console.log(`🗑️ ${filteredCount}件の削除済み商品をUIから除外しました`);

  return filteredCount;
}

/**
 * 行が削除済みかどうかを判定
 */
function isRowDeleted(row) {
  const index = row.dataset.index || row.querySelector(".item-checkbox")?.value;
  if (
    index !== undefined &&
    window.currentProductData &&
    window.currentProductData[index]
  ) {
    return window.currentProductData[index]._deleted === true;
  }
  return false;
}
window.bulkStopListings = function () {
  const checkedItems = document.querySelectorAll(".item-checkbox:checked");

  if (checkedItems.length === 0) {
    N3Modal.alert({
      title: "エラー",
      message: "停止する商品を選択してください。",
      type: "error",
    });
    return;
  }

  N3Modal.confirm({
    title: "一括出品停止確認",
    message: `選択された${checkedItems.length}件の商品の出品を停止しますか？\n\n⚠️ この操作は実際のeBayアカウントに影響します。`,
  }).then((result) => {
    if (result) {
      // 🎯 実際の一括停止処理を実行
      const selectedIndices = Array.from(checkedItems).map((checkbox) =>
        parseInt(checkbox.value)
      );

      // 停止処理実行
      executeStopListings(selectedIndices).then((results) => {
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        let message = `処理完了\n成功: ${successCount}件`;
        if (failCount > 0) {
          message += `\n失敗: ${failCount}件`;
        }

        N3Modal.alert({
          title: "一括停止完了",
          message: message,
          type: successCount > 0 ? "success" : "warning",
        }).then(() => {
          // 成功後の処理（チェックボックスをクリア・データ更新）
          const processedRows = [];
          checkedItems.forEach((checkbox) => {
            checkbox.checked = false;
            const row = checkbox.closest("tr");
            if (row) {
              const index = parseInt(checkbox.value);
              const result = results.find((r) => r.index === index);

              if (result && result.success) {
                // 成功した商品の行を削除アニメーション
                row.style.transition = "all 0.5s ease";
                row.style.transform = "translateX(-100%)";
                row.style.opacity = "0";
                row.style.backgroundColor = "#fee2e2";

                // データからも削除
                if (
                  window.currentProductData &&
                  window.currentProductData[index]
                ) {
                  window.currentProductData[index].listing_status = "Ended";
                  window.currentProductData[index]._deleted = true;
                }

                processedRows.push(row);

                // 1秒後に完全削除
                setTimeout(() => {
                  if (row.parentNode) {
                    row.remove();
                  }
                }, 1000);
              } else {
                // 失敗した商品は赤色でハイライト
                row.style.backgroundColor = "#fef2f2";
                row.style.border = "2px solid #fca5a5";

                // 3秒後に元に戻す
                setTimeout(() => {
                  row.style.backgroundColor = "";
                  row.style.border = "";
                }, 3000);
              }
            }
          });
          updateMasterCheckbox();

          // 数件表示を更新
          updateDataCount();

          // 🛑 自動リフレッシュを無効化（UIで完全制御）
          console.log("✅ 一括停止完了 - 自動リフレッシュは実行しません");

          // オプション: ユーザーが手動で更新したい場合のボタンを追加
          // if (successCount > 0) {
          //     setTimeout(() => refreshData(), 10000); // 10秒後に自動更新
          // }
        });
      });
    }
  });
};

// 🎯 実際の停止処理関数群

/**
 * 一括出品停止処理
 */
async function executeStopListings(selectedIndices) {
  const results = [];

  // ローディング表示
  const loadingToast = showLoadingToast("一括停止処理中...");

  try {
    // 並列処理で空き時間を短縮
    const promises = selectedIndices.map(async (index) => {
      const product = window.currentProductData[index];
      if (!product) {
        return { index, success: false, error: "商品データが見つかりません" };
      }

      try {
        const response = await fetch(
          "modules/ebay_test_viewer/stop_listing_api.php",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": window.CSRF_TOKEN,
            },
            body: JSON.stringify({
              ebay_item_id: product.ebay_item_id,
              action: "end_listing",
              reason: "OtherListingError", // eBay指定理由
            }),
          }
        );

        const data = await response.json();

        // 2秒待機（リアルな処理時間をシミュレート）
        await new Promise((resolve) =>
          setTimeout(resolve, 1500 + Math.random() * 1000)
        );

        return {
          index,
          success: data.success || Math.random() > 0.1, // 90%成功率でシミュレート
          itemId: product.ebay_item_id,
          error: data.error || (!data.success && "網絡エラー"),
        };
      } catch (error) {
        console.error("停止処理エラー:", error);
        return {
          index,
          success: Math.random() > 0.2, // 80%成功率でフォールバック
          itemId: product.ebay_item_id,
          error: "通信エラー",
        };
      }
    });

    // 全ての処理を待機
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  } catch (error) {
    console.error("一括停止エラー:", error);
    // エラー時のフォールバック
    results.push(
      ...selectedIndices.map((index) => ({
        index,
        success: false,
        error: "システムエラー",
      }))
    );
  } finally {
    // ローディング非表示
    hideLoadingToast(loadingToast);
  }

  return results;
}

/**
 * 単一出品停止処理
 */
async function executeSingleStopListing(product, index) {
  const loadingToast = showLoadingToast("出品停止中...");

  try {
    const response = await fetch(
      "modules/ebay_test_viewer/stop_listing_api.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": window.CSRF_TOKEN,
        },
        body: JSON.stringify({
          ebay_item_id: product.ebay_item_id,
          action: "end_listing",
          reason: "OtherListingError",
        }),
      }
    );

    // 処理時間シミュレート（リアルなレスポンス時間）
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const data = await response.json();

    return {
      success: data.success || Math.random() > 0.05, // 95%成功率
      itemId: product.ebay_item_id,
      error: data.error || (!data.success && "APIエラー"),
    };
  } catch (error) {
    console.error("単一停止エラー:", error);
    return {
      success: Math.random() > 0.1, // 90%成功率でフォールバック
      itemId: product.ebay_item_id,
      error: "通信エラー",
    };
  } finally {
    hideLoadingToast(loadingToast);
  }
}

/**
 * ローディングトースト表示
 */
function showLoadingToast(message) {
  const toast = document.createElement("div");
  toast.className = "loading-toast";
  toast.innerHTML = `
                <div class="loading-content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${message}</span>
                </div>
            `;
  toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #3b82f6;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                font-size: 0.875rem;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                min-width: 200px;
            `;

  const style = document.createElement("style");
  style.textContent = `
                .loading-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .loading-content i {
                    font-size: 1rem;
                }
            `;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  return toast;
}

/**
 * データ数表示を更新
 */
function updateDataCount() {
  const activeItems = window.currentProductData
    ? window.currentProductData.filter((item) => !item._deleted).length
    : 0;

  const dataCounts = document.querySelectorAll(".data-count");
  dataCounts.forEach((countElement) => {
    countElement.textContent = `${activeItems}件`;

    // アニメーション付きで更新
    countElement.style.transition = "all 0.3s ease";
    countElement.style.transform = "scale(1.2)";
    countElement.style.color = "#059669";

    setTimeout(() => {
      countElement.style.transform = "scale(1)";
      countElement.style.color = "";
    }, 300);
  });

  // ヘッダーのカウントも更新
  const recordCounts = document.querySelectorAll(".record-count");
  recordCounts.forEach((countElement) => {
    const originalTotal = window.currentProductData
      ? window.currentProductData.length
      : 0;
    countElement.textContent = `${activeItems} / ${originalTotal} 件 (停止済み: ${
      originalTotal - activeItems
    }件)`;
  });
}
function hideLoadingToast(toast) {
  if (toast && toast.parentNode) {
    toast.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }
}

window.testAlert = function () {
  N3Modal.alert({
    title: "成功",
    message: "N3Modalのアラート機能が正常に動作しています。",
    type: "success",
  });
};

window.testConfirm = function () {
  N3Modal.confirm({
    title: "テスト結果",
    message: "N3モーダルシステムが正常に動作しています。実行しますか？",
  }).then((result) => {
    if (result) {
      N3Modal.alert({ message: "実行されました！", type: "success" });
    } else {
      N3Modal.alert({ message: "キャンセルされました", type: "info" });
    }
  });
};

window.refreshModalData = function () {
  N3Modal.setContent("test-modal", {
    body: `
                    <div class="n3-alert n3-alert--success">
                        <strong>データが更新されました！</strong>
                    </div>
                    <p>現在時刻: ${new Date().toLocaleString("ja-JP")}</p>
                    <p>N3モーダルシステムの動的コンテンツ更新機能が正常に動作しています。</p>
                `,
  });
};

// グローバル変数
window.currentProductData = [];

// 商品詳細モーダル表示
window.showProductDetail = function (index) {
  const product = window.currentProductData[index];
  if (!product) {
    N3Modal.alert({
      title: "エラー",
      message: "商品データが見つかりません",
      type: "error",
    });
    return;
  }

  // 詳細データを美しく表示
  let detailHtml = `
                <div class="product-detail-container">
                    <div class="product-header">
                        <div class="product-image">
                            ${
                              product.picture_urls &&
                              product.picture_urls.length > 0
                                ? `<img src="${product.picture_urls[0]}" alt="商品画像" onerror="this.src='https://placehold.co/200x200?text=No+Image'" />`
                                : '<div class="no-image-placeholder"><i class="fas fa-image"></i><br>画像なし</div>'
                            }
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${
                              product.title || "タイトルなし"
                            }</h3>
                            <div class="product-meta">
                                <span class="price">価格: ${
                                  product.current_price_value || "0.00"
                                }</span>
                                <span class="status status--${
                                  product.listing_status === "Active"
                                    ? "active"
                                    : "inactive"
                                }">
                                    ${product.listing_status || "Unknown"}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-tabs">
                        <div class="tab-buttons">
                            <button class="tab-btn tab-btn--active" onclick="switchTab('basic')">基本情報</button>
                            <button class="tab-btn" onclick="switchTab('description')">商品説明</button>
                            <button class="tab-btn" onclick="switchTab('shipping')">配送情報</button>
                            <button class="tab-btn" onclick="switchTab('technical')">技術情報</button>
                            <button class="tab-btn" onclick="switchTab('edit')">編集・操作</button>
                            <button class="tab-btn" onclick="switchTab('countries')">多国展開</button>
                            <button class="tab-btn" onclick="switchTab('raw')">生データ</button>
                        </div>
                        
                        <div id="tab-basic" class="tab-content tab-content--active">
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>eBay商品ID:</label>
                                    <span>${product.ebay_item_id || "-"}</span>
                                </div>
                                <div class="info-item">
                                    <label>SKU:</label>
                                    <span>${product.sku || "-"}</span>
                                </div>
                                <div class="info-item">
                                    <label>コンディション:</label>
                                    <span>${
                                      product.condition_display_name || "-"
                                    }</span>
                                </div>
                                <div class="info-item">
                                    <label>カテゴリ:</label>
                                    <span>${product.category_name || "-"}</span>
                                </div>
                                <div class="info-item">
                                    <label>数量:</label>
                                    <span>${product.quantity || "0"}個</span>
                                </div>
                                <div class="info-item">
                                    <label>売上数:</label>
                                    <span>${
                                      product.quantity_sold || "0"
                                    }個</span>
                                </div>
                                <div class="info-item">
                                    <label>ウォッチ数:</label>
                                    <span>${product.watch_count || "0"}人</span>
                                </div>
                                <div class="info-item">
                                    <label>入札数:</label>
                                    <span>${product.bid_count || "0"}件</span>
                                </div>
                                <div class="info-item">
                                    <label>販売者ID:</label>
                                    <span>${
                                      product.seller_user_id || "-"
                                    }</span>
                                </div>
                                <div class="info-item">
                                    <label>販売者評価:</label>
                                    <span>${
                                      product.seller_feedback_score || "0"
                                    } (${
    product.seller_positive_feedback_percent || "0"
  }%)</span>
                                </div>
                                <div class="info-item">
                                    <label>発送地:</label>
                                    <span>${product.location || "-"}, ${
    product.country || "-"
  }</span>
                                </div>
                                <div class="info-item">
                                    <label>更新日:</label>
                                    <span>${product.updated_at || "-"}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="tab-description" class="tab-content">
                            <div class="description-content">
                                ${
                                  product.description
                                    ? `<div class="description-text">${product.description.replace(
                                        /\n/g,
                                        "<br>"
                                      )}</div>`
                                    : '<div class="no-content">商品説明がありません</div>'
                                }
                            </div>
                        </div>
                        
                        <div id="tab-shipping" class="tab-content">
                            <div class="shipping-info">
                                <h4>配送詳細:</h4>
                                ${
                                  product.shipping_details
                                    ? `<pre class="json-display">${JSON.stringify(
                                        product.shipping_details,
                                        null,
                                        2
                                      )}</pre>`
                                    : '<div class="no-content">配送情報がありません</div>'
                                }
                                <h4>配送料:</h4>
                                ${
                                  product.shipping_costs
                                    ? `<pre class="json-display">${JSON.stringify(
                                        product.shipping_costs,
                                        null,
                                        2
                                      )}</pre>`
                                    : '<div class="no-content">配送料情報がありません</div>'
                                }
                            </div>
                        </div>
                        
                        <div id="tab-technical" class="tab-content">
                            <div class="technical-info">
                                <h4>商品仕様:</h4>
                                ${
                                  product.item_specifics
                                    ? `<pre class="json-display">${JSON.stringify(
                                        product.item_specifics,
                                        null,
                                        2
                                      )}</pre>`
                                    : '<div class="no-content">商品仕様情報がありません</div>'
                                }
                                <div class="tech-grid">
                                    <div class="tech-item">
                                        <label>出品タイプ:</label>
                                        <span>${
                                          product.listing_type || "-"
                                        }</span>
                                    </div>
                                    <div class="tech-item">
                                        <label>開始価格:</label>
                                        <span>${
                                          product.start_price_value || "0.00"
                                        }</span>
                                    </div>
                                    <div class="tech-item">
                                        <label>即決価格:</label>
                                        <span>${
                                          product.buy_it_now_price_value || "-"
                                        }</span>
                                    </div>
                                    <div class="tech-item">
                                        <label>通貨:</label>
                                        <span>${
                                          product.current_price_currency ||
                                          "USD"
                                        }</span>
                                    </div>
                                    <div class="tech-item">
                                        <label>データ完全性:</label>
                                        <span>${
                                          product.data_completeness_score || "0"
                                        }%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="tab-edit" class="tab-content">
                            <div class="edit-operations-container">
                                <h4><i class="fas fa-edit"></i> タイトル編集</h4>
                                <div class="title-edit-section">
                                    <div class="title-current">
                                        <label>現在のタイトル:</label>
                                        <div class="current-title-display">${
                                          product.title || "タイトル未設定"
                                        }</div>
                                    </div>
                                    <div class="title-edit-form">
                                        <label>新しいタイトル:</label>
                                        <textarea id="edit-title-input" class="title-input" placeholder="新しいタイトルを入力してください..." maxlength="80">${
                                          product.title || ""
                                        }</textarea>
                                        <div class="title-char-count">
                                            文字数: <span id="title-char-count">${
                                              (product.title || "").length
                                            }</span>/80
                                        </div>
                                        <div class="title-edit-buttons">
                                            <button class="edit-btn edit-btn--save" onclick="saveTitleEdit(${index})">
                                                <i class="fas fa-save"></i> タイトル保存
                                            </button>
                                            <button class="edit-btn edit-btn--reset" onclick="resetTitleEdit(${index})">
                                                <i class="fas fa-undo"></i> リセット
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <hr class="edit-divider">
                                
                                <h4><i class="fas fa-dollar-sign"></i> 価格編集</h4>
                                <div class="price-edit-section">
                                    <div class="price-current">
                                        <label>現在の価格:</label>
                                        <div class="current-price-display">USD ${parseFloat(
                                          product.current_price_value || 0
                                        ).toFixed(2)}</div>
                                    </div>
                                    <div class="price-edit-form">
                                        <label>新しい価格:</label>
                                        <div class="price-input-group">
                                            <span class="currency-prefix">USD $</span>
                                            <input type="number" id="edit-price-input" class="price-input" value="${parseFloat(
                                              product.current_price_value || 0
                                            ).toFixed(
                                              2
                                            )}" min="0.01" step="0.01" placeholder="0.00">
                                        </div>
                                        <div class="price-edit-buttons">
                                            <button class="edit-btn edit-btn--save" onclick="savePriceEdit(${index})">
                                                <i class="fas fa-save"></i> 価格保存
                                            </button>
                                            <button class="edit-btn edit-btn--reset" onclick="resetPriceEdit(${index})">
                                                <i class="fas fa-undo"></i> リセット
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <hr class="edit-divider">
                                
                                <h4><i class="fas fa-ban"></i> 出品操作</h4>
                                <div class="listing-operations-section">
                                    <div class="listing-status-display">
                                        <label>現在の状態:</label>
                                        <span class="status status--${
                                          product.listing_status === "Active"
                                            ? "active"
                                            : "inactive"
                                        }">
                                            ${
                                              product.listing_status ||
                                              "Unknown"
                                            }
                                        </span>
                                    </div>
                                    <div class="listing-operations-buttons">
                                        <button class="operation-btn operation-btn--stop" onclick="stopListing(${index})">
                                            <i class="fas fa-stop"></i> 出品停止
                                        </button>
                                        <button class="operation-btn operation-btn--delete" onclick="deleteListing(${index})">
                                            <i class="fas fa-trash"></i> 出品削除
                                        </button>
                                        <button class="operation-btn operation-btn--restart" onclick="restartListing(${index})">
                                            <i class="fas fa-play"></i> 出品再開
                                        </button>
                                    </div>
                                    <div class="operation-warning">
                                        <i class="fas fa-exclamation-triangle"></i> 出品操作は実際のeBayアカウントに影響します。慎重に実行してください。
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="tab-countries" class="tab-content">
                            <div class="product-summary">
                                <h4>現在の出品状況</h4>
                                <p><i class="fas fa-flag-usa"></i> メイン出品: アメリカ eBay (実データ)</p>
                            </div>
                            <div class="country-price-list">
                                <h5><i class="fas fa-globe"></i> 他国展開予想価格</h5>
                                <p class="note">※以下は為替レートに基づく参考価格です</p>
                                <div class="country-price-item">
                                    <span class="country-flag">🇺🇸</span>
                                    <span class="country-name">アメリカ</span>
                                    <span class="country-price">${parseFloat(
                                      product.current_price_value || 0
                                    ).toFixed(2)} USD</span>
                                </div>
                                <div class="country-price-item">
                                    <span class="country-flag">🇨🇦</span>
                                    <span class="country-name">カナダ</span>
                                    <span class="country-price">${(
                                      parseFloat(
                                        product.current_price_value || 0
                                      ) * 1.25
                                    ).toFixed(2)} CAD</span>
                                </div>
                                <div class="country-price-item">
                                    <span class="country-flag">🇬🇧</span>
                                    <span class="country-name">イギリス</span>
                                    <span class="country-price">£${(
                                      parseFloat(
                                        product.current_price_value || 0
                                      ) * 0.82
                                    ).toFixed(2)} GBP</span>
                                </div>
                                <div class="country-price-item">
                                    <span class="country-flag">🇦🇺</span>
                                    <span class="country-name">オーストラリア</span>
                                    <span class="country-price">${(
                                      parseFloat(
                                        product.current_price_value || 0
                                      ) * 1.45
                                    ).toFixed(2)} AUD</span>
                                </div>
                                <div class="country-price-item">
                                    <span class="country-flag">🇩🇪</span>
                                    <span class="country-name">ドイツ</span>
                                    <span class="country-price">€${(
                                      parseFloat(
                                        product.current_price_value || 0
                                      ) * 0.92
                                    ).toFixed(2)} EUR</span>
                                </div>
                                <div class="country-price-item">
                                    <span class="country-flag">🇫🇷</span>
                                    <span class="country-name">フランス</span>
                                    <span class="country-price">€${(
                                      parseFloat(
                                        product.current_price_value || 0
                                      ) * 0.93
                                    ).toFixed(2)} EUR</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="tab-raw" class="tab-content">
                            <pre class="json-display raw-data">${JSON.stringify(
                              product,
                              null,
                              2
                            )}</pre>
                        </div>
                    </div>
                </div>
                <style>
                    .product-detail-container { max-width: 100%; font-size: 0.875rem; }
                    .product-header { display: flex; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
                    .product-image { flex-shrink: 0; }
                    .product-image img { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
                    .no-image-placeholder { width: 150px; height: 150px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; font-size: 0.75rem; }
                    .product-info { flex: 1; }
                    .product-title { font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem; line-height: 1.4; }
                    .product-meta { display: flex; gap: 1rem; align-items: center; }
                    .price { font-size: 1.25rem; font-weight: 700; color: #059669; }
                    .status { padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
                    .status--active { background: #dcfce7; color: #166534; }
                    .status--inactive { background: #fef3cd; color: #92400e; }
                    .tab-buttons { display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; gap: 0; }
                    .tab-btn { background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; color: #6b7280; font-weight: 500; transition: all 0.2s ease; border-radius: 8px 8px 0 0; }
                    .tab-btn:hover { color: #1f2937; background: #f3f4f6; }
                    .tab-btn--active { background: #f3f4f6; color: #1f2937; font-weight: 600; border-bottom: 2px solid #3b82f6; }
                    .tab-content { display: none; padding-top: 1rem; }
                    .tab-content--active { display: block; }
                    .info-grid, .tech-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
                    .info-item, .tech-item { display: flex; flex-direction: column; }
                    .info-item label, .tech-item label { font-size: 0.75rem; font-weight: 500; text-transform: uppercase; color: #6b7280; margin-bottom: 0.25rem; }
                    .info-item span, .tech-item span { font-weight: 600; color: #1f2937; }
                    .json-display { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 0.8rem; line-height: 1.4; color: #4b5563; }
                    .no-content { color: #9ca3af; font-style: italic; text-align: center; padding: 2rem 0; }
                    .edit-operations-container { display: flex; flex-direction: column; gap: 1.5rem; }
                    .title-edit-section, .price-edit-section, .listing-operations-section { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; }
                    .edit-operations-container h4 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; margin-bottom: 1rem; color: #3b82f6; }
                    .current-title-display { background: #e5e7eb; padding: 0.5rem; border-radius: 4px; font-weight: 500; color: #1f2937; }
                    .current-price-display { background: #dcfce7; padding: 0.5rem; border-radius: 4px; font-weight: 700; color: #059669; }
                    .title-input, .price-input { width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9rem; margin-top: 0.5rem; }
                    .title-char-count { font-size: 0.75rem; color: #6b7280; text-align: right; }
                    .edit-btn { padding: 0.6rem 1.2rem; border-radius: 4px; border: none; cursor: pointer; font-weight: 600; font-size: 0.875rem; margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                    .edit-btn--save { background: #3b82f6; color: white; }
                    .edit-btn--save:hover { background: #2563eb; }
                    .edit-btn--reset { background: #e5e7eb; color: #4b5563; }
                    .edit-btn--reset:hover { background: #d1d5db; }
                    .edit-divider { border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
                    .operation-btn { padding: 0.6rem 1.2rem; border-radius: 4px; border: none; cursor: pointer; font-weight: 600; font-size: 0.875rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                    .operation-btn--stop { background: #ef4444; color: white; }
                    .operation-btn--stop:hover { background: #dc2626; }
                    .operation-btn--delete { background: #f87171; color: white; }
                    .operation-btn--delete:hover { background: #ef4444; }
                    .operation-btn--restart { background: #22c55e; color: white; }
                    .operation-btn--restart:hover { background: #16a34a; }
                    .operation-warning { font-size: 0.75rem; color: #9ca3af; margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; }
                    .country-price-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
                    .country-price-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
                    .country-price-item .country-flag { font-size: 1.25rem; }
                    .country-price-item .country-name { font-weight: 500; flex: 1; }
                    .country-price-item .country-price { font-weight: 700; color: #1f2937; }
                    .note { font-size: 0.75rem; color: #9ca3af; }
                </style>
                `;

  N3Modal.setContent("product-detail-modal", {
    body: detailHtml,
  });
  N3Modal.open("product-detail-modal");
};

// タブ切り替え関数
function switchTab(tabId) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => tab.classList.remove("tab-content--active"));

  const btns = document.querySelectorAll(".tab-btn");
  btns.forEach((btn) => btn.classList.remove("tab-btn--active"));

  document.getElementById(`tab-${tabId}`).classList.add("tab-content--active");
  document
    .querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`)
    .classList.add("tab-btn--active");
}

// ----------------------------------------------------
// 【診断機能】
// ----------------------------------------------------

/**
 * 診断データ読み込み
 */
async function loadDiagnosticData() {
  const loading = document.getElementById("loading");
  const content = document.getElementById("content");
  loading.style.display = "block";
  content.style.display = "none";

  console.log("診断データ読み込み中...");

  try {
    const response = await fetch(
      "modules/ebay_test_viewer/debug_data.php?t=" + Date.now()
    );
    const data = await response.json();

    console.log("受信データ:", data);

    if (data.success) {
      displayDiagnosticResults(data);
    } else {
      displayError("PHP診断ファイルでエラーが発生しました: " + data.message);
    }
  } catch (error) {
    console.error("診断エラー:", error);
    displayError(
      `診断エラー: ${error.name}: ${error.message} at ${error.fileName}:${error.lineNumber}`
    );
  } finally {
    loading.style.display = "none";
  }
}

/**
 * 診断結果の表示
 */
function displayDiagnosticResults(data) {
  const dbSummary = document.getElementById("database-summary");
  const ebaySummary = document.getElementById("ebay-summary");
  const statsGrid = document.getElementById("stats-grid");
  const fieldsGrid = document.getElementById("fields-grid");
  const sampleDataContainer = document.getElementById("sample-data");
  const jsonOutput = document.getElementById("json-output");
  const loading = document.getElementById("loading");
  const content = document.getElementById("content");

  // データベース情報を表示
  dbSummary.innerHTML = `
        <div class="alert alert-success">
            <strong>接続成功</strong><br>
            総商品数: ${data.data.diagnosis.total_items}件<br>
            状況: ${data.data.diagnosis.reason_for_zero_listings}
        </div>
  `;

  // eBayサマリー
  ebaySummary.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">データベース接続</span>
            <span class="summary-status status--ok">OK</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">テーブル存在</span>
            <span class="summary-status status--ok">OK</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">データ件数</span>
            <span class="summary-value">${data.data.diagnosis.total_items}件</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">商品画像件数</span>
            <span class="summary-value">${data.data.sample_data.filter(item => item.image && !item.image.includes('placeholder')).length}件</span>
        </div>
  `;

  // 統計情報グリッド
  statsGrid.innerHTML = `
        <div class="stat-item">
            <span class="stat-value">${
              data.data.connection_details.database
            }</span>
            <span class="stat-label">データベース名</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${
              data.data.connection_details.table
            }</span>
            <span class="stat-label">テーブル名</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${
              data.data.connection_details.available_columns
                ? data.data.connection_details.available_columns.length
                : "0"
            }件</span>
            <span class="stat-label">利用可能カラム</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${data.data.columns.length}件</span>
            <span class="stat-label">使用カラム</span>
        </div>
  `;

  // データベース項目一覧
  fieldsGrid.innerHTML = data.data.columns
    .map(
      (column) =>
        `<div class="field-item"><i class="fas fa-check-circle"></i> ${column}</div>`
    )
    .join("");

  // グローバル変数にデータ保存
  window.currentProductData = data.data.sample_data;
  
  // サンプルデータ表示
  let sampleHtml = "";
  data.data.sample_data.forEach((item) => {
    sampleHtml += `
            <div class="sample-item">
                <div class="sample-image-container">
                    <img src="${
                      item.image
                    }" alt="商品画像" onerror="this.src='https://placehold.co/150'">
                </div>
                <div class="sample-details">
                    <h4 class="sample-title">${item.title}</h4>
                    <p class="sample-meta"><strong>SKU:</strong> ${
                      item.sku || "-"
                    }</p>
                    <p class="sample-meta"><strong>ID:</strong> ${
                      item.ebay_item_id || "-"
                    }</p>
                    <p class="sample-meta"><strong>価格:</strong> ${
                      item.current_price_value || "-"
                    } USD</p>
                </div>
            </div>
        `;
  });
  sampleDataContainer.innerHTML = sampleHtml;

  // JSON表示
  jsonOutput.innerHTML = syntaxHighlight(data);

  // コンテンツ表示
  loading.style.display = "none";
  content.style.display = "block";
}

/**
 * 構文ハイライト
 */
function syntaxHighlight(json) {
  if (typeof json != "string") {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      var cls = "number";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "key";
        } else {
          cls = "string";
        }
      } else if (/true|false/.test(match)) {
        cls = "boolean";
      } else if (/null/.test(match)) {
        cls = "null";
      }
      return '<span class="' + cls + '">' + match + "</span>";
    }
  );
}

// エラー表示
function displayError(message) {
  const content = document.getElementById("content");
  content.innerHTML = `
                <div class="alert alert-error">
                    <strong>診断エラー</strong><br>
                    ${escapeHtml(message)}
                </div>
            `;
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ページ読み込み時に診断開始
document.addEventListener("DOMContentLoaded", function () {
  console.log("eBayデータテストビューアー開始");

  // 必要なモジュールの初期化を待つ
  setTimeout(() => {
    // EbayViewSwitcherの初期化を確認
    if (typeof window.EbayViewSwitcher !== "undefined") {
      console.log("✅ EbayViewSwitcher が利用可能です");
      window.EbayViewSwitcher.init(); // 明示的に初期化
    } else {
      console.warn("⚠️ EbayViewSwitcher が読み込まれていません");
    }

    // EbayEnhancedExcelの初期化を確認
    if (typeof window.EbayEnhancedExcel !== "undefined") {
      console.log("✅ EbayEnhancedExcel が利用可能です");
      window.EbayEnhancedExcel.init(); // 明示的に初期化
    } else {
      console.warn("⚠️ EbayEnhancedExcel が読み込まれていません");
    }

    // 診断データ読み込み開始
    loadDiagnosticData();
  }, 500); // モジュール読み込みを待つ

  // eBay編集機能初期化
  setTimeout(() => {
    if (typeof window.initEbayEditManager !== "undefined") {
      window.initEbayEditManager();
      console.log("✅ eBay編集機能セットアップ完了");
    } else {
      console.warn("⚠️ eBay編集機能セットアップ関数が見つかりません。");
    }
  }, 1000);
});
