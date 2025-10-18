import { ShippingFeesDatabase } from '@/components/shipping/shipping-fees-database'

export default function FeesDbPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-6">
        <ShippingFeesDatabase />
      </div>
    </div>
  )
}
