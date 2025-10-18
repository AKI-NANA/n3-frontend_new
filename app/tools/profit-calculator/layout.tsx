import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '利益計算システム - NAGANO-3',
  description: '高精度な多国籍プラットフォーム利益計算・最適化システム',
}

export default function ProfitCalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
