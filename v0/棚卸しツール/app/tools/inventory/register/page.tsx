import { InventoryForm } from "@/components/inventory/inventory-form"

export const metadata = {
  title: "在庫登録 | 棚卸し管理",
  description: "新しい商品の在庫登録ページ",
}

export default function InventoryRegisterPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">在庫登録</h1>
          <p className="mt-2 text-muted-foreground">新しい商品情報を登録します。システムが自動的にSKUを生成します。</p>
        </div>

        <InventoryForm />
      </div>
    </main>
  )
}
