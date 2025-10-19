/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // publicPath の自動設定を無効化
    if (!isServer) {
      config.output.publicPath = '/_next/'
    }
    return config
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
  // 開発環境でのソースマップ有効化
  productionBrowserSourceMaps: false,
  // 厳格モード
  reactStrictMode: true,
}

export default nextConfig
