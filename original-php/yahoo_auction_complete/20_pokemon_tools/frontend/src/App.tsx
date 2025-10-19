import React, { useState, useEffect } from 'react';
import './App.css';

interface Card {
  id: number;
  name: string;
  price: number;
  change: number;
  grade: string;
}

function App() {
  const [cards] = useState<Card[]>([
    { id: 1, name: 'ピカチュウ', price: 15000, change: 5.2, grade: 'S' },
    { id: 2, name: 'リザードン', price: 45000, change: -2.1, grade: 'S' },
    { id: 3, name: 'フシギダネ', price: 300, change: 1.5, grade: 'B' }
  ]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* ヘッダー */}
      <div style={{ backgroundColor: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#2563eb', margin: 0 }}>
              🎮 ポケモンカード相場システム
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: '#10b981', 
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>システム稼働中</span>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* 統計カード */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            background: 'linear-gradient(to right, #3b82f6, #2563eb)', 
            borderRadius: '0.5rem', 
            padding: '1.5rem', 
            color: 'white' 
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>総カード数</h3>
            <p style={{ fontSize: '1.875rem', fontWeight: '700', margin: 0 }}>{cards.length}</p>
          </div>
          
          <div style={{ 
            background: 'linear-gradient(to right, #10b981, #059669)', 
            borderRadius: '0.5rem', 
            padding: '1.5rem', 
            color: 'white' 
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>生成記事数</h3>
            <p style={{ fontSize: '1.875rem', fontWeight: '700', margin: 0 }}>24</p>
          </div>
          
          <div style={{ 
            background: 'linear-gradient(to right, #8b5cf6, #7c3aed)', 
            borderRadius: '0.5rem', 
            padding: '1.5rem', 
            color: 'white' 
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>平均価格</h3>
            <p style={{ fontSize: '1.875rem', fontWeight: '700', margin: 0 }}>¥20,100</p>
          </div>
          
          <div style={{ 
            background: 'linear-gradient(to right, #f97316, #ea580c)', 
            borderRadius: '0.5rem', 
            padding: '1.5rem', 
            color: 'white' 
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>現在時刻</h3>
            <p style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
              {currentTime.toLocaleTimeString('ja-JP')}
            </p>
          </div>
        </div>

        {/* カード一覧 */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1.5rem' }}>注目カード一覧</h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {cards.map((card) => (
              <div key={card.id} style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem', 
                padding: '1.5rem',
                transition: 'box-shadow 0.15s ease-in-out'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>{card.name}</h3>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: card.grade === 'S' ? '#fee2e2' : card.grade === 'A' ? '#fed7aa' : '#fef3c7',
                    color: card.grade === 'S' ? '#991b1b' : card.grade === 'A' ? '#9a3412' : '#92400e'
                  }}>
                    {card.grade}級
                  </span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#4b5563' }}>現在価格:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937' }}>
                      ¥{card.price.toLocaleString()}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#4b5563' }}>24h変動:</span>
                    <span style={{
                      fontWeight: '700',
                      color: card.change > 0 ? '#059669' : card.change < 0 ? '#dc2626' : '#4b5563'
                    }}>
                      {card.change > 0 ? '+' : ''}{card.change}%
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button 
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      fontWeight: '500',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#1d4ed8';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onClick={() => alert(`${card.name}の記事を生成中...`)}
                  >
                    📝 ブログ記事生成
                  </button>
                  
                  <button 
                    style={{
                      width: '100%',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      fontWeight: '500',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease-in-out'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#b91c1c';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }}
                    onClick={() => alert(`${card.name}のYouTube台本を生成中...`)}
                  >
                    🎬 YouTube台本生成
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* システム情報 */}
        <div style={{ marginTop: '2rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>システム情報</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '4rem', 
                height: '4rem', 
                backgroundColor: '#dcfce7', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 0.75rem' 
              }}>
                <div style={{ width: '2rem', height: '2rem', backgroundColor: '#10b981', borderRadius: '50%' }}></div>
              </div>
              <h3 style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 0.25rem 0' }}>データベース</h3>
              <p style={{ fontSize: '0.875rem', color: '#059669', margin: 0 }}>正常動作中</p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '4rem', 
                height: '4rem', 
                backgroundColor: '#dbeafe', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 0.75rem' 
              }}>
                <div style={{ 
                  width: '2rem', 
                  height: '2rem', 
                  backgroundColor: '#3b82f6', 
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
              <h3 style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 0.25rem 0' }}>AI生成エンジン</h3>
              <p style={{ fontSize: '0.875rem', color: '#2563eb', margin: 0 }}>処理中</p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '4rem', 
                height: '4rem', 
                backgroundColor: '#ede9fe', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 0.75rem' 
              }}>
                <div style={{ width: '2rem', height: '2rem', backgroundColor: '#8b5cf6', borderRadius: '50%' }}></div>
              </div>
              <h3 style={{ fontWeight: '600', color: '#1f2937', margin: '0 0 0.25rem 0' }}>自動投稿</h3>
              <p style={{ fontSize: '0.875rem', color: '#9333ea', margin: 0 }}>待機中</p>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#6b7280' }}>
          <p style={{ margin: 0 }}>
            ポケモンカード相場自動システム v1.0 - 現在時刻: {currentTime.toLocaleString('ja-JP')}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;