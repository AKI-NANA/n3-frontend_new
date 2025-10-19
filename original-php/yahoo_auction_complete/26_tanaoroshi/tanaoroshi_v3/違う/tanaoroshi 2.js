// システム設定
window.CSRF_TOKEN = "<?= $csrf_token ?>";

// グローバル変数
let allProducts = [];

// API呼び出し関数
async function loadDiagnosticData() {
  try {
    const response = await fetch("data.json"); // テスト用JSONファイルを読み込む
    if (!response.ok) {
      throw new Error(`ネットワークエラー: ${response.status}`);
    }
    const data = await response.json();
    if (data.success) {
      allProducts = data.products;
      displayDiagnosticResults(data);
    } else {
      displayError("データ取得に失敗しました: " + data.message);
    }
  } catch (error) {
    displayError(`診断エラー: ${error.message}`);
    console.error(error);
  }
}

// 診断結果の表示（Excel/Cardビュー両方に対応）
function displayDiagnosticResults(data) {
  const excelTbody = document.getElementById("excel-tbody");
  const cardContainer = document.getElementById("card-container");

  if (excelTbody) {
    excelTbody.innerHTML = ""; // Excelビューをクリア
    data.products.forEach((product, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="item-checkbox" data-index="${index}"></td>
        <td><img src="https://via.placeholder.com/50" alt="商品画像" onerror="this.onerror=null;this.src='https://via.placeholder.com/50';" class="product-thumb"></td>
        <td>${escapeHtml(product.title)}</td>
        <td>${escapeHtml(product.asin)}</td>
        <td class="status-cell">${escapeHtml(product.status)}</td>
        <td><input type="number" value="${
          product.stock
        }" class="stock-input" onchange="updateQuantityDirect(${index}, this.value)"></td>
        <td>$${product.price.toFixed(2)}</td>
        <td>${new Date().toLocaleDateString()}</td>
        <td><button class="action-btn" onclick="editProduct(${index})">編集</button></td>
      `;
      excelTbody.appendChild(row);
    });
  }

  if (cardContainer) {
    cardContainer.innerHTML = ""; // カードビューをクリア
    data.products.forEach((product, index) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <div class="card-image"><img src="https://via.placeholder.com/150" alt="商品画像"></div>
        <div class="card-content">
          <div class="card-title">${escapeHtml(product.title)}</div>
          <div class="card-details">
            <span class="card-id">${escapeHtml(product.asin)}</span>
            <span class="card-price">$${product.price.toFixed(2)}</span>
            <span class="card-status">${escapeHtml(product.status)}</span>
          </div>
          <button class="card-btn" onclick="editProduct(${index})">編集</button>
        </div>
      `;
      cardContainer.appendChild(card);
    });
  }

  // JSON出力エリアに表示
  document.getElementById("json-output").textContent = JSON.stringify(
    data,
    null,
    2
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
  loadDiagnosticData();
});
