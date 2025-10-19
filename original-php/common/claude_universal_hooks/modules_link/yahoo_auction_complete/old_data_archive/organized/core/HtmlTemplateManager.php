<?php

/**
 * HtmlTemplateManager Class
 * * PostgreSQLのproduct_html_templatesテーブルと既存の商品データを統合し、
 * HTMLテンプレートを生成・管理します。
 * * 依存関係:
 * - database_query_handler.php (データベース接続とクエリ実行用)
 */
class HtmlTemplateManager {
    private $dbHandler;

    /**
     * コンストラクタ
     * @param DatabaseQueryHandler $dbHandler データベースハンドラーのインスタンス
     */
    public function __construct($dbHandler) {
        $this->dbHandler = $dbHandler;
    }

    /**
     * 商品IDから最適なHTMLテンプレートを取得・生成します。
     * @param string $itemId 取得する商品のSKU（item_sku）
     * @return array|false 生成されたHTMLデータ、または失敗時にfalse
     */
    public function generateTemplateForProduct($itemId) {
        // 1. 商品情報をapproval_queueテーブルから取得
        $productData = $this->dbHandler->getProductBySku($itemId);
        
        if (!$productData) {
            return false;
        }

        $category = $productData['category'];

        // 2. カテゴリに基づいて最適なテンプレートIDを取得
        $templateResult = $this->dbHandler->getTemplateByCategory($category);
        
        if (!$templateResult || empty($templateResult)) {
            // カテゴリに紐づくテンプレートが見つからない場合、Generalカテゴリを試す
            $templateResult = $this->dbHandler->getTemplateByCategory('General');
            if (!$templateResult || empty($templateResult)) {
                return [
                    'success' => false,
                    'message' => '指定されたカテゴリおよびGeneralカテゴリのテンプレートが見つかりません。'
                ];
            }
        }
        
        $template = $templateResult[0];

        // 3. プレースホルダーを置換してHTMLを生成
        $html = $template['html_content'];
        $placeholders = json_decode($template['placeholder_fields'], true);

        // プレースホルダーを動的に置換
        foreach ($placeholders as $placeholder) {
            $field = $placeholder['field'];
            $replacement = isset($productData[$field]) ? $productData[$field] : '';
            $html = str_replace('{{' . $field . '}}', htmlspecialchars($replacement), $html);
        }
        
        // 4. 統計を更新
        $this->dbHandler->updateTemplateUsage($template['template_id'], true, $productData['title_jp']);

        return [
            'success' => true,
            'template_id' => $template['template_id'],
            'html' => $html,
            'css' => $template['css_styles'],
            'message' => 'テンプレートが正常に生成されました。'
        ];
    }
}

// database_query_handler.phpに以下のメソッドを追加してください
/*
    public function getProductBySku($sku) {
        $stmt = $this->conn->prepare("SELECT * FROM approval_queue WHERE item_sku = ?");
        $stmt->execute([$sku]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getTemplateByCategory($category) {
        $stmt = $this->conn->prepare("SELECT * FROM product_html_templates WHERE category = ? AND is_active = TRUE ORDER BY priority DESC, usage_count DESC LIMIT 1");
        $stmt->execute([$category]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateTemplateUsage($templateId, $success, $productTitle) {
        $stmt = $this->conn->prepare("SELECT update_template_usage(?, ?, ?)");
        $stmt->execute([$templateId, $success, $productTitle]);
    }
*/