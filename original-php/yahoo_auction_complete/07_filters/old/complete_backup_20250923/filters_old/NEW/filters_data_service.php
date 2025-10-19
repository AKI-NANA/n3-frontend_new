<?php
/**
 * NAGANO-3 フィルターシステム データサービス
 * 
 * 機能: PostgreSQL操作・クエリ実行・データ変換・キャッシュ統合
 * 依存: PostgreSQL PDO接続、Redis
 * 作成: 2024年版 NAGANO-3準拠
 */
class FiltersDataService {
    
    private $pdo;
    private $cache = [];
    private $cache_ttl = 300; // 5分キャッシュ
    
    public function __construct() {
        $this->initializeDatabase();
    }
    
    /**
     * PostgreSQL接続初期化
     */
    private function initializeDatabase() {
        try {
            // グローバルPDO接続を使用（既存システム準拠）
            global $pdo;
            
            if (isset($pdo) && $pdo instanceof PDO) {
                $this->pdo = $pdo;
            } else {
                // フォールバック: 直接接続
                $this->pdo = $this->createDatabaseConnection();
            }
            
            // PostgreSQL固有設定
            $this->pdo->exec("SET search_path TO public");
            $this->pdo->exec("SET client_encoding TO 'UTF8'");
            $this->pdo->exec("SET timezone = 'Asia/Tokyo'");
            
        } catch (Exception $e) {
            error_log("NAGANO3_FILTERS Database initialization error: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました: " . $e->getMessage());
        }
    }
    
