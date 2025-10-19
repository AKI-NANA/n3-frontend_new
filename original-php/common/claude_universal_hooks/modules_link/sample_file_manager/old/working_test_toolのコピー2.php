<?php
// セッションが既に開始されていない場合のみ開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CSRF保護
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// データベース設定
$db_file = 'web_tool_data.db';

// SQLiteデータベース初期化
function initializeDatabase() {
    global $db_file;
    
    try {
        $pdo = new PDO("sqlite:$db_file");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // ユーザーテーブル
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'user',
            avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // ファイルテーブル
        $pdo->exec("CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            upload_path TEXT,
            uploaded_by INTEGER,
            tags TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users (id)
        )");
        
        // プロジェクトテーブル
        $pdo->exec("CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            priority TEXT DEFAULT 'medium',
            assigned_to INTEGER,
            due_date DATE,
            progress INTEGER DEFAULT 0,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_to) REFERENCES users (id)
        )");
        
        // タスクテーブル
        $pdo->exec("CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            assigned_to INTEGER,
            due_date DATE,
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id),
            FOREIGN KEY (assigned_to) REFERENCES users (id)
        )");
        
        // 設定テーブル
        $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT,
            setting_type TEXT DEFAULT 'text',
            description TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // 初期データ挿入
        insertInitialData($pdo);
        
        return $pdo;
    } catch (PDOException $e) {
        error_log("Database initialization error: " . $e->getMessage());
        return null;
    }
}

// 初期データ挿入
function insertInitialData($pdo) {
    // サンプルユーザー
    $users = [
        ['有田宏明', 'arita@example.com', 'admin'],
        ['田中太郎', 'tanaka@example.com', 'user'],
        ['佐藤花子', 'sato@example.com', 'manager'],
        ['山田次郎', 'yamada@example.com', 'user']
    ];
    
    foreach ($users as $user) {
        try {
            $pdo->prepare("INSERT OR IGNORE INTO users (name, email, role) VALUES (?, ?, ?)")
                ->execute($user);
        } catch (PDOException $e) {
            // 重複エラーは無視
        }
    }
    
    // サンプルプロジェクト
    $projects = [
        ['Webサイトリニューアル', 'コーポレートサイトの全面刷新プロジェクト', 'active', 'high', 1, '2025-08-30', 75],
        ['在庫管理システム開発', '新しい在庫管理システムの構築', 'active', 'medium', 2, '2025-09-15', 40],
        ['モバイルアプリ開発', 'iOS/Androidアプリの開発', 'planning', 'high', 3, '2025-10-01', 15],
        ['データベース最適化', 'システムパフォーマンス改善', 'completed', 'low', 4, '2025-07-20', 100]
    ];
    
    foreach ($projects as $project) {
        try {
            $pdo->prepare("INSERT OR IGNORE INTO projects (title, description, status, priority, assigned_to, due_date, progress) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute($project);
        } catch (PDOException $e) {
            // 重複エラーは無視
        }
    }
    
    // サンプルタスク
    $tasks = [
        [1, 'デザイン調査', 'トレンド調査と競合分析', 'completed', 'medium', 1, '2025-07-25'],
        [1, 'ワイヤーフレーム作成', 'サイト構成の設計', 'in_progress', 'high', 1, '2025-08-05'],
        [1, 'コーディング', 'HTML/CSS/JavaScript実装', 'pending', 'high', 2, '2025-08-20'],
        [2, '要件定義', 'システム仕様の明確化', 'completed', 'high', 2, '2025-07-30'],
        [2, 'データベース設計', 'テーブル設計とER図作成', 'in_progress', 'medium', 3, '2025-08-10']
    ];
    
    foreach ($tasks as $task) {
        try {
            $pdo->prepare("INSERT OR IGNORE INTO tasks (project_id, title, description, status, priority, assigned_to, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute($task);
        } catch (PDOException $e) {
            // 重複エラーは無視
        }
    }
    
    // システム設定
    $settings = [
        ['site_title', 'Complete Web Tool', 'text', 'サイトタイトル'],
        ['max_upload_size', '10485760', 'number', '最大アップロードサイズ（バイト）'],
        ['allowed_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,zip', 'text', '許可ファイル拡張子'],
        ['records_per_page', '10', 'number', '1ページあたりの表示件数'],
        ['timezone', 'Asia/Tokyo', 'text', 'タイムゾーン']
    ];
    
    foreach ($settings as $setting) {
        try {
            $pdo->prepare("INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)")
                ->execute($setting);
        } catch (PDOException $e) {
            // 重複エラーは無視
        }
    }
}

// データベース初期化
$pdo = initializeDatabase();

// アップロードディレクトリ作成
$upload_dir = 'uploads';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// API処理
if (isset($_GET['api'])) {
    header('Content-Type: application/json');
    
    // CSRF確認
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token'])) {
        http_response_code(403);
        echo json_encode(['error' => 'CSRF token mismatch']);
        exit;
    }
    
    switch ($_GET['api']) {
        case 'users':
            handleUsersAPI($pdo);
            break;
            
        case 'projects':
            handleProjectsAPI($pdo);
            break;
            
        case 'tasks':
            handleTasksAPI($pdo);
            break;
            
        case 'files':
            handleFilesAPI($pdo);
            break;
            
        case 'settings':
            handleSettingsAPI($pdo);
            break;
            
        case 'dashboard':
            handleDashboardAPI($pdo);
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'API endpoint not found']);
    }
    exit;
}

