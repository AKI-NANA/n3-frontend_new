# desktop-crawler/main.py
"""
Desktop Crawler FastAPI Server
eBay検索APIサーバー
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from ebay_search import EbaySearchClient

# 環境変数読み込み
load_dotenv()

app = FastAPI(
    title="Research Tool Desktop Crawler",
    description="eBay商品検索とデータ取得API",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# eBayクライアント初期化
try:
    ebay_client = EbaySearchClient()
except Exception as e:
    print(f"Failed to initialize eBay client: {e}")
    ebay_client = None


# リクエストモデル
class SearchRequest(BaseModel):
    keywords: str
    category_id: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    condition: Optional[str] = None
    sort_order: str = "BestMatch"
    limit: int = 100


# レスポンスモデル
class HealthResponse(BaseModel):
    status: str
    message: str
    ebay_api_configured: bool
    supabase_configured: bool


@app.get("/", response_model=dict)
async def root():
    """ルートエンドポイント"""
    return {
        "message": "Research Tool Desktop Crawler API",
        "version": "1.0.0",
        "endpoints": {
            "/health": "ヘルスチェック",
            "/api/ebay/search": "eBay商品検索 (POST)"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """ヘルスチェック"""
    ebay_configured = bool(os.getenv('EBAY_APP_ID'))
    supabase_configured = bool(
        os.getenv('SUPABASE_URL') and 
        os.getenv('SUPABASE_SERVICE_KEY')
    )
    
    status = "healthy" if (ebay_configured and supabase_configured) else "unhealthy"
    
    return HealthResponse(
        status=status,
        message="Desktop Crawler is running",
        ebay_api_configured=ebay_configured,
        supabase_configured=supabase_configured
    )


@app.post("/api/ebay/search")
async def search_ebay_products(
    request: SearchRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    eBay商品検索
    
    Args:
        request: 検索パラメータ
        x_api_key: API認証キー（オプション）
        
    Returns:
        検索結果
    """
    # API Key検証（設定されている場合）
    expected_key = os.getenv('CRAWLER_API_KEY')
    if expected_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # eBayクライアントチェック
    if not ebay_client:
        raise HTTPException(
            status_code=503, 
            detail="eBay client not initialized. Check EBAY_APP_ID configuration."
        )
    
    # キーワード検証
    if not request.keywords or len(request.keywords.strip()) == 0:
        raise HTTPException(status_code=400, detail="Keywords are required")
    
    try:
        # eBay検索実行
        products = ebay_client.search_products(
            keywords=request.keywords,
            category_id=request.category_id,
            min_price=request.min_price,
            max_price=request.max_price,
            condition=request.condition,
            sort_order=request.sort_order,
            limit=request.limit
        )
        
        return {
            "success": True,
            "count": len(products),
            "products": products,
            "search_params": {
                "keywords": request.keywords,
                "category_id": request.category_id,
                "min_price": request.min_price,
                "max_price": request.max_price,
                "condition": request.condition,
                "sort_order": request.sort_order,
                "limit": request.limit
            }
        }
        
    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"eBay search failed: {str(e)}"
        )


@app.get("/api/ebay/categories")
async def get_ebay_categories():
    """eBayカテゴリ一覧取得（将来実装）"""
    return {
        "categories": [
            {"id": "293", "name": "Cameras & Photo"},
            {"id": "550", "name": "Video Games & Consoles"},
            {"id": "15032", "name": "Watches, Parts & Accessories"},
            {"id": "625", "name": "Computers/Tablets & Networking"},
            {"id": "11450", "name": "Clothing, Shoes & Accessories"},
            {"id": "267", "name": "Books, Movies & Music"}
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('CRAWLER_PORT', 8000))
    
    print(f"""
    ╔════════════════════════════════════════════════╗
    ║  Desktop Crawler API Server Starting...       ║
    ║  Port: {port}                                     ║
    ║  Docs: http://localhost:{port}/docs              ║
    ╚════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
