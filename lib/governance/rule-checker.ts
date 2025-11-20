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

      try {
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
      } catch (error) {
        // ファイル読み込みエラーは無視
        console.warn(`Failed to read file: ${file}`)
      }
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
      // createClient() の直接呼び出しを検出（import文は除外）
      if (line.includes('createClient()') && !line.includes('import') && !line.includes('from')) {
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
        { pattern: /['"]sk_[a-zA-Z0-9]{32,}['"]/, name: 'Stripe等のシークレットキー' },
        { pattern: /['"]api[_-]?key['"]:\s*['"][^'"]{10,}['"]/, name: 'APIキー' },
        { pattern: /['"]password['"]:\s*['"][^'"]{6,}['"]/, name: 'パスワード' },
        { pattern: /['"]token['"]:\s*['"][^'"]{10,}['"]/, name: 'トークン' },
      ]

      for (const { pattern, name } of apiKeyPatterns) {
        if (pattern.test(line) && !line.includes('process.env')) {
          // 環境変数経由でない場合のみ警告
          violations.push({
            rule: 'C',
            file,
            line: index + 1,
            column: line.search(pattern),
            message: `機密情報（${name}）のハードコーディングを検出。process.env.XXX を使用してください。`,
            severity: 'warning'
          })
        }
      }
    })

    return violations
  }
}
