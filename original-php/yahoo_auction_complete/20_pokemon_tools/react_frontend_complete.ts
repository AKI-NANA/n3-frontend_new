// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import CardManagement from './pages/CardManagement';
import ContentGeneration from './pages/ContentGeneration';
import Publishing from './pages/Publishing';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cards/*" element={<CardManagement />} />
              <Route path="/content/*" element={<ContentGeneration />} />
              <Route path="/publishing/*" element={<Publishing />} />
              <Route path="/analytics/*" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </div>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;

// frontend/src/components/Layout/Layout.tsx
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

// frontend/src/components/Layout/Sidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  HomeIcon, 
  RectangleGroupIcon,
  PencilSquareIcon,
  ShareIcon,
  ChartBarIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: HomeIcon },
  { name: 'カード管理', href: '/cards', icon: RectangleGroupIcon },
  { name: 'コンテンツ生成', href: '/content', icon: PencilSquareIcon },
  { name: '公開管理', href: '/publishing', icon: ShareIcon },
  { name: 'アナリティクス', href: '/analytics', icon: ChartBarIcon },
  { name: '設定', href: '/settings', icon: CogIcon },
];

const Sidebar: React.FC = () => {
  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-8 w-8 text-white" />
          <span className="text-xl font-bold text-white">PokéContent</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t">
        <div className="text-xs text-gray-500 text-center">
          © 2025 Pokemon Content System
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

// frontend/src/components/Layout/Header.tsx
import React from 'react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              ポケモンカード コンテンツシステム
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <BellIcon className="h-6 w-6" />
            </button>
            <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
              <UserCircleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

// frontend/src/pages/Dashboard.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import StatsCards from '../components/Dashboard/StatsCards';
import RecentActivity from '../components/Dashboard/RecentActivity';
import ContentGenerationChart from '../components/Dashboard/ContentGenerationChart';
import PopularCardsWidget from '../components/Dashboard/PopularCardsWidget';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.dashboard.getStats(),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white h-32 rounded-lg shadow"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <div className="text-sm text-gray-500">
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">コンテンツ生成トレンド</h2>
          <ContentGenerationChart />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">人気カード</h2>
          <PopularCardsWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">システム状態</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">価格収集</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                正常稼働
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">AI生成</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                正常稼働
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">公開システム</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                一部制限
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// frontend/src/components/Dashboard/StatsCards.tsx
import React from 'react';
import { 
  CurrencyYenIcon, 
  DocumentTextIcon, 
  EyeIcon,
  TrendingUpIcon 
} from '@heroicons/react/24/outline';

interface StatsCardsProps {
  stats: any;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: '総収益',
      value: '¥' + (stats?.revenue || 0).toLocaleString(),
      change: '+12.5%',
      changeType: 'positive',
      icon: CurrencyYenIcon,
      color: 'bg-green-500'
    },
    {
      title: '生成コンテンツ',
      value: (stats?.totalContents || 0).toLocaleString(),
      change: '+5.2%',
      changeType: 'positive',
      icon: DocumentTextIcon,
      color: 'bg-blue-500'
    },
    {
      title: '総ページビュー',
      value: (stats?.totalViews || 0).toLocaleString(),
      change: '+8.1%',
      changeType: 'positive',
      icon: EyeIcon,
      color: 'bg-purple-500'
    },
    {
      title: '投資効率',
      value: (stats?.roi || 0) + '%',
      change: '+3.4%',
      changeType: 'positive',
      icon: TrendingUpIcon,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {card.title}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {card.value}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

// frontend/src/components/Dashboard/ContentGenerationChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const ContentGenerationChart: React.FC = () => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['content-generation-chart'],
    queryFn: () => api.analytics.getContentGenerationTrend(),
  });

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded"></div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="generated" 
          stroke="#3B82F6" 
          strokeWidth={2}
          name="生成数"
        />
        <Line 
          type="monotone" 
          dataKey="published" 
          stroke="#10B981" 
          strokeWidth={2}
          name="公開数"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ContentGenerationChart;

// frontend/src/components/Dashboard/PopularCardsWidget.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const PopularCardsWidget: React.FC = () => {
  const { data: popularCards, isLoading } = useQuery({
    queryKey: ['popular-cards'],
    queryFn: () => api.cards.getPopularCards({ limit: 5 }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3">
            <div className="bg-gray-200 h-12 w-12 rounded"></div>
            <div className="flex-1">
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-3 w-20 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {popularCards?.map((card: any, index: number) => (
        <div key={card.id} className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white text-sm font-medium">
              {index + 1}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {card.name}
            </p>
            <p className="text-sm text-gray-500">
              {card.series?.name} • {card.rarity}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-medium text-gray-900">
              ¥{card.latest_price?.toLocaleString() || '---'}
            </p>
            <p className={`text-xs ${
              card.price_trend === 'up' ? 'text-green-600' : 
              card.price_trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {card.price_trend === 'up' ? '↗' : card.price_trend === 'down' ? '↘' : '→'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PopularCardsWidget;

// frontend/src/components/Dashboard/RecentActivity.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClockIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';

const RecentActivity: React.FC = () => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api.analytics.getRecentActivity(),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">最近のアクティビティ</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex space-x-3">
              <div className="bg-gray-200 h-10 w-10 rounded-full"></div>
              <div className="flex-1">
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 w-24 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">最近のアクティビティ</h2>
      <div className="flow-root">
        <ul className="-mb-8">
          {activities?.map((activity: any, index: number) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {index !== activities.length - 1 && (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      activity.type === 'content_generated' ? 'bg-green-500' :
                      activity.type === 'content_published' ? 'bg-blue-500' :
                      activity.type === 'price_updated' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}>
                      <ClockIcon className="h-4 w-4 text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {activity.description}
                      </p>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      {new Date(activity.timestamp).toLocaleString('ja-JP')}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RecentActivity;

// frontend/src/pages/CardManagement.tsx
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import CardList from '../components/CardManagement/CardList';
import CardDetail from '../components/CardManagement/CardDetail';

const CardManagement: React.FC = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<CardList />} />
        <Route path="/:id" element={<CardDetail />} />
      </Routes>
    </div>
  );
};

export default CardManagement;

// frontend/src/components/CardManagement/CardList.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';

const CardList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    rarity: '',
    investment_grade: '',
    series: '',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: cardsData, isLoading, error } = useQuery({
    queryKey: ['cards', searchTerm, filters, currentPage],
    queryFn: () => api.cards.getCards({
      search: searchTerm,
      ...filters,
      page: currentPage,
    }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">エラーが発生しました: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">カード管理</h1>
      </div>

      {/* 検索とフィルター */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="カード名、番号で検索..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              レアリティ
            </label>
            <select
              value={filters.rarity}
              onChange={(e) => handleFilterChange('rarity', e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="UR">UR</option>
              <option value="HR">HR</option>
              <option value="SR">SR</option>
              <option value="RRR">RRR</option>
              <option value="RR">RR</option>
              <option value="R">R</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              投資グレード
            </label>
            <select
              value={filters.investment_grade}
              onChange={(e) => handleFilterChange('investment_grade', e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="S">S級</option>
              <option value="A+">A+級</option>
              <option value="A">A級</option>
              <option value="B+">B+級</option>
              <option value="B">B級</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              シリーズ
            </label>
            <select
              value={filters.series}
              onChange={(e) => handleFilterChange('series', e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="1">クレイバースト</option>
              <option value="2">スノーハザード</option>
              {/* 動的にシリーズオプションを追加 */}
            </select>
          </div>
        </div>
      </div>

      {/* カードリスト */}
      <div className="bg-white shadow rounded-lg">
        {isLoading ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-48 rounded mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-3 w-20 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cardsData?.results?.map((card: any) => (
                <Link
                  key={card.id}
                  to={`/cards/${card.id}`}
                  className="group block bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200"
                >
                  <div className="aspect-w-3 aspect-h-4 w-full overflow-hidden rounded-t-lg bg-gray-200">
                    {card.image_urls?.[0] ? (
                      <img
                        src={card.image_urls[0]}
                        alt={card.name}
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-100">
                        <span className="text-gray-400 text-sm">No Image</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {card.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {card.series?.name} • {card.card_number}
                    </p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        card.investment_grade === 'S' ? 'bg-red-100 text-red-800' :
                        card.investment_grade === 'A+' ? 'bg-orange-100 text-orange-800' :
                        card.investment_grade === 'A' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {card.investment_grade}級
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        ¥{card.latest_price?.toLocaleString() || '---'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        人気度: {card.popularity_score}/100
                      </span>
                      <span className={`text-xs ${
                        card.price_trend === 'up' ? 'text-green-600' : 
                        card.price_trend === 'down' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {card.price_trend === 'up' ? '↗ 上昇' : 
                         card.price_trend === 'down' ? '↘ 下降' : '→ 横ばい'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* ページネーション */}
            {cardsData?.count > 0 && (
              <div className="mt-8 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  {cardsData.count}件中 {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, cardsData.count)}件を表示
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!cardsData.previous}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!cardsData.next}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardList;
              