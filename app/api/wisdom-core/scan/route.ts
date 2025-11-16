import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// サイドバーの全ツール定義（SidebarConfig.tsと完全一致 - 114個）
const SIDEBAR_TOOLS: Record<string, { category: string; paths: string[] }> = {
  // 統合ツール (17個)
  '01_ダッシュボード': { category: 'core', paths: ['dashboard', '/dashboard'] },
  '02_データ取得': { category: 'data', paths: ['data-collection', '/data-collection', 'scraping'] },
  '03_商品承認': { category: 'workflow', paths: ['approval', '/approval'] },
  '04_データ分析': { category: 'analysis', paths: ['analytics/sales', '/analytics/sales', 'analytics'] },
  '05_利益計算': { category: 'financial', paths: ['ebay-pricing', '/ebay-pricing', 'profit'] },
  '06_フィルター管理': { category: 'management', paths: ['management/filter', '/management/filter', 'filter'] },
  '07_データ編集': { category: 'data', paths: ['tools/editing', '/tools/editing', 'editing', 'editor'] },
  '08_出品管理': { category: 'listing', paths: ['management/listing', '/management/listing', 'listing-management'] },
  '09_送料計算': { category: 'financial', paths: ['shipping-calculator', '/shipping-calculator', 'shipping'] },
  '10_在庫管理': { category: 'inventory', paths: ['inventory', '/inventory'] },
  '11_カテゴリ管理': { category: 'data', paths: ['category-management', '/category-management', 'category'] },
  '12_HTMLエディタ': { category: 'tools', paths: ['tools/html-editor', '/tools/html-editor', 'html-editor'] },
  '13_統合分析': { category: 'analysis', paths: ['analytics/inventory', '/analytics/inventory'] },
  '14_API連携': { category: 'api', paths: ['/api', 'api/ebay', 'ebay-auth'] },
  '15_HTS分類自動化': { category: 'tools', paths: ['tools/hts-classification', '/tools/hts-classification', 'hts-classification'] },
  '16_HTS階層構造ツール': { category: 'tools', paths: ['tools/hts-hierarchy', '/tools/hts-hierarchy', 'hts-hierarchy'] },
  '17_開発ナレッジ事典': { category: 'development', paths: ['tools/wisdom-core', '/tools/wisdom-core', 'wisdom-core'] },
  
  // 出品ツール (6個)
  '出品スケジューラー': { category: 'listing', paths: ['listing-management', '/listing-management'] },
  '一括出品': { category: 'listing', paths: ['bulk-listing', '/bulk-listing'] },
  '出品ツール': { category: 'listing', paths: ['listing-tool', '/listing-tool'] },
  '配送ポリシー管理': { category: 'shipping', paths: ['shipping-policy-manager', '/shipping-policy-manager', 'shipping-policy'] },
  'eBay価格計算': { category: 'financial', paths: ['ebay-pricing', '/ebay-pricing'] },
  'スコア評価': { category: 'analysis', paths: ['score-management', '/score-management'] },
  
  // 商品管理 (4個)
  '商品一覧': { category: 'products', paths: ['shohin', '/shohin'] },
  '商品登録': { category: 'products', paths: ['shohin/add', '/shohin/add'] },
  'Amazon商品登録': { category: 'products', paths: ['asin-upload', '/asin-upload'] },
  'カテゴリ管理(商品)': { category: 'products', paths: ['shohin/category', '/shohin/category'] },
  
  // 在庫管理 (6個)
  '在庫監視システム': { category: 'inventory', paths: ['inventory-monitoring', '/inventory-monitoring'] },
  '在庫一覧': { category: 'inventory', paths: ['zaiko', '/zaiko'] },
  '入庫管理': { category: 'inventory', paths: ['zaiko/nyuko', '/zaiko/nyuko'] },
  '出庫管理': { category: 'inventory', paths: ['zaiko/shukko', '/zaiko/shukko'] },
  '棚卸し': { category: 'inventory', paths: ['zaiko/tanaoroshi', '/zaiko/tanaoroshi'] },
  '在庫調整': { category: 'inventory', paths: ['zaiko/chosei', '/zaiko/chosei'] },
  
  // 受注管理 (4個)
  '受注一覧': { category: 'order', paths: ['juchu', '/juchu'] },
  '出荷管理': { category: 'order', paths: ['shukka', '/shukka'] },
  '返品管理': { category: 'order', paths: ['henpin', '/henpin'] },
  '配送追跡': { category: 'order', paths: ['haisou', '/haisou'] },
  
  // リサーチ (3個)
  'eBayリサーチ': { category: 'research', paths: ['research/ebay-research', '/research/ebay-research'] },
  '市場リサーチ': { category: 'research', paths: ['research/market-research', '/research/market-research'] },
  'スコアリング': { category: 'research', paths: ['research/scoring', '/research/scoring'] },
  
  // 分析 (4個)
  '売上分析': { category: 'analysis', paths: ['analytics/sales', '/analytics/sales'] },
  '在庫回転率': { category: 'analysis', paths: ['analytics/inventory', '/analytics/inventory'] },
  '価格トレンド': { category: 'analysis', paths: ['analytics/price-trends', '/analytics/price-trends'] },
  '顧客分析': { category: 'analysis', paths: ['analytics/customers', '/analytics/customers'] },
  
  // AI制御 (4個)
  'AI分析': { category: 'ai', paths: ['ai/analysis', '/ai/analysis'] },
  '需要予測': { category: 'ai', paths: ['ai/demand', '/ai/demand'] },
  '価格最適化': { category: 'ai', paths: ['ai/pricing', '/ai/pricing'] },
  'レコメンド': { category: 'ai', paths: ['ai/recommend', '/ai/recommend'] },
  
  // 記帳会計 (3個)
  '売上管理': { category: 'accounting', paths: ['uriage', '/uriage'] },
  '仕入管理': { category: 'accounting', paths: ['shiire', '/shiire'] },
  '財務レポート': { category: 'accounting', paths: ['zaimu', '/zaimu'] },
  
  // 外部連携 (7個)
  'Yahoo!オークション': { category: 'external', paths: ['yahoo-auction', '/yahoo-auction', 'yahoo'] },
  'eBay': { category: 'external', paths: ['ebay', '/ebay'] },
  'メルカリ': { category: 'external', paths: ['mercari', '/mercari'] },
  'Amazon連携': { category: 'external', paths: ['amazon', '/amazon'] },
  '楽天連携': { category: 'external', paths: ['rakuten', '/rakuten'] },
  'Yahoo連携': { category: 'external', paths: ['yahoo', '/yahoo'] },
  'API管理': { category: 'external', paths: ['api', '/api'] },
  
  // システム管理 (9個)
  'システムヘルスチェック': { category: 'system', paths: ['system-health', '/system-health'] },
  'Git & デプロイ': { category: 'system', paths: ['tools/git-deploy', '/tools/git-deploy'] },
  'Supabase接続': { category: 'system', paths: ['tools/supabase-connection', '/tools/supabase-connection'] },
  'APIテストツール': { category: 'system', paths: ['tools/api-test', '/tools/api-test'] },
  'eBay Token取得': { category: 'system', paths: ['api/ebay/auth', '/api/ebay/auth'] },
  'ユーザー管理': { category: 'system', paths: ['users', '/users', 'settings/users'] },
  '権限設定': { category: 'system', paths: ['permissions', '/permissions'] },
  'バックアップ': { category: 'system', paths: ['backup', '/backup', 'settings/backup'] },
  'ログ管理': { category: 'system', paths: ['logs', '/logs'] },
  
  // その他ツール (5個)
  '出品ツールハブ': { category: 'tools', paths: ['tools', '/tools'] },
  'スクレイピング': { category: 'tools', paths: ['tools/scraping', '/tools/scraping'] },
  '商品承認ツール': { category: 'tools', paths: ['tools/approval', '/tools/approval'] },
  '利益計算ツール': { category: 'tools', paths: ['tools/profit-calculator', '/tools/profit-calculator'] },
  'ワークフローエンジン': { category: 'tools', paths: ['tools/workflow-engine', '/tools/workflow-engine'] },
  
  // 設定 (4個)
  'ユーザー管理(設定)': { category: 'settings', paths: ['settings/users', '/settings/users'] },
  'API設定': { category: 'settings', paths: ['settings/api', '/settings/api'] },
  '通知設定': { category: 'settings', paths: ['settings/notifications', '/settings/notifications'] },
  'バックアップ(設定)': { category: 'settings', paths: ['settings/backup', '/settings/backup'] },
  
  // 開発ガイド (7個)
  '開発指示書管理': { category: 'development', paths: ['dev-instructions', '/dev-instructions'] },
  'リアルタイム開発ダッシュボード': { category: 'development', paths: ['dev-guide', '/dev-guide'] },
  'システム開発ガイド': { category: 'development', paths: ['docs/index.html', '/docs/index.html'] },
  '全14ツール構成': { category: 'development', paths: ['docs/index.html#tools', '/docs/index.html#tools'] },
  'データベース設計': { category: 'development', paths: ['docs/index.html#database', '/docs/index.html#database'] },
  'ワークフロー説明': { category: 'development', paths: ['docs/index.html#workflow', '/docs/index.html#workflow'] },
  '開発方針・修正方法': { category: 'development', paths: ['docs/index.html#development', '/docs/index.html#development'] },
}

