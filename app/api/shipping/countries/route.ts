// app/api/shipping/countries/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('shipping_country_zones')
      .select(`
        *,
        zone:shipping_zones(zone_code, zone_name)
      `)
      .order('country_name', { ascending: true })
    
    if (error) {
      console.error('Database error, returning mock data:', error)
      return NextResponse.json(getMockCountries())
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Failed to fetch countries:', error)
    return NextResponse.json(getMockCountries())
  }
}

function getMockCountries() {
  return [
    { id: 1, country_code: 'US', country_name: 'United States', zone_code: 'ZONE_1', zone_name: 'Zone 1', flag: '🇺🇸' },
    { id: 2, country_code: 'CA', country_name: 'Canada', zone_code: 'ZONE_1', zone_name: 'Zone 1', flag: '🇨🇦' },
    { id: 3, country_code: 'MX', country_name: 'Mexico', zone_code: 'ZONE_1', zone_name: 'Zone 1', flag: '🇲🇽' },
    { id: 4, country_code: 'GB', country_name: 'United Kingdom', zone_code: 'ZONE_2', zone_name: 'Zone 2', flag: '🇬🇧' },
    { id: 5, country_code: 'DE', country_name: 'Germany', zone_code: 'ZONE_2', zone_name: 'Zone 2', flag: '🇩🇪' },
    { id: 6, country_code: 'FR', country_name: 'France', zone_code: 'ZONE_2', zone_name: 'Zone 2', flag: '🇫🇷' },
    { id: 7, country_code: 'IT', country_name: 'Italy', zone_code: 'ZONE_2', zone_name: 'Zone 2', flag: '🇮🇹' },
    { id: 8, country_code: 'ES', country_name: 'Spain', zone_code: 'ZONE_2', zone_name: 'Zone 2', flag: '🇪🇸' },
    { id: 9, country_code: 'NL', country_name: 'Netherlands', zone_code: 'ZONE_2', zone_name: 'Zone 2', flag: '🇳🇱' },
    { id: 10, country_code: 'BE', country_name: 'Belgium', zone_code: 'ZONE_2', zone_name: 'Zone 2', flag: '🇧🇪' },
    { id: 11, country_code: 'PL', country_name: 'Poland', zone_code: 'ZONE_3', zone_name: 'Zone 3', flag: '🇵🇱' },
    { id: 12, country_code: 'CZ', country_name: 'Czech Republic', zone_code: 'ZONE_3', zone_name: 'Zone 3', flag: '🇨🇿' },
    { id: 13, country_code: 'HU', country_name: 'Hungary', zone_code: 'ZONE_3', zone_name: 'Zone 3', flag: '🇭🇺' },
    { id: 14, country_code: 'JP', country_name: 'Japan', zone_code: 'ZONE_4', zone_name: 'Zone 4', flag: '🇯🇵' },
    { id: 15, country_code: 'CN', country_name: 'China', zone_code: 'ZONE_4', zone_name: 'Zone 4', flag: '🇨🇳' },
    { id: 16, country_code: 'KR', country_name: 'South Korea', zone_code: 'ZONE_4', zone_name: 'Zone 4', flag: '🇰🇷' },
    { id: 17, country_code: 'AU', country_name: 'Australia', zone_code: 'ZONE_5', zone_name: 'Zone 5', flag: '🇦🇺' },
    { id: 18, country_code: 'NZ', country_name: 'New Zealand', zone_code: 'ZONE_5', zone_name: 'Zone 5', flag: '🇳🇿' },
    { id: 19, country_code: 'BR', country_name: 'Brazil', zone_code: 'ZONE_6', zone_name: 'Zone 6', flag: '🇧🇷' },
    { id: 20, country_code: 'AR', country_name: 'Argentina', zone_code: 'ZONE_6', zone_name: 'Zone 6', flag: '🇦🇷' },
  ]
}
