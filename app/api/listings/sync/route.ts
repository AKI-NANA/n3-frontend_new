import { getSupabaseServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, platform, platform_id, quantity, price, status } = body

    if (!["ebay", "mercari"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // 出品情報を保存
    const table = platform === "ebay" ? "ebay_listings" : "mercari_listings"
    const insertData: any = {
      product_sku: sku,
      status,
      listing_quantity: quantity,
    }

    if (platform === "ebay") {
      insertData.item_id = platform_id
      insertData.price_usd = price
    } else {
      insertData.listing_id = platform_id
      insertData.price_jpy = price
    }

    const { data, error } = await supabase.from(table).insert(insertData).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to sync listing" }, { status: 500 })
  }
}
