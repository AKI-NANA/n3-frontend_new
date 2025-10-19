// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import CardsPage from './pages/CardsPage';
import ContentGenerationPage from './pages/ContentGenerationPage';
import ContentCollectionPage from './pages/ContentCollectionPage';
import PublishingPage from './pages/PublishingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Navigation />
                    <main className="lg:pl-64">
                      <div className="px-4 py-8 sm:px-6 lg:px-8">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/cards" element={<CardsPage />} />
                          <Route path="/content/generation" element={<ContentGenerationPage />} />
                          <Route path="/content/collection" element={<ContentCollectionPage />} />
                          <Route path="/publishing" element={<PublishingPage />} />
                          <Route path="/analytics" element={<AnalyticsPage />} />
                        </Routes>
                      </div>
                    </main>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../utils/apiClient';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // トークンが有効かチェック
      apiClient.get('/auth/user/')
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('authToken');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await apiClient.post('/auth/token/', {
      username,
      password,
    });
    
    const { token, user } = response.data;
    localStorage.setItem('authToken', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// src/components/Navigation.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  CogIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: HomeIcon },
  { name: 'カード分析', href: '/cards', icon: MagnifyingGlassIcon },
  { name: 'コンテンツ生成', href: '/content/generation', icon: DocumentTextIcon },
  { name: 'コンテンツ収集', href: '/content/collection', icon: CloudArrowUpIcon },
  { name: '投稿管理', href: '/publishing', icon: CloudArrowUpIcon },
  { name: '分析・レポート', href: '/analytics', icon: ChartBarIcon },
];

const Navigation: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-50 flex">
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-gray-800 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <SidebarContent navigation={navigation} location={location} />
          </div>
          <div className="w-14 flex-shrink-0"></div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
          <SidebarContent navigation={navigation} location={location} />
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="flex items-center gap-x-4">
                <span className="text-sm font-medium text-gray-900">{user?.username}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const SidebarContent: React.FC<{
  navigation: typeof navigation;
  location: { pathname: string };
}> = ({ navigation, location }) => {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center">
          <CogIcon className="h-8 w-8 text-indigo-400" />
          <span className="ml-2 text-white text-lg font-semibold">
            ポケカAI
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`
                        group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                        ${
                          isActive
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }
                      `}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          <li className="mt-auto">
            <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-white">
              <div className="flex min-w-0 flex-1 items-center gap-x-4">
                <div className="min-w-0 flex-auto">
                  <p className="text-sm font-semibold leading-6 text-white">
                    {user?.username}
                  </p>
                  <p className="text-xs leading-5 text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white"
              >
                ログアウト
              </button>
            </div>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Navigation;

// src/components/LoadingSpinner.tsx
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
    </div>
  );
};

export default LoadingSpinner;

// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      toast.success('ログインしました');
    } catch (error) {
      toast.error('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ポケモンカード コンテンツ自動生成システム
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            アカウントでログインしてください
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="sr-only">
              ユーザー名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="ユーザー名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

// src/pages/Dashboard.tsx
import React from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '../utils/apiClient';
import StatsCard from '../components/StatsCard';
import RecentActivityCard from '../components/RecentActivityCard';
import QuickActions from '../components/QuickActions';

interface DashboardStats {
  totalCards: number;
  totalContent: number;
  monthlyViews: number;
  revenue: number;
  recentActivity: any[];
}

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'dashboard-stats',
    () => apiClient.get('/analytics/dashboard/').then(res => res.data)
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-2 text-gray-600">
          システム全体の状況を確認できます
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="総カード数"
          value={stats?.totalCards || 0}
          icon="database"
          color="blue"
        />
        <StatsCard
          title="生成コンテンツ"
          value={stats?.totalContent || 0}
          icon="document"
          color="green"
        />
        <StatsCard
          title="月間閲覧数"
          value={stats?.monthlyViews || 0}
          icon="eye"
          color="purple"
          format="number"
        />
        <StatsCard
          title="月間収益"
          value={stats?.revenue || 0}
          icon="currency"
          color="orange"
          format="currency"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <QuickActions />
        
        {/* Recent Activity */}
        <RecentActivityCard activities={stats?.recentActivity || []} />
      </div>
    </div>
  );
};

export default Dashboard;