// Users API
function handleUsersAPI($pdo) {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $stmt = $pdo->query("SELECT * FROM users ORDER BY created_at DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;
            
        case 'POST':
            $name = $_POST['name'] ?? '';
            $email = $_POST['email'] ?? '';
            $role = $_POST['role'] ?? 'user';
            
            if (empty($name) || empty($email)) {
                http_response_code(400);
                echo json_encode(['error' => '名前とメールアドレスは必須です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("INSERT INTO users (name, email, role) VALUES (?, ?, ?)");
                $stmt->execute([$name, $email, $role]);
                
                echo json_encode([
                    'success' => true,
                    'id' => $pdo->lastInsertId(),
                    'message' => 'ユーザーが追加されました'
                ]);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'ユーザー追加に失敗しました: ' . $e->getMessage()]);
            }
            break;
            
        case 'PUT':
            parse_str(file_get_contents("php://input"), $data);
            $id = $data['id'] ?? '';
            $name = $data['name'] ?? '';
            $email = $data['email'] ?? '';
            $role = $data['role'] ?? '';
            
            if (empty($id) || empty($name) || empty($email)) {
                http_response_code(400);
                echo json_encode(['error' => 'ID、名前、メールアドレスは必須です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->execute([$name, $email, $role, $id]);
                
                echo json_encode(['success' => true, 'message' => 'ユーザーが更新されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'ユーザー更新に失敗しました: ' . $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? '';
            
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'ユーザーIDが必要です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
                $stmt->execute([$id]);
                
                echo json_encode(['success' => true, 'message' => 'ユーザーが削除されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'ユーザー削除に失敗しました: ' . $e->getMessage()]);
            }
            break;
    }
}

// Projects API
function handleProjectsAPI($pdo) {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $stmt = $pdo->query("
                SELECT p.*, u.name as assigned_name 
                FROM projects p 
                LEFT JOIN users u ON p.assigned_to = u.id 
                ORDER BY p.created_at DESC
            ");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;
            
        case 'POST':
            $title = $_POST['title'] ?? '';
            $description = $_POST['description'] ?? '';
            $status = $_POST['status'] ?? 'active';
            $priority = $_POST['priority'] ?? 'medium';
            $assigned_to = $_POST['assigned_to'] ?? null;
            $due_date = $_POST['due_date'] ?? null;
            $progress = $_POST['progress'] ?? 0;
            
            if (empty($title)) {
                http_response_code(400);
                echo json_encode(['error' => 'プロジェクトタイトルは必須です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("INSERT INTO projects (title, description, status, priority, assigned_to, due_date, progress) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$title, $description, $status, $priority, $assigned_to, $due_date, $progress]);
                
                echo json_encode([
                    'success' => true,
                    'id' => $pdo->lastInsertId(),
                    'message' => 'プロジェクトが追加されました'
                ]);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'プロジェクト追加に失敗しました: ' . $e->getMessage()]);
            }
            break;
            
        case 'PUT':
            parse_str(file_get_contents("php://input"), $data);
            $id = $data['id'] ?? '';
            $title = $data['title'] ?? '';
            $description = $data['description'] ?? '';
            $status = $data['status'] ?? 'active';
            $priority = $data['priority'] ?? 'medium';
            $assigned_to = $data['assigned_to'] ?? null;
            $due_date = $data['due_date'] ?? null;
            $progress = $data['progress'] ?? 0;
            
            if (empty($id) || empty($title)) {
                http_response_code(400);
                echo json_encode(['error' => 'IDとタイトルは必須です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("UPDATE projects SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, due_date = ?, progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->execute([$title, $description, $status, $priority, $assigned_to, $due_date, $progress, $id]);
                
                echo json_encode(['success' => true, 'message' => 'プロジェクトが更新されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'プロジェクト更新に失敗しました: ' . $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? '';
            
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'プロジェクトIDが必要です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("DELETE FROM projects WHERE id = ?");
                $stmt->execute([$id]);
                
                echo json_encode(['success' => true, 'message' => 'プロジェクトが削除されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'プロジェクト削除に失敗しました: ' . $e->getMessage()]);
            }
            break;
    }
}

// Tasks API
function handleTasksAPI($pdo) {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $project_id = $_GET['project_id'] ?? '';
            
            if ($project_id) {
                $stmt = $pdo->prepare("
                    SELECT t.*, u.name as assigned_name, p.title as project_title 
                    FROM tasks t 
                    LEFT JOIN users u ON t.assigned_to = u.id 
                    LEFT JOIN projects p ON t.project_id = p.id 
                    WHERE t.project_id = ? 
                    ORDER BY t.created_at DESC
                ");
                $stmt->execute([$project_id]);
            } else {
                $stmt = $pdo->query("
                    SELECT t.*, u.name as assigned_name, p.title as project_title 
                    FROM tasks t 
                    LEFT JOIN users u ON t.assigned_to = u.id 
                    LEFT JOIN projects p ON t.project_id = p.id 
                    ORDER BY t.created_at DESC
                ");
            }
            
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;
            
        case 'POST':
            $project_id = $_POST['project_id'] ?? '';
            $title = $_POST['title'] ?? '';
            $description = $_POST['description'] ?? '';
            $status = $_POST['status'] ?? 'pending';
            $priority = $_POST['priority'] ?? 'medium';
            $assigned_to = $_POST['assigned_to'] ?? null;
            $due_date = $_POST['due_date'] ?? null;
            
            if (empty($title)) {
                http_response_code(400);
                echo json_encode(['error' => 'タスクタイトルは必須です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$project_id, $title, $description, $status, $priority, $assigned_to, $due_date]);
                
                echo json_encode([
                    'success' => true,
                    'id' => $pdo->lastInsertId(),
                    'message' => 'タスクが追加されました'
                ]);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'タスク追加に失敗しました: ' . $e->getMessage()]);
            }
            break;
            
        case 'PUT':
            parse_str(file_get_contents("php://input"), $data);
            $id = $data['id'] ?? '';
            $title = $data['title'] ?? '';
            $description = $data['description'] ?? '';
            $status = $data['status'] ?? 'pending';
            $priority = $data['priority'] ?? 'medium';
            $assigned_to = $data['assigned_to'] ?? null;
            $due_date = $data['due_date'] ?? null;
            
            if (empty($id) || empty($title)) {
                http_response_code(400);
                echo json_encode(['error' => 'IDとタイトルは必須です']);
                return;
            }
            
            // 完了ステータスの場合、完了日時を設定
            $completed_at = ($status === 'completed') ? 'CURRENT_TIMESTAMP' : 'NULL';
            
            try {
                $stmt = $pdo->prepare("UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, due_date = ?, completed_at = " . $completed_at . " WHERE id = ?");
                $stmt->execute([$title, $description, $status, $priority, $assigned_to, $due_date, $id]);
                
                echo json_encode(['success' => true, 'message' => 'タスクが更新されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'タスク更新に失敗しました: ' . $e->getMessage()]);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? '';
            
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'タスクIDが必要です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
                $stmt->execute([$id]);
                
                echo json_encode(['success' => true, 'message' => 'タスクが削除されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'タスク削除に失敗しました: ' . $e->getMessage()]);
            }
            break;
    }
}

// Files API
function handleFilesAPI($pdo) {
    global $upload_dir;
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (isset($_GET['download']) && isset($_GET['id'])) {
                // ファイルダウンロード
                $id = $_GET['id'];
                $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ?");
                $stmt->execute([$id]);
                $file = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($file) {
                    $file_path = $upload_dir . '/' . $file['stored_name'];
                    if (file_exists($file_path)) {
                        header('Content-Type: application/octet-stream');
                        header('Content-Disposition: attachment; filename="' . $file['original_name'] . '"');
                        header('Content-Length: ' . filesize($file_path));
                        readfile($file_path);
                        exit;
                    }
                }
                
                http_response_code(404);
                echo json_encode(['error' => 'ファイルが見つかりません']);
                return;
            }
            
            // ファイル一覧取得
            $stmt = $pdo->query("
                SELECT f.*, u.name as uploaded_by_name 
                FROM files f 
                LEFT JOIN users u ON f.uploaded_by = u.id 
                ORDER BY f.created_at DESC
            ");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;
            
        case 'POST':
            if (isset($_FILES['file'])) {
                $file = $_FILES['file'];
                $original_name = $file['name'];
                $file_size = $file['size'];
                $file_type = $file['type'];
                $tmp_name = $file['tmp_name'];
                
                // ファイル名重複回避
                $stored_name = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $original_name);
                $upload_path = $upload_dir . '/' . $stored_name;
                
                if (move_uploaded_file($tmp_name, $upload_path)) {
                    try {
                        $stmt = $pdo->prepare("INSERT INTO files (original_name, stored_name, file_type, file_size, upload_path, uploaded_by, description) VALUES (?, ?, ?, ?, ?, ?, ?)");
                        $stmt->execute([
                            $original_name,
                            $stored_name,
                            $file_type,
                            $file_size,
                            $upload_path,
                            $_POST['uploaded_by'] ?? null,
                            $_POST['description'] ?? ''
                        ]);
                        
                        echo json_encode([
                            'success' => true,
                            'id' => $pdo->lastInsertId(),
                            'message' => 'ファイルがアップロードされました'
                        ]);
                    } catch (PDOException $e) {
                        http_response_code(400);
                        echo json_encode(['error' => 'ファイル情報の保存に失敗しました: ' . $e->getMessage()]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'ファイルのアップロードに失敗しました']);
                }
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'ファイルが選択されていません']);
            }
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? '';
            
            if (empty($id)) {
                http_response_code(400);
                echo json_encode(['error' => 'ファイルIDが必要です']);
                return;
            }
            
            try {
                // ファイル情報取得
                $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ?");
                $stmt->execute([$id]);
                $file = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($file) {
                    // 物理ファイル削除
                    $file_path = $upload_dir . '/' . $file['stored_name'];
                    if (file_exists($file_path)) {
                        unlink($file_path);
                    }
                    
                    // データベースから削除
                    $stmt = $pdo->prepare("DELETE FROM files WHERE id = ?");
                    $stmt->execute([$id]);
                }
                
                echo json_encode(['success' => true, 'message' => 'ファイルが削除されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => 'ファイル削除に失敗しました: ' . $e->getMessage()]);
            }
            break;
    }
}

// Settings API
function handleSettingsAPI($pdo) {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $stmt = $pdo->query("SELECT * FROM settings ORDER BY setting_key");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;
            
        case 'POST':
            $setting_key = $_POST['setting_key'] ?? '';
            $setting_value = $_POST['setting_value'] ?? '';
            $setting_type = $_POST['setting_type'] ?? 'text';
            $description = $_POST['description'] ?? '';
            
            if (empty($setting_key)) {
                http_response_code(400);
                echo json_encode(['error' => '設定キーは必須です']);
                return;
            }
            
            try {
                $stmt = $pdo->prepare("INSERT OR REPLACE INTO settings (setting_key, setting_value, setting_type, description, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)");
                $stmt->execute([$setting_key, $setting_value, $setting_type, $description]);
                
                echo json_encode(['success' => true, 'message' => '設定が保存されました']);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(['error' => '設定保存に失敗しました: ' . $e->getMessage()]);
            }
            break;
    }
}

// Dashboard API
function handleDashboardAPI($pdo) {
    try {
        // 統計情報取得
        $stats = [
            'total_users' => $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
            'total_projects' => $pdo->query("SELECT COUNT(*) FROM projects")->fetchColumn(),
            'active_projects' => $pdo->query("SELECT COUNT(*) FROM projects WHERE status = 'active'")->fetchColumn(),
            'total_tasks' => $pdo->query("SELECT COUNT(*) FROM tasks")->fetchColumn(),
            'completed_tasks' => $pdo->query("SELECT COUNT(*) FROM tasks WHERE status = 'completed'")->fetchColumn(),
            'total_files' => $pdo->query("SELECT COUNT(*) FROM files")->fetchColumn(),
            'total_file_size' => $pdo->query("SELECT COALESCE(SUM(file_size), 0) FROM files")->fetchColumn()
        ];
        
        // 最近のアクティビティ
        $recent_projects = $pdo->query("SELECT title, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
        $recent_tasks = $pdo->query("SELECT title, status, created_at FROM tasks ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
        $recent_files = $pdo->query("SELECT original_name, file_size, created_at FROM files ORDER BY created_at DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'stats' => $stats,
            'recent_activities' => [
                'projects' => $recent_projects,
                'tasks' => $recent_tasks,
                'files' => $recent_files
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(400);
        echo json_encode(['error' => 'ダッシュボードデータ取得に失敗しました: ' . $e->getMessage()]);
    }
}

?><!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Web Tool - 多機能管理システム</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            color: #2c3e50;
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .header p {
            text-align: center;
            color: #7f8c8d;
            font-size: 1.1rem;
        }
        
        .nav {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        
        .nav-btn {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
        }
        
        .nav-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(52, 152, 219, 0.4);
        }
        
        .nav-btn.active {
            background: linear-gradient(45deg, #e74c3c, #c0392b);
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
        }
        
        .content {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            min-height: 600px;
        }
        
        .section {
            display: none;
        }
        
        .section.active {
            display: block;
        }
        
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #74b9ff, #0984e3);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(116, 185, 255, 0.3);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-card h3 {
            font-size: 2.2rem;
            margin-bottom: 10px;
        }
        
        .stat-card p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }
        
        .btn {
            background: linear-gradient(45deg, #2ecc71, #27ae60);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            margin-right: 10px;
            margin-bottom: 10px;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
        }
        
        .btn-danger {
            background: linear-gradient(45deg, #e74c3c, #c0392b);
        }
        
        .btn-danger:hover {
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
        }
        
        .btn-warning {
            background: linear-gradient(45deg, #f39c12, #e67e22);
        }
        
        .btn-warning:hover {
            box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .table th,
        .table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .table th {
            background: linear-gradient(45deg, #34495e, #2c3e50);
            color: white;
            font-weight: 600;
        }
        
        .table tr:hover {
            background: #f8f9fa;
        }
        
        .status-badge {
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.9rem;
            font-weight: 600;
            color: white;
        }
        
        .status-active { background: #2ecc71; }
        .status-inactive { background: #95a5a6; }
        .status-pending { background: #f39c12; }
        .status-completed { background: #27ae60; }
        .status-in_progress { background: #3498db; }
        .status-planning { background: #9b59b6; }
        .status-user { background: #3498db; }
        .status-manager { background: #e67e22; }
        .status-admin { background: #e74c3c; }
        
        .priority-high { background: #e74c3c; }
        .priority-medium { background: #f39c12; }
        .priority-low { background: #2ecc71; }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #ecf0f1;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(45deg, #2ecc71, #27ae60);
            transition: width 0.3s ease;
        }
        
        .file-upload {
            border: 2px dashed #3498db;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            background: #f8f9fa;
            transition: all 0.3s ease;
            margin-bottom: 20px;
        }
        
        .file-upload:hover,
        .file-upload.dragover {
            background: #e3f2fd;
            border-color: #2196f3;
        }
        
        .file-upload input[type="file"] {
            display: none;
        }
        
        .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-bottom: 10px;
            background: white;
        }
        
        .file-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .file-icon {
            width: 40px;
            height: 40px;
            background: #3498db;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 15px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .modal-header h3 {
            color: #2c3e50;
        }
        
        .close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #7f8c8d;
        }
        
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
            font-weight: 600;
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2000;
            min-width: 300px;
            text-align: center;
        }
        
        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .recent-activities {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .activity-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .activity-card h4 {
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        
        .activity-item {
            padding: 10px 0;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-item h5 {
            color: #34495e;
            margin-bottom: 5px;
        }
        
        .activity-item p {
            color: #7f8c8d;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .nav {
                flex-direction: column;
                align-items: center;
            }
            
            .nav-btn {
                width: 200px;
            }
            
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            
            .recent-activities {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .modal-content {
                width: 95%;
                margin: 20px;
            }
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* 左マージン削除CSS */
.content,
.section,
.dashboard-grid,
.stat-card,
.recent-activities,
.activity-card,
.table,
.loading,
.file-upload,
#users-content,
#projects-content,
#tasks-content,
#files-content,
#settings-content {
    margin-left: 0 !important;
    padding-left: 10px !important;
}

/* 全体のマージンリセット */
* {
    box-sizing: border-box;
}

body, html {
    margin: 0;
    padding: 0;
}

.content {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 20px 10px;
}

/* フレックスボックス調整 */
div[style*="display: flex"] {
    margin-left: 0 !important;
    padding-left: 0 !important;
}

/* テーブル調整 */
.table {
    width: 100%;
    margin: 0;
    border-collapse: collapse;
}

/* ボタン調整 */
.btn {
    margin-left: 0;
}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Complete Web Tool</h1>
            <p>包括的な多機能管理システム - ユーザー・プロジェクト・タスク・ファイル管理</p>
        </div>
        
        <div class="nav">
            <button class="nav-btn active" onclick="showSection('dashboard')">📊 ダッシュボード</button>
            <button class="nav-btn" onclick="showSection('users')">👥 ユーザー管理</button>
            <button class="nav-btn" onclick="showSection('projects')">📋 プロジェクト管理</button>
            <button class="nav-btn" onclick="showSection('tasks')">✅ タスク管理</button>
            <button class="nav-btn" onclick="showSection('files')">📁 ファイル管理</button>
            <button class="nav-btn" onclick="showSection('settings')">⚙️ 設定</button>
        </div>
        
        <div class="content">
            <!-- ダッシュボード -->
            <div id="dashboard" class="section active">
                <h2>📊 ダッシュボード</h2>
                <div class="dashboard-grid">
                    <div class="stat-card">
                        <h3 id="stat-users">-</h3>
                        <p>総ユーザー数</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="stat-projects">-</h3>
                        <p>総プロジェクト数</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="stat-active-projects">-</h3>
                        <p>アクティブプロジェクト</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="stat-tasks">-</h3>
                        <p>総タスク数</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="stat-completed-tasks">-</h3>
                        <p>完了タスク数</p>
                    </div>
                    <div class="stat-card">
                        <h3 id="stat-files">-</h3>
                        <p>総ファイル数</p>
                    </div>
                </div>
                
                <div class="recent-activities">
                    <div class="activity-card">
                        <h4>📋 最近のプロジェクト</h4>
                        <div id="recent-projects"></div>
                    </div>
                    <div class="activity-card">
                        <h4>✅ 最近のタスク</h4>
                        <div id="recent-tasks"></div>
                    </div>
                    <div class="activity-card">
                        <h4>📁 最近のファイル</h4>
                        <div id="recent-files"></div>
                    </div>
                </div>
            </div>
            
            <!-- ユーザー管理 -->
            <div id="users" class="section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>👥 ユーザー管理</h2>
                    <button class="btn" onclick="openModal('userModal')">➕ ユーザー追加</button>
                </div>
                
                <div class="loading" id="users-loading">
                    <div class="spinner"></div>
                    <p>読み込み中...</p>
                </div>
                
                <div id="users-content">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>名前</th>
                                <th>メールアドレス</th>
                                <th>役割</th>
                                <th>登録日</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- プロジェクト管理 -->
            <div id="projects" class="section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>📋 プロジェクト管理</h2>
                    <button class="btn" onclick="openModal('projectModal')">➕ プロジェクト追加</button>
                </div>
                
                <div class="loading" id="projects-loading">
                    <div class="spinner"></div>
                    <p>読み込み中...</p>
                </div>
                
                <div id="projects-content">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>タイトル</th>
                                <th>ステータス</th>
                                <th>優先度</th>
                                <th>担当者</th>
                                <th>期限</th>
                                <th>進捗</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="projects-table-body">
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- タスク管理 -->
            <div id="tasks" class="section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>✅ タスク管理</h2>
                    <button class="btn" onclick="openModal('taskModal')">➕ タスク追加</button>
                </div>
                
                <div class="loading" id="tasks-loading">
                    <div class="spinner"></div>
                    <p>読み込み中...</p>
                </div>
                
                <div id="tasks-content">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>タイトル</th>
                                <th>プロジェクト</th>
                                <th>ステータス</th>
                                <th>優先度</th>
                                <th>担当者</th>
                                <th>期限</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="tasks-table-body">
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- ファイル管理 -->
            <div id="files" class="section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>📁 ファイル管理</h2>
                    <button class="btn" onclick="openModal('fileModal')">📤 ファイルアップロード</button>
                </div>
                
                <div class="file-upload" id="file-upload-area">
                    <input type="file" id="file-input" multiple>
                    <p>📁 ファイルをドラッグ&ドロップまたはクリックしてアップロード</p>
                    <button class="btn" onclick="document.getElementById('file-input').click()">ファイルを選択</button>
                </div>
                
                <div class="loading" id="files-loading">
                    <div class="spinner"></div>
                    <p>読み込み中...</p>
                </div>
                
                <div id="files-content">
                    <div id="files-list"></div>
                </div>
            </div>
            
            <!-- 設定 -->
            <div id="settings" class="section">
                <h2>⚙️ システム設定</h2>
                
                <div class="loading" id="settings-loading">
                    <div class="spinner"></div>
                    <p>読み込み中...</p>
                </div>
                
                <div id="settings-content">
                    <form id="settings-form">
                        <div id="settings-form-content"></div>
                        <button type="submit" class="btn">設定を保存</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    
    <!-- モーダル -->
    <!-- ユーザーモーダル -->
    <div id="userModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="user-modal-title">ユーザー追加</h3>
                <button class="close" onclick="closeModal('userModal')">&times;</button>
            </div>
            <form id="user-form">
                <input type="hidden" id="user-id" name="id">
                <div class="form-group">
                    <label for="user-name">名前</label>
                    <input type="text" id="user-name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="user-email">メールアドレス</label>
                    <input type="email" id="user-email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="user-role">役割</label>
                    <select id="user-role" name="role">
                        <option value="user">ユーザー</option>
                        <option value="manager">マネージャー</option>
                        <option value="admin">管理者</option>
                    </select>
                </div>
                <button type="submit" class="btn">保存</button>
                <button type="button" class="btn btn-danger" onclick="closeModal('userModal')">キャンセル</button>
            </form>
        </div>
    </div>
    
    <!-- プロジェクトモーダル -->
    <div id="projectModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="project-modal-title">プロジェクト追加</h3>
                <button class="close" onclick="closeModal('projectModal')">&times;</button>
            </div>
            <form id="project-form">
                <input type="hidden" id="project-id" name="id">
                <div class="form-group">
                    <label for="project-title">タイトル</label>
                    <input type="text" id="project-title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="project-description">説明</label>
                    <textarea id="project-description" name="description" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="project-status">ステータス</label>
                    <select id="project-status" name="status">
                        <option value="planning">計画中</option>
                        <option value="active">進行中</option>
                        <option value="completed">完了</option>
                        <option value="on_hold">保留</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="project-priority">優先度</label>
                    <select id="project-priority" name="priority">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="project-assigned-to">担当者</label>
                    <select id="project-assigned-to" name="assigned_to">
                        <option value="">未割り当て</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="project-due-date">期限</label>
                    <input type="date" id="project-due-date" name="due_date">
                </div>
                <div class="form-group">
                    <label for="project-progress">進捗 (%)</label>
                    <input type="number" id="project-progress" name="progress" min="0" max="100" value="0">
                </div>
                <button type="submit" class="btn">保存</button>
                <button type="button" class="btn btn-danger" onclick="closeModal('projectModal')">キャンセル</button>
            </form>
        </div>
    </div>
    
    <!-- タスクモーダル -->
    <div id="taskModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="task-modal-title">タスク追加</h3>
                <button class="close" onclick="closeModal('taskModal')">&times;</button>
            </div>
            <form id="task-form">
                <input type="hidden" id="task-id" name="id">
                <div class="form-group">
                    <label for="task-project-id">プロジェクト</label>
                    <select id="task-project-id" name="project_id">
                        <option value="">プロジェクトを選択</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="task-title">タイトル</label>
                    <input type="text" id="task-title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="task-description">説明</label>
                    <textarea id="task-description" name="description" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="task-status">ステータス</label>
                    <select id="task-status" name="status">
                        <option value="pending">未着手</option>
                        <option value="in_progress">進行中</option>
                        <option value="completed">完了</option>
                        <option value="on_hold">保留</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="task-priority">優先度</label>
                    <select id="task-priority" name="priority">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="task-assigned-to">担当者</label>
                    <select id="task-assigned-to" name="assigned_to">
                        <option value="">未割り当て</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="task-due-date">期限</label>
                    <input type="date" id="task-due-date" name="due_date">
                </div>
                <button type="submit" class="btn">保存</button>
                <button type="button" class="btn btn-danger" onclick="closeModal('taskModal')">キャンセル</button>
            </form>
        </div>
    </div>
    
    <!-- ファイルモーダル -->
    <div id="fileModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>ファイルアップロード</h3>
                <button class="close" onclick="closeModal('fileModal')">&times;</button>
            </div>
            <form id="file-form" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="file-upload">ファイル</label>
                    <input type="file" id="file-upload" name="file" required multiple>
                </div>
                <div class="form-group">
                    <label for="file-description">説明</label>
                    <textarea id="file-description" name="description" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label for="file-uploaded-by">アップロード者</label>
                    <select id="file-uploaded-by" name="uploaded_by">
                        <option value="">選択してください</option>
                    </select>
                </div>
                <button type="submit" class="btn">アップロード</button>
                <button type="button" class="btn btn-danger" onclick="closeModal('fileModal')">キャンセル</button>
            </form>
        </div>
    </div>
    
    <script>
        // CSRFトークン
        const csrfToken = '<?php echo $_SESSION['csrf_token']; ?>';
        
        // グローバル変数
        let currentSection = 'dashboard';
        let users = [];
        let projects = [];
        let tasks = [];
        let files = [];
        let settings = [];
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboard();
            setupFileUpload();
            setupFormHandlers();
        });
        
        // セクション表示切り替え
        function showSection(sectionName) {
            // 全セクションを非表示
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            // ナビゲーションボタンの状態更新
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 選択されたセクションを表示
            document.getElementById(sectionName).classList.add('active');
            event.target.classList.add('active');
            
            currentSection = sectionName;
            
            // セクション別データ読み込み
            switch(sectionName) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'users':
                    loadUsers();
                    break;
                case 'projects':
                    loadProjects();
                    break;
                case 'tasks':
                    loadTasks();
                    break;
                case 'files':
                    loadFiles();
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        }
        
        // ダッシュボードデータ読み込み
        async function loadDashboard() {
            try {
                const response = await fetch('?api=dashboard');
                const data = await response.json();
                
                if (data.error) {
                    showAlert('error', data.error);
                    return;
                }
                
                // 統計情報更新
                document.getElementById('stat-users').textContent = data.stats.total_users;
                document.getElementById('stat-projects').textContent = data.stats.total_projects;
                document.getElementById('stat-active-projects').textContent = data.stats.active_projects;
                document.getElementById('stat-tasks').textContent = data.stats.total_tasks;
                document.getElementById('stat-completed-tasks').textContent = data.stats.completed_tasks;
                document.getElementById('stat-files').textContent = data.stats.total_files;
                
                // 最近のアクティビティ更新
                updateRecentActivities(data.recent_activities);
                
            } catch (error) {
                showAlert('error', 'ダッシュボードの読み込みに失敗しました: ' + error.message);
            }
        }
        
        // 最近のアクティビティ更新
        function updateRecentActivities(activities) {
            // プロジェクト
            const projectsContainer = document.getElementById('recent-projects');
            projectsContainer.innerHTML = '';
            activities.projects.forEach(project => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <h5>${project.title}</h5>
                    <p><span class="status-badge status-${project.status}">${getStatusText(project.status)}</span></p>
                    <p>${formatDate(project.created_at)}</p>
                `;
                projectsContainer.appendChild(item);
            });
            
            // タスク
            const tasksContainer = document.getElementById('recent-tasks');
            tasksContainer.innerHTML = '';
            activities.tasks.forEach(task => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <h5>${task.title}</h5>
                    <p><span class="status-badge status-${task.status}">${getStatusText(task.status)}</span></p>
                    <p>${formatDate(task.created_at)}</p>
                `;
                tasksContainer.appendChild(item);
            });
            
            // ファイル
            const filesContainer = document.getElementById('recent-files');
            filesContainer.innerHTML = '';
            activities.files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <h5>${file.original_name}</h5>
                    <p>${formatFileSize(file.file_size)}</p>
                    <p>${formatDate(file.created_at)}</p>
                `;
                filesContainer.appendChild(item);
            });
        }
        
        // ユーザー読み込み
        async function loadUsers() {
            try {
                showLoading('users');
                const response = await fetch('?api=users');
                users = await response.json();
                
                if (users.error) {
                    showAlert('error', users.error);
                    return;
                }
                
                renderUsersTable();
                populateUserSelects();
                
            } catch (error) {
                showAlert('error', 'ユーザーの読み込みに失敗しました: ' + error.message);
            } finally {
                hideLoading('users');
            }
        }
        
        // ユーザーテーブル描画
        function renderUsersTable() {
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';
            
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="status-badge status-${user.role}">${getRoleText(user.role)}</span></td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <button class="btn btn-warning" onclick="editUser(${user.id})">編集</button>
                        <button class="btn btn-danger" onclick="deleteUser(${user.id})">削除</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // プロジェクト読み込み
        async function loadProjects() {
            try {
                showLoading('projects');
                const response = await fetch('?api=projects');
                projects = await response.json();
                
                if (projects.error) {
                    showAlert('error', projects.error);
                    return;
                }
                
                renderProjectsTable();
                populateProjectSelects();
                
            } catch (error) {
                showAlert('error', 'プロジェクトの読み込みに失敗しました: ' + error.message);
            } finally {
                hideLoading('projects');
            }
        }
        
        // プロジェクトテーブル描画
        function renderProjectsTable() {
            const tbody = document.getElementById('projects-table-body');
            tbody.innerHTML = '';
            
            projects.forEach(project => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${project.id}</td>
                    <td>${project.title}</td>
                    <td><span class="status-badge status-${project.status}">${getStatusText(project.status)}</span></td>
                    <td><span class="status-badge priority-${project.priority}">${getPriorityText(project.priority)}</span></td>
                    <td>${project.assigned_name || '未割り当て'}</td>
                    <td>${project.due_date || '-'}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${project.progress}%"></div>
                        </div>
                        ${project.progress}%
                    </td>
                    <td>
                        <button class="btn btn-warning" onclick="editProject(${project.id})">編集</button>
                        <button class="btn btn-danger" onclick="deleteProject(${project.id})">削除</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // タスク読み込み
        async function loadTasks() {
            try {
                showLoading('tasks');
                const response = await fetch('?api=tasks');
                tasks = await response.json();
                
                if (tasks.error) {
                    showAlert('error', tasks.error);
                    return;
                }
                
                renderTasksTable();
                
            } catch (error) {
                showAlert('error', 'タスクの読み込みに失敗しました: ' + error.message);
            } finally {
                hideLoading('tasks');
            }
        }
        
        // タスクテーブル描画
        function renderTasksTable() {
            const tbody = document.getElementById('tasks-table-body');
            tbody.innerHTML = '';
            
            tasks.forEach(task => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${task.id}</td>
                    <td>${task.title}</td>
                    <td>${task.project_title || '-'}</td>
                    <td><span class="status-badge status-${task.status}">${getStatusText(task.status)}</span></td>
                    <td><span class="status-badge priority-${task.priority}">${getPriorityText(task.priority)}</span></td>
                    <td>${task.assigned_name || '未割り当て'}</td>
                    <td>${task.due_date || '-'}</td>
                    <td>
                        <button class="btn btn-warning" onclick="editTask(${task.id})">編集</button>
                        <button class="btn btn-danger" onclick="deleteTask(${task.id})">削除</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // ファイル読み込み
        async function loadFiles() {
            try {
                showLoading('files');
                const response = await fetch('?api=files');
                files = await response.json();
                
                if (files.error) {
                    showAlert('error', files.error);
                    return;
                }
                
                renderFilesList();
                
            } catch (error) {
                showAlert('error', 'ファイルの読み込みに失敗しました: ' + error.message);
            } finally {
                hideLoading('files');
            }
        }
        
        // ファイル一覧描画
        function renderFilesList() {
            const container = document.getElementById('files-list');
            container.innerHTML = '';
            
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <div class="file-info">
                        <div class="file-icon">${getFileIcon(file.file_type)}</div>
                        <div>
                            <h4>${file.original_name}</h4>
                            <p>${formatFileSize(file.file_size)} • ${formatDate(file.created_at)}</p>
                            <p>アップロード者: ${file.uploaded_by_name || '不明'}</p>
                        </div>
                    </div>
                    <div>
                        <button class="btn" onclick="downloadFile(${file.id})">📥 ダウンロード</button>
                        <button class="btn btn-danger" onclick="deleteFile(${file.id})">🗑️ 削除</button>
                    </div>
                `;
                container.appendChild(item);
            });
        }
        
        // 設定読み込み
        async function loadSettings() {
            try {
                showLoading('settings');
                const response = await fetch('?api=settings');
                settings = await response.json();
                
                if (settings.error) {
                    showAlert('error', settings.error);
                    return;
                }
                
                renderSettingsForm();
                
            } catch (error) {
                showAlert('error', '設定の読み込みに失敗しました: ' + error.message);
            } finally {
                hideLoading('settings');
            }
        }
        
        // 設定フォーム描画
        function renderSettingsForm() {
            const container = document.getElementById('settings-form-content');
            container.innerHTML = '';
            
            settings.forEach(setting => {
                const group = document.createElement('div');
                group.className = 'form-group';
                
                let input = '';
                if (setting.setting_type === 'number') {
                    input = `<input type="number" id="setting-${setting.setting_key}" name="${setting.setting_key}" value="${setting.setting_value}" required>`;
                } else if (setting.setting_type === 'textarea') {
                    input = `<textarea id="setting-${setting.setting_key}" name="${setting.setting_key}" rows="3" required>${setting.setting_value}</textarea>`;
                } else {
                    input = `<input type="text" id="setting-${setting.setting_key}" name="${setting.setting_key}" value="${setting.setting_value}" required>`;
                }
                
                group.innerHTML = `
                    <label for="setting-${setting.setting_key}">${setting.description}</label>
                    ${input}
                    <small style="color: #7f8c8d;">キー: ${setting.setting_key}</small>
                `;
                container.appendChild(group);
            });
        }
        
        // フォームハンドラー設定
        function setupFormHandlers() {
            // ユーザーフォーム
            document.getElementById('user-form').addEventListener('submit', async function(e) {
                e.preventDefault();
                await saveUser();
            });
            
            // プロジェクトフォーム
            document.getElementById('project-form').addEventListener('submit', async function(e) {
                e.preventDefault();
                await saveProject();
            });
            
            // タスクフォーム
            document.getElementById('task-form').addEventListener('submit', async function(e) {
                e.preventDefault();
                await saveTask();
            });
            
            // ファイルフォーム
            document.getElementById('file-form').addEventListener('submit', async function(e) {
                e.preventDefault();
                await uploadFile();
            });
            
            // 設定フォーム
            document.getElementById('settings-form').addEventListener('submit', async function(e) {
                e.preventDefault();
                await saveSettings();
            });
        }
        
        // ファイルアップロード設定
        function setupFileUpload() {
            const uploadArea = document.getElementById('file-upload-area');
            const fileInput = document.getElementById('file-input');
            
            // ドラッグ&ドロップ
            uploadArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', function(e) {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', function(e) {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    uploadFiles(files);
                }
            });
            
            // ファイル選択
            fileInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    uploadFiles(e.target.files);
                }
            });
        }
        
        // ファイルアップロード実行
        async function uploadFiles(fileList) {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('csrf_token', csrfToken);
                formData.append('uploaded_by', 1); // デフォルトユーザー
                
                try {
                    const response = await fetch('?api=files', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        showAlert('success', `${file.name} のアップロードが完了しました`);
                    } else {
                        showAlert('error', `${file.name} のアップロードに失敗: ${result.error}`);
                    }
                } catch (error) {
                    showAlert('error', `${file.name} のアップロードに失敗: ${error.message}`);
                }
            }
            
            // ファイル一覧更新
            if (currentSection === 'files') {
                loadFiles();
            }
        }
        
        // ユーザー保存
        async function saveUser() {
            const form = document.getElementById('user-form');
            const formData = new FormData(form);
            formData.append('csrf_token', csrfToken);
            
            const id = formData.get('id');
            const method = id ? 'PUT' : 'POST';
            
            try {
                let response;
                if (method === 'PUT') {
                    // PUT リクエストの場合
                    const params = new URLSearchParams(formData);
                    response = await fetch('?api=users', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params
                    });
                } else {
                    response = await fetch('?api=users', {
                        method: 'POST',
                        body: formData
                    });
                }
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    closeModal('userModal');
                    loadUsers();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'ユーザー保存に失敗しました: ' + error.message);
            }
        }
        
        // プロジェクト保存
        async function saveProject() {
            const form = document.getElementById('project-form');
            const formData = new FormData(form);
            formData.append('csrf_token', csrfToken);
            
            const id = formData.get('id');
            const method = id ? 'PUT' : 'POST';
            
            try {
                let response;
                if (method === 'PUT') {
                    const params = new URLSearchParams(formData);
                    response = await fetch('?api=projects', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params
                    });
                } else {
                    response = await fetch('?api=projects', {
                        method: 'POST',
                        body: formData
                    });
                }
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    closeModal('projectModal');
                    loadProjects();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'プロジェクト保存に失敗しました: ' + error.message);
            }
        }
        
        // タスク保存
        async function saveTask() {
            const form = document.getElementById('task-form');
            const formData = new FormData(form);
            formData.append('csrf_token', csrfToken);
            
            const id = formData.get('id');
            const method = id ? 'PUT' : 'POST';
            
            try {
                let response;
                if (method === 'PUT') {
                    const params = new URLSearchParams(formData);
                    response = await fetch('?api=tasks', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: params
                    });
                } else {
                    response = await fetch('?api=tasks', {
                        method: 'POST',
                        body: formData
                    });
                }
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    closeModal('taskModal');
                    loadTasks();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'タスク保存に失敗しました: ' + error.message);
            }
        }
        
        // 設定保存
        async function saveSettings() {
            const form = document.getElementById('settings-form');
            const formData = new FormData(form);
            formData.append('csrf_token', csrfToken);
            
            try {
                // 各設定を個別に保存
                for (let setting of settings) {
                    const value = formData.get(setting.setting_key);
                    if (value !== null) {
                        const settingFormData = new FormData();
                        settingFormData.append('setting_key', setting.setting_key);
                        settingFormData.append('setting_value', value);
                        settingFormData.append('setting_type', setting.setting_type);
                        settingFormData.append('description', setting.description);
                        settingFormData.append('csrf_token', csrfToken);
                        
                        await fetch('?api=settings', {
                            method: 'POST',
                            body: settingFormData
                        });
                    }
                }
                
                showAlert('success', '設定が保存されました');
                
            } catch (error) {
                showAlert('error', '設定保存に失敗しました: ' + error.message);
            }
        }
        
        // ユーザー編集
        function editUser(id) {
            const user = users.find(u => u.id == id);
            if (user) {
                document.getElementById('user-id').value = user.id;
                document.getElementById('user-name').value = user.name;
                document.getElementById('user-email').value = user.email;
                document.getElementById('user-role').value = user.role;
                document.getElementById('user-modal-title').textContent = 'ユーザー編集';
                openModal('userModal');
            }
        }
        
        // ユーザー削除
        async function deleteUser(id) {
            if (!confirm('このユーザーを削除しますか？')) return;
            
            try {
                const response = await fetch(`?api=users&id=${id}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    loadUsers();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'ユーザー削除に失敗しました: ' + error.message);
            }
        }
        
        // プロジェクト編集
        function editProject(id) {
            const project = projects.find(p => p.id == id);
            if (project) {
                document.getElementById('project-id').value = project.id;
                document.getElementById('project-title').value = project.title;
                document.getElementById('project-description').value = project.description || '';
                document.getElementById('project-status').value = project.status;
                document.getElementById('project-priority').value = project.priority;
                document.getElementById('project-assigned-to').value = project.assigned_to || '';
                document.getElementById('project-due-date').value = project.due_date || '';
                document.getElementById('project-progress').value = project.progress || 0;
                document.getElementById('project-modal-title').textContent = 'プロジェクト編集';
                openModal('projectModal');
            }
        }
        
        // プロジェクト削除
        async function deleteProject(id) {
            if (!confirm('このプロジェクトを削除しますか？')) return;
            
            try {
                const response = await fetch(`?api=projects&id=${id}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    loadProjects();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'プロジェクト削除に失敗しました: ' + error.message);
            }
        }
        
        // タスク編集
        function editTask(id) {
            const task = tasks.find(t => t.id == id);
            if (task) {
                document.getElementById('task-id').value = task.id;
                document.getElementById('task-project-id').value = task.project_id || '';
                document.getElementById('task-title').value = task.title;
                document.getElementById('task-description').value = task.description || '';
                document.getElementById('task-status').value = task.status;
                document.getElementById('task-priority').value = task.priority;
                document.getElementById('task-assigned-to').value = task.assigned_to || '';
                document.getElementById('task-due-date').value = task.due_date || '';
                document.getElementById('task-modal-title').textContent = 'タスク編集';
                openModal('taskModal');
            }
        }
        
        // タスク削除
        async function deleteTask(id) {
            if (!confirm('このタスクを削除しますか？')) return;
            
            try {
                const response = await fetch(`?api=tasks&id=${id}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    loadTasks();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'タスク削除に失敗しました: ' + error.message);
            }
        }
        
        // ファイルダウンロード
        function downloadFile(id) {
            window.open(`?api=files&download=1&id=${id}`, '_blank');
        }
        
        // ファイル削除
        async function deleteFile(id) {
            if (!confirm('このファイルを削除しますか？')) return;
            
            try {
                const response = await fetch(`?api=files&id=${id}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    loadFiles();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'ファイル削除に失敗しました: ' + error.message);
            }
        }
        
        // ファイルアップロード（モーダル）
        async function uploadFile() {
            const form = document.getElementById('file-form');
            const formData = new FormData(form);
            formData.append('csrf_token', csrfToken);
            
            try {
                const response = await fetch('?api=files', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showAlert('success', result.message);
                    closeModal('fileModal');
                    loadFiles();
                } else {
                    showAlert('error', result.error);
                }
            } catch (error) {
                showAlert('error', 'ファイルアップロードに失敗しました: ' + error.message);
            }
        }
        
        // モーダル開閉
        function openModal(modalId) {
            document.getElementById(modalId).style.display = 'block';
            
            // ユーザー選択肢更新
            if (modalId === 'projectModal' || modalId === 'taskModal' || modalId === 'fileModal') {
                populateUserSelects();
            }
            
            // プロジェクト選択肢更新
            if (modalId === 'taskModal') {
                populateProjectSelects();
            }
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
            
            // フォームリセット
            const form = document.querySelector(`#${modalId} form`);
            if (form) {
                form.reset();
                
                // 隠しフィールドもクリア
                const hiddenFields = form.querySelectorAll('input[type="hidden"]');
                hiddenFields.forEach(field => field.value = '');
                
                // モーダルタイトルリセット
                const titleElement = form.closest('.modal').querySelector('.modal-header h3');
                if (titleElement) {
                    if (modalId === 'userModal') titleElement.textContent = 'ユーザー追加';
                    if (modalId === 'projectModal') titleElement.textContent = 'プロジェクト追加';
                    if (modalId === 'taskModal') titleElement.textContent = 'タスク追加';
                }
            }
        }
        
        // ユーザー選択肢更新
        function populateUserSelects() {
            const selects = ['project-assigned-to', 'task-assigned-to', 'file-uploaded-by'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select && users.length > 0) {
                    // 既存のオプションをクリア（最初のオプションは残す）
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    
                    // ユーザーオプション追加
                    users.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.name;
                        select.appendChild(option);
                    });
                }
            });
        }
        
        // プロジェクト選択肢更新
        function populateProjectSelects() {
            const select = document.getElementById('task-project-id');
            if (select && projects.length > 0) {
                // 既存のオプションをクリア（最初のオプションは残す）
                while (select.children.length > 1) {
                    select.removeChild(select.lastChild);
                }
                
                // プロジェクトオプション追加
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.title;
                    select.appendChild(option);
                });
            }
        }
        
        // ローディング表示/非表示
        function showLoading(section) {
            const loading = document.getElementById(`${section}-loading`);
            const content = document.getElementById(`${section}-content`);
            if (loading) loading.style.display = 'block';
            if (content) content.style.display = 'none';
        }
        
        function hideLoading(section) {
            const loading = document.getElementById(`${section}-loading`);
            const content = document.getElementById(`${section}-content`);
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        }
        
        // アラート表示
        function showAlert(type, message) {
            // 既存のアラートを削除
            const existingAlerts = document.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());
            
            // 新しいアラート作成
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.textContent = message;
            
            // アラートを画面上部に挿入
            document.body.insertBefore(alert, document.body.firstChild);
            
            // 5秒後に自動削除
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
        
        // ユーティリティ関数
        function formatDate(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'});
        }
        
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        function getStatusText(status) {
            const statusMap = {
                'active': '進行中',
                'inactive': '非活性',
                'pending': '未着手',
                'completed': '完了',
                'in_progress': '進行中',
                'planning': '計画中',
                'on_hold': '保留'
            };
            return statusMap[status] || status;
        }
        
        function getPriorityText(priority) {
            const priorityMap = {
                'low': '低',
                'medium': '中',
                'high': '高'
            };
            return priorityMap[priority] || priority;
        }
        
        function getRoleText(role) {
            const roleMap = {
                'user': 'ユーザー',
                'manager': 'マネージャー',
                'admin': '管理者'
            };
            return roleMap[role] || role;
        }
        
        function getFileIcon(fileType) {
            if (fileType && fileType.includes('image')) return '🖼️';
            if (fileType && fileType.includes('video')) return '🎥';
            if (fileType && fileType.includes('audio')) return '🎵';
            if (fileType && fileType.includes('pdf')) return '📄';
            if (fileType && fileType.includes('word')) return '📝';
            if (fileType && fileType.includes('excel')) return '📊';
            if (fileType && fileType.includes('zip')) return '🗜️';
            return '📄';
        }
        
        // モーダル外クリックで閉じる
        window.addEventListener('click', function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });

        // JavaScript実行でHTML内の左マージンを即座に削除
function removeAllLeftMargins() {
    // 全要素のstyle属性から margin-left を削除
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
        const style = element.getAttribute('style');
        if (style && style.includes('margin-left')) {
            const newStyle = style.replace(/margin-left\s*:\s*[^;]+;?/gi, '');
            element.setAttribute('style', newStyle);
        }
        
        // CSSプロパティ直接削除
        element.style.marginLeft = '0';
        element.style.paddingLeft = '10px';
    });
    
    console.log('✅ 全ての左マージンを削除しました');
    return '左マージン削除完了';
}

// 即座実行
removeAllLeftMargins();
    </script>
</body>
</html>