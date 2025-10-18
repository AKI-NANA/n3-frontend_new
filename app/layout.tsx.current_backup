import type { Metadata } from "next"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import Footer from "@/components/layout/Footer"
import RightSidebar from "@/components/layout/RightSidebar"
import MainContent from "@/components/layout/MainContent"
import "./globals.css"

export const metadata: Metadata = {
  title: "NAGANO-3 v2.0",
  description: "統合eコマース管理システム",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        <Header />
        <Sidebar />
        <RightSidebar />
        <MainContent>
          {children}
        </MainContent>
        <Footer />
      </body>
    </html>
  )
}
