import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateSKU } from "@/lib/utils/sku-generator"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, category, purchase_price, image_url } = body

    const supabase = await getSupabaseServerClient()

    // SKU生成
    const sku = generateSKU()

    // products_masterに挿入
    const { data, error } = await supabase
      .from("products_master")
      .insert({
        sku,
        name,
        description,
        category,
        purchase_price,
        image_url,
        stock_quantity: 0,
        variation_type: "Single",
        status: "NeedsApproval",
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data, sku }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to register product" }, { status: 500 })
  }
}
