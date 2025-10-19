"""
Desktop Crawler FastAPI Server - 完全統合版
desktop-crawler/main.py
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import asyncio

from complete_research_system import CompleteResearchSystem

# 環境変数読み込み
load_dotenv()

app = FastAPI(
    title="Research Tool Desktop Crawler - Complete Edition",
    description="eBay完全統合リサーチAPI (Finding + Shopping + AI Analysis)",
    version="2.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 完全統合システム初期化
try:
    research_system = CompleteResearchSystem(
        ebay_app_id=os.getenv('EBAY_APP_ID'),
        anthropic_key=os.getenv('ANTHROPIC_API_KEY'),
        supabase_url=os.getenv('SUPABASE_URL'),
        supabase_key=os.getenv('SUPABASE_SERVICE_KEY')
    )
    print("✅ Complete Research System initialized")
except Exception as e:
    print(f"❌ Failed to initialize Complete Research System: {e}")
    research_system = None


# リクエストモデル
class CompleteResearchRequest(BaseModel):
    keywords: str
    category_id: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    condition: Optional[str] = None
    sort_order: str = "BestMatch"
    limit: int = 100
    enable_ai_analysis: bool = True  # 🔥 AI分析フラグ


# レスポンスモデル
class HealthResponse(BaseModel):
    status: str
    message: str
    ebay_api_configured: bool
    anthropic_api_configured: bool
    supabase_configured: bool


@app.get("/", response_model=dict)
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Research Tool Desktop Crawler API - Complete Edition",
        "version": "2.0.0",
        "features": [
            "Finding API Integration",
            "Shopping API Integration", 
            "AI Classification System",
            "Filter Database Integration",
            "Seller Profile Analysis"
        ],
        "endpoints": {
            "/health": "ヘルスチェック",
            "/api/research/complete": "完全統合リサーチ (POST)"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """ヘルスチェック"""
    ebay_configured = bool(os.getenv('EBAY_APP_ID'))
    anthropic_configured = bool(os.getenv('ANTHROPIC_API_KEY'))
    supabase_configured = bool(
        os.getenv('SUPABASE_URL') and 
        os.getenv('SUPABASE_SERVICE_KEY')
    )
    
    all_configured = ebay_configured and anthropic_configured and supabase_configured
    status = "healthy" if all_configured else "degraded"
    
    return HealthResponse(
        status=status,
        message="Desktop Crawler is running" if all_configured else "Some services are not configured",
        ebay_api_configured=ebay_configured,
        anthropic_api_configured=anthropic_configured,
        supabase_configured=supabase_configured
    )


@app.post("/api/research/complete")
async def complete_research(
    request: CompleteResearchRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    🔥 完全統合リサーチ
    
    Finding API + Shopping API + AI分析を一括実行
    
    Args:
        request: リサーチパラメータ
        x_api_key: API認証キー（オプション）
        
    Returns:
        {
            "success": true,
            "summary": {
                "total_products": 100,
                "ai_analyzed": 100,
                "hazardous_count": 5,
                "vero_high_count": 3,
                ...
            }
        }
    """
    # API Key検証
    expected_key = os.getenv('CRAWLER_API_KEY')
    if expected_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # システムチェック
    if not research_system:
        raise HTTPException(
            status_code=503,
            detail="Research system not initialized. Check configuration."
        )
    
    try:
        print(f"\n🚀 Complete Research Request: {request.keywords}")
        print(f"   Limit: {request.limit}, AI Analysis: {request.enable_ai_analysis}")
        
        # 完全統合リサーチ実行
        summary = await research_system.research(
            keywords=request.keywords,
            limit=request.limit,
            enable_ai_analysis=request.enable_ai_analysis
        )
        
        return {
            "success": True,
            "summary": summary,
            "message": f"Complete research finished: {summary['total_products']} products"
        }
        
    except Exception as e:
        print(f"❌ Complete Research Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Research failed: {str(e)}"
        )


# 既存の基本検索エンドポイント（後方互換性）
@app.post("/api/ebay/search")
async def basic_search(
    request: dict,
    x_api_key: Optional[str] = Header(None)
):
    """
    基本検索（Finding APIのみ）
    後方互換性のため残す
    """
    # 完全統合版に転送
    complete_request = CompleteResearchRequest(
        keywords=request.get('keywords'),
        category_id=request.get('category_id'),
        min_price=request.get('min_price'),
        max_price=request.get('max_price'),
        condition=request.get('condition'),
        sort_order=request.get('sort_order', 'BestMatch'),
        limit=request.get('limit', 100),
        enable_ai_analysis=False  # 基本検索はAI分析なし
    )
    
    return await complete_research(complete_request, x_api_key)


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('CRAWLER_PORT', 8000))
    
    print("\n" + "="*60)
    print("🚀 Desktop Crawler API Server - Complete Edition")
    print("="*60)
    print(f"📡 Port: {port}")
    print(f"📚 Docs: http://localhost:{port}/docs")
    print(f"🔥 Features: Finding + Shopping + AI Analysis")
    print("="*60 + "\n")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