// src/components/StatsCard.tsx
import React from 'react';
import { 
  CurrencyYenIcon, 
  DocumentTextIcon, 
  EyeIcon,
  CircleStackIcon 
} from '@heroicons/react/24/outline';

interface StatsCardProps {
  title: string;
  value: number;
  icon: 'database' | 'document' | 'eye' | 'currency';
  color: 'blue' | 'green' | 'purple' | 'orange';
  format?: 'number' | 'currency';
}

const iconMap = {
  database: CircleStackIcon,
  document: DocumentTextIcon,
  eye: EyeIcon,
  currency: CurrencyYenIcon,
};

const colorMap = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  orange: 'from-orange-500 to-orange-600',
};

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  format = 'number' 
}) => {
  const Icon = iconMap[icon];
  
  const formatValue = (val: number) => {
    if (format === 'currency') {
      return `¥${val.toLocaleString()}`;
    }
    return val.toLocaleString();
  };

  return (
    <div className={`bg-gradient-to-r ${colorMap[color]} text-white rounded-lg p-6 shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold">{formatValue(value)}</p>
        </div>
        <Icon className="h-12 w-12 opacity-80" />
      </div>
    </div>
  );
};

export default StatsCard;

// src/components/QuickActions.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const handleQuickGenerate = async () => {
    try {
      // クイック生成のAPI呼び出し
      toast.success('コンテンツ生成を開始しました');
    } catch (error) {
      toast.error('生成に失敗しました');
    }
  };

  const actions = [
    {
      title: 'コンテンツ生成',
      description: 'AIでブログ記事を自動生成',
      action: () => navigate('/content/generation'),
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: '✨',
    },
    {
      title: 'カード分析',
      description: '価格データを分析',
      action: () => navigate('/cards'),
      color: 'bg-green-600 hover:bg-green-700',
      icon: '📊',
    },
    {
      title: '投稿管理',
      description: 'WordPress投稿を管理',
      action: () => navigate('/publishing'),
      color: 'bg-purple-600 hover:bg-purple-700',
      icon: '📤',
    },
    {
      title: 'クイック生成',
      description: '人気カードで即座に生成',
      action: handleQuickGenerate,
      color: 'bg-orange-600 hover:bg-orange-700',
      icon: '⚡',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        クイックアクション
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`${action.color} text-white p-4 rounded-lg text-left transition-colors`}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-medium">{action.title}</div>
            <div className="text-sm opacity-90">{action.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;

// src/components/RecentActivityCard.tsx
import React from 'react';

interface Activity {
  id: number;
  type: string;
  title: string;
  timestamp: string;
  status: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ activities }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        最近のアクティビティ
      </h3>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            アクティビティはありません
          </p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.type} • {activity.timestamp}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${activity.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                  }
                `}>
                  {activity.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivityCard;

// src/utils/apiClient.ts
import axios from 'axios';
import toast from 'react-hot-toast';

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('サーバーエラーが発生しました');
    } else if (error.response?.status >= 400) {
      toast.error(error.response?.data?.detail || 'エラーが発生しました');
    }
    return Promise.reject(error);
  }
);

// src/types/index.ts
export interface PokemonCard {
  id: number;
  card_id: string;
  name_jp: string;
  name_en: string;
  card_number: string;
  series_name: string;
  rarity_display: string;
  investment_grade_display: string;
  is_popular: boolean;
  popularity_score: number;
  current_price: number;
  price_change_24h: number;
  image_url: string;
  thumbnail: string;
}

export interface GeneratedContent {
  id: number;
  title: string;
  content: string;
  summary: string;
  card_detail: PokemonCard;
  template_name: string;
  status_display: string;
  quality_score: number;
  word_count: number;
  reading_time: number;
  created_at: string;
}

export interface ContentGenerationTask {
  task_id: string;
  status_display: string;
  progress_percentage: number;
  template_name: string;
  started_at: string;
  estimated_completion: string;
}

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}

// src/App.css
@tailwind base;
@tailwind components;
@tailwind utilities;

.react-loading-skeleton {
  --base-color: #f3f4f6;
  --highlight-color: #e5e7eb;
  --animation-duration: 2s;
  --animation-direction: normal;
  --pseudo-element-display: block;
}