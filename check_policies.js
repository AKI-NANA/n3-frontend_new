const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPolicies() {
  const { data, error } = await supabase
    .from('ebay_shipping_policies_v2')
    .select('policy_name, weight_min_kg, weight_max_kg, price_band_final')
    .limit(10)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Policies:', JSON.stringify(data, null, 2))
  }
}

checkPolicies()
