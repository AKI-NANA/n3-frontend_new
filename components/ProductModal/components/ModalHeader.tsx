'use client';

import type { Product } from '@/types/product';

export interface ModalHeaderProps {
  product: Product | null;
  onClose: () => void;
}

export function ModalHeader({ product, onClose }: ModalHeaderProps) {
  return (
    <header 
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
        color: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '70px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* 🔥 画像サイズを大きく */}
        <img 
          src={product?.images?.[0]?.url || '/placeholder.png'} 
          alt="商品" 
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '12px',
            objectFit: 'cover',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        />
        <div>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 600,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'white',
          }}>
            <i className="fas fa-edit"></i>
            <span>{product?.title || 'データ読み込み中...'}</span>
          </h2>
          <small style={{ opacity: 0.9, fontSize: '0.85rem', color: 'white' }}>
            ID: {product?.id || 'N/A'} | 
            ASIN: {product?.asin || 'N/A'} |
            更新: {product?.updatedAt ? new Date(product.updatedAt).toLocaleDateString('ja-JP') : 'N/A'}
          </small>
        </div>
      </div>
      {/* 🔥 ×ボタンの色を暗めに変更 */}
      <button 
        onClick={onClose}
        aria-label="閉じる"
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          border: 'none',
          color: '#f3f4f6',
          fontSize: '1.8rem',
          cursor: 'pointer',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
          e.currentTarget.style.color = '#f3f4f6'
        }}
      >
        ×
      </button>
    </header>
  );
}
