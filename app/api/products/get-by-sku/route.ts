import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get("sku")

    if (!sku) {
      return NextResponse.json({ error: "SKU parameter is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from("products_master").select("*").eq("sku", sku).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
