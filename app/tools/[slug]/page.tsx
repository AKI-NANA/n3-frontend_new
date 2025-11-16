import { toolsConfig } from '@/data/tools-config'
import { PhpIframe } from '@/components/legacy/php-iframe'
import { notFound } from 'next/navigation'

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tool = toolsConfig.find(t => t.slug === slug)
  
  if (!tool) {
    notFound()
  }

  // Reactベースのツールはそれぞれのページで処理
  if (tool.isReact) {
    notFound() // 直接的なルートに任せる
  }

  // PHPベースのツールの場合のみ表示
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{tool.name}</h1>
      <PhpIframe src={tool.phpPath} />
    </div>
  )
}
