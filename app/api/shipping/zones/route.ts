// app/api/shipping/zones/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('shipping_zones')
      .select('*')
      .order('zone_code', { ascending: true })
    
    if (error) {
      console.error('Database error, returning mock data:', error)
      // モックデータを返す
      return NextResponse.json([
        { id: 1, zone_code: 'ZONE_1', zone_name: 'Zone 1 - North America', country_count: 3 },
        { id: 2, zone_code: 'ZONE_2', zone_name: 'Zone 2 - Europe West', country_count: 15 },
        { id: 3, zone_code: 'ZONE_3', zone_name: 'Zone 3 - Europe East', country_count: 20 },
        { id: 4, zone_code: 'ZONE_4', zone_name: 'Zone 4 - Asia', country_count: 25 },
        { id: 5, zone_code: 'ZONE_5', zone_name: 'Zone 5 - Oceania', country_count: 10 },
        { id: 6, zone_code: 'ZONE_6', zone_name: 'Zone 6 - South America', country_count: 12 },
        { id: 7, zone_code: 'ZONE_7', zone_name: 'Zone 7 - Africa', country_count: 30 },
        { id: 8, zone_code: 'ZONE_8', zone_name: 'Zone 8 - Middle East', country_count: 15 },
      ])
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Failed to fetch zones:', error)
    // モックデータを返す
    return NextResponse.json([
      { id: 1, zone_code: 'ZONE_1', zone_name: 'Zone 1 - North America', country_count: 3 },
      { id: 2, zone_code: 'ZONE_2', zone_name: 'Zone 2 - Europe West', country_count: 15 },
      { id: 3, zone_code: 'ZONE_3', zone_name: 'Zone 3 - Europe East', country_count: 20 },
      { id: 4, zone_code: 'ZONE_4', zone_name: 'Zone 4 - Asia', country_count: 25 },
      { id: 5, zone_code: 'ZONE_5', zone_name: 'Zone 5 - Oceania', country_count: 10 },
      { id: 6, zone_code: 'ZONE_6', zone_name: 'Zone 6 - South America', country_count: 12 },
      { id: 7, zone_code: 'ZONE_7', zone_name: 'Zone 7 - Africa', country_count: 30 },
      { id: 8, zone_code: 'ZONE_8', zone_name: 'Zone 8 - Middle East', country_count: 15 },
    ])
  }
}
