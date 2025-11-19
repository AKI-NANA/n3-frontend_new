import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, status } = body

    if (!["NeedsApproval", "Approved", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from("products_master").update({ status }).eq("sku", sku).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product status" }, { status: 500 })
  }
}