// フォルダ説明
const folderDescriptions: Record<string, string> = {
  'app': 'Next.jsのページとAPIルート',
  'components': '再利用可能なReactコンポーネント',
  'lib': 'ユーティリティ関数とヘルパー',
  'types': 'TypeScript型定義',
  'hooks': 'カスタムReactフック',
  'contexts': 'Reactコンテキスト',
  'services': 'ビジネスロジックとAPIクライアント',
  'data': 'マスターデータとJSONファイル',
  'public': '静的アセット（画像、アイコン等）',
  'styles': 'グローバルスタイル',
  'api': 'APIエンドポイント',
  'database': 'データベーススキーマとマイグレーション',
  'migrations': 'DBマイグレーションファイル',
  'scripts': 'ビルド・デプロイスクリプト',
  'docs': 'プロジェクトドキュメント',
  'tests': 'テストコード',
  'config': '設定ファイル',
  'original-php': '旧PHPシステム（アーカイブ）',
}

function classifyFile(filePath: string, fileName: string, content?: string) {
  const ext = path.extname(fileName).toLowerCase()
  const dir = path.dirname(filePath)
  
  let toolType = 'その他'
  let category = 'other'
  let description = ''
  let features: string[] = []
  let relatedTools: string[] = []
  
  // パスから関連ツール判定（強化版）
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/')
  const pathParts = normalizedPath.split('/').filter(p => p)
  
  Object.entries(SIDEBAR_TOOLS).forEach(([toolName, config]) => {
    config.paths.forEach(p => {
      const normalizedP = p.toLowerCase().replace(/\\/g, '/').replace(/^\//, '')
      
      // 完全一致
      if (normalizedPath.includes(normalizedP)) {
        relatedTools.push(toolName)
      }
      // パーツ単位での一致
      else if (pathParts.some(part => part === normalizedP || part.includes(normalizedP))) {
        relatedTools.push(toolName)
      }
      // ダッシュ/アンダースコア変換での一致
      else {
        const variants = [
          normalizedP,
          normalizedP.replace(/-/g, '_'),
          normalizedP.replace(/_/g, '-'),
        ]
        if (variants.some(v => normalizedPath.includes(v) || pathParts.some(part => part.includes(v)))) {
          relatedTools.push(toolName)
        }
      }
    })
  })
  
  // 重複削除
  relatedTools = [...new Set(relatedTools)]
  
  // 最初にマッチしたツールをメインツールタイプに設定
  if (relatedTools.length > 0) {
    toolType = relatedTools[0]
    const firstToolConfig = SIDEBAR_TOOLS[toolType]
    if (firstToolConfig) {
      category = firstToolConfig.category
    }
  }
  
  // 拡張子から機能判定
  const extMapping: Record<string, string[]> = {
    '.tsx': ['React Component', 'TypeScript'],
    '.jsx': ['React Component', 'JavaScript'],
    '.ts': ['TypeScript'],
    '.js': ['JavaScript'],
    '.php': ['PHP'],
    '.css': ['Styling'],
    '.scss': ['Styling', 'Sass'],
    '.json': ['Configuration', 'Data'],
    '.md': ['Documentation'],
    '.sql': ['Database'],
    '.html': ['HTML'],
    '.htm': ['HTML'],
    '.xml': ['XML'],
    '.yml': ['Configuration', 'YAML'],
    '.yaml': ['Configuration', 'YAML'],
    '.svg': ['Image', 'Vector'],
    '.jpg': ['Image'],
    '.jpeg': ['Image'],
    '.png': ['Image'],
    '.gif': ['Image'],
    '.webp': ['Image'],
    '.ico': ['Icon'],
    '.txt': ['Text'],
    '.pdf': ['Document'],
    '.py': ['Python'],
    '.rb': ['Ruby'],
    '.go': ['Go'],
    '.rs': ['Rust'],
    '.sh': ['Shell Script'],
    '.bash': ['Shell Script'],
  }
  
  features = extMapping[ext] || ['Other']
  
  if (fileName.includes('page.tsx')) features.push('Next.js Page')
  if (fileName.includes('layout.tsx')) features.push('Layout')
  if (fileName.includes('route.ts')) features.push('API Route')
  if (fileName.includes('config')) features.push('Configuration')
  
  // コンテンツから関連ツール判定（強化版）
  if (content && content.length < 50000) { // 大きすぎるファイルはスキップ
    const lowerContent = content.toLowerCase()
    Object.entries(SIDEBAR_TOOLS).forEach(([toolName, config]) => {
      // 既に含まれている場合はスキップ
      if (relatedTools.includes(toolName)) return
      
      config.paths.forEach(p => {
        const normalizedP = p.toLowerCase().replace(/\\/g, '/').replace(/^\//, '')
        
        // コンテンツ内にパスのキーワードが含まれるか
        if (lowerContent.includes(normalizedP)) {
          relatedTools.push(toolName)
        }
        // import文やコメント内でのマッチ
        else if (
          lowerContent.includes(`from '${normalizedP}`) ||
          lowerContent.includes(`from "${normalizedP}`) ||
          lowerContent.includes(`import ${normalizedP}`) ||
          lowerContent.includes(`/${normalizedP}/`) ||
          lowerContent.includes(`/${normalizedP}'`) ||
          lowerContent.includes(`/${normalizedP}"`)
        ) {
          relatedTools.push(toolName)
        }
      })
    })
  }
  
  // 重複削除（再度）
  relatedTools = [...new Set(relatedTools)]
  
  return { toolType, category, description, features, relatedTools }
}

function scanDirectory(dirPath: string, baseDir: string, results: any[] = []) {
  try {
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      if (
        item === 'node_modules' || 
        item === '.next' || 
        item === '.git' ||
        (item.startsWith('.') && item !== '.env.example')
      ) continue
      
      const fullPath = path.join(dirPath, item)
      let stat
      try {
        stat = fs.statSync(fullPath)
      } catch (e) {
        continue
      }
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, baseDir, results)
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase()
        
        const targetExts = [
          '.tsx', '.ts', '.jsx', '.js', '.php', '.py', '.rb', '.go', '.rs',
          '.html', '.htm', '.xml', '.svg',
          '.css', '.scss', '.sass', '.less',
          '.json', '.yml', '.yaml', '.toml', '.ini', '.env',
          '.md', '.txt', '.pdf',
          '.sql',
          '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.bmp',
          '.sh', '.bash', '.zsh',
        ]
        
        if (targetExts.includes(ext) || ext === '') {
          const relativePath = path.relative(baseDir, fullPath)
          
          let content = ''
          const textExts = ['.tsx', '.ts', '.jsx', '.js', '.php', '.css', '.json', '.md', '.sql', '.html', '.txt', '.yml', '.yaml', '.xml']
          if (textExts.includes(ext)) {
            try {
              content = fs.readFileSync(fullPath, 'utf-8')
            } catch (e) {}
          }
          
          const { toolType, category, description, features, relatedTools } = classifyFile(relativePath, item, content)
          
          results.push({
            path: relativePath,
            file_name: item,
            tool_type: toolType,
            category: category,
            description_simple: description,
            main_features: features,
            tech_stack: ext.replace('.', '') || 'no-ext',
            file_size: stat.size,
            last_modified: stat.mtime,
            related_tools: relatedTools,
          })
        }
      }
    }
  } catch (error) {
    console.error('Scan error:', error)
  }
  
  return results
}

export async function POST() {
  try {
    const projectRoot = path.join(process.cwd())
    console.log('🔍 スキャン開始:', projectRoot)
    
    const files = scanDirectory(projectRoot, projectRoot)
    console.log(`📊 スキャン完了: ${files.length}ファイル検出`)
    
    // ツール統計を出力
    const toolCounts: Record<string, number> = {}
    files.forEach(f => {
      if (f.tool_type !== 'その他') {
        toolCounts[f.tool_type] = (toolCounts[f.tool_type] || 0) + 1
      }
    })
    console.log('📈 ツール別ファイル数:', toolCounts)
    console.log('🔧 検出ツール数:', Object.keys(toolCounts).length)
    
    await supabase.from('code_map').delete().neq('id', 0)
    
    const batchSize = 100
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const { error } = await supabase.from('code_map').insert(batch)
      if (error) {
        console.error('Insert error:', error)
        throw error
      }
    }
    
    console.log('✅ Supabaseに保存完了')
    
    return NextResponse.json({
      success: true,
      message: 'スキャン完了',
      total: files.length,
      toolsDetected: Object.keys(toolCounts).length,
    })
  } catch (error: any) {
    console.error('❌ Scan error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    
    const { data, error, count } = await supabase
      .from('code_map')
      .select('*', { count: 'exact' })
      .order('path', { ascending: true })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      folderDescriptions,
      sidebarTools: Object.keys(SIDEBAR_TOOLS),
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
