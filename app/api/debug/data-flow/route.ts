// app/api/debug/data-flow/route.ts
// データフローの完全追跡

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('id') || '322'
  
  const supabase = await createClient()
  
  const flow: any = {
    productId,
    timestamp: new Date().toISOString(),
    steps: {}
  }

  try {
    // ステップ1: 生のデータベースクエリ
    flow.steps.step1_raw_database = {
      name: 'データベースから直接取得',
      query: `SELECT * FROM products_master WHERE id = ${productId}`
    }
    
    const { data: rawData, error: rawError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
      .single()
    
    if (rawError) {
      flow.steps.step1_raw_database.error = rawError.message
      flow.steps.step1_raw_database.status = 'FAILED'
    } else {
      flow.steps.step1_raw_database.status = 'SUCCESS'
      flow.steps.step1_raw_database.data = {
        id: rawData.id,
        idType: typeof rawData.id,
        title: rawData.title?.substring(0, 50),
        price_jpy: rawData.price_jpy,
        price_jpyType: typeof rawData.price_jpy,
        listing_data: rawData.listing_data,
        listing_dataType: typeof rawData.listing_data,
        listing_dataKeys: rawData.listing_data ? Object.keys(rawData.listing_data) : [],
        weight_g: rawData.listing_data?.weight_g,
        weight_gType: typeof rawData.listing_data?.weight_g
      }
    }

    // ステップ2: fetchProducts関数を通した取得
    flow.steps.step2_fetchProducts = {
      name: 'fetchProducts関数経由',
      description: 'lib/supabase/products.tsのfetchProducts()'
    }
    
    const { data: products, error: fetchError } = await supabase
      .from('products_master')
      .select('*')
      .eq('id', productId)
    
    if (fetchError) {
      flow.steps.step2_fetchProducts.error = fetchError.message
      flow.steps.step2_fetchProducts.status = 'FAILED'
    } else {
      const product = products[0]
      
      // マッピング処理をシミュレート
      const mapped = {
        ...product,
        english_title: product.title_en
      }
      
      flow.steps.step2_fetchProducts.status = 'SUCCESS'
      flow.steps.step2_fetchProducts.beforeMapping = {
        id: product.id,
        idType: typeof product.id,
        price_jpy: product.price_jpy,
        price_jpyType: typeof product.price_jpy,
        listing_data: product.listing_data,
        weight_g: product.listing_data?.weight_g
      }
      flow.steps.step2_fetchProducts.afterMapping = {
        id: mapped.id,
        idType: typeof mapped.id,
        price_jpy: mapped.price_jpy,
        price_jpyType: typeof mapped.price_jpy,
        english_title: mapped.english_title,
        listing_data: mapped.listing_data,
        weight_g: mapped.listing_data?.weight_g
      }
    }

    // ステップ3: 送料計算APIに送信される形式
    flow.steps.step3_shipping_api_format = {
      name: '送料計算APIへの送信',
      description: 'POST /api/tools/shipping-calculate'
    }
    
    if (products && products[0]) {
      const product = products[0]
      const mapped = { ...product, english_title: product.title_en }
      
      // 送料計算APIで実際に使用される値
      const listingData = mapped.listing_data || {}
      const weight_g = listingData.weight_g
      const price_jpy = mapped.price_jpy
      
      flow.steps.step3_shipping_api_format.extractedValues = {
        price_jpy: {
          value: price_jpy,
          type: typeof price_jpy,
          exists: price_jpy !== null && price_jpy !== undefined,
          isNumber: typeof price_jpy === 'number',
          isPositive: typeof price_jpy === 'number' && price_jpy > 0
        },
        weight_g: {
          value: weight_g,
          type: typeof weight_g,
          exists: weight_g !== null && weight_g !== undefined,
          isNumber: typeof weight_g === 'number',
          isPositive: typeof weight_g === 'number' && weight_g > 0
        }
      }
      
      // 検証ロジックをシミュレート
      const validation = {
        price_jpy_valid: !!price_jpy && typeof price_jpy === 'number' && price_jpy > 0,
        weight_g_valid: !!weight_g && typeof weight_g === 'number' && weight_g > 0,
        overall_valid: false
      }
      validation.overall_valid = validation.price_jpy_valid && validation.weight_g_valid
      
      flow.steps.step3_shipping_api_format.validation = validation
      
      if (!validation.overall_valid) {
        flow.steps.step3_shipping_api_format.status = 'WOULD_FAIL'
        flow.steps.step3_shipping_api_format.wouldFailWith = '重量または価格情報が不足しています'
      } else {
        flow.steps.step3_shipping_api_format.status = 'WOULD_PASS'
      }
    }

    // ステップ4: 型の問題診断
    flow.steps.step4_type_diagnosis = {
      name: '型の問題診断',
      checks: {}
    }
    
    if (rawData) {
      const checks = flow.steps.step4_type_diagnosis.checks
      
      // price_jpyの型チェック
      checks.price_jpy = {
        dbValue: rawData.price_jpy,
        dbType: typeof rawData.price_jpy,
        isString: typeof rawData.price_jpy === 'string',
        isNumber: typeof rawData.price_jpy === 'number',
        isNull: rawData.price_jpy === null,
        isUndefined: rawData.price_jpy === undefined,
        needsConversion: typeof rawData.price_jpy === 'string',
        convertedValue: typeof rawData.price_jpy === 'string' 
          ? parseFloat(rawData.price_jpy) 
          : rawData.price_jpy
      }
      
      // weight_gの型チェック
      const weight = rawData.listing_data?.weight_g
      checks.weight_g = {
        dbValue: weight,
        dbType: typeof weight,
        isString: typeof weight === 'string',
        isNumber: typeof weight === 'number',
        isNull: weight === null,
        isUndefined: weight === undefined,
        needsConversion: typeof weight === 'string',
        convertedValue: typeof weight === 'string' 
          ? parseFloat(weight) 
          : weight
      }
      
      // listing_dataの型チェック
      checks.listing_data = {
        exists: !!rawData.listing_data,
        type: typeof rawData.listing_data,
        isObject: typeof rawData.listing_data === 'object',
        isNull: rawData.listing_data === null,
        keys: rawData.listing_data ? Object.keys(rawData.listing_data) : [],
        stringified: JSON.stringify(rawData.listing_data)
      }
    }

    // 最終判定
    flow.finalDiagnosis = {
      canCalculateShipping: false,
      reasons: []
    }
    
    if (flow.steps.step3_shipping_api_format?.validation) {
      const val = flow.steps.step3_shipping_api_format.validation
      flow.finalDiagnosis.canCalculateShipping = val.overall_valid
      
      if (!val.price_jpy_valid) {
        flow.finalDiagnosis.reasons.push('price_jpy が無効または不足')
      }
      if (!val.weight_g_valid) {
        flow.finalDiagnosis.reasons.push('weight_g が無効または不足')
      }
      
      if (flow.finalDiagnosis.canCalculateShipping) {
        flow.finalDiagnosis.message = '✅ 送料計算可能'
      } else {
        flow.finalDiagnosis.message = '❌ 送料計算不可'
      }
    }

    // 修正提案
    flow.fixSuggestions = []
    
    const typeChecks = flow.steps.step4_type_diagnosis?.checks
    if (typeChecks) {
      if (typeChecks.price_jpy?.isNull || typeChecks.price_jpy?.isUndefined) {
        flow.fixSuggestions.push({
          field: 'price_jpy',
          issue: 'NULLまたはundefined',
          sql: `UPDATE products_master SET price_jpy = 1500 WHERE id = ${productId};`
        })
      } else if (typeChecks.price_jpy?.isString) {
        flow.fixSuggestions.push({
          field: 'price_jpy',
          issue: '文字列型で格納されている',
          sql: `UPDATE products_master SET price_jpy = price_jpy::numeric WHERE id = ${productId};`
        })
      }
      
      if (typeChecks.weight_g?.isNull || typeChecks.weight_g?.isUndefined) {
        flow.fixSuggestions.push({
          field: 'weight_g',
          issue: 'NULLまたはundefined',
          sql: `UPDATE products_master SET listing_data = jsonb_set(COALESCE(listing_data, '{}'::jsonb), '{weight_g}', '500'::jsonb) WHERE id = ${productId};`
        })
      } else if (typeChecks.weight_g?.isString) {
        flow.fixSuggestions.push({
          field: 'weight_g',
          issue: '文字列型で格納されている',
          note: 'listing_dataはJSONBなので、数値として格納されるべき'
        })
      }
    }

    return NextResponse.json(flow, { status: 200 })

  } catch (error) {
    flow.error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
    return NextResponse.json(flow, { status: 500 })
  }
}
