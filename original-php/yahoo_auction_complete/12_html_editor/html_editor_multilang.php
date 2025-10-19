<?php
/**
 * Yahoo Auction Tool - 多言語対応HTMLテンプレート編集システム
 * JSON API完全対応版 - 8言語対応（eBay各国対応）
 * 作成日: 2025-10-15
 * 対応言語: 🇺🇸 🇬🇧 🇦🇺 🇩🇪 🇫🇷 🇮🇹 🇪🇸 🇯🇵
 */

// 強制デバッグモード
$forceAPI = true;

if ($forceAPI) {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    
    while (ob_get_level()) {
        ob_end_clean();
    }
    ob_start();
}

// セキュリティヘッダー
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * JSON応答関数
 */
function sendJSON($success, $data = null, $message = '', $debug = []) {
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'debug' => $debug
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// リクエスト解析
$action = '';
$input = [];
$debug = [];

$debug['method'] = $_SERVER['REQUEST_METHOD'];
$rawBody = file_get_contents('php://input');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($rawBody)) {
        $decoded = json_decode($rawBody, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $input = $decoded;
            $action = $decoded['action'] ?? '';
        }
    }
    if (empty($action) && !empty($_POST)) {
        $action = $_POST['action'] ?? '';
        $input = $_POST;
    }
}

// アクション処理
if (!empty($action)) {
    try {
        switch ($action) {
            case 'debug_request':
                sendJSON(true, ['message' => '✅ 接続成功'], 'デバッグ完了', $debug);
                break;
            case 'save_template':
                handleSaveTemplate($input, $debug);
                break;
            case 'load_templates':
                handleLoadTemplates($debug);
                break;
            case 'load_single_template':
                handleLoadSingleTemplate($input, $debug);
                break;
            case 'delete_template':
                handleDeleteTemplate($input, $debug);
                break;
            case 'generate_preview':
                handleGeneratePreview($input, $debug);
                break;
            default:
                sendJSON(false, null, "❌ 未対応: '$action'", $debug);
        }
    } catch (Exception $e) {
        sendJSON(false, null, '🚨 エラー: ' . $e->getMessage(), $debug);
    }
}

/**
 * テンプレート保存（多言語対応）
 */
function handleSaveTemplate($input, $debug) {
    if (!isset($input['template_data'])) {
        sendJSON(false, null, '❌ template_data が必要です', $debug);
    }
    
    $templateData = $input['template_data'];
    
    if (empty($templateData['name'])) {
        sendJSON(false, null, '❌ テンプレート名が必要です', $debug);
    }
    
    if (empty($templateData['languages'])) {
        sendJSON(false, null, '❌ 言語データが必要です', $debug);
    }
    
    $saveDir = __DIR__ . '/saved_templates';
    if (!is_dir($saveDir)) {
        mkdir($saveDir, 0755, true);
    }
    
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $templateData['name']);
    $fileName = date('Y-m-d_H-i-s') . '_' . $safeName . '.json';
    $filePath = $saveDir . '/' . $fileName;
    
    $saveData = [
        'template_id' => uniqid('tpl_', true),
        'name' => $templateData['name'],
        'category' => $templateData['category'] ?? 'general',
        'languages' => $templateData['languages'],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
        'version' => '2.0-multilang'
    ];
    
    $jsonData = json_encode($saveData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    file_put_contents($filePath, $jsonData);
    
    sendJSON(true, [
        'template_id' => $saveData['template_id'],
        'file_name' => $fileName,
        'languages_saved' => array_keys($templateData['languages'])
    ], '✅ 保存しました', $debug);
}

/**
 * テンプレート一覧読み込み
 */