    /**
     * PostgreSQL接続作成（フォールバック用）
     */
    private function createDatabaseConnection() {
        // 環境変数または定数から接続情報取得
        $host = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: 'localhost');
        $port = defined('DB_PORT') ? DB_PORT : (getenv('DB_PORT') ?: '5432');
        $dbname = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: 'nagano3');
        $username = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'postgres');
        $password = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: '');
        
        $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";
        
        return new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
    }
    
    // ===========================================
    // NGワード関連メソッド
    // ===========================================
    
    /**
     * アクティブNGワード取得
     * 
     * @return array NGワードリスト
     */
    public function getActiveNGWords() {
        $cache_key = 'active_ng_words';
        
        if ($this->hasValidCache($cache_key)) {
            return $this->cache[$cache_key]['data'];
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, uuid, word, level, category, auto_generated, 
                       created_at, created_by, updated_at
                FROM filter_ng_words 
                WHERE is_active = TRUE AND is_deleted = FALSE
                ORDER BY 
                    CASE level 
                        WHEN 'complete_ng' THEN 1 
                        WHEN 'conditional_ng' THEN 2 
                        WHEN 'requires_review' THEN 3 
                    END,
                    LENGTH(word) DESC,
                    word ASC
            ");
            $stmt->execute();
            $result = $stmt->fetchAll();
            
            $this->setCache($cache_key, $result);
            return $result;
            
        } catch (Exception $e) {
            error_log("NGワード取得エラー: " . $e->getMessage());
            throw new Exception("NGワードデータの取得に失敗しました");
        }
    }
    
    /**
     * NGワード追加
     * 
     * @param array $ng_word_data NGワードデータ
     * @return bool 成功/失敗
     */
    public function insertNGWord($ng_word_data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO filter_ng_words 
                (word, level, category, auto_generated, created_by, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (word, is_active) 
                DO UPDATE SET 
                    level = EXCLUDED.level,
                    category = EXCLUDED.category,
                    updated_at = NOW(),
                    version = filter_ng_words.version + 1
            ");
            
            $metadata = json_encode($ng_word_data['metadata'] ?? []);
            
            $result = $stmt->execute([
                $ng_word_data['word'],
                $ng_word_data['level'] ?? 'complete_ng',
                $ng_word_data['category'] ?? null,
                $ng_word_data['auto_generated'] ?? false,
                $ng_word_data['created_by'] ?? 'system',
                $metadata
            ]);
            
            // キャッシュクリア
            $this->clearCache('active_ng_words');
            
            return $result;
            
        } catch (Exception $e) {
            error_log("NGワード追加エラー: " . $e->getMessage());
            throw new Exception("NGワードの追加に失敗しました: " . $e->getMessage());
        }
    }
    
    /**
     * NGワード更新
     * 
     * @param int $id NGワードID
     * @param array $update_data 更新データ
     * @return bool 成功/失敗
     */
    public function updateNGWord($id, $update_data) {
        try {
            $set_clauses = [];
            $params = [];
            
            $allowed_fields = ['word', 'level', 'category', 'is_active', 'metadata'];
            
            foreach ($update_data as $field => $value) {
                if (in_array($field, $allowed_fields)) {
                    if ($field === 'metadata') {
                        $set_clauses[] = "{$field} = ?";
                        $params[] = json_encode($value);
                    } else {
                        $set_clauses[] = "{$field} = ?";
                        $params[] = $value;
                    }
                }
            }
            
            if (empty($set_clauses)) {
                throw new Exception("更新対象フィールドが指定されていません");
            }
            
            $set_clauses[] = "updated_at = NOW()";
            $set_clauses[] = "version = version + 1";
            $params[] = $id;
            
            $sql = "UPDATE filter_ng_words SET " . implode(', ', $set_clauses) . " WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);
            
            // キャッシュクリア
            $this->clearCache('active_ng_words');
            
            return $result;
            
        } catch (Exception $e) {
            error_log("NGワード更新エラー: " . $e->getMessage());
            throw new Exception("NGワードの更新に失敗しました: " . $e->getMessage());
        }
    }
    
    // ===========================================
    // 禁止カテゴリ関連メソッド
    // ===========================================
    
    /**
     * 禁止カテゴリ取得
     * 
     * @return array 禁止カテゴリリスト
     */
    public function getProhibitedCategories() {
        $cache_key = 'prohibited_categories';
        
        if ($this->hasValidCache($cache_key)) {
            return $this->cache[$cache_key]['data'];
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, uuid, category_name, prohibition_type, reason, 
                       is_active, created_at, updated_at
                FROM filter_prohibited_categories 
                WHERE is_active = TRUE AND is_deleted = FALSE
                ORDER BY 
                    CASE prohibition_type 
                        WHEN 'complete_ban' THEN 1 
                        WHEN 'requires_approval' THEN 2 
                    END,
                    category_name ASC
            ");
            $stmt->execute();
            $result = $stmt->fetchAll();
            
            $this->setCache($cache_key, $result);
            return $result;
            
        } catch (Exception $e) {
            error_log("禁止カテゴリ取得エラー: " . $e->getMessage());
            throw new Exception("禁止カテゴリデータの取得に失敗しました");
        }
    }
    
    /**
     * 禁止カテゴリ追加
     * 
     * @param array $category_data カテゴリデータ
     * @return bool 成功/失敗
     */
    public function insertProhibitedCategory($category_data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO filter_prohibited_categories 
                (category_name, prohibition_type, reason, metadata)
                VALUES (?, ?, ?, ?)
            ");
            
            $metadata = json_encode($category_data['metadata'] ?? []);
            
            $result = $stmt->execute([
                $category_data['category_name'],
                $category_data['prohibition_type'] ?? 'complete_ban',
                $category_data['reason'] ?? '',
                $metadata
            ]);
            
            // キャッシュクリア
            $this->clearCache('prohibited_categories');
            
            return $result;
            
        } catch (Exception $e) {
            error_log("禁止カテゴリ追加エラー: " . $e->getMessage());
            throw new Exception("禁止カテゴリの追加に失敗しました: " . $e->getMessage());
        }
    }
    
    // ===========================================
    // 外部データ関連メソッド
    // ===========================================
    
    /**
     * 外部禁制品データ取得
     * 
     * @return array 外部禁制品リスト
     */
    public function getExternalProhibitedItems() {
        $cache_key = 'external_prohibited_items';
        
        if ($this->hasValidCache($cache_key)) {
            return $this->cache[$cache_key]['data'];
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, uuid, item_name_jp, item_name_en, prohibition_reason, 
                       source_url, last_updated, is_active
                FROM external_prohibited_items 
                WHERE is_active = TRUE AND is_deleted = FALSE
                ORDER BY last_updated DESC, item_name_jp ASC
            ");
            $stmt->execute();
            $result = $stmt->fetchAll();
            
            $this->setCache($cache_key, $result, 7200); // 2時間キャッシュ
            return $result;
            
        } catch (Exception $e) {
            error_log("外部禁制品取得エラー: " . $e->getMessage());
            throw new Exception("外部禁制品データの取得に失敗しました");
        }
    }
    
    /**
     * 外部禁制品データ一括更新
     * 
     * @param array $items_data 禁制品データ配列
     * @return bool 成功/失敗
     */
    public function bulkUpdateExternalItems($items_data) {
        try {
            $this->pdo->beginTransaction();
            
            // 既存データを無効化
            $stmt = $this->pdo->prepare("UPDATE external_prohibited_items SET is_active = FALSE");
            $stmt->execute();
            
            // 新しいデータを挿入
            $stmt = $this->pdo->prepare("
                INSERT INTO external_prohibited_items 
                (item_name_jp, item_name_en, prohibition_reason, source_url, data_hash, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (data_hash) 
                DO UPDATE SET 
                    item_name_jp = EXCLUDED.item_name_jp,
                    item_name_en = EXCLUDED.item_name_en,
                    prohibition_reason = EXCLUDED.prohibition_reason,
                    source_url = EXCLUDED.source_url,
                    last_updated = NOW(),
                    is_active = TRUE,
                    updated_at = NOW()
            ");
            
            foreach ($items_data as $item) {
                $hash = md5($item['item_name_jp'] . $item['item_name_en'] . $item['prohibition_reason']);
                $metadata = json_encode($item['metadata'] ?? []);
                
                $stmt->execute([
                    $item['item_name_jp'] ?? '',
                    $item['item_name_en'] ?? '',
                    $item['prohibition_reason'] ?? '',
                    $item['source_url'] ?? '',
                    $hash,
                    $metadata
                ]);
            }
            
            $this->pdo->commit();
            
            // キャッシュクリア
            $this->clearCache('external_prohibited_items');
            
            return true;
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("外部データ一括更新エラー: " . $e->getMessage());
            throw new Exception("外部データの更新に失敗しました: " . $e->getMessage());
        }
    }
    
    // ===========================================
    // AI学習データ関連メソッド
    // ===========================================
    
    /**
     * AI学習データ追加
     * 
     * @param array $learning_data 学習データ
     * @return bool 成功/失敗
     */
    public function insertLearningData($learning_data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO ai_learning_data 
                (product_id, product_title, product_description, human_judgment, 
                 human_reason, ai_confidence_score, learning_source, created_by, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $metadata = json_encode($learning_data['metadata'] ?? []);
            
            return $stmt->execute([
                $learning_data['product_id'] ?? null,
                $learning_data['product_title'] ?? '',
                $learning_data['product_description'] ?? '',
                $learning_data['human_judgment'],
                $learning_data['human_reason'] ?? '',
                $learning_data['ai_confidence_score'] ?? null,
                $learning_data['learning_source'] ?? 'manual_mark',
                $learning_data['created_by'] ?? 'system',
                $metadata
            ]);
            
        } catch (Exception $e) {
            error_log("AI学習データ追加エラー: " . $e->getMessage());
            throw new Exception("AI学習データの追加に失敗しました: " . $e->getMessage());
        }
    }
    
    /**
     * AI学習データ取得
     * 
     * @param int $limit 取得件数
     * @param string $judgment_filter 判定フィルター
     * @return array 学習データリスト
     */
    public function getLearningData($limit = 100, $judgment_filter = null) {
        try {
            $where_clause = "WHERE is_deleted = FALSE";
            $params = [];
            
            if ($judgment_filter) {
                $where_clause .= " AND human_judgment = ?";
                $params[] = $judgment_filter;
            }
            
            $stmt = $this->pdo->prepare("
                SELECT id, uuid, product_id, product_title, product_description, 
                       human_judgment, human_reason, ai_confidence_score, 
                       learning_source, created_at, created_by
                FROM ai_learning_data 
                {$where_clause}
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            
            $params[] = $limit;
            $stmt->execute($params);
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("AI学習データ取得エラー: " . $e->getMessage());
            throw new Exception("AI学習データの取得に失敗しました");
        }
    }
    
    // ===========================================
    // フィルター実行ログ関連メソッド
    // ===========================================
    
    /**
     * フィルター実行ログ追加
     * 
     * @param array $log_data ログデータ
     * @return bool 成功/失敗
     */
    public function insertFilterLog($log_data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO filter_execution_logs 
                (execution_batch_id, product_id, filter_stage, result, 
                 confidence_score, reason, execution_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            
            return $stmt->execute([
                $log_data['execution_batch_id'],
                $log_data['product_id'] ?? null,
                $log_data['filter_stage'],
                $log_data['result'],
                $log_data['confidence_score'] ?? null,
                $log_data['reason'] ?? '',
                $log_data['execution_time_ms'] ?? 0
            ]);
            
        } catch (Exception $e) {
            error_log("フィルターログ追加エラー: " . $e->getMessage());
            return false; // ログエラーは例外を投げない
        }
    }
    
    /**
     * フィルター統計取得
     * 
     * @param int $days 集計日数
     * @return array 統計データ
     */
    public function getFilterStatistics($days = 7) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    DATE(created_at) as date,
                    filter_stage,
                    result,
                    COUNT(*) as count,
                    AVG(execution_time_ms) as avg_execution_time,
                    MAX(execution_time_ms) as max_execution_time
                FROM filter_execution_logs 
                WHERE created_at >= NOW() - INTERVAL '{$days} days'
                GROUP BY DATE(created_at), filter_stage, result
                ORDER BY date DESC, filter_stage, result
            ");
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("フィルター統計取得エラー: " . $e->getMessage());
            throw new Exception("フィルター統計の取得に失敗しました");
        }
    }
    
    // ===========================================
    // 人間確認待ち関連メソッド
    // ===========================================
    
    /**
     * 人間確認待ち追加
     * 
     * @param array $review_data 確認待ちデータ
     * @return bool 成功/失敗
     */
    public function insertPendingReview($review_data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO pending_reviews 
                (product_id, sku, reason, reason_category, confidence_score, 
                 ai_analysis_result, status, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $ai_result = isset($review_data['ai_analysis_result']) ? 
                         json_encode($review_data['ai_analysis_result']) : null;
            $metadata = json_encode($review_data['metadata'] ?? []);
            
            return $stmt->execute([
                $review_data['product_id'],
                $review_data['sku'] ?? '',
                $review_data['reason'],
                $review_data['reason_category'],
                $review_data['confidence_score'] ?? null,
                $ai_result,
                $review_data['status'] ?? 'pending',
                $metadata
            ]);
            
        } catch (Exception $e) {
            error_log("確認待ち追加エラー: " . $e->getMessage());
            throw new Exception("確認待ちデータの追加に失敗しました: " . $e->getMessage());
        }
    }
    
    /**
     * 人間確認待ちリスト取得
     * 
     * @param string $status ステータス
     * @param int $limit 取得件数
     * @return array 確認待ちリスト
     */
    public function getPendingReviews($status = 'pending', $limit = 50) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, uuid, product_id, sku, reason, reason_category, 
                       confidence_score, ai_analysis_result, status, 
                       created_at, reviewed_at, reviewed_by, review_comment
                FROM pending_reviews 
                WHERE status = ? AND is_deleted = FALSE
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            $stmt->execute([$status, $limit]);
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("確認待ち取得エラー: " . $e->getMessage());
            throw new Exception("確認待ちデータの取得に失敗しました");
        }
    }
    
    /**
     * 確認待ち件数取得
     * 
     * @return int 確認待ち件数
     */
    public function getPendingReviewCount() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) 
                FROM pending_reviews 
                WHERE status = 'pending' AND is_deleted = FALSE
            ");
            $stmt->execute();
            
            return $stmt->fetchColumn();
            
        } catch (Exception $e) {
            error_log("確認待ち件数取得エラー: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * 確認待ち更新
     * 
     * @param int $review_id レビューID
     * @param array $update_data 更新データ
     * @return bool 成功/失敗
     */
    public function updatePendingReview($review_id, $update_data) {
        try {
            $set_clauses = [];
            $params = [];
            
            $allowed_fields = ['status', 'reviewed_at', 'reviewed_by', 'review_comment'];
            
            foreach ($update_data as $field => $value) {
                if (in_array($field, $allowed_fields)) {
                    $set_clauses[] = "{$field} = ?";
                    $params[] = $value;
                }
            }
            
            if (empty($set_clauses)) {
                return false;
            }
            
            $set_clauses[] = "updated_at = NOW()";
            $set_clauses[] = "version = version + 1";
            $params[] = $review_id;
            
            $sql = "UPDATE pending_reviews SET " . implode(', ', $set_clauses) . " WHERE id = ?";
            $stmt = $this->pdo->prepare($sql);
            
            return $stmt->execute($params);
            
        } catch (Exception $e) {
            error_log("確認待ち更新エラー: " . $e->getMessage());
            throw new Exception("確認待ちデータの更新に失敗しました: " . $e->getMessage());
        }
    }
    
    /**
     * 確認待ちデータ取得（ID指定）
     * 
     * @param int $review_id レビューID
     * @return array|null 確認待ちデータ
     */
    public function getPendingReviewById($review_id) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM pending_reviews 
                WHERE id = ? AND is_deleted = FALSE
            ");
            $stmt->execute([$review_id]);
            
            return $stmt->fetch();
            
        } catch (Exception $e) {
            error_log("確認待ちデータ取得エラー: " . $e->getMessage());
            return null;
        }
    }
    
    // ===========================================
    // システム設定関連メソッド
    // ===========================================
    
    /**
     * システム設定取得
     * 
     * @return array 設定配列
     */
    public function getSystemSettings() {
        $cache_key = 'system_settings';
        
        if ($this->hasValidCache($cache_key)) {
            return $this->cache[$cache_key]['data'];
        }
        
        try {
            $stmt = $this->pdo->prepare("
                SELECT setting_key, setting_value, setting_type, description, 
                       is_active, updated_at, updated_by
                FROM filter_system_settings 
                WHERE is_active = TRUE
                ORDER BY setting_key ASC
            ");
            $stmt->execute();
            $result = $stmt->fetchAll();
            
            $this->setCache($cache_key, $result, 1800); // 30分キャッシュ
            return $result;
            
        } catch (Exception $e) {
            error_log("システム設定取得エラー: " . $e->getMessage());
            throw new Exception("システム設定の取得に失敗しました");
        }
    }
    
    /**
     * システム設定更新
     * 
     * @param string $setting_key 設定キー
     * @param mixed $setting_value 設定値
     * @param string $updated_by 更新者
     * @return bool 成功/失敗
     */
    public function updateSystemSetting($setting_key, $setting_value, $updated_by = 'system') {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE filter_system_settings 
                SET setting_value = ?, updated_at = NOW(), updated_by = ?
                WHERE setting_key = ? AND is_active = TRUE
            ");
            
            $result = $stmt->execute([$setting_value, $updated_by, $setting_key]);
            
            // キャッシュクリア
            $this->clearCache('system_settings');
            
            return $result;
            
        } catch (Exception $e) {
            error_log("システム設定更新エラー: " . $e->getMessage());
            throw new Exception("システム設定の更新に失敗しました: " . $e->getMessage());
        }
    }
    
    // ===========================================
    // 商品データ関連メソッド（既存システム連携）
    // ===========================================
    
    /**
     * 商品データ取得（ID指定）
     * 
     * @param int $product_id 商品ID
     * @return array|null 商品データ
     */
    public function getProductById($product_id) {
        try {
            // 既存の商品テーブルから取得（テーブル名は環境に応じて調整）
            $stmt = $this->pdo->prepare("
                SELECT 
                    id,
                    title,
                    description,
                    category,
                    sku,
                    status,
                    created_at,
                    updated_at
                FROM products 
                WHERE id = ? AND status = 'active'
            ");
            $stmt->execute([$product_id]);
            
            return $stmt->fetch();
            
        } catch (Exception $e) {
            error_log("商品データ取得エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 商品データ一括取得
     * 
     * @param array $product_ids 商品IDリスト
     * @return array 商品データリスト
     */
    public function getProductsByIds($product_ids) {
        try {
            if (empty($product_ids)) {
                return [];
            }
            
            $placeholders = str_repeat('?,', count($product_ids) - 1) . '?';
            $stmt = $this->pdo->prepare("
                SELECT 
                    id,
                    title,
                    description,
                    category,
                    sku,
                    status,
                    created_at,
                    updated_at
                FROM products 
                WHERE id IN ({$placeholders}) AND status = 'active'
            ");
            $stmt->execute($product_ids);
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("商品データ一括取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    // ===========================================
    // データベース関数実行メソッド
    // ===========================================
    
    /**
     * フィルターパフォーマンス統計取得
     * 
     * @param int $days_back 過去日数
     * @return array パフォーマンス統計
     */
    public function getFilterPerformanceStats($days_back = 7) {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM get_filter_performance_stats(?)");
            $stmt->execute([$days_back]);
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("パフォーマンス統計取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * NGワード効果測定取得
     * 
     * @param int $days_back 過去日数
     * @return array NGワード効果データ
     */
    public function getNGWordEffectiveness($days_back = 30) {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM get_ngword_effectiveness(?)");
            $stmt->execute([$days_back]);
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("NGワード効果測定取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * データ整合性検証実行
     * 
     * @return array 検証結果
     */
    public function validateDataIntegrity() {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM validate_filter_data_integrity()");
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (Exception $e) {
            error_log("データ整合性検証エラー: " . $e->getMessage());
            return [];
        }
    }
    
    // ===========================================
    // キャッシュ管理メソッド
    // ===========================================
    
    /**
     * 有効なキャッシュがあるかチェック
     * 
     * @param string $key キャッシュキー
     * @return bool 有効なキャッシュの存在
     */
    private function hasValidCache($key) {
        if (!isset($this->cache[$key])) {
            return false;
        }
        
        $cache_data = $this->cache[$key];
        return (time() - $cache_data['timestamp']) < $cache_data['ttl'];
    }
    
    /**
     * キャッシュ設定
     * 
     * @param string $key キャッシュキー
     * @param mixed $data データ
     * @param int $ttl 有効期限（秒）
     */
    private function setCache($key, $data, $ttl = null) {
        $this->cache[$key] = [
            'data' => $data,
            'timestamp' => time(),
            'ttl' => $ttl ?? $this->cache_ttl
        ];
    }
    
    /**
     * キャッシュクリア
     * 
     * @param string $key キャッシュキー
     */
    private function clearCache($key = null) {
        if ($key === null) {
            $this->cache = [];
        } else {
            unset($this->cache[$key]);
        }
    }
    
    // ===========================================
    // ヘルパーメソッド
    // ===========================================
    
    /**
     * トランザクション開始
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }
    
    /**
     * トランザクションコミット
     */
    public function commit() {
        return $this->pdo->commit();
    }
    
    /**
     * トランザクションロールバック
     */
    public function rollBack() {
        return $this->pdo->rollBack();
    }
    
    /**
     * 最後に挿入されたIDを取得
     * 
     * @return string 最後のID
     */
    public function getLastInsertId() {
        return $this->pdo->lastInsertId();
    }
    
    /**
     * 接続状況確認
     * 
     * @return bool 接続状況
     */
    public function isConnected() {
        try {
            $this->pdo->query('SELECT 1');
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * デストラクタ
     */
    public function __destruct() {
        $this->pdo = null;
    }
}
?>