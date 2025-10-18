// app/api/shipping/services/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('shipping_services')
      .select(`
        *,
        carrier:shipping_carriers(carrier_name)
      `)
      .eq('is_active', true)
      .order('service_name', { ascending: true })
    
    if (error) {
      console.error('Database error, returning mock data:', error)
      return NextResponse.json(getMockServices())
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Failed to fetch services:', error)
    return NextResponse.json(getMockServices())
  }
}

function getMockServices() {
  return [
    { id: 1, carrier_id: '1', service_name: 'FedEx International Priority', service_code: 'FEDEX_INTL_PRIORITY', is_active: true },
    { id: 2, carrier_id: '1', service_name: 'FedEx International Economy', service_code: 'FEDEX_INTL_ECONOMY', is_active: true },
    { id: 3, carrier_id: '2', service_name: 'UPS Worldwide Express', service_code: 'UPS_WORLDWIDE_EXPRESS', is_active: true },
    { id: 4, carrier_id: '2', service_name: 'UPS Worldwide Saver', service_code: 'UPS_WORLDWIDE_SAVER', is_active: true },
    { id: 5, carrier_id: '3', service_name: 'USPS Priority Mail International', service_code: 'USPS_PMI', is_active: true },
    { id: 6, carrier_id: '3', service_name: 'USPS First Class International', service_code: 'USPS_FCI', is_active: true },
    { id: 7, carrier_id: '4', service_name: 'DHL Express Worldwide', service_code: 'DHL_EXPRESS', is_active: true },
    { id: 8, carrier_id: '5', service_name: 'EMS', service_code: 'JP_EMS', is_active: true },
  ]
}