function handleLoadTemplates($debug) {
    $templates = [];
    $saveDir = __DIR__ . '/saved_templates';
    
    if (is_dir($saveDir)) {
        $files = glob($saveDir . '/*.json');
        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content) {
                $data = json_decode($content, true);
                if ($data && json_last_error() === JSON_ERROR_NONE) {
                    $data['file_size'] = filesize($file);
                    $data['language_count'] = isset($data['languages']) ? count($data['languages']) : 1;
                    $templates[] = $data;
                }
            }
        }
    }
    
    usort($templates, function($a, $b) {
        return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
    });
    
    sendJSON(true, $templates, "✅ " . count($templates) . "件読み込み", $debug);
}

/**
 * 単一テンプレート読み込み
 */
function handleLoadSingleTemplate($input, $debug) {
    if (!isset($input['template_id'])) {
        sendJSON(false, null, '❌ template_id が必要です', $debug);
    }
    
    $templateId = $input['template_id'];
    $saveDir = __DIR__ . '/saved_templates';
    $files = glob($saveDir . '/*.json');
    
    foreach ($files as $file) {
        $content = file_get_contents($file);
        if ($content) {
            $data = json_decode($content, true);
            if ($data && $data['template_id'] === $templateId) {
                sendJSON(true, $data, '✅ 読み込み完了', $debug);
                return;
            }
        }
    }
    
    sendJSON(false, null, '❌ 見つかりません', $debug);
}

/**
 * テンプレート削除
 */
function handleDeleteTemplate($input, $debug) {
    if (!isset($input['template_id'])) {
        sendJSON(false, null, '❌ template_id が必要です', $debug);
    }
    
    $templateId = $input['template_id'];
    $saveDir = __DIR__ . '/saved_templates';
    $files = glob($saveDir . '/*.json');
    
    foreach ($files as $file) {
        $content = file_get_contents($file);
        if ($content) {
            $data = json_decode($content, true);
            if ($data && $data['template_id'] === $templateId) {
                unlink($file);
                sendJSON(true, null, '✅ 削除しました', $debug);
                return;
            }
        }
    }
    
    sendJSON(false, null, '❌ 見つかりません', $debug);
}

/**
 * プレビュー生成（多言語対応）
 */
function handleGeneratePreview($input, $debug) {
    if (empty($input['html_content'])) {
        sendJSON(false, null, '❌ HTML が必要です', $debug);
    }
    
    $htmlContent = $input['html_content'];
    $language = $input['language'] ?? 'en_US';
    $sampleType = $input['sample_data'] ?? 'default';
    
    $sampleData = generateSampleData($sampleType, $language);
    $previewHTML = str_replace(array_keys($sampleData), array_values($sampleData), $htmlContent);
    
    // サニタイズ
    $previewHTML = preg_replace('/javascript:/i', '', $previewHTML);
    $previewHTML = preg_replace('/on\w+\s*=/i', '', $previewHTML);
    
    sendJSON(true, [
        'html' => $previewHTML,
        'language' => $language
    ], '✅ プレビュー生成', $debug);
}

/**
 * サンプルデータ生成（多言語）
 */
