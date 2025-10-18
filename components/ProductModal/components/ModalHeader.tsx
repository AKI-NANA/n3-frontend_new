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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img 
          src={product?.images?.[0]?.url || '/placeholder.png'} 
          alt="商品" 
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '8px',
            objectFit: 'cover',
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
      <button 
        onClick={onClose}
        aria-label="閉じる"
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '1.8rem',
          cursor: 'pointer',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'background 0.3s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        ×
      </button>
    </header>
  );
}
