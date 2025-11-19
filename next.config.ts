import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ワークスペースルートの明示的な設定
  outputFileTracingRoot: '/Users/aritahiroaki/n3-frontend_new',
  
  // ビルドから除外するパターン
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Turbopack設定：アーカイブを除外
  turbopack: {
    rules: {
      '**/_archive/**': {
        loaders: [],
      },
    },
  },
  
  // 画像の最適化設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  // 厳格モード
  reactStrictMode: true,
  // TypeScriptエラーを無視（開発時）
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
