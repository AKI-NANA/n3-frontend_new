import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 簡単なクエリでテスト
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        status: "error"
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Supabase接続正常",
      status: "connected"
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      status: "error"
    }, { status: 500 })
  }
}
