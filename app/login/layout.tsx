import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ログイン - NAGANO-3',
  description: 'NAGANO-3 に ログイン',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  )
}
