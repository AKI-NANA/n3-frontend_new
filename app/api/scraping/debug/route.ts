// Debug endpoint to check scraping setup
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  }

  // 1. Check if puppeteer is available
  try {
    const puppeteer = require('puppeteer')
    debugInfo.checks.puppeteer = {
      installed: true,
      version: puppeteer.version || 'unknown'
    }
  } catch (error) {
    debugInfo.checks.puppeteer = {
      installed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }

  // 2. Check Supabase environment variables
  debugInfo.checks.supabase = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み (長さ: ' + process.env.NEXT_PUBLIC_SUPABASE_URL.length + ')' : '未設定',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み (長さ: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : '未設定'
  }

  // 3. Try to launch puppeteer
  if (debugInfo.checks.puppeteer.installed) {
    try {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      })
      const version = await browser.version()
      await browser.close()
      debugInfo.checks.chromeLaunch = {
        success: true,
        version: version
      }
    } catch (error) {
      debugInfo.checks.chromeLaunch = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Run: npx puppeteer browsers install chrome'
      }
    }
  }

  // 4. Test simple scraping
  if (debugInfo.checks.chromeLaunch?.success) {
    try {
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 10000 })
      const title = await page.title()
      await browser.close()
      debugInfo.checks.basicScraping = {
        success: true,
        testTitle: title
      }
    } catch (error) {
      debugInfo.checks.basicScraping = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // 5. Check current API file version
  debugInfo.checks.apiVersion = {
    file: 'app/api/scraping/execute/route.ts',
    implementation: 'structure_based_puppeteer_v2025',
    note: 'Check if this matches the deployed version'
  }

  return NextResponse.json(debugInfo, { status: 200 })
}
