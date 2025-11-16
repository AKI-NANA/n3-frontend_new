import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateVariationSKU } from "@/lib/utils/sku-generator"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parent_sku, variations, policy_group_id } = body

    const supabase = await getSupabaseServerClient()

    // 親SKUが存在するか確認
    const { data: parentProduct, error: parentError } = await supabase
      .from("products_master")
      .select("id")
      .eq("sku", parent_sku)
      .single()

    if (parentError || !parentProduct) {
      return NextResponse.json({ error: "Parent SKU not found" }, { status: 404 })
    }

    // 親SKUのvariation_typeを更新
    await supabase
      .from("products_master")
      .update({
        variation_type: "Parent",
        policy_group_id,
      })
      .eq("sku", parent_sku)

    // 子SKUを作成
    const childSkus = variations.map((variation: any, index: number) => ({
      sku: generateVariationSKU(parent_sku, index + 1),
      parent_sku_id: parentProduct.id,
      variation_type: "Child",
      status: "NeedsApproval",
      policy_group_id,
      name: variation.name,
      description: variation.description,
      stock_quantity: variation.stock_quantity || 0,
    }))

    const { data, error } = await supabase.from("products_master").insert(childSkus).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        message: "Variation created successfully",
        parent_sku,
        child_skus: data,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json({ error: "Failed to create variation" }, { status: 500 })
  }
}
