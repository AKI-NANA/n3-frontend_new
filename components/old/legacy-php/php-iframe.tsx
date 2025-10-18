'use client'

export function PhpIframe({ src }: { src: string }) {
  return (
    <iframe
      src={`http://localhost:8080${src}`}
      className="w-full h-[calc(100vh-4rem)] border-0"
      title="Legacy PHP Tool"
    />
  )
}
