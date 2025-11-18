import { createClient } from "@/lib/supabase/server" // 修正: createClient に
import { generateNextSKU } from "@/lib/utils/sku-generator" // 修正: generateNextSKU に
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, category, purchase_price, image_url } = body

        // 修正: createClient を呼び出す
        const supabase = await createClient()

        // SKU生成
        // 修正: generateNextSKU を呼び出す
        const sku = await generateNextSKU()

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
            .single()

        if (error) {
            console.error("データベース挿入エラー:", error)
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data }, { status: 201 })
    } catch (error) {
        console.error("API実行エラー:", error)
        // エラーオブジェクトの型を確認してメッセージを取得
        const errorMessage = error instanceof Error ? error.message : "不明なサーバーエラー"
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
    }
}
