/**
 * eBay Create Listing API エンドポイント
 * User Token を使用して出品を作成
 * EU責任者情報（GPSR対応）を含む
 */

import { NextRequest, NextResponse } from 'next/server'
import { euResponsiblePersonService } from '@/lib/services/euResponsiblePersonService'

export async function POST(request: NextRequest) {
  try {
    const userToken = process.env.EBAY_USER_ACCESS_TOKEN

    if (!userToken) {
      return NextResponse.json(
        { error: 'EBAY_USER_ACCESS_TOKEN が設定されていません' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const { 
      title, 
      description, 
      price, 
      quantity, 
      category,
      brand,
      manufacturer,
      // EU責任者情報（商品データから）
      eu_responsible_company_name,
      eu_responsible_address_line1,
      eu_responsible_address_line2,
      eu_responsible_city,
      eu_responsible_state_or_province,
      eu_responsible_postal_code,
      eu_responsible_country,
      eu_responsible_email,
      eu_responsible_phone,
      eu_responsible_contact_url
    } = body

    if (!title || !price) {
      return NextResponse.json(
        { error: 'title と price は必須です' },
        { status: 400 }
      )
    }

    console.log('📤 eBay Create Listing API を呼び出し中...')
    console.log('商品:', { title, price, quantity })

    // EU責任者情報の準備
    let responsiblePersons: any[] = []
    
    if (eu_responsible_company_name && eu_responsible_company_name !== 'N/A') {
      // 商品データに既にEU情報がある場合
      const responsiblePerson: any = {
        companyName: eu_responsible_company_name,
        addressLine1: eu_responsible_address_line1,
        city: eu_responsible_city,
        postalCode: eu_responsible_postal_code,
        country: eu_responsible_country,
        types: ['EUResponsiblePerson']
      }

      // オプショナルフィールドを追加
      if (eu_responsible_address_line2) {
        responsiblePerson.addressLine2 = eu_responsible_address_line2
      }
      if (eu_responsible_state_or_province) {
        responsiblePerson.stateOrProvince = eu_responsible_state_or_province
      }
      if (eu_responsible_email) {
        responsiblePerson.email = eu_responsible_email
      }
      if (eu_responsible_phone) {
        responsiblePerson.phone = eu_responsible_phone
      }
      if (eu_responsible_contact_url) {
        responsiblePerson.contactUrl = eu_responsible_contact_url
      }

      responsiblePersons = [responsiblePerson]
      console.log('✅ EU責任者情報: 商品データから取得')
    } else {
      // EU情報がない場合はDBから検索
      console.log('🔍 EU責任者情報をDBから検索中...')
      const euPerson = await euResponsiblePersonService.findResponsiblePerson(
        manufacturer || brand,
        brand
      )

      if (euPerson) {
        const responsiblePerson: any = {
          companyName: euPerson.company_name,
          addressLine1: euPerson.address_line1,
          city: euPerson.city,
          postalCode: euPerson.postal_code,
          country: euPerson.country,
          types: ['EUResponsiblePerson']
        }

        if (euPerson.address_line2) responsiblePerson.addressLine2 = euPerson.address_line2
        if (euPerson.state_or_province) responsiblePerson.stateOrProvince = euPerson.state_or_province
        if (euPerson.email) responsiblePerson.email = euPerson.email
        if (euPerson.phone) responsiblePerson.phone = euPerson.phone
        if (euPerson.contact_url) responsiblePerson.contactUrl = euPerson.contact_url

        responsiblePersons = [responsiblePerson]
        console.log('✅ EU責任者情報: DBから取得')
      } else {
        console.log('⚠️  EU責任者情報が見つかりません')
      }
    }

    // eBay Inventory API ペイロード構築
    const listingPayload: any = {
      title: title,
      description: description || '',
      price: price,
      quantity: quantity || 1,
      categoryId: category || '293'
    }

    // regulatory.responsiblePersons 追加（EU責任者情報がある場合）
    if (responsiblePersons.length > 0) {
      listingPayload.regulatory = {
        responsiblePersons: responsiblePersons
      }
      console.log('🇪🇺 EU責任者情報を出品データに追加しました')
    }

    console.log('📦 出品ペイロード:', JSON.stringify(listingPayload, null, 2))

    const response = await fetch('https://api.ebay.com/sell/inventory/v1/inventory', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(listingPayload)
    })

    const data = await response.text()

    console.log(`ステータス: ${response.status}`)

    if (!response.ok) {
      console.error('❌ eBay API エラー:', data)
      return NextResponse.json(
        {
          error: 'eBay API エラー',
          status: response.status,
          details: data
        },
        { status: response.status }
      )
    }

    console.log('✅ 出品作成成功')

    try {
      const jsonData = JSON.parse(data)
      return NextResponse.json({
        success: true,
        data: jsonData,
        hasEUInfo: responsiblePersons.length > 0,
        message: '出品を作成しました'
      })
    } catch (e) {
      return NextResponse.json({
        success: true,
        data: data,
        hasEUInfo: responsiblePersons.length > 0,
        message: '出品を作成しました（テキスト形式）'
      })
    }

  } catch (error: any) {
    console.error('❌ リクエストエラー:', error.message)
    return NextResponse.json(
      { error: error.message || 'リクエストに失敗しました' },
      { status: 500 }
    )
  }
}
