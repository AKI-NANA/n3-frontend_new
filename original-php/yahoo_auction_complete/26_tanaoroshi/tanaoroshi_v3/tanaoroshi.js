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

// 商品編集関数
function editProduct(index) {
  const product = allProducts[index];
  if (!product) {
    alert('商品データが見つかりません');
    return;
  }
  
  // モーダルにデータを表示
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = `
    <div class="product-edit-form">
      <h4>商品編集: ${escapeHtml(product.title)}</h4>
      <div class="form-group">
        <label>ASIN/ID:</label>
        <input type="text" value="${escapeHtml(product.asin)}" readonly>
      </div>
      <div class="form-group">
        <label>商品名:</label>
        <input type="text" value="${escapeHtml(product.title)}" id="edit-title-${index}">
      </div>
      <div class="form-group">
        <label>価格:</label>
        <input type="number" value="${product.price}" step="0.01" id="edit-price-${index}">
      </div>
      <div class="form-group">
        <label>在庫:</label>
        <input type="number" value="${product.stock}" id="edit-stock-${index}">
      </div>
      <div class="form-group">
        <label>ステータス:</label>
        <select id="edit-status-${index}">
          <option value="active" ${product.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${product.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
    </div>
  `;
  
  // モーダル表示（N3Modal関数があれば使用、なければフォールバック）
  if (typeof N3Modal !== 'undefined' && N3Modal.open) {
    N3Modal.open('test-modal');
  } else {
    document.getElementById('test-modal').style.display = 'flex';
  }
}

// 在庫数量直接更新
function updateQuantityDirect(index, newValue) {
  if (allProducts[index]) {
    allProducts[index].stock = parseInt(newValue) || 0;
    console.log(`商品 ${index} の在庫を ${newValue} に更新`);
  }
}

// モーダルデータ更新
function refreshModalData() {
  alert('データ更新機能は実装予定です');
}

// ページ読み込み時に診断開始
document.addEventListener("DOMContentLoaded", function () {
  console.log("eBayデータテストビューアー開始");
  loadDiagnosticData();
  
  // ビュー切り替えボタンの状態更新
  const urlParams = new URLSearchParams(window.location.search);
  const currentView = urlParams.get('view') || 'excel';
  
  document.querySelectorAll('.view-switcher-btn').forEach(btn => {
    if (btn.dataset.view === currentView) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
});
