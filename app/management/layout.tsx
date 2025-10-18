'use client'

export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
