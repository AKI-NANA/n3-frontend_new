import { PhpIframe } from '@/components/legacy/php-iframe'
import { toolsConfig } from '@/data/tools-config'
import { notFound } from 'next/navigation'

export default function WorkflowEnginePage() {
  const tool = toolsConfig.find(t => t.slug === 'workflow-engine')
  
  if (!tool || !('phpPath' in tool)) {
    notFound()
  }

  return (
    <div className="h-screen">
      <PhpIframe src={tool.phpPath} />
    </div>
  )
}
