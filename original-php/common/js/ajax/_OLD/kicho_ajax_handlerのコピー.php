<?php
/**
 * 記帳Ajax処理ハンドラー - kicho_ajax_handler.php
 * 保存場所: /common/claude_universal_hooks/modules/kicho/ajax/kicho_ajax_handler.php
 * 
 * 機能:
 * - 動的記帳エントリの保存・削除・更新
 * - リアルタイム計算処理
 * - データ検証・バリデーション
 * - 自動保存処理
 */

// セキュリティヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// エラーレポート設定（開発時のみ）
error_reporting(E_ALL);
ini_set('display_errors', 0); // 本番では0に

class KichoAjaxHandler {
    
    private $db;
    private $user_id;
    private $allowed_actions;
    private $validation_rules;
    
    public function __construct() {
        $this->initializeDatabase();
        $this->initializeUserSession();
        $this->initializeAllowedActions();
        $this->initializeValidationRules();
    }
    
    private function initializeDatabase() {