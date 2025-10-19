document.addEventListener("DOMContentLoaded", () => {
  const researchForm = document.getElementById("researchForm");
  const resultsContainer = document.getElementById("resultsContainer");
  const toggleFilters = document.getElementById("toggleFilters");
  const advancedFilters = document.getElementById("advancedFilters");

  // 詳細フィルターの表示/非表示
  toggleFilters.addEventListener("click", (e) => {
    e.preventDefault();
    advancedFilters.style.display =
      advancedFilters.style.display === "none" ? "grid" : "none";
  });

  researchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = document.getElementById("query").value.trim();
    if (!query) return;

    showLoading();
    resultsContainer.innerHTML = ""; // 既存の結果をクリア

    const filters = {
      sellerCountry: document.getElementById("sellerCountry").value,
      condition: document.getElementById("condition").value,
      priceMin: document.getElementById("priceMin").value,
      priceMax: document.getElementById("priceMax").value,
    };

    const formData = new FormData();
    formData.append("action", "search_products");
    formData.append("query", query);
    formData.append("filters", JSON.stringify(filters));

    try {
      const response = await fetch("api/ebay_api_handler.php", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        if (result.data.items && result.data.items.length > 0) {
          displayResults(result.data.items);
        } else {
          resultsContainer.innerHTML =
            '<div class="no-results-message"><i class="fas fa-frown"></i><p>検索結果が見つかりませんでした。</p></div>';
        }
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError("API通信エラーが発生しました。");
    } finally {
      hideLoading();
    }
  });
});

function displayResults(items) {
  // スコアの高い順に並び替え（PHP側で既に実施済みだが念のため）
  items.sort((a, b) => b.analysis.profit_score - a.analysis.profit_score);

  items.forEach((item) => {
    const itemHtml = createItemCard(item);
    document.getElementById("resultsContainer").appendChild(itemHtml);
  });
}

function createItemCard(item) {
  const card = document.createElement("div");
  card.className = "item-card";

  const profitFlag = item.analysis.is_profitable
    ? '<span class="profit-flag profitable">✔ 利益商品</span>'
    : '<span class="profit-flag non-profitable">✗ 利益商品ではない</span>';
  const availabilityFlag = item.analysis.is_currently_available
    ? '<span class="available-flag in-stock">即決</span>'
    : '<span class="available-flag auction">オークション</span>';
  const scoreFlag = `<span class="score-flag">スコア: ${item.analysis.profit_score.toFixed(
    0
  )}</span>`;

  const sellerSaveBtn = `<button class="n3-btn n3-btn-sm n3-btn-secondary" onclick="saveSeller('${item.item.seller.username}', '${item.item.seller.sellerLegalName.link.href}')">
        <i class="fas fa-bookmark"></i> セラー保存
    </button>`;

  card.innerHTML = `
        <img src="${item.item.image.imageUrl}" alt="${
    item.item.title
  }" class="item-thumbnail">
        <div class="item-content">
            <a href="${
              item.item.itemWebUrl
            }" target="_blank" class="item-title">${item.item.title}</a>
            <div class="item-meta">
                <span class="price">$${item.item.price.value} ${
    item.item.price.currency
  }</span>
                <span class="condition">状態: ${item.item.condition}</span>
                <span class="seller">セラー: ${item.item.seller.username} (${
    item.item.seller.country
  })</span>
            </div>
            <div class="item-analysis">
                <div class="analysis-row">
                    <span>推定利益:</span>
                    <span class="profit-amount">¥${item.analysis.estimated_profit_jpy.toFixed(
                      0
                    )}</span>
                </div>
                <div class="analysis-row">
                    <span>利益率:</span>
                    <span class="profit-rate">${item.analysis.estimated_profit_rate.toFixed(
                      1
                    )}%</span>
                </div>
            </div>
            <div class="item-flags">
                ${profitFlag}
                ${availabilityFlag}
                ${scoreFlag}
            </div>
        </div>
        <div class="item-actions">
            ${sellerSaveBtn}
        </div>
    `;
  return card;
}

async function saveSeller(username, sellerUrl) {
  const formData = new FormData();
  formData.append("action", "save_profitable_seller");
  formData.append(
    "seller_data",
    JSON.stringify({
      username: username,
      seller_url: sellerUrl,
      // その他のセラー情報をAPIから取得して追加可能
    })
  );

  try {
    const response = await fetch("api/ebay_api_handler.php", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (result.success) {
      alert("セラー情報を保存しました！");
    } else {
      alert("セラー情報の保存に失敗しました: " + result.message);
    }
  } catch (error) {
    alert("セラー情報の保存に失敗しました: " + error.message);
  }
}

function showLoading() {
  // ローディング表示
  document.body.classList.add("loading");
}

function hideLoading() {
  // ローディング非表示
  document.body.classList.remove("loading");
}

function showError(message) {
  resultsContainer.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>${message}</p></div>`;
}
