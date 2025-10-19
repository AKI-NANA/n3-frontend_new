<?php
/**
 * NAGANO-3 Path Resolver
 * V2-Z準拠 パス解決システム
 */

/**
 * 相対パスを絶対パスに解決する
 * @param string $relative_path 相対パス
 * @return string|false 解決された絶対パス、失敗時はfalse
 */
function resolve_path($relative_path) {
    $caller_file = debug_backtrace()[0]['file'];
    $project_root = find_project_root(dirname($caller_file));
    $full_path = $project_root . '/' . ltrim($relative_path, '/');
    return file_exists($full_path) ? $full_path : false;
}

/**
 * プロジェクトルートディレクトリを探索する
 * @param string $start_dir 開始ディレクトリ
 * @return string プロジェクトルートのパス
 */
function find_project_root($start_dir) {
    $current_dir = $start_dir;
    for ($i = 0; $i < 5; $i++) {
        if (file_exists($current_dir . '/index.php')) return $current_dir;
        $parent_dir = dirname($current_dir);
        if ($parent_dir === $current_dir) break;
        $current_dir = $parent_dir;
    }
    return $_SERVER['DOCUMENT_ROOT'] ?? dirname(__FILE__);
}

/**
 * アセットのURLを取得する
 * @param string $filename ファイル名
 * @param string|null $type ファイルタイプ
 * @return string|false アセットのURL、失敗時はfalse
 */
function get_asset_url($filename, $type = null) {
    require_once resolve_path('system_core/helpers/AdvancedAssetFinder.php');
    $absolute_path = AdvancedAssetFinder::findAssetAdvanced($filename, $type);
    return $absolute_path ? '/' . AdvancedAssetFinder::getRelativeUrl($absolute_path) : false;
}

/**
 * アセットの存在確認付きURL取得
 * @param string $filename ファイル名
 * @param string|null $type ファイルタイプ
 * @return string|null アセットのURL、失敗時はnull
 */
function get_verified_asset_url($filename, $type = null) {
    $url = get_asset_url($filename, $type);
    if (!$url) {
        error_log("⚠️ アセットが見つかりません: {$filename}");
        return null;
    }
    return $url;
} 