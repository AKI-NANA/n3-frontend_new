# 楽天・ヤフオク→Amazon転売システム React化開発指示書

## 📋 プロジェクト概要

既存のPythonベース転売自動化システムをReactフロントエンド + FastAPI バックエンドの構成に変更し、Web UIで操作可能な完全なシステムを構築する。

### 🎯 開発目標
- ユーザーフレンドリーなWeb UI
- リアルタイム収集状況監視
- 利益商品の視覚的分析
- 自動収集スケジュール管理
- システム健全性監視

---

## 🏗️ システム構成

### バックエンド構成
```
backend/
├── main.py                 # FastAPI メインアプリ
├── models/                 # データモデル
│   ├── __init__.py
│   ├── product.py         # 商品モデル
│   ├── profit.py          # 利益分析モデル
│   └── collection.py      # 収集履歴モデル
├── services/              # ビジネスロジック
│   ├── __init__.py
│   ├── scraper_service.py # スクレイピングサービス
│   ├── profit_service.py  # 利益計算サービス
│   ├── matching_service.py # 商品マッチングサービス
│   └── collection_service.py # 収集管理サービス
├── api/                   # API エンドポイント
│   ├── __init__.py
│   ├── collection.py      # 収集API
│   ├── products.py        # 商品API
│   ├── analytics.py       # 分析API
│   └── system.py          # システム監視API
├── core/                  # コアモジュール
│   ├── __init__.py
│   ├── database.py        # データベース管理
│   ├── config.py          # 設定管理
│   └── security.py        # セキュリティ
├── scraping/              # 既存スクレイピングモジュール
│   ├── __init__.py
│   ├── anti_detection.py  # ロボット回避
│   ├── rakuten_scraper.py # 楽天スクレイパー
│   └── yahoo_scraper.py   # ヤフオクスクレイパー
└── requirements.txt       # Python依存関係
```

### フロントエンド構成
```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/        # 再利用コンポーネント
│   │   ├── common/        # 共通コンポーネント
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── dashboard/     # ダッシュボード
│   │   │   ├── StatusCard.tsx
│   │   │   ├── ChartCard.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── collection/    # 収集管理
│   │   │   ├── CollectionControl.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   └── ScheduleManager.tsx
│   │   ├── products/      # 商品管理
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProfitAnalysis.tsx
│   │   │   └── FilterPanel.tsx
│   │   └── analytics/     # 分析画面
│   │       ├── ProfitChart.tsx
│   │       ├── SourceBreakdown.tsx
│   │       └── TrendAnalysis.tsx
│   ├── pages/             # ページコンポーネント
│   │   ├── Dashboard.tsx
│   │   ├── Collection.tsx
│   │   ├── Products.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── hooks/             # カスタムフック
│   │   ├── useWebSocket.ts
│   │   ├── useApi.ts
│   │   └── useLocalStorage.ts
│   ├── services/          # API通信
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── types.ts
│   ├── utils/             # ユーティリティ
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── styles/            # スタイル
│   │   ├── globals.css
│   │   └── components.css
│   ├── App.tsx            # メインアプリ
│   ├── index.tsx          # エントリポイント
│   └── types/             # TypeScript型定義
│       ├── api.ts
│       ├── product.ts
│       └── collection.ts
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

---

## 🔧 開発フェーズ

### Phase 1: バックエンド基盤構築 (2-3日)

#### 1.1 FastAPI基盤セットアップ
```python
# backend/main.py
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn

