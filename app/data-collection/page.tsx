import { DataCollectionSystem } from '@/components/data-collection'
import { ManagementSidebar } from '@/components/management-suite/shared/ManagementSidebar'

export default function DataCollectionPage() {
  return (
    <div className="flex h-screen bg-background">
      <ManagementSidebar />
      <div className="flex-1 overflow-hidden">
        <DataCollectionSystem />
      </div>
    </div>
  )
}
