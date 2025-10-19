<?php
// Ajax動的ルーティング設定
return array (
  'kicho_content' => 
  array (
    'handler' => '/Users/aritahiroaki/NAGANO-3/N3-Development/common/claude_universal_hooks/modules/kicho/ajax_handler.php',
    'csrf_required' => true,
    'rate_limit' => 100,
    'allowed_actions' => 
    array (
      0 => 'health_check',
      1 => 'get_statistics',
      2 => 'refresh-all',
      3 => 'toggle-auto-refresh',
      4 => 'execute-mf-import',
      5 => 'execute-integrated-ai-learning',
      6 => 'bulk-approve-transactions',
      7 => 'download-rules-csv',
      8 => 'save-uploaded-rules-as-database',
      9 => 'execute-full-backup',
    ),
  ),
  'dashboard' => 
  array (
    'handler' => '/Users/aritahiroaki/NAGANO-3/N3-Development/common/claude_universal_hooks/modules/dashboard/ajax_handler.php',
    'csrf_required' => true,
    'rate_limit' => 50,
    'allowed_actions' => 
    array (
      0 => 'get_dashboard_stats',
      1 => 'update_widget',
    ),
  ),
);
