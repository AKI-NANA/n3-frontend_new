import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
  // TypeScript/ESLintエラーを無視（開発時）
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
