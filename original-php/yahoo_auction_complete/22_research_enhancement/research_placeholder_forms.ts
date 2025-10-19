// app/research/components/SellerSearchForm.tsx
import type { ResearchProduct } from '@/types/research';

interface FormProps {
  onSearch: (results: ResearchProduct[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
  setLoadingSubMessage: (message: string) => void;
}

export function SellerSearchForm({ onSearch, setLoading, setLoadingMessage, setLoadingSubMessage }: FormProps) {
  return (
    <div className="text-center py-12">
      <i className="fas fa-user text-6xl text-gray-300 mb-4"></i>
      <h3 className="text-2xl font-bold text-gray-700 mb-2">セラーリサーチ</h3>
      <p className="text-gray-500">この機能は開発中です</p>
    </div>
  );
}

// app/research/components/ReverseSearchForm.tsx
export function ReverseSearchForm({ onSearch, setLoading, setLoadingMessage, setLoadingSubMessage }: FormProps) {
  return (
    <div className="text-center py-12">
      <i className="fas fa-exchange-alt text-6xl text-gray-300 mb-4"></i>
      <h3 className="text-2xl font-bold text-gray-700 mb-2">逆リサーチ（Amazon→eBay）</h3>
      <p className="text-gray-500">この機能は開発中です</p>
    </div>
  );
}

// app/research/components/AIAnalysisForm.tsx
export function AIAnalysisForm({ onSearch, setLoading, setLoadingMessage, setLoadingSubMessage }: FormProps) {
  return (
    <div className="text-center py-12">
      <i className="fas fa-brain text-6xl text-gray-300 mb-4"></i>
      <h3 className="text-2xl font-bold text-gray-700 mb-2">AI分析</h3>
      <p className="text-gray-500">この機能は開発中です</p>
    </div>
  );
}
