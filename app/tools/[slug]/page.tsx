import { toolsConfig } from '@/data/tools-config'
import { PhpIframe } from '@/components/legacy/php-iframe'
import { notFound } from 'next/navigation'

export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = toolsConfig.find(t => t.slug === params.slug)
  
  if (!tool) {
    notFound()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{tool.name}</h1>
      <PhpIframe src={tool.phpPath} />
    </div>
  )
}
