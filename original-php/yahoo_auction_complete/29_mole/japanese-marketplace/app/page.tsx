import { GlobalHeader } from "@/components/global-header"
import { ProductDetail } from "@/components/product-detail"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <main>
        <ProductDetail />
      </main>
    </div>
  )
}
