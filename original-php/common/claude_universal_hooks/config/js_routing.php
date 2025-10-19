<?php
// JS動的ルーティング設定 - 修正版
return array (
  'kicho_content' => 
  array (
    'file' => '/common/claude_universal_hooks/js_copy/pages/kicho.js',
    'dependencies' => 
    array (
    ),
    'defer' => false,
    'required' => true,
    'load_order' => 1,
  ),
  'dashboard' => 
  array (
    'file' => '/common/js/core/dashboard.js',
    'dependencies' => 
    array (
    ),
    'defer' => true,
    'required' => false,
    'load_order' => 2,
  ),
  'zaiko_content' => 
  array (
    'file' => '/common/js/modules/zaiko.js',
    'dependencies' => 
    array (
    ),
    'defer' => true,
    'required' => false,
    'load_order' => 2,
  ),
);
