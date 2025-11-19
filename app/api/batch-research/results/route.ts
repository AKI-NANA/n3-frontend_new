/**
 * app/api/batch-research/results/route.ts
 *
 * バッチリサーチ結果取得API
 * - GET: ジョブIDまたは検索条件で結果を取得
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/batch-research/results
 * バッチリサーチ結果を取得
 *
 * クエリパラメータ:
 * - job_id: ジョブID
 * - search_id: 検索ID
 * - seller_id: セラーID
 * - limit: 取得件数（デフォルト: 100）
 * - offset: オフセット（デフォルト: 0）
 * - sort_by: ソート項目（デフォルト: sold_date）
 * - sort_order: ソート順（asc/desc、デフォルト: desc）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const jobId = searchParams.get("job_id");
    const searchId = searchParams.get("search_id");
    const sellerId = searchParams.get("seller_id");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sort_by") || "sold_date";
    const sortOrder = searchParams.get("sort_order") || "desc";

    console.log("📊 結果取得リクエスト:", {
      jobId,
      searchId,
      sellerId,
      limit,
      offset,
    });

    let query = supabase
      .from("research_batch_results")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1);

    // フィルター適用
    if (jobId) {
      query = query.eq("job_id", jobId);
    }
    if (searchId) {
      query = query.eq("search_id", searchId);
    }
    if (sellerId) {
      query = query.eq("seller_id", sellerId);
    }

    // ソート
    query = query.order(sortBy, {
      ascending: sortOrder === "asc",
    });

    const { data, error, count } = await query;

    if (error) {
      console.error("❌ 結果取得エラー:", error);
      throw error;
    }

    // 統計情報を計算
    let stats = null;
    if (data && data.length > 0) {
      const prices = data
        .map((item) => item.total_price_usd)
        .filter((price) => price !== null);
      const avgPrice =
        prices.length > 0
          ? prices.reduce((sum, price) => sum + price, 0) / prices.length
          : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      stats = {
        total_items: count,
        sold_items: data.filter((item) => item.is_sold).length,
        avg_price: avgPrice,
        min_price: minPrice,
        max_price: maxPrice,
      };
    }

    return NextResponse.json({
      success: true,
      results: data,
      stats,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error: any) {
    console.error("❌ 結果取得エラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "結果の取得に失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/batch-research/results/export
 * 結果をCSVエクスポート
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job_id, format = "csv" } = body;

    if (!job_id) {
      return NextResponse.json(
        {
          success: false,
          error: "job_idが必要です",
        },
        { status: 400 }
      );
    }

    console.log(`📥 エクスポートリクエスト: ${job_id} (${format})`);

    // 全結果を取得
    const { data, error } = await supabase
      .from("research_batch_results")
      .select("*")
      .eq("job_id", job_id)
      .order("sold_date", { ascending: false });

    if (error) {
      console.error("❌ 結果取得エラー:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "結果が見つかりません",
        },
        { status: 404 }
      );
    }

    if (format === "csv") {
      // CSVヘッダー
      const headers = [
        "ebay_item_id",
        "title",
        "seller_id",
        "total_price_usd",
        "shipping_cost_usd",
        "is_sold",
        "sold_date",
        "listing_type",
        "condition_display_name",
        "primary_category_name",
        "location",
        "country",
        "view_item_url",
      ];

      // CSVデータ
      const rows = data.map((item) => [
        item.ebay_item_id,
        `"${(item.title || "").replace(/"/g, '""')}"`, // エスケープ
        item.seller_id,
        item.total_price_usd || 0,
        item.shipping_cost_usd || 0,
        item.is_sold ? "Yes" : "No",
        item.sold_date || "",
        item.listing_type || "",
        item.condition_display_name || "",
        item.primary_category_name || "",
        item.location || "",
        item.country || "",
        item.view_item_url || "",
      ]);

      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
        "\n"
      );

      // CSVファイルとして返す
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="batch_research_${job_id}_${Date.now()}.csv"`,
        },
      });
    } else if (format === "json") {
      // JSON形式で返す
      return NextResponse.json({
        success: true,
        job_id,
        total_items: data.length,
        results: data,
        exported_at: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "サポートされていないフォーマットです",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("❌ エクスポートエラー:", error);
    return NextResponse.json(
      {
        success: false,
        error: "エクスポートに失敗しました",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
