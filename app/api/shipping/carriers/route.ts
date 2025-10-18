// app/api/shipping/carriers/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('shipping_carriers')
      .select('*')
      .eq('is_active', true)
      .order('carrier_name', { ascending: true })
    
    if (error) {
      console.error('Database error, returning mock data:', error)
      return NextResponse.json(getMockCarriers())
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Failed to fetch carriers:', error)
    return NextResponse.json(getMockCarriers())
  }
}

function getMockCarriers() {
  return [
    { id: 1, carrier_name: 'FedEx', carrier_code: 'FEDEX', is_active: true },
    { id: 2, carrier_name: 'UPS', carrier_code: 'UPS', is_active: true },
    { id: 3, carrier_name: 'USPS', carrier_code: 'USPS', is_active: true },
    { id: 4, carrier_name: 'DHL', carrier_code: 'DHL', is_active: true },
    { id: 5, carrier_name: 'Japan Post', carrier_code: 'JP_POST', is_active: true },
  ]
}