app = FastAPI(
    title="転売システム API",
    description="楽天・ヤフオク→Amazon転売システム",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# WebSocket接続管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# WebSocketエンドポイント
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        manager.active_connections.remove(websocket)
```

#### 1.2 データモデル定義
```python
# backend/models/product.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProductSource(str, Enum):
    RAKUTEN = "rakuten"
    YAHOO_AUCTION = "yahoo_auction"

class ProductCondition(str, Enum):
    NEW = "new"
    USED_LIKE_NEW = "used_like_new"
    USED_VERY_GOOD = "used_very_good"
    USED_GOOD = "used_good"

class SourceProduct(BaseModel):
    id: Optional[int] = None
    source_type: ProductSource
    product_url: str
    jan_code: Optional[str] = None
    title: str
    price: float
    condition: ProductCondition
    brand: Optional[str] = None
    # ... 他のフィールド

class ProfitAnalysis(BaseModel):
    source_cost: float
    amazon_revenue: float
    profit: float
    profit_margin: float
    is_profitable: bool
    priority_score: float
```

#### 1.3 コア API エンドポイント
```python
# backend/api/collection.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from services.collection_service import CollectionService

router = APIRouter()
collection_service = CollectionService()

@router.post("/start")
async def start_collection(background_tasks: BackgroundTasks):
    """収集開始"""
    try:
        background_tasks.add_task(collection_service.run_collection)
        return {"message": "収集を開始しました", "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_collection_status():
    """収集状況取得"""
    return await collection_service.get_status()

@router.get("/history")
async def get_collection_history(limit: int = 50):
    """収集履歴取得"""
    return await collection_service.get_history(limit)
```

### Phase 2: フロントエンド基盤構築 (2-3日)

#### 2.1 React プロジェクト初期化
```bash
# フロントエンド構築コマンド
npx create-react-app frontend --template typescript
cd frontend
npm install @types/node @types/react @types/react-dom
npm install tailwindcss @headlessui/react @heroicons/react
npm install recharts react-router-dom axios socket.io-client
npm install @tanstack/react-query react-hook-form
```

#### 2.2 TypeScript型定義
```typescript
// frontend/src/types/api.ts
export interface SourceProduct {
  id?: number;
  source_type: 'rakuten' | 'yahoo_auction';
  product_url: string;
  jan_code?: string;
  title: string;
  price: number;
  condition: ProductCondition;
  brand?: string;
  profit_analysis?: ProfitAnalysis;
}

export interface ProfitAnalysis {
  source_cost: number;
  amazon_revenue: number;
  profit: number;
  profit_margin: number;
  is_profitable: boolean;
  priority_score: number;
}

export interface CollectionStatus {
  is_running: boolean;
  current_stage: string;
  progress: number;
  products_collected: number;
  profitable_products: number;
  estimated_completion: string;
}
```

#### 2.3 API通信サービス
```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const collectionApi = {
  start: () => api.post('/api/collection/start'),
  getStatus: () => api.get('/api/collection/status'),
  getHistory: (limit = 50) => api.get(`/api/collection/history?limit=${limit}`),
};

export const productsApi = {
  getProfitableProducts: (limit = 50) => api.get(`/api/products/profitable?limit=${limit}`),
  getProduct: (id: number) => api.get(`/api/products/${id}`),
  updateProduct: (id: number, data: any) => api.put(`/api/products/${id}`, data),
};

export const analyticsApi = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  getProfitTrends: (days = 30) => api.get(`/api/analytics/profit-trends?days=${days}`),
  getSourceBreakdown: () => api.get('/api/analytics/source-breakdown'),
};
```

### Phase 3: 主要コンポーネント開発 (3-4日)

#### 3.1 ダッシュボード画面
```typescript
// frontend/src/pages/Dashboard.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatusCard } from '../components/dashboard/StatusCard';
import { ChartCard } from '../components/dashboard/ChartCard';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { analyticsApi } from '../services/api';

export const Dashboard: React.FC = () => {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: analyticsApi.getDashboard,
    refetchInterval: 30000, // 30秒ごとに更新
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
      
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="今日の収集商品"
          value={dashboardData?.today_collected || 0}
          change="+12%"
          icon="📦"
        />
        <StatusCard
          title="利益商品数"
          value={dashboardData?.profitable_products || 0}
          change="+8%"
          icon="💰"
        />
        <StatusCard
          title="予想総利益"
          value={`¥${(dashboardData?.total_profit || 0).toLocaleString()}`}
          change="+15%"
          icon="📈"
        />
        <StatusCard
          title="平均利益率"
          value={`${dashboardData?.avg_margin || 0}%`}
          change="+2.3%"
          icon="📊"
        />
      </div>

      {/* チャートエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="利益推移" />
        <ChartCard title="ソース別収集数" />
      </div>

      {/* 最近のアクティビティ */}
      <RecentActivity />
    </div>
  );
};
```

#### 3.2 収集管理画面
```typescript
// frontend/src/pages/Collection.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CollectionControl } from '../components/collection/CollectionControl';
import { ProgressTracker } from '../components/collection/ProgressTracker';
import { collectionApi } from '../services/api';

export const Collection: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: status } = useQuery({
    queryKey: ['collection-status'],
    queryFn: collectionApi.getStatus,
    refetchInterval: 5000, // 5秒ごとに更新
  });

  const startMutation = useMutation({
    mutationFn: collectionApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-status'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">収集管理</h1>
      
      <CollectionControl
        isRunning={status?.is_running || false}
        onStart={() => startMutation.mutate()}
        onStop={() => {/* 停止処理 */}}
      />
      
      {status?.is_running && (
        <ProgressTracker
          stage={status.current_stage}
          progress={status.progress}
          productsCollected={status.products_collected}
          profitableProducts={status.profitable_products}
        />
      )}
    </div>
  );
};
```

#### 3.3 商品一覧画面
```typescript
// frontend/src/pages/Products.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProductList } from '../components/products/ProductList';
import { FilterPanel } from '../components/products/FilterPanel';
import { productsApi } from '../services/api';