function generateSampleData($type, $language = 'en_US') {
    $samples = [
        'default' => [
            'en_US' => [
                '{{TITLE}}' => 'Premium Quality Product',
                '{{PRICE}}' => '$99.99',
                '{{BRAND}}' => 'Top Brand',
                '{{CONDITION}}' => 'Brand New',
                '{{DESCRIPTION}}' => 'High-quality product with detailed specifications.',
                '{{FEATURES}}' => "• Premium materials\n• Professional craftsmanship\n• Fast shipping",
                '{{SPECIFICATIONS}}' => "Size: 10 x 5 x 3 inches\nWeight: 1.5 lbs",
                '{{SHIPPING_INFO}}' => 'Fast shipping with tracking from USA',
                '{{RETURN_POLICY}}' => '30-day money-back guarantee',
                '{{WARRANTY}}' => '1-year manufacturer warranty'
            ],
            'en_GB' => [
                '{{TITLE}}' => 'Premium Quality Product',
                '{{PRICE}}' => '£79.99',
                '{{BRAND}}' => 'Top Brand',
                '{{CONDITION}}' => 'Brand New',
                '{{DESCRIPTION}}' => 'High-quality product with detailed specifications.',
                '{{FEATURES}}' => "• Premium materials\n• Professional craftsmanship\n• Fast UK delivery",
                '{{SPECIFICATIONS}}' => "Size: 25 x 13 x 8 cm\nWeight: 680g",
                '{{SHIPPING_INFO}}' => 'Fast Royal Mail delivery with tracking',
                '{{RETURN_POLICY}}' => '30-day money-back guarantee',
                '{{WARRANTY}}' => '1-year manufacturer warranty'
            ],
            'en_AU' => [
                '{{TITLE}}' => 'Premium Quality Product',
                '{{PRICE}}' => 'AU$149.99',
                '{{BRAND}}' => 'Top Brand',
                '{{CONDITION}}' => 'Brand New',
                '{{DESCRIPTION}}' => 'High-quality product with detailed specifications.',
                '{{FEATURES}}' => "• Premium materials\n• Professional craftsmanship\n• Fast delivery",
                '{{SPECIFICATIONS}}' => "Size: 25 x 13 x 8 cm\nWeight: 680g",
                '{{SHIPPING_INFO}}' => 'Fast Australia Post delivery with tracking',
                '{{RETURN_POLICY}}' => '30-day money-back guarantee',
                '{{WARRANTY}}' => '1-year manufacturer warranty'
            ],
            'de' => [
                '{{TITLE}}' => 'Premium Qualitätsprodukt',
                '{{PRICE}}' => '€89,99',
                '{{BRAND}}' => 'Top Marke',
                '{{CONDITION}}' => 'Brandneu',
                '{{DESCRIPTION}}' => 'Hochwertiges Produkt mit detaillierten Spezifikationen.',
                '{{FEATURES}}' => "• Premium-Materialien\n• Professionelle Handwerkskunst\n• Schneller Versand",
                '{{SPECIFICATIONS}}' => "Größe: 25 x 13 x 8 cm\nGewicht: 680g",
                '{{SHIPPING_INFO}}' => 'Schneller DHL-Versand mit Tracking',
                '{{RETURN_POLICY}}' => '30 Tage Geld-zurück-Garantie',
                '{{WARRANTY}}' => '1 Jahr Herstellergarantie'
            ],
            'fr' => [
                '{{TITLE}}' => 'Produit de Qualité Premium',
                '{{PRICE}}' => '€89,99',
                '{{BRAND}}' => 'Marque Premium',
                '{{CONDITION}}' => 'Neuf',
                '{{DESCRIPTION}}' => 'Produit de haute qualité avec spécifications détaillées.',
                '{{FEATURES}}' => "• Matériaux premium\n• Qualité professionnelle\n• Livraison rapide",
                '{{SPECIFICATIONS}}' => "Taille: 25 x 13 x 8 cm\nPoids: 680g",
                '{{SHIPPING_INFO}}' => 'Livraison rapide avec suivi',
                '{{RETURN_POLICY}}' => 'Garantie satisfait ou remboursé 30 jours',
                '{{WARRANTY}}' => 'Garantie fabricant 1 an'
            ],
            'it' => [
                '{{TITLE}}' => 'Prodotto di Qualità Premium',
                '{{PRICE}}' => '€89,99',
                '{{BRAND}}' => 'Top Brand',
                '{{CONDITION}}' => 'Nuovo',
                '{{DESCRIPTION}}' => 'Prodotto di alta qualità con specifiche dettagliate.',
                '{{FEATURES}}' => "• Materiali premium\n• Qualità professionale\n• Spedizione veloce",
                '{{SPECIFICATIONS}}' => "Dimensioni: 25 x 13 x 8 cm\nPeso: 680g",
                '{{SHIPPING_INFO}}' => 'Spedizione veloce con tracking',
                '{{RETURN_POLICY}}' => 'Garanzia soddisfatti o rimborsati 30 giorni',
                '{{WARRANTY}}' => 'Garanzia del produttore 1 anno'
            ],
            'es' => [
                '{{TITLE}}' => 'Producto de Calidad Premium',
                '{{PRICE}}' => '€89,99',
                '{{BRAND}}' => 'Marca Premium',
                '{{CONDITION}}' => 'Nuevo',
                '{{DESCRIPTION}}' => 'Producto de alta calidad con especificaciones detalladas.',
                '{{FEATURES}}' => "• Materiales premium\n• Calidad profesional\n• Envío rápido",
                '{{SPECIFICATIONS}}' => "Tamaño: 25 x 13 x 8 cm\nPeso: 680g",
                '{{SHIPPING_INFO}}' => 'Envío rápido con seguimiento',
                '{{RETURN_POLICY}}' => 'Garantía de devolución de dinero de 30 días',
                '{{WARRANTY}}' => 'Garantía del fabricante de 1 año'
            ],
            'ja' => [
                '{{TITLE}}' => 'プレミアム高品質商品',
                '{{PRICE}}' => '¥12,999',
                '{{BRAND}}' => 'トップブランド',
                '{{CONDITION}}' => '新品',
                '{{DESCRIPTION}}' => '詳細な仕様の高品質商品です。',
                '{{FEATURES}}' => "• プレミアム素材\n• プロ仕上げ\n• 高速配送",
                '{{SPECIFICATIONS}}' => "サイズ: 25 x 13 x 8 cm\n重量: 680g",
                '{{SHIPPING_INFO}}' => '追跡番号付き高速配送',
                '{{RETURN_POLICY}}' => '30日間返金保証',
                '{{WARRANTY}}' => 'メーカー1年保証'
            ]
        ]
    ];
    
    $data = $samples[$type] ?? $samples['default'];
    return $data[$language] ?? $data['en_US'];
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多言語対応 HTMLテンプレート編集</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="../../css/yahoo_auction_tool_content.css" rel="stylesheet">
    <link href="../../css/yahoo_auction_system.css" rel="stylesheet">
    <style>
    /* 言語タブ */
    .language-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid var(--border-color);
        overflow-x: auto;
    }
    
    .language-tab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        border-radius: 0.375rem 0.375rem 0 0;
        cursor: pointer;
        transition: all 0.15s;
        font-size: 0.875rem;
        white-space: nowrap;
    }
    
    .language-tab:hover {
        background: var(--bg-hover);
    }
    
    .language-tab.active {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
        font-weight: 600;
    }
    
    .language-flag {
        font-size: 1.25rem;
    }
    
    .language-info {
        background: #dbeafe;
        border-left: 4px solid #3b82f6;
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
    }
    
    .language-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: #3b82f6;
        color: white;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        margin-right: 0.25rem;
        margin-bottom: 0.25rem;
    }
    
    /* 既存スタイル継承 */
    .editor-layout { display: grid; grid-template-columns: 1fr 400px; gap: 1.5rem; margin: 1.5rem; }
    .editor-panel, .sidebar-panel { background: white; border-radius: 0.5rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .html-editor textarea { width: 100%; height: 400px; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.375rem; font-family: monospace; font-size: 0.875rem; resize: vertical; }
    .templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .template-card { background: white; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; transition: all 0.15s; }
    .template-card:hover { box-shadow: 0 4px 6px rgba(0,0,0,0.1); transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <div class="dashboard-header">
                <h1><i class="fas fa-globe"></i> 多言語対応 HTMLテンプレート編集システム</h1>
                <p>8言語対応 - eBay各国向け商品説明テンプレート作成</p>
            </div>

            <div id="statusBar" class="notification info" style="display: none; margin: 1rem;">
                <i class="fas fa-info-circle"></i>
                <span id="statusMessage">Ready</span>
            </div>

            <div class="editor-layout">
                <div class="editor-panel">
                    <div class="panel-header">
                        <h3><i class="fas fa-edit"></i> 多言語テンプレート編集</h3>
                        <div class="editor-actions">
                            <button class="btn btn-success" onclick="saveMultiLangTemplate()">
                                <i class="fas fa-save"></i> 全言語保存
                            </button>
                            <button class="btn btn-info" onclick="loadTemplates()">
                                <i class="fas fa-folder-open"></i> 読み込み
                            </button>
                        </div>
                    </div>
                    
                    <div class="template-info">
                        <div class="form-row">
                            <div class="form-group">
                                <label>テンプレート名</label>
                                <input type="text" id="templateName" placeholder="My Multilingual Template">
                            </div>
                            <div class="form-group">
                                <label>カテゴリ</label>
                                <select id="templateCategory">
                                    <option value="general">汎用</option>
                                    <option value="electronics">エレクトロニクス</option>
                                    <option value="fashion">ファッション</option>
                                    <option value="collectibles">コレクタブル</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="language-info">
                        <strong><i class="fas fa-info-circle"></i> 多言語対応:</strong>
                        各タブで言語ごとにHTMLを編集できます。プレースホルダー（{{TITLE}}など）は全言語共通です。
                    </div>
                    
                    <div class="language-tabs" id="languageTabs"></div>
                    
                    <div class="html-editor">
                        <textarea id="htmlEditor" placeholder="選択中の言語向けのHTMLを記述します..."></textarea>
                    </div>
                    
                    <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #64748b;">
                        <span id="currentLangIndicator"></span>
                    </div>
                </div>
                
                <div class="sidebar-panel">
                    <div class="variables-panel">
                        <h4><i class="fas fa-tags"></i> 使用可能な変数</h4>
                        <div class="variable-groups">
                            <div class="variable-group">
                                <h5>基本情報</h5>
                                <div class="variable-tags">
                                    <button class="variable-tag" onclick="insertVariable('{{TITLE}}')">{{TITLE}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{PRICE}}')">{{PRICE}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{BRAND}}')">{{BRAND}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{CONDITION}}')">{{CONDITION}}</button>
                                </div>
                            </div>
                            <div class="variable-group">
                                <h5>説明・詳細</h5>
                                <div class="variable-tags">
                                    <button class="variable-tag" onclick="insertVariable('{{DESCRIPTION}}')">{{DESCRIPTION}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{FEATURES}}')">{{FEATURES}}</button>
                                    <button class="variable-tag" onclick="insertVariable('{{SPECIFICATIONS}}')">{{SPECIFICATIONS}}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="preview-panel">
                        <div class="preview-header">
                            <h4><i class="fas fa-eye"></i> プレビュー</h4>
                            <div class="preview-controls">
                                <select id="previewLanguage"></select>
                                <button class="btn btn-sm btn-warning" onclick="generatePreview()">
                                    <i class="fas fa-play"></i> 生成
                                </button>
                            </div>
                        </div>
                        <div class="preview-content" id="previewContent">
                            <div class="preview-placeholder">
                                <i class="fas fa-info-circle"></i>
                                <p>HTMLを入力して「生成」ボタンを押してください</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <section class="section">
                <div class="section-header">
                    <h3><i class="fas fa-folder"></i> 保存済み多言語テンプレート</h3>
                    <button class="btn btn-info" onclick="loadTemplates()">
                        <i class="fas fa-sync"></i> 更新
                    </button>
                </div>
                <div class="templates-grid" id="templatesGrid">
                    <div class="no-templates">保存済みテンプレートがありません。</div>
                </div>
            </section>
        </div>
    </div>

    <script>
        const LANGUAGES = [
            { code: 'en_US', name: 'English (US)', flag: '🇺🇸', ebay: 'ebay.com' },
            { code: 'en_GB', name: 'English (UK)', flag: '🇬🇧', ebay: 'ebay.co.uk' },
            { code: 'en_AU', name: 'English (AU)', flag: '🇦🇺', ebay: 'ebay.com.au' },
            { code: 'de', name: 'Deutsch', flag: '🇩🇪', ebay: 'ebay.de' },
            { code: 'fr', name: 'Français', flag: '🇫🇷', ebay: 'ebay.fr' },
            { code: 'it', name: 'Italiano', flag: '🇮🇹', ebay: 'ebay.it' },
            { code: 'es', name: 'Español', flag: '🇪🇸', ebay: 'ebay.es' },
            { code: 'ja', name: '日本語', flag: '🇯🇵', ebay: 'ebay.co.jp' }
        ];
        
        let currentLanguage = 'en_US';
        let languageContents = {};
        
        LANGUAGES.forEach(lang => {
            languageContents[lang.code] = '';
        });
        
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 多言語HTMLエディタ初期化');
            generateLanguageTabs();
            generatePreviewLanguageOptions();
            loadTemplates();
        });

        function generateLanguageTabs() {
            const tabs = LANGUAGES.map(lang => `
                <div class="language-tab ${lang.code === currentLanguage ? 'active' : ''}" 
                     onclick="switchLanguage('${lang.code}')">
                    <span class="language-flag">${lang.flag}</span>
                    <span>${lang.name}</span>
                </div>
            `).join('');
            document.getElementById('languageTabs').innerHTML = tabs;
            updateCurrentLanguageIndicator();
        }
        
        function generatePreviewLanguageOptions() {
            const options = LANGUAGES.map(lang => 
                `<option value="${lang.code}">${lang.flag} ${lang.name}</option>`
            ).join('');
            document.getElementById('previewLanguage').innerHTML = options;
        }
        
        function switchLanguage(langCode) {
            const editor = document.getElementById('htmlEditor');
            if (editor) {
                languageContents[currentLanguage] = editor.value;
            }
            
            currentLanguage = langCode;
            if (editor) {
                editor.value = languageContents[currentLanguage] || '';
            }
            
            document.querySelectorAll('.language-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.closest('.language-tab').classList.add('active');
            
            updateCurrentLanguageIndicator();
            showStatus(`言語を ${LANGUAGES.find(l => l.code === langCode).name} に切り替えました`, 'info');
        }
        
        function updateCurrentLanguageIndicator() {
            const lang = LANGUAGES.find(l => l.code === currentLanguage);
            document.getElementById('currentLangIndicator').innerHTML = 
                `<strong>編集中:</strong> ${lang.flag} ${lang.name} (${lang.ebay})`;
        }
        
        function saveMultiLangTemplate() {
            const editor = document.getElementById('htmlEditor');
            if (editor) {
                languageContents[currentLanguage] = editor.value;
            }
            
            const languages = {};
            LANGUAGES.forEach(lang => {
                if (languageContents[lang.code].trim()) {
                    languages[lang.code] = {
                        html_content: languageContents[lang.code],
                        updated_at: new Date().toISOString()
                    };
                }
            });
            
            if (Object.keys(languages).length === 0) {
                showStatus('❌ 最低1つの言語でHTMLを入力してください', 'error');
                return;
            }
            
            const templateData = {
                name: document.getElementById('templateName').value || 'Untitled',
                category: document.getElementById('templateCategory').value,
                languages: languages
            };
            
            fetch('html_editor_multilang.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_template', template_data: templateData })
            })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    showStatus(`✅ ${result.data.languages_saved.length}言語保存しました`, 'success');
                    loadTemplates();
                    document.getElementById('templateName').value = '';
                    LANGUAGES.forEach(lang => { languageContents[lang.code] = ''; });
                    document.getElementById('htmlEditor').value = '';
                } else {
                    showStatus('❌ 保存エラー: ' + result.message, 'error');
                }
            });
        }
        
        function generatePreview() {
            const previewLang = document.getElementById('previewLanguage').value;
            const htmlContent = languageContents[previewLang] || document.getElementById('htmlEditor').value;
            
            if (!htmlContent.trim()) {
                showStatus('❌ HTMLを入力してください', 'error');
                return;
            }
            
            fetch('html_editor_multilang.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate_preview', html_content: htmlContent, language: previewLang })
            })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    document.getElementById('previewContent').innerHTML = result.data.html;
                    const lang = LANGUAGES.find(l => l.code === previewLang);
                    showStatus(`✅ ${lang.flag} ${lang.name} のプレビュー生成`, 'success');
                }
            });
        }
        
        function loadTemplates() {
            fetch('html_editor_multilang.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'load_templates' })
            })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    displayTemplatesList(result.data);
                }
            });
        }
        
        function displayTemplatesList(templates) {
            const grid = document.getElementById('templatesGrid');
            if (!templates || templates.length === 0) {
                grid.innerHTML = '<div class="no-templates">保存済みテンプレートがありません。</div>';
                return;
            }
            
            const html = templates.map(t => {
                const langBadges = t.languages ? 
                    Object.keys(t.languages).map(langCode => {
                        const lang = LANGUAGES.find(l => l.code === langCode);
                        return lang ? `<span class="language-badge">${lang.flag} ${lang.name}</span>` : '';
                    }).join('') : '';
                
                return `
                    <div class="template-card">
                        <div class="template-header">
                            <h4>${t.name || 'Untitled'}</h4>
                            <span class="category-badge">${t.category || 'general'}</span>
                        </div>
                        <div class="template-meta">
                            <span>${t.created_at || ''}</span>
                            <span>${t.language_count || 0} 言語</span>
                        </div>
                        <div style="margin-bottom: 0.5rem;">${langBadges}</div>
                        <div class="template-actions">
                            <button class="btn btn-sm btn-primary" onclick="loadTemplate('${t.template_id}')">
                                <i class="fas fa-edit"></i> 編集
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.template_id}')">
                                <i class="fas fa-trash"></i> 削除
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            grid.innerHTML = html;
        }
        
        function loadTemplate(templateId) {
            fetch('html_editor_multilang.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'load_single_template', template_id: templateId })
            })
            .then(r => r.json())
            .then(result => {
                if (result.success) {
                    const t = result.data;
                    document.getElementById('templateName').value = t.name || '';
                    document.getElementById('templateCategory').value = t.category || 'general';
                    
                    if (t.languages) {
                        Object.keys(t.languages).forEach(langCode => {
                            languageContents[langCode] = t.languages[langCode].html_content || '';
                        });
                    }
                    
                    document.getElementById('htmlEditor').value = languageContents[currentLanguage] || '';
                    showStatus(`✅ テンプレート「${t.name}」読み込み完了`, 'success');
                }
            });
        }
        
        function deleteTemplate(templateId) {
            if (confirm('このテンプレートを削除しますか？全言語のデータが削除されます。')) {
                fetch('html_editor_multilang.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete_template', template_id: templateId })
                })
                .then(r => r.json())
                .then(result => {
                    if (result.success) {
                        showStatus('✅ 削除しました', 'success');
                        loadTemplates();
                    }
                });
            }
        }
        
        function insertVariable(variable) {
            const editor = document.getElementById('htmlEditor');
            if (!editor) return;
            
            const startPos = editor.selectionStart;
            const endPos = editor.selectionEnd;
            const beforeText = editor.value.substring(0, startPos);
            const afterText = editor.value.substring(endPos);
            
            editor.value = beforeText + variable + afterText;
            const newPos = startPos + variable.length;
            editor.setSelectionRange(newPos, newPos);
            editor.focus();
            
            languageContents[currentLanguage] = editor.value;
            showStatus('変数を挿入: ' + variable, 'success');
        }
        
        function showStatus(message, type = 'info') {
            const statusBar = document.getElementById('statusBar');
            const statusMessage = document.getElementById('statusMessage');
            
            if (statusBar && statusMessage) {
                statusMessage.textContent = message;
                statusBar.className = `notification ${type}`;
                statusBar.style.display = 'flex';
                
                if (type === 'success') {
                    setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
                }
            }
            console.log(`[${type.toUpperCase()}]:`, message);
        }
        
        console.log('✅ 多言語HTMLエディタ初期化完了');
    </script>
</body>
</html>