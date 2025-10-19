# 07_editing モジュール リファクタリング実行計画

## Phase 1: 構造分離

### 1.1 ファイル構造の作成

```bash
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure/07_editing

# 新しい構造を作成
mkdir -p api assets includes

# 既存ファイルをバックアップ
cp editing.php editing_original_backup_$(date +%Y%m%d_%H%M%S).php
```

### 1.2 分離後の構造

```
07_editing/
├── editor.php              # メインエントリーポイント (HTMLのみ)
├── api/
│   ├── data.php            # データ取得API
│   ├── update.php          # データ更新API
│   ├── delete.php          # データ削除API
│   └── export.php          # CSV出力API
├── assets/
│   ├── editor.css          # スタイル
│   └── editor.js           # JavaScript機能
├── includes/
│   └── ProductEditor.php   # 編集機能クラス
└── config.php              # 設定
```

## Phase 2: コードの実装

### 2.1 shared 基盤の作成

まずshared基盤を構築します：

```php
// shared/core/Database.php
class Database {
    private static $instance = null;
    private $pdo;
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $this->pdo = new PDO($dsn, "postgres", "Kn240914");
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }
    
    public function select($table, $conditions = [], $options = []) {
        // 安全なSELECT実装
    }
    
    public function update($table, $data, $conditions) {
        // 安全なUPDATE実装
    }
    
    public function delete($table, $conditions) {
        // 安全なDELETE実装
    }
}
```

### 2.2 API応答の標準化

```php
// shared/core/ApiResponse.php
class ApiResponse {
    public static function success($data, $message = '', $module = '') {
        return self::send([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    public static function error($message, $code = 500, $module = '') {
        return self::send([
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $code
            ],
            'module' => $module,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    private static function send($data) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
```

### 2.3 07_editing の新しいエントリーポイント

```php
// 07_editing/editor.php
<?php
require_once '../shared/core/Database.php';
require_once '../shared/core/ApiResponse.php';
require_once 'includes/ProductEditor.php';

$editor = new ProductEditor();
$stats = $editor->getStats();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>商品データ編集システム</title>
    <link rel="stylesheet" href="../shared/css/common.css">
    <link rel="stylesheet" href="assets/editor.css">
</head>
<body>
    <div class="container">
        <header class="page-header">
            <h1>商品データ編集システム</h1>
            <p>総件数: <?= $stats['total'] ?>件 | 未出品: <?= $stats['unlisted'] ?>件</p>
        </header>
        
        <div class="toolbar">
            <button id="loadData" class="btn btn-primary">データ読み込み</button>
            <button id="exportCSV" class="btn btn-secondary">CSV出力</button>
            <button id="deleteSelected" class="btn btn-danger">選択削除</button>
        </div>
        
        <div class="data-container">
            <table id="productTable" class="data-table">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="selectAll"></th>
                        <th>ID</th>
                        <th>商品名</th>
                        <th>価格</th>
                        <th>カテゴリ</th>
                        <th>状態</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <!-- データはJavaScriptで動的に読み込み -->
                </tbody>
            </table>
        </div>
    </div>
    
    <script src="../shared/js/common.js"></script>
    <script src="assets/editor.js"></script>
</body>
</html>
```

### 2.4 API分離

```php
// 07_editing/api/data.php
<?php
require_once '../../shared/core/Database.php';
require_once '../../shared/core/ApiResponse.php';
require_once '../includes/ProductEditor.php';

$editor = new ProductEditor();

$page = intval($_GET['page'] ?? 1);
$limit = intval($_GET['limit'] ?? 20);
$filters = $_GET['filters'] ?? [];

try {
    $result = $editor->getProducts($page, $limit, $filters);
    ApiResponse::success($result, 'データ取得成功', '07_editing');
} catch (Exception $e) {
    ApiResponse::error($e->getMessage(), 500, '07_editing');
}
```

### 2.5 JavaScript分離

```javascript
// 07_editing/assets/editor.js
class ProductEditor {
    constructor() {
        this.selectedProducts = new Set();
        this.init();
    }
    
    init() {
        document.getElementById('loadData').addEventListener('click', () => this.loadData());
        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('deleteSelected').addEventListener('click', () => this.deleteSelected());
    }
    
    async loadData(page = 1) {
        try {
            const response = await fetch(`api/data.php?page=${page}&limit=20`);
            const result = await response.json();
            
            if (result.success) {
                this.renderTable(result.data);
            } else {
                console.error('データ取得失敗:', result.error);
            }
        } catch (error) {
            console.error('API呼び出しエラー:', error);
        }
    }
    
    renderTable(data) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        data.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" value="${product.id}"></td>
                <td>${product.id}</td>
                <td>${product.title}</td>
                <td>¥${product.price.toLocaleString()}</td>
                <td>${product.category}</td>
                <td>${product.condition}</td>
                <td>
                    <button onclick="editProduct(${product.id})" class="btn btn-sm">編集</button>
                    <button onclick="deleteProduct(${product.id})" class="btn btn-sm btn-danger">削除</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async deleteSelected() {
        const selected = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value)
            .filter(id => id !== 'on'); // selectAll除外
        
        if (selected.length === 0) {
            alert('削除する商品を選択してください');
            return;
        }
        
        if (!confirm(`${selected.length}件の商品を削除しますか？`)) {
            return;
        }
        
        try {
            const response = await fetch('api/delete.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({product_ids: selected})
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`${result.data.deleted_count}件を削除しました`);
                this.loadData(); // 再読み込み
            } else {
                alert('削除に失敗しました: ' + result.error.message);
            }
        } catch (error) {
            alert('削除エラー: ' + error.message);
        }
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.productEditor = new ProductEditor();
});
```

## Phase 3: 実行手順

### 3.1 shared 基盤の構築

```bash
# shared ディレクトリの準備
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure
mkdir -p shared/{core,css,js}

# Database.php を作成
cat > shared/core/Database.php << 'EOF'
[Database クラスのコード]
EOF

# ApiResponse.php を作成
cat > shared/core/ApiResponse.php << 'EOF'
[ApiResponse クラスのコード]
EOF
```

### 3.2 07_editing の分離実行

```bash
cd 07_editing

# 新構造の作成
mkdir -p api assets includes

# editor.php の作成
cat > editor.php << 'EOF'
[新しいメインファイルのコード]
EOF

# API ファイルの作成
cat > api/data.php << 'EOF'
[data.php のコード]
EOF
```

### 3.3 動作テスト

```bash
# PHPサーバーの起動
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete
php -S localhost:8000

# ブラウザでアクセス
# http://localhost:8000/new_structure/07_editing/editor.php
```

この計画により、07_editingを設計原則に従った構造に分離し、shared ライブラリ使用、UI/API分離、責任分離を実現します。