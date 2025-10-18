'use client'

interface PhpIframeProps {
  src: string
}

export function PhpIframe({ src }: PhpIframeProps) {
  // PHPサーバーのURLを構築（開発環境の場合）
  const phpServerUrl = process.env.NEXT_PUBLIC_PHP_SERVER_URL || 'http://localhost:8080'
  const fullUrl = `${phpServerUrl}${src}`

  return (
    <iframe
      src={fullUrl}
      className="w-full h-full border-0"
      title="PHP Legacy Tool"
      style={{ 
        backgroundColor: '#f5f5f5',
        minHeight: 'calc(100vh - 64px)'
      }}
    />
  )
}