export const Products: React.FC = () => {
  const [filters, setFilters] = useState({
    source: 'all',
    minProfit: 0,
    minMargin: 0,
    sortBy: 'priority_score',
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['profitable-products', filters],
    queryFn: () => productsApi.getProfitableProducts(100),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">利益商品一覧</h1>
      
      <FilterPanel filters={filters} onFiltersChange={setFilters} />
      
      <ProductList products={products || []} isLoading={isLoading} />
    </div>
  );
};
```

### Phase 4: リアルタイム機能実装 (2-3日)

#### 4.1 WebSocket統合
```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:8000');
    
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('collection_update', (data) => {
      // 収集進捗更新
      console.log('Collection update:', data);
    });

    newSocket.on('new_profitable_product', (product) => {
      // 新しい利益商品通知
      console.log('New profitable product:', product);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return { socket, connectionStatus };
};
```

#### 4.2 プログレストラッカー
```typescript
// frontend/src/components/collection/ProgressTracker.tsx
import React from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ProgressTrackerProps {
  stage: string;
  progress: number;
  productsCollected: number;
  profitableProducts: number;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  stage,
  progress,
  productsCollected,
  profitableProducts,
}) => {
  const { connectionStatus } = useWebSocket();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">収集進捗</h3>
        <span className={`px-2 py-1 rounded text-sm ${
          connectionStatus === 'connected' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {connectionStatus === 'connected' ? '接続中' : '切断中'}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>現在のステージ: {stage}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{productsCollected}</div>
            <div className="text-sm text-gray-600">収集商品数</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{profitableProducts}</div>
            <div className="text-sm text-gray-600">利益商品数</div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Phase 5: 分析・可視化機能 (2-3日)

#### 5.1 チャートコンポーネント
```typescript
// frontend/src/components/analytics/ProfitChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';

export const ProfitChart: React.FC = () => {
  const { data: trendData } = useQuery({
    queryKey: ['profit-trends'],
    queryFn: () => analyticsApi.getProfitTrends(30),
  });

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">利益推移（過去30日）</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [`¥${value.toLocaleString()}`, '利益']}
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="#3B82F6" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

#### 5.2 商品カード
```typescript
// frontend/src/components/products/ProductCard.tsx
import React from 'react';
import { SourceProduct } from '../../types/api';

interface ProductCardProps {
  product: SourceProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const profitAnalysis = product.profit_analysis;
  
  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium truncate flex-1 mr-4">
          {product.title}
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          product.source_type === 'rakuten' 
            ? 'bg-red-100 text-red-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {product.source_type === 'rakuten' ? '楽天' : 'ヤフオク'}
        </span>
      </div>

      {profitAnalysis && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">仕入価格</span>
            <span className="font-medium">¥{product.price.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amazon販売価格</span>
            <span className="font-medium">¥{profitAnalysis.amazon_revenue.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">予想利益</span>
            <span className="font-bold text-green-600">
              ¥{profitAnalysis.profit.toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">利益率</span>
            <span className="font-bold text-green-600">
              {profitAnalysis.profit_margin.toFixed(1)}%
            </span>
          </div>
          
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">優先度スコア</span>
              <span className="font-medium">
                {profitAnalysis.priority_score.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex space-x-2">
        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700 transition-colors"
        >
          商品ページを見る
        </a>
        <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          詳細
        </button>
      </div>
    </div>
  );
};
```

### Phase 6: 設定・管理機能 (1-2日)

#### 6.1 設定画面
```typescript
// frontend/src/pages/Settings.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

interface SettingsForm {
  collection: {
    rakuten_categories: string[];
    yahoo_keywords: string[];
    collection_interval: number;
  };
  profit: {
    min_profit: number;
    min_margin: number;
    min_price: number;
  };
  notifications: {
    email_enabled: boolean;
    email_address: string;
    slack_webhook: string;
  };
}

export const Settings: React.FC = () => {
  const { register, handleSubmit, watch } = useForm<SettingsForm>();
  
  const onSubmit = (data: SettingsForm) => {
    console.log('Settings saved:', data);
    // API呼び出しで設定保存
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">設定</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* 収集設定 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">収集設定</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                楽天カテゴリID
              </label>
              <textarea
                {...register('collection.rakuten_categories')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="100026,101070,100939"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ヤフオクキーワード
              </label>
              <textarea
                {...register('collection.yahoo_keywords')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="iPhone,Nintendo Switch,Canon"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* 利益設定 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">利益フィルター</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最低利益額（円）
              </label>
              <input
                type="number"
                {...register('profit.min_profit')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                defaultValue={1000}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最低利益率（%）
              </label>
              <input
                type="number"
                {...register('profit.min_margin')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                defaultValue={20}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最低販売価格（円）
              </label>
              <input
                type="number"
                {...register('profit.min_price')}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                defaultValue={2000}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          設定を保存
        </button>
      </form>
    </div>
  );
};
```

---

## 🚀 デプロイメント構成

### Docker構成
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./arbitrage.db
      - CORS_ORIGINS=http://localhost:3000
    volumes:
      - ./backend:/app
      - ./data:/app/data
    depends_on:
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_WS_URL=ws://localhost:8000
    volumes:
      - ./frontend:/app

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend

volumes:
  redis_data:
```

### 環境変数設定
```bash
# .env
# バックエンド設定
DATABASE_URL=sqlite:///./arbitrage.db
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000

# フロントエンド設定
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000

# 外部API設定（将来用）
RAKUTEN_APP_ID=your-rakuten-app-id
AMAZON_ACCESS_KEY=your-amazon-access-key
```

---

## 📋 テスト戦略

### バックエンドテスト
```python
# backend/tests/test_collection.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_start_collection():
    response = client.post("/api/collection/start")
    assert response.status_code == 200
    assert response.json()["status"] == "started"

def test_get_collection_status():
    response = client.get("/api/collection/status")
    assert response.status_code == 200
    assert "is_running" in response.json()
```

### フロントエンドテスト
```typescript
// frontend/src/components/__tests__/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../products/ProductCard';

const mockProduct = {
  id: 1,
  title: 'Test Product',
  price: 1000,
  source_type: 'rakuten',
  profit_analysis: {
    profit: 500,
    profit_margin: 33.3,
    amazon_revenue: 1500,
  }
};

test('renders product information correctly', () => {
  render(<ProductCard product={mockProduct} />);
  
  expect(screen.getByText('Test Product')).toBeInTheDocument();
  expect(screen.getByText('¥1,000')).toBeInTheDocument();
  expect(screen.getByText('¥500')).toBeInTheDocument();
  expect(screen.getByText('33.3%')).toBeInTheDocument();
});
```

---

## 🔄 開発ワークフロー

### 1. 初期セットアップ
```bash
# リポジトリクローン
git clone <repository-url>
cd arbitrage-system

# バックエンドセットアップ
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# フロントエンドセットアップ
cd ../frontend
npm install

# Docker環境起動
cd ..
docker-compose up -d
```

### 2. 開発サーバー起動
```bash
# バックエンド起動
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# フロントエンド起動
cd frontend
npm start
```

### 3. API統合テスト
```bash
# APIテスト実行
cd backend
pytest tests/

# フロントエンドテスト実行
cd frontend
npm test
```

---

## 📚 技術スタック

### バックエンド
- **FastAPI**: REST API + WebSocket
- **SQLite**: データベース（本番環境ではPostgreSQL推奨）
- **SQLAlchemy**: ORM
- **Pydantic**: データバリデーション
- **Redis**: キャッシュ・セッション管理
- **Celery**: バックグラウンドタスク
- **pytest**: テスティング

### フロントエンド
- **React 18**: UIライブラリ
- **TypeScript**: 型安全性
- **TailwindCSS**: スタイリング
- **React Query**: サーバー状態管理
- **React Hook Form**: フォーム管理
- **Recharts**: チャート・可視化
- **Socket.IO**: リアルタイム通信
- **React Router**: ルーティング

### インフラ
- **Docker**: コンテナ化
- **Nginx**: リバースプロキシ
- **GitHub Actions**: CI/CD

---

## 🎯 実装優先度

### 高優先度 (Week 1-2)
1. ✅ バックエンドAPI基盤
2. ✅ フロントエンド基本構造
3. ✅ ダッシュボード画面
4. ✅ 収集管理機能

### 中優先度 (Week 3-4)
1. ✅ 商品一覧・詳細機能
2. ✅ リアルタイム更新
3. ✅ 分析・チャート機能
4. ✅ フィルタリング・検索

### 低優先度 (Week 5-6)
1. ✅ 設定管理画面
2. ✅ 通知機能
3. ✅ エクスポート機能
4. ✅ パフォーマンス最適化

---

## 📊 成功指標

### 機能要件
- [ ] 楽天・ヤフオクからの自動収集
- [ ] リアルタイム進捗表示
- [ ] 利益商品の自動抽出・表示
- [ ] 分析チャート・ダッシュボード
- [ ] 設定管理・カスタマイズ

### 非機能要件
- [ ] レスポンス時間 < 2秒
- [ ] モバイル対応
- [ ] 99%以上の稼働率
- [ ] セキュアなデータ管理

### UX要件
- [ ] 直感的な操作性
- [ ] リアルタイム更新
- [ ] エラーハンドリング
- [ ] アクセシビリティ準拠

---

この開発指示書に従って実装することで、既存のPythonスクレイピングシステムを現代的なWebアプリケーションに発展させることができます。各フェーズは並行開発可能で、段階的なデプロイメントにも対応しています。