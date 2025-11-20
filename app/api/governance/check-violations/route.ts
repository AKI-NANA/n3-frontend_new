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
