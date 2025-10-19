// App.tsx - メインアプリケーション
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CardAnalysis from './components/CardAnalysis';
import ContentGeneration from './components/ContentGeneration';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cards" element={<CardAnalysis />} />
            <Route path="/content" element={<ContentGeneration />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

// components/Navigation.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'ダッシュボード', icon: 'chart-line' },
    { path: '/cards', label: 'カード分析', icon: 'search' },
    { path: '/content', label: 'コンテンツ生成', icon: 'magic' },
  ];

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <i className="fas fa-magic mr-2"></i>
            ポケモンカード コンテンツ自動生成システム
          </h1>
          <nav className="flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-white bg-opacity-20'
                    : 'hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <i className={`fas fa-${item.icon} mr-2`}></i>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navigation;

// components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import apiClient from '../utils/apiClient';

interface DashboardStats {
  totalCards: number;
  totalContent: number;
  monthlyViews: number;
  revenue: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/analytics/dashboard/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickGenerate = async () => {
    try {
      const response = await apiClient.post('/ai/generate_blog_article/', {
        card_id: 1, // デフォルトで人気カード
        language: 'jp'
      });
      
      alert(`コンテンツ生成を開始しました\nタスクID: ${response.data.task_id}`);
    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('コンテンツ生成に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">ダッシュボード</h2>
        <div className="flex space-x-4">
          <Button onClick={handleQuickGenerate} className="bg-green-600 hover:bg-green-700">
            <i className="fas fa-magic mr-2"></i>
            クイック生成
          </Button>
          <Button variant="outline">
            <i className="fas fa-cog mr-2"></i>
            設定
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">総カード数</p>
                <p className="text-3xl font-bold">{stats?.totalCards || 0}</p>
              </div>
              <i className="fas fa-database text-4xl text-blue-200"></i>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">生成コンテンツ</p>
                <p className="text-3xl font-bold">{stats?.totalContent || 0}</p>
              </div>
              <i className="fas fa-file-alt text-4xl text-green-200"></i>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">月間閲覧数</p>
                <p className="text-3xl font-bold">{stats?.monthlyViews?.toLocaleString() || 0}</p>
              </div>
              <i className="fas fa-eye text-4xl text-purple-200"></i>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">月間収益</p>
                <p className="text-3xl font-bold">¥{stats?.revenue?.toLocaleString() || 0}</p>
              </div>
              <i className="fas fa-yen-sign text-4xl text-orange-200"></i>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* クイックアクション */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4">クイックアクション</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              className="h-20 bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center"
              onClick={() => window.location.href = '/cards'}
            >
              <i className="fas fa-search text-2xl mb-2"></i>
              <span>カード検索・分析</span>
            </Button>
            
            <Button 
              className="h-20 bg-green-600 hover:bg-green-700 text-white flex flex-col items-center justify-center"
              onClick={() => window.location.href = '/content'}
            >
              <i className="fas fa-magic text-2xl mb-2"></i>
              <span>AI コンテンツ生成</span>
            </Button>
            
            <Button 
              className="h-20 bg-purple-600 hover:bg-purple-700 text-white flex flex-col items-center justify-center"
              onClick={() => alert('WordPress管理画面を開きます')}
            >
              <i className="fas fa-wordpress text-2xl mb-2"></i>
              <span>投稿管理</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

// components/ContentGeneration.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import apiClient from '../utils/apiClient';

interface PokemonCard {
  id: number;
  name_jp: string;
  card_number: string;
  rarity: string;
  investment_grade: string;
}

interface GenerationTask {
  id: string;
  content_type: string;
  status: string;
  progress: number;
}

const ContentGeneration: React.FC = () => {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [contentType, setContentType] = useState<string>('blog_jp');
  const [language, setLanguage] = useState<string>('jp');
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await apiClient.get('/cards/popular_cards/');
      setCards(response.data);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    }
  };

  const handleGenerateContent = async () => {
    if (!selectedCard) {
      alert('カードを選択してください');
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let data: any = { card_id: selectedCard };

      switch (contentType) {
        case 'blog_jp':
        case 'blog_en':
        case 'blog_cn':
          endpoint = '/ai/generate_blog_article/';
          data.language = language;
          break;
        case 'youtube_script':
          endpoint = '/ai/generate_youtube_script/';
          data.video_length = 10;
          break;
        case 'social_posts':
          endpoint = '/ai/generate_social_posts/';
          data.platforms = ['twitter', 'instagram'];
          break;
      }

      const response = await apiClient.post(endpoint, data);
      
      // タスクリストに追加
      const newTask: GenerationTask = {
        id: response.data.task_id,
        content_type: contentType,
        status: 'processing',
        progress: 0
      };
      setTasks(prev => [...prev, newTask]);

      alert(`コンテンツ生成を開始しました\n推定時間: ${response.data.estimated_time}`);
    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('コンテンツ生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    setLoading(true);
    try {
      const platforms = ['blog_jp', 'youtube_script', 'social_posts'];
      
      for (const platform of platforms) {
        const response = await apiClient.post('/ai/generate_blog_article/', {
          card_id: selectedCard,
          content_type: platform
        });
        
        const newTask: GenerationTask = {
          id: response.data.task_id,
          content_type: platform,
          status: 'processing',
          progress: 0
        };
        setTasks(prev => [...prev, newTask]);
      }

      alert('全プラットフォーム向けコンテンツ生成を開始しました！');
    } catch (error) {
      console.error('Failed to generate all content:', error);
      alert('一括生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">AI コンテンツ生成</h2>
        <Button 
          onClick={handleGenerateAll}
          disabled={!selectedCard || loading}
          className="bg-green-600 hover:bg-green-700"
        >
          <i className="fas fa-magic mr-2"></i>
          全プラットフォーム一括生成
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 生成設定 */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">生成設定</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象カード
                </label>
                <Select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="w-full"
                >
                  <option value="">カードを選択してください</option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name_jp} ({card.card_number}) - {card.rarity}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  コンテンツタイプ
                </label>
                <Select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full"
                >
                  <option value="blog_jp">ブログ記事（日本語）</option>
                  <option value="blog_en">ブログ記事（英語）</option>
                  <option value="blog_cn">ブログ記事（中国語）</option>
                  <option value="youtube_script">YouTube台本</option>
                  <option value="social_posts">SNS投稿</option>
                </Select>
              </div>

              <Button
                onClick={handleGenerateContent}
                disabled={!selectedCard || loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner animate-spin mr-2"></i>
                    生成中...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic mr-2"></i>
                    コンテンツ生成開始
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 生成状況 */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">生成状況</h3>
            
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                生成タスクはありません
              </p>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{task.content_type}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContentGeneration;

// utils/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター（認証トークンの自動付与）
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

// レスポンスインターセプター（エラーハンドリング）
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// components/ui/Button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;