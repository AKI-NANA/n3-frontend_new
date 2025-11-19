# 🚀 SDIM（Smart Development Integration Manager）拡張開発指示書

## 📋 目次
1. [概要](#概要)
2. [現状分析](#現状分析)
3. [拡張要件](#拡張要件)
4. [実装アーキテクチャ](#実装アーキテクチャ)
5. [ステップ・バイ・ステップ実装計画](#ステップバイステップ実装計画)
6. [技術的アプローチ詳細](#技術的アプローチ詳細)
7. [Git Hooks統合](#git-hooks統合)

---

## 概要

既存の `/tools/git-deploy` デプロイツールを、**コード**・**環境変数**・**データベーススキーマ**の3要素を連動させるガバナンス・シンクロナイザー（SDIM）へと拡張します。

### 🎯 目標
開発者やAIが意識することなく、プロジェクトの健全性を常に保つ「自動ガバナンス」システムの構築。

### 🔑 3つの開発ルール

**ルールA（DB操作の抽象化）：** Supabaseクライアントへの直接SQL記述禁止。すべてのDB操作は `lib/supabase/*.ts` の抽象化層を経由。

**ルールB（マスタテーブル経由）：** データ書き込みは必ずマスタテーブル（例: `products_master`）を経由し、特定のAPIエンドポイントのみに限定。

**ルールC（環境変数）：** 機密情報は必ず環境変数（`.env`）に格納し、コードに直接ハードコーディング禁止。

---

## 現状分析

### 既存の実装（✅）

#### フロントエンド
- **メインページ:** `/app/tools/git-deploy/page.tsx`
  - デプロイタブ（Git Push/Pull、VPSデプロイ、完全同期）
  - クリーンアップタブ（バックアップ＆クリーンアップ）
  - コマンドタブ、ガイドタブ

- **クリーンアップコンポーネント:** `/app/tools/git-deploy/CleanupTab.tsx`
  - GitHubバックアップ作成
  - ローカルバックアップ作成
  - リポジトリクリーンアップ
  - 不要ファイル検出・削除

#### バックエンド API Routes

**Git操作:**
```
/api/git/status          - Git状態確認
/api/git/push            - Gitプッシュ
/api/git/pull            - Gitプル
/api/git/diff            - 差分確認
/api/git/backup          - ローカルバックアップ
/api/git/backup-github   - GitHubバックアップ
/api/git/cleanup         - 不要ファイル検出・削除
/api/git/clean-repository - リポジトリクリーンアップ
/api/git/remote-diff     - リモート差分確認
/api/git/sync-from-remote - Git同期
/api/git/sync-status     - 同期状態確認
/api/git/verify-backup   - バックアップ検証
/api/git/reset-main      - mainブランチリセット
```

**デプロイ操作:**
```
/api/deploy/vps          - VPSデプロイ
/api/deploy/full-sync    - 完全同期
/api/deploy/clean-deploy - クリーンデプロイ
/api/deploy/clean-vps    - VPSクリーンアップ
```

**環境変数操作:**
```
/api/env/sync            - 環境変数同期確認
/api/env/content         - 環境変数内容取得
```

#### データ層の良い例
- `/lib/supabase/products.ts` - 製品データの抽象化層（ルールAの実装例）
- `/lib/supabase/hts.ts` - HTSコードデータ
- `/lib/supabase/client.ts` - Supabaseクライアント生成

### 不足している実装（❌）

1. ❌ **コード監査機能**（ESLint + カスタムルールによる自動チェック）
2. ❌ **環境変数の自動同期**（現在は確認のみ、同期機能なし）
3. ❌ **DBマイグレーション管理**（完全に未実装）
4. ❌ **ルール違反警告ダッシュボード**（新機能）
5. ❌ **Git Hooks統合**（pre-commit, pre-push）
6. ❌ **DBバックアップ＆リストア機能**（Supabase DBスナップショット）

---

## 拡張要件

### 1. 3要素の連動同期パネル（Governance Synchronizer）

UI上に3つのボタンを設置し、連動した操作を可能にする。

#### ボタン1: コード監査＆デプロイ
- **機能:**
  - ESLint/Prettier実行
  - カスタムルールチェック（ルールA、B、C）
  - 問題なければVPSへデプロイ
- **実装先:** 新規タブ「ガバナンス」を追加
- **API:** `/api/governance/audit-code` (新規作成)

#### ボタン2: 環境変数シンク
- **機能:**
  - ローカルの `.env` とVPSのSecretsの差分を読み込み
  - 安全に同期（マスキング付き確認ダイアログ）
  - Git Push/Pull時に自動実行
- **実装先:** 既存の「環境変数」セクションを拡張
- **API:** `/api/env/sync-to-vps` (新規作成)

#### ボタン3: スキーママイグレーション
- **機能:**
  - 未適用のDBマイグレーションファイル（`supabase/migrations/`）を確認
  - ボタン1成功後に自動実行
  - ロールバック機能付き
- **実装先:** 新規タブ「データベース」を追加
- **API:** `/api/database/migrate` (新規作成)

### 2. 自動バックアップ＆リカバリパネル

**既存の実装を拡張:**
- ✅ GitHubバックアップ（実装済み）
- ✅ ローカルバックアップ（実装済み）
- ❌ DBバックアップ（Supabase DBのスナップショット）
- ❌ ワンクリックリカバリ（コード + DB + 環境変数を一括復元）

**追加UI:**
```
┌─────────────────────────────────────────┐
│ 📸 スナップショットリスト               │
├─────────────────────────────────────────┤
│ ✅ 2025-11-19 13:14:09                  │
│    └─ Code: backup-20251119-1314       │
│    └─ DB: snapshot-20251119-1314       │
│    └─ ENV: env-20251119-1314           │
│                                         │
│ [🔄 このポイントに復元する]            │
└─────────────────────────────────────────┘
```

**API:**
- `/api/backup/create-snapshot` (新規) - コード+DB+ENV一括バックアップ
- `/api/backup/restore-snapshot` (新規) - 一括リストア
- `/api/database/backup` (新規) - DBバックアップ
- `/api/database/restore` (新規) - DBリストア

### 3. ルール違反警告ダッシュボード

**UI配置:** ページ上部に固定表示

```tsx
{violations.length > 0 && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="w-4 h-4" />
    <AlertDescription>
      <strong>⚠️ {violations.length}件のルール違反を検出:</strong>
      <ul>
        {violations.map((v, idx) => (
          <li key={idx}>
            {v.rule}: {v.file}:{v.line} - {v.message}
          </li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}
```

**API:**
- `/api/governance/check-violations` (新規) - ルール違反の静的解析

**チェック内容:**
- ルールA違反: `createClient()` や `supabase.from()` の直接使用
- ルールB違反: マスタテーブル以外への `insert()`, `update()`, `delete()`
- ルールC違反: APIキーやパスワードのハードコーディング

---

## 実装アーキテクチャ

### ディレクトリ構造（新規追加分）

```
n3-frontend_new/
├── app/
│   ├── tools/
│   │   └── git-deploy/
│   │       ├── page.tsx                      # 既存（拡張）
│   │       ├── CleanupTab.tsx                # 既存
│   │       ├── GovernanceTab.tsx             # 🆕 新規
│   │       ├── DatabaseTab.tsx               # 🆕 新規
│   │       └── BackupSnapshotPanel.tsx       # 🆕 新規
│   └── api/
│       ├── governance/
│       │   ├── audit-code/route.ts           # 🆕 新規
│       │   └── check-violations/route.ts     # 🆕 新規
│       ├── database/
│       │   ├── migrate/route.ts              # 🆕 新規
│       │   ├── backup/route.ts               # 🆕 新規
│       │   └── restore/route.ts              # 🆕 新規
│       ├── backup/
│       │   ├── create-snapshot/route.ts      # 🆕 新規
│       │   └── restore-snapshot/route.ts     # 🆕 新規
│       └── env/
│           └── sync-to-vps/route.ts          # 🆕 新規（既存の sync を拡張）
├── lib/
│   └── governance/
│       ├── code-auditor.ts                   # 🆕 新規
│       ├── rule-checker.ts                   # 🆕 新規
│       └── migration-manager.ts              # 🆕 新規
├── .husky/
│   ├── pre-commit                            # 🆕 新規
│   └── pre-push                              # 🆕 新規
└── supabase/
    └── migrations/                           # 既存（管理対象）
```

---

## ステップ・バイ・ステップ実装計画

### フェーズ1: ガバナンス基盤構築（1-2日）

#### ステップ1.1: ルールチェッカーの実装
**ファイル:** `/lib/governance/rule-checker.ts`

```typescript
// lib/governance/rule-checker.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import { glob } from 'glob'

export interface Violation {
  rule: 'A' | 'B' | 'C'
  file: string
  line: number
  column: number
  message: string
  severity: 'error' | 'warning'
}

export class RuleChecker {
  private projectRoot: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  async checkAll(): Promise<Violation[]> {
    const violations: Violation[] = []

    // TypeScript/JavaScriptファイルを検索
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: this.projectRoot,
      ignore: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/lib/supabase/client.ts', // クライアント生成は除外
        '**/lib/supabase/server.ts'  // サーバークライアントも除外
      ]
    })

    for (const file of files) {
      const filePath = path.join(this.projectRoot, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n')

      // ルールA: Supabase直接操作の検出
      const ruleAViolations = this.checkRuleA(file, lines)
      violations.push(...ruleAViolations)

      // ルールB: マスタテーブル以外への書き込み検出
      const ruleBViolations = this.checkRuleB(file, lines)
      violations.push(...ruleBViolations)

      // ルールC: ハードコーディング検出
      const ruleCViolations = this.checkRuleC(file, lines)
      violations.push(...ruleCViolations)
    }

    return violations
  }

  private checkRuleA(file: string, lines: string[]): Violation[] {
    const violations: Violation[] = []

    // lib/supabase/ 内のファイルは除外
    if (file.startsWith('lib/supabase/')) {
      return violations
    }

    lines.forEach((line, index) => {
      // createClient() の直接呼び出しを検出
      if (line.includes('createClient()') && !line.includes('import')) {
        // lib/supabase/*.ts 経由でない直接使用を検出
        const isDirectUse = !file.startsWith('lib/supabase/')

        if (isDirectUse) {
          violations.push({
            rule: 'A',
            file,
            line: index + 1,
            column: line.indexOf('createClient()'),
            message: 'Supabaseクライアントの直接使用を検出。lib/supabase/*.ts の抽象化層を使用してください。',
            severity: 'error'
          })
        }
      }

      // .from().insert/update/delete の直接使用を検出
      const directDbOperations = /supabase\s*\.\s*from\s*\([^)]+\)\s*\.\s*(insert|update|delete)\s*\(/
      if (directDbOperations.test(line) && !file.startsWith('lib/supabase/')) {
        violations.push({
          rule: 'A',
          file,
          line: index + 1,
          column: line.search(directDbOperations),
          message: 'Supabaseへの直接書き込みを検出。lib/supabase/*.ts の関数を使用してください。',
          severity: 'error'
        })
      }
    })

    return violations
  }

  private checkRuleB(file: string, lines: string[]): Violation[] {
    const violations: Violation[] = []

    // APIルート以外でのマスタテーブル書き込みを検出
    const isApiRoute = file.includes('/api/')

    lines.forEach((line, index) => {
      const masterTableWrite = /\.from\s*\(\s*['"](\w+)_master['"]\s*\)\s*\.\s*(insert|update|delete)/
      const match = masterTableWrite.exec(line)

      if (match && !isApiRoute) {
        violations.push({
          rule: 'B',
          file,
          line: index + 1,
          column: match.index,
          message: `マスタテーブル「${match[1]}_master」への書き込みはAPIエンドポイントからのみ許可されます。`,
          severity: 'error'
        })
      }
    })

    return violations
  }

  private checkRuleC(file: string, lines: string[]): Violation[] {
    const violations: Violation[] = []

    lines.forEach((line, index) => {
      // APIキーのパターン検出
      const apiKeyPatterns = [
        /['"]sk_[a-zA-Z0-9]{32,}['"]/,        // Stripe等のシークレットキー
        /['"]api[_-]?key['"]:\s*['"][^'"]+['"]/, // api_key: "xxx"
        /['"]password['"]:\s*['"][^'"]+['"]/,    // password: "xxx"
        /['"]token['"]:\s*['"][^'"]+['"]/,       // token: "xxx"
      ]

      for (const pattern of apiKeyPatterns) {
        if (pattern.test(line) && !line.includes('process.env')) {
          // 環境変数経由でない場合のみ警告
          violations.push({
            rule: 'C',
            file,
            line: index + 1,
            column: line.search(pattern),
            message: '機密情報のハードコーディングを検出。process.env.XXX を使用してください。',
            severity: 'warning'
          })
        }
      }
    })

    return violations
  }
}
```

#### ステップ1.2: コード監査APIの実装
**ファイル:** `/app/api/governance/audit-code/route.ts`

```typescript
// app/api/governance/audit-code/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { RuleChecker } from '@/lib/governance/rule-checker'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const logs: string[] = []
    const addLog = (msg: string) => {
      console.log(msg)
      logs.push(msg)
    }

    addLog('🔍 コード監査を開始します...')

    // ステップ1: ESLintチェック
    addLog('📋 ESLintチェック中...')
    try {
      const { stdout, stderr } = await execAsync('npm run lint')
      if (stderr) {
        addLog(`⚠️ ESLint警告: ${stderr}`)
      } else {
        addLog('✅ ESLintチェック完了（問題なし）')
      }
    } catch (error: any) {
      // ESLintエラーがある場合
      addLog(`❌ ESLintエラー: ${error.message}`)
      return NextResponse.json({
        success: false,
        message: 'ESLintエラーが見つかりました',
        logs,
        eslintErrors: error.stdout
      }, { status: 400 })
    }

    // ステップ2: Prettierチェック
    addLog('🎨 Prettierチェック中...')
    try {
      const { stdout } = await execAsync('npx prettier --check .')
      addLog('✅ Prettierチェック完了（フォーマット済み）')
    } catch (error: any) {
      addLog('⚠️ フォーマットが必要なファイルがあります（自動修正可能）')
    }

    // ステップ3: カスタムルールチェック
    addLog('🛡️ カスタムルール（A, B, C）チェック中...')
    const checker = new RuleChecker()
    const violations = await checker.checkAll()

    if (violations.length > 0) {
      addLog(`❌ ${violations.length}件のルール違反を検出`)
      violations.forEach(v => {
        addLog(`  - [ルール${v.rule}] ${v.file}:${v.line} - ${v.message}`)
      })

      return NextResponse.json({
        success: false,
        message: `${violations.length}件のルール違反があります`,
        logs,
        violations
      }, { status: 400 })
    }

    addLog('✅ カスタムルールチェック完了（問題なし）')
    addLog('')
    addLog('🎉 すべての監査をパスしました！デプロイ可能です。')

    return NextResponse.json({
      success: true,
      message: 'コード監査完了（問題なし）',
      logs,
      violations: []
    })

  } catch (error) {
    console.error('Code audit failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'コード監査に失敗しました'
    }, { status: 500 })
  }
}
```

#### ステップ1.3: ルール違反チェックAPIの実装
**ファイル:** `/app/api/governance/check-violations/route.ts`

```typescript
// app/api/governance/check-violations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { RuleChecker } from '@/lib/governance/rule-checker'

export async function GET(request: NextRequest) {
  try {
    const checker = new RuleChecker()
    const violations = await checker.checkAll()

    return NextResponse.json({
      success: true,
      violations,
      count: violations.length,
      summary: {
        ruleA: violations.filter(v => v.rule === 'A').length,
        ruleB: violations.filter(v => v.rule === 'B').length,
        ruleC: violations.filter(v => v.rule === 'C').length
      }
    })
  } catch (error) {
    console.error('Violation check failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'ルール違反チェックに失敗しました'
    }, { status: 500 })
  }
}
```

---

### フェーズ2: 環境変数同期機能（1日）

#### ステップ2.1: 環境変数同期APIの拡張
**ファイル:** `/app/api/env/sync-to-vps/route.ts`

```typescript
// app/api/env/sync-to-vps/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface EnvDiff {
  localOnly: string[]
  vpsOnly: string[]
  different: Array<{ key: string; localValue: string; vpsValue: string }>
  same: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { mode } = await request.json() // mode: 'check' | 'sync'

    const logs: string[] = []
    const addLog = (msg: string) => {
      console.log(msg)
      logs.push(msg)
    }

    addLog('🔍 環境変数の差分チェック中...')

    // ローカルの .env を読み込み
    const localEnvPath = path.join(process.cwd(), '.env')
    const localEnvContent = await fs.readFile(localEnvPath, 'utf-8')
    const localEnv = parseEnv(localEnvContent)

    // VPSの .env を取得（SSH経由）
    const sshHost = 'ubuntu@tk2-236-27682.vs.sakura.ne.jp'
    const remotePath = '~/n3-frontend_new/.env'

    addLog('📡 VPSから環境変数を取得中...')
    const { stdout: vpsEnvContent } = await execAsync(`ssh ${sshHost} "cat ${remotePath}"`)
    const vpsEnv = parseEnv(vpsEnvContent)

    // 差分を計算
    const diff: EnvDiff = {
      localOnly: [],
      vpsOnly: [],
      different: [],
      same: []
    }

    const allKeys = new Set([...Object.keys(localEnv), ...Object.keys(vpsEnv)])

    for (const key of allKeys) {
      if (localEnv[key] && !vpsEnv[key]) {
        diff.localOnly.push(key)
      } else if (!localEnv[key] && vpsEnv[key]) {
        diff.vpsOnly.push(key)
      } else if (localEnv[key] !== vpsEnv[key]) {
        diff.different.push({
          key,
          localValue: maskValue(localEnv[key]),
          vpsValue: maskValue(vpsEnv[key])
        })
      } else {
        diff.same.push(key)
      }
    }

    addLog(`📊 差分結果:`)
    addLog(`  - ローカルのみ: ${diff.localOnly.length}件`)
    addLog(`  - VPSのみ: ${diff.vpsOnly.length}件`)
    addLog(`  - 値が異なる: ${diff.different.length}件`)
    addLog(`  - 一致: ${diff.same.length}件`)

    if (mode === 'check') {
      return NextResponse.json({
        success: true,
        diff,
        logs
      })
    }

    // mode === 'sync' の場合、ローカルをVPSに同期
    if (mode === 'sync') {
      addLog('🔄 VPSに環境変数を同期中...')

      // ローカルの .env をVPSにコピー
      const tempFile = `/tmp/.env.${Date.now()}`
      await fs.writeFile(tempFile, localEnvContent)

      await execAsync(`scp ${tempFile} ${sshHost}:${remotePath}`)
      await fs.unlink(tempFile)

      addLog('✅ 環境変数の同期完了')

      return NextResponse.json({
        success: true,
        message: '環境変数をVPSに同期しました',
        diff,
        logs
      })
    }

  } catch (error) {
    console.error('Env sync failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '環境変数同期に失敗しました'
    }, { status: 500 })
  }
}

function parseEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {}

  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const [key, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=').replace(/^["']|["']$/g, '')

    if (key) {
      env[key.trim()] = value
    }
  })

  return env
}

function maskValue(value: string): string {
  if (value.length <= 8) return '****'
  return value.substring(0, 4) + '****' + value.substring(value.length - 4)
}
```

---

### フェーズ3: データベースマイグレーション管理（1-2日）

#### ステップ3.1: マイグレーションマネージャーの実装
**ファイル:** `/lib/governance/migration-manager.ts`

```typescript
// lib/governance/migration-manager.ts
import * as fs from 'fs/promises'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

export interface Migration {
  id: string
  name: string
  applied: boolean
  appliedAt?: Date
  sql?: string
}

export class MigrationManager {
  private supabaseUrl: string
  private supabaseKey: string
  private migrationsDir: string

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    this.migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  }

  async listMigrations(): Promise<Migration[]> {
    const supabase = createClient(this.supabaseUrl, this.supabaseKey)

    // マイグレーション履歴テーブルを取得
    const { data: appliedMigrations } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('applied_at', { ascending: false })

    // ローカルのマイグレーションファイルを取得
    const files = await fs.readdir(this.migrationsDir)
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()

    const migrations: Migration[] = []

    for (const file of sqlFiles) {
      const id = file.replace('.sql', '')
      const applied = appliedMigrations?.some(m => m.version === id) || false
      const appliedRecord = appliedMigrations?.find(m => m.version === id)

      migrations.push({
        id,
        name: file,
        applied,
        appliedAt: appliedRecord ? new Date(appliedRecord.applied_at) : undefined
      })
    }

    return migrations
  }

  async applyMigration(migrationId: string): Promise<void> {
    const supabase = createClient(this.supabaseUrl, this.supabaseKey)

    // マイグレーションファイルを読み込み
    const filePath = path.join(this.migrationsDir, `${migrationId}.sql`)
    const sql = await fs.readFile(filePath, 'utf-8')

    // SQLを実行（Supabaseの場合、REST APIまたはPostgreSQL接続が必要）
    // この例ではREST APIを使用
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      throw new Error(`Migration failed: ${error.message}`)
    }

    // マイグレーション履歴に記録
    await supabase
      .from('schema_migrations')
      .insert({
        version: migrationId,
        applied_at: new Date().toISOString()
      })
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    const supabase = createClient(this.supabaseUrl, this.supabaseKey)

    // ロールバック用のSQLを探す（.down.sql）
    const downFilePath = path.join(this.migrationsDir, `${migrationId}.down.sql`)

    try {
      const sql = await fs.readFile(downFilePath, 'utf-8')
      const { error } = await supabase.rpc('exec_sql', { sql })

      if (error) {
        throw new Error(`Rollback failed: ${error.message}`)
      }

      // マイグレーション履歴から削除
      await supabase
        .from('schema_migrations')
        .delete()
        .eq('version', migrationId)

    } catch (error) {
      throw new Error(`Rollback file not found: ${downFilePath}`)
    }
  }
}
```

#### ステップ3.2: マイグレーションAPIの実装
**ファイル:** `/app/api/database/migrate/route.ts`

```typescript
// app/api/database/migrate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MigrationManager } from '@/lib/governance/migration-manager'

export async function GET(request: NextRequest) {
  try {
    const manager = new MigrationManager()
    const migrations = await manager.listMigrations()

    const pending = migrations.filter(m => !m.applied)
    const applied = migrations.filter(m => m.applied)

    return NextResponse.json({
      success: true,
      migrations,
      summary: {
        total: migrations.length,
        applied: applied.length,
        pending: pending.length
      }
    })
  } catch (error) {
    console.error('List migrations failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'マイグレーション一覧取得に失敗しました'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { migrationId, action } = await request.json()
    // action: 'apply' | 'rollback'

    const manager = new MigrationManager()

    const logs: string[] = []
    const addLog = (msg: string) => {
      console.log(msg)
      logs.push(msg)
    }

    if (action === 'apply') {
      addLog(`🔧 マイグレーション ${migrationId} を適用中...`)
      await manager.applyMigration(migrationId)
      addLog('✅ マイグレーション適用完了')
    } else if (action === 'rollback') {
      addLog(`🔄 マイグレーション ${migrationId} をロールバック中...`)
      await manager.rollbackMigration(migrationId)
      addLog('✅ ロールバック完了')
    }

    return NextResponse.json({
      success: true,
      message: `マイグレーション${action === 'apply' ? '適用' : 'ロールバック'}完了`,
      logs
    })

  } catch (error) {
    console.error('Migration operation failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'マイグレーション操作に失敗しました'
    }, { status: 500 })
  }
}
```

---

### フェーズ4: UI拡張（2-3日）

#### ステップ4.1: ガバナンスタブの追加
**ファイル:** `/app/tools/git-deploy/GovernanceTab.tsx`

```typescript
// app/tools/git-deploy/GovernanceTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Code,
  Database,
  Key
} from 'lucide-react'

export default function GovernanceTab() {
  const [violations, setViolations] = useState<any[]>([])
  const [checkingViolations, setCheckingViolations] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditResult, setAuditResult] = useState<any>(null)

  // ページロード時にルール違反をチェック
  useEffect(() => {
    checkViolations()
  }, [])

  const checkViolations = async () => {
    setCheckingViolations(true)
    try {
      const response = await fetch('/api/governance/check-violations')
      const data = await response.json()
      if (data.success) {
        setViolations(data.violations)
      }
    } catch (error) {
      console.error('Violation check failed:', error)
    } finally {
      setCheckingViolations(false)
    }
  }

  const handleAudit = async () => {
    setAuditLoading(true)
    setAuditResult(null)

    try {
      const response = await fetch('/api/governance/audit-code', { method: 'POST' })
      const data = await response.json()

      setAuditResult(data)

      // 監査後に違反を再チェック
      await checkViolations()
    } catch (error) {
      console.error('Audit failed:', error)
      setAuditResult({
        success: false,
        message: 'コード監査に失敗しました'
      })
    } finally {
      setAuditLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ルール違反警告ダッシュボード */}
      {violations.length > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            <strong className="text-lg">⚠️ {violations.length}件のルール違反を検出:</strong>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {violations.map((v, idx) => (
                <div key={idx} className="bg-red-50 dark:bg-red-900/20 p-3 rounded border">
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive">ルール{v.rule}</Badge>
                    <div className="flex-1">
                      <div className="font-mono text-sm text-red-700 dark:text-red-300">
                        {v.file}:{v.line}:{v.column}
                      </div>
                      <div className="text-sm mt-1">{v.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {violations.length === 0 && !checkingViolations && (
        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription>
            ✅ <strong>コードは健全です！</strong> ルール違反は検出されませんでした。
          </AlertDescription>
        </Alert>
      )}

      {/* 3要素連動同期パネル */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            🛡️ ガバナンス同期パネル
          </CardTitle>
          <CardDescription>
            コード・環境変数・データベースの3要素を連動チェック＆デプロイ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* ボタン1: コード監査＆デプロイ */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
            <div className="flex items-center gap-3 mb-3">
              <Code className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-lg">1️⃣ コード監査＆デプロイ</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ESLint、Prettier、カスタムルール（A, B, C）をチェックし、問題なければデプロイを許可します。
            </p>

            <Button
              onClick={handleAudit}
              disabled={auditLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {auditLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  監査中...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  コード監査を実行
                </>
              )}
            </Button>

            {auditResult && (
              <Alert
                variant={auditResult.success ? 'default' : 'destructive'}
                className="mt-4"
              >
                {auditResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <AlertDescription>
                  {auditResult.message}
                  {auditResult.logs && (
                    <div className="mt-3 bg-slate-900 text-green-400 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto">
                      {auditResult.logs.map((log: string, idx: number) => (
                        <div key={idx}>{log}</div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* ボタン2: 環境変数シンク */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10">
            <div className="flex items-center gap-3 mb-3">
              <Key className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-lg">2️⃣ 環境変数シンク</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ローカルの .env とVPSの環境変数の差分を確認し、安全に同期します。
            </p>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                // 既存の環境変数タブに遷移、または専用UIを表示
                alert('環境変数シンク機能は既存のタブで利用可能です')
              }}
            >
              <Key className="w-4 h-4 mr-2" />
              環境変数を同期
            </Button>
          </div>

          {/* ボタン3: スキーママイグレーション */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-lg">3️⃣ スキーママイグレーション</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              未適用のDBマイグレーションファイルを確認し、コード監査成功後に適用します。
            </p>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                // データベースタブに遷移
                alert('スキーママイグレーション機能は「データベース」タブで利用可能です')
              }}
            >
              <Database className="w-4 h-4 mr-2" />
              マイグレーションを確認
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ルール説明カード */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">📖 開発ルール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Badge>A</Badge>
            <div>
              <strong>DB操作の抽象化:</strong> Supabaseへの直接SQL記述禁止。
              lib/supabase/*.ts の抽象化層を経由すること。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Badge>B</Badge>
            <div>
              <strong>マスタテーブル経由:</strong> データ書き込みは必ずマスタテーブル
              （例: products_master）を経由し、APIエンドポイントのみに限定。
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Badge>C</Badge>
            <div>
              <strong>環境変数:</strong> 機密情報（APIキー等）は必ず環境変数（.env）に格納し、
              コードに直接ハードコーディング禁止。
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### ステップ4.2: データベースタブの追加
**ファイル:** `/app/tools/git-deploy/DatabaseTab.tsx`

```typescript
// app/tools/git-deploy/DatabaseTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react'

export default function DatabaseTab() {
  const [migrations, setMigrations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [operationResult, setOperationResult] = useState<any>(null)

  useEffect(() => {
    loadMigrations()
  }, [])

  const loadMigrations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/database/migrate')
      const data = await response.json()
      if (data.success) {
        setMigrations(data.migrations)
      }
    } catch (error) {
      console.error('Failed to load migrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMigration = async (migrationId: string, action: 'apply' | 'rollback') => {
    setOperationResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/database/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrationId, action })
      })

      const data = await response.json()
      setOperationResult(data)

      if (data.success) {
        await loadMigrations()
      }
    } catch (error) {
      console.error('Migration operation failed:', error)
      setOperationResult({
        success: false,
        message: 'マイグレーション操作に失敗しました'
      })
    } finally {
      setLoading(false)
    }
  }

  const pendingMigrations = migrations.filter(m => !m.applied)
  const appliedMigrations = migrations.filter(m => m.applied)

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            📊 マイグレーション状態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{migrations.length}</div>
              <div className="text-sm text-muted-foreground">合計</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{appliedMigrations.length}</div>
              <div className="text-sm text-muted-foreground">適用済み</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{pendingMigrations.length}</div>
              <div className="text-sm text-muted-foreground">未適用</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 未適用マイグレーション */}
      {pendingMigrations.length > 0 && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-800">
          <CardHeader className="bg-yellow-50 dark:bg-yellow-900/20">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              ⚠️ 未適用のマイグレーション
            </CardTitle>
            <CardDescription>
              以下のマイグレーションがまだ適用されていません
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {pendingMigrations.map((migration, idx) => (
              <div key={migration.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-semibold">{migration.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {migration.id}</div>
                </div>
                <Button
                  onClick={() => handleMigration(migration.id, 'apply')}
                  disabled={loading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-3 h-3 mr-1" />
                  適用
                </Button>
              </div>
            ))}

            {pendingMigrations.length > 1 && (
              <Button
                onClick={async () => {
                  for (const migration of pendingMigrations) {
                    await handleMigration(migration.id, 'apply')
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    適用中...
                  </>
                ) : (
                  <>すべてのマイグレーションを適用</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 適用済みマイグレーション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            ✅ 適用済みマイグレーション
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {appliedMigrations.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              適用済みのマイグレーションはありません
            </div>
          ) : (
            appliedMigrations.map((migration) => (
              <div key={migration.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm">{migration.name}</div>
                  <div className="text-xs text-muted-foreground">
                    適用日時: {migration.appliedAt ? new Date(migration.appliedAt).toLocaleString('ja-JP') : 'N/A'}
                  </div>
                </div>
                <Button
                  onClick={() => handleMigration(migration.id, 'rollback')}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  ロールバック
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 操作結果 */}
      {operationResult && (
        <Alert variant={operationResult.success ? 'default' : 'destructive'}>
          {operationResult.success ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <AlertDescription>
            {operationResult.message}
            {operationResult.logs && (
              <div className="mt-3 bg-slate-900 text-green-400 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                {operationResult.logs.map((log: string, idx: number) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
```

#### ステップ4.3: メインページへのタブ統合
**ファイル:** `/app/tools/git-deploy/page.tsx` の修正

```typescript
// page.tsx に以下を追加
import GovernanceTab from './GovernanceTab'
import DatabaseTab from './DatabaseTab'

// activeTab の型を拡張
const [activeTab, setActiveTab] = useState<'deploy' | 'commands' | 'guide' | 'cleanup' | 'governance' | 'database'>('deploy')

// タブボタンに追加
<Button
  variant={activeTab === 'governance' ? 'default' : 'ghost'}
  onClick={() => setActiveTab('governance')}
>
  <Shield className="w-4 h-4 mr-2" />
  ガバナンス
</Button>

<Button
  variant={activeTab === 'database' ? 'default' : 'ghost'}
  onClick={() => setActiveTab('database')}
>
  <Database className="w-4 h-4 mr-2" />
  データベース
</Button>

// タブコンテンツに追加
{activeTab === 'governance' && <GovernanceTab />}
{activeTab === 'database' && <DatabaseTab />}
```

---

### フェーズ5: Git Hooks統合（1日）

#### ステップ5.1: Huskyのセットアップ

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run pre-commit-check"
npx husky add .husky/pre-push "npm run pre-push-check"
```

#### ステップ5.2: package.json にスクリプト追加

```json
{
  "scripts": {
    "pre-commit-check": "node scripts/pre-commit-check.js",
    "pre-push-check": "node scripts/pre-push-check.js"
  }
}
```

#### ステップ5.3: pre-commit チェックスクリプト
**ファイル:** `/scripts/pre-commit-check.js`

```javascript
// scripts/pre-commit-check.js
const { execSync } = require('child_process')

console.log('🔍 Pre-commit チェック開始...')

try {
  // 1. ESLintチェック
  console.log('📋 ESLintチェック中...')
  execSync('npm run lint', { stdio: 'inherit' })
  console.log('✅ ESLint通過')

  // 2. Prettierチェック
  console.log('🎨 Prettierチェック中...')
  execSync('npx prettier --check .', { stdio: 'inherit' })
  console.log('✅ Prettier通過')

  // 3. カスタムルールチェック（ローカルで実行）
  console.log('🛡️ カスタムルールチェック中...')
  const { RuleChecker } = require('../lib/governance/rule-checker')
  const checker = new RuleChecker()

  checker.checkAll().then(violations => {
    if (violations.length > 0) {
      console.error(`❌ ${violations.length}件のルール違反を検出:`)
      violations.forEach(v => {
        console.error(`  [ルール${v.rule}] ${v.file}:${v.line} - ${v.message}`)
      })
      process.exit(1)
    }
    console.log('✅ カスタムルール通過')
    console.log('')
    console.log('🎉 すべてのチェックをパス！コミット可能です。')
  })

} catch (error) {
  console.error('❌ Pre-commit チェック失敗')
  process.exit(1)
}
```

#### ステップ5.4: pre-push チェックスクリプト
**ファイル:** `/scripts/pre-push-check.js`

```javascript
// scripts/pre-push-check.js
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Pre-push チェック開始...')

try {
  // 1. 環境変数の同期確認
  console.log('🔑 環境変数の同期状態を確認中...')

  const localEnvPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(localEnvPath)) {
    console.warn('⚠️ .env ファイルが見つかりません')
  } else {
    console.log('✅ 環境変数ファイル確認')
    // 注: 実際の同期チェックはVPSへのSSH接続が必要なため、ローカルでは警告のみ
    console.log('💡 VPSとの環境変数同期は /tools/git-deploy から手動で確認してください')
  }

  // 2. ビルドチェック（オプション）
  console.log('🔨 ビルドチェック中...')
  try {
    execSync('npm run build', { stdio: 'inherit' })
    console.log('✅ ビルド成功')
  } catch (error) {
    console.error('❌ ビルド失敗。プッシュ前に修正してください。')
    process.exit(1)
  }

  console.log('')
  console.log('🎉 すべてのチェックをパス！プッシュ可能です。')

} catch (error) {
  console.error('❌ Pre-push チェック失敗')
  process.exit(1)
}
```

---

## 技術的アプローチ詳細

### 1. ルールA, B, Cの実装方法

#### ルールA: Supabase直接操作の検出
**技術:** 正規表現ベースの静的解析

```typescript
// lib/supabase/ 以外でのcreateClient()使用を検出
const directClientUsePattern = /createClient\(\)/
const directDbOperationPattern = /supabase\s*\.\s*from\s*\([^)]+\)\s*\.\s*(insert|update|delete)\s*\(/

// ファイルごとにチェック
if (!file.startsWith('lib/supabase/') && directClientUsePattern.test(content)) {
  // 違反を記録
}
```

**強制方法:**
- pre-commitフックで自動チェック
- CI/CDパイプラインで必須チェック
- VSCode拡張（ESLint custom rule）で警告表示

#### ルールB: マスタテーブル経由の強制
**技術:** データベーストリガー + APIゲートウェイパターン

```sql
-- Supabase上でトリガーを設定
CREATE OR REPLACE FUNCTION check_master_table_access()
RETURNS TRIGGER AS $$
BEGIN
  -- APIロール以外からの直接書き込みを拒否
  IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Direct write to master table is not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_master_table_access
BEFORE INSERT OR UPDATE OR DELETE ON products_master
FOR EACH ROW EXECUTE FUNCTION check_master_table_access();
```

**API層での実装:**
```typescript
// lib/supabase/products.ts
export async function updateProduct(id: string, updates: ProductUpdate) {
  // この関数のみがproducts_masterへの書き込みを許可される
  const { data, error } = await supabase
    .from('products_master')
    .update(updates)
    .eq('id', id)

  if (error) throw error
  return data
}
```

#### ルールC: 環境変数ハードコーディングの検出
**技術:** 正規表現 + ESLint custom rule

```typescript
// .eslintrc.js に追加
module.exports = {
  rules: {
    'no-hardcoded-credentials': 'error'
  }
}

// ESLint custom rule
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '機密情報のハードコーディングを禁止'
    }
  },
  create(context) {
    return {
      Literal(node) {
        const value = node.value
        if (typeof value === 'string') {
          // APIキーパターンを検出
          if (/sk_[a-zA-Z0-9]{32,}/.test(value)) {
            context.report({
              node,
              message: 'APIキーをハードコーディングしないでください。環境変数を使用してください。'
            })
          }
        }
      }
    }
  }
}
```

### 2. 環境変数同期の自動化

**アーキテクチャ:**
```
┌─────────────┐      SSH/SCP      ┌──────────┐
│ Local .env  │ ←───────────────→ │ VPS .env │
└─────────────┘                    └──────────┘
       ↓                                 ↓
   [差分検出]                        [バックアップ]
       ↓                                 ↓
  [マスキング]                       [適用]
       ↓
 [ユーザー確認]
```

**セキュリティ:**
- 機密情報は`****`でマスキング
- 同期前に必ずバックアップ
- 双方向同期（ローカル→VPS、VPS→ローカル）をサポート

### 3. DBマイグレーション管理

**アーキテクチャ:**
```
supabase/migrations/
├── 20250101000000_initial_schema.sql
├── 20250102000000_add_products_master.sql
└── 20250103000000_add_user_roles.sql

↓ Migration Manager

schema_migrations テーブル
├── version: 20250101000000 | applied_at: 2025-01-01 10:00:00
├── version: 20250102000000 | applied_at: 2025-01-02 11:00:00
└── version: 20250103000000 | applied_at: (pending)
```

**実装:**
- `schema_migrations` テーブルで適用履歴を管理
- `.sql` ファイルをバージョン順に実行
- `.down.sql` でロールバックをサポート

---

## Git Hooks統合

### 開発フロー（自動化後）

```
開発者がコミット実行
    ↓
[pre-commit フック]
    ├─ ESLint
    ├─ Prettier
    └─ カスタムルール（A, B, C）
    ↓
すべて通過 → コミット成功
    ↓
開発者がプッシュ実行
    ↓
[pre-push フック]
    ├─ 環境変数同期チェック
    └─ ビルドチェック
    ↓
すべて通過 → プッシュ成功
    ↓
GitHub Actions（CI/CD）
    ├─ 再度ルールチェック
    ├─ DBマイグレーション適用
    └─ VPSデプロイ
```

### CI/CDパイプライン（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy with Governance

on:
  push:
    branches: [main, claude/*]

jobs:
  governance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run governance checks
        run: |
          npm run lint
          npm run check:violations

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

  deploy:
    needs: governance-check
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        run: |
          # VPSにSSH接続してデプロイ
          ssh ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} << 'EOF'
            cd ~/n3-frontend_new
            git pull
            npm install
            npm run build
            pm2 restart n3-frontend
          EOF
```

---

## まとめ

### 実装の優先順位

**高優先度（必須）:**
1. ✅ ルールチェッカーの実装（フェーズ1）
2. ✅ コード監査APIの実装（フェーズ1）
3. ✅ ガバナンスタブの追加（フェーズ4）
4. ✅ Git Hooksの統合（フェーズ5）

**中優先度（推奨）:**
5. ✅ 環境変数同期の自動化（フェーズ2）
6. ✅ データベースタブの追加（フェーズ4）

**低優先度（拡張）:**
7. ⭕ DBマイグレーション管理（フェーズ3）
8. ⭕ DBバックアップ＆リストア（フェーズ6）

### 期待される効果

1. **開発品質の向上:** ルール違反を自動検出し、早期に修正
2. **デプロイの安全性:** 3要素（コード・環境・DB）の同期を保証
3. **開発効率の向上:** 手動チェックを自動化し、レビュー時間を短縮
4. **属人化の防止:** ルールを自動強制し、誰が開発しても同じ品質を維持

### 次のステップ

1. このドキュメントをチームで共有
2. フェーズ1から順次実装を開始
3. 各フェーズ完了後にテストとレビューを実施
4. 本番環境への段階的な導入

---

**作成日:** 2025-11-19
**バージョン:** 1.0
**作成者:** Claude (Anthropic)
