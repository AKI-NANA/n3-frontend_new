"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Copy } from "lucide-react"
import { GroupingBoxModal } from "./grouping-box-modal"

interface Product {
  id: number
  sku: string
  name: string
  category: string
  purchase_price: number
  stock_quantity: number
  variation_type: string
  status: string
  image_url?: string
  created_at: string
}

interface ProductListProps {
  onSelectProduct?: (product: Product) => void
  filterStatus?: string
}

export function ProductList({ onSelectProduct, filterStatus }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedSKU, setSelectedSKU] = useState<string | null>(null)
  const [showGroupingModal, setShowGroupingModal] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products/get-all")
        const result = await response.json()

        if (result.data) {
          setProducts(result.data)
        }
      } catch (error) {
        console.error("Failed to fetch products:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    let filtered = products

    if (filterStatus) {
      filtered = filtered.filter((p) => p.status === filterStatus)
    }

    setFilteredProducts(filtered)
  }, [products, filterStatus])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      NeedsApproval: { label: "承認待ち", variant: "secondary" },
      Approved: { label: "承認済み", variant: "default" },
      Rejected: { label: "却下", variant: "destructive" },
    }

    const config = statusConfig[status] || { label: status, variant: "default" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getVariationBadge = (type: string) => {
    if (type === "Parent") {
      return <Badge variant="secondary">親SKU</Badge>
    } else if (type === "Child") {
      return <Badge variant="secondary">子SKU</Badge>
    }
    return null
  }

  const handleOpenGroupingBox = (product: Product) => {
    if (product.variation_type === "Single") {
      setSelectedSKU(product.sku)
      setShowGroupingModal(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">画像</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>商品名</TableHead>
                <TableHead>カテゴリー</TableHead>
                <TableHead className="text-right">在庫数</TableHead>
                <TableHead>仕入原価</TableHead>
                <TableHead>タイプ</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">商品がありません</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <div className="relative h-10 w-10 rounded">
                          <Image
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right">{product.stock_quantity}</TableCell>
                    <TableCell>¥{Number(product.purchase_price || 0).toLocaleString()}</TableCell>
                    <TableCell>{getVariationBadge(product.variation_type)}</TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {product.variation_type === "Single" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenGroupingBox(product)}
                          title="バリエーション化"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onSelectProduct && onSelectProduct(product)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="text-sm text-muted-foreground">合計: {filteredProducts.length}件の商品</div>
      </div>

      {selectedSKU && (
        <GroupingBoxModal
          isOpen={showGroupingModal}
          parentSKU={selectedSKU}
          onClose={() => {
            setShowGroupingModal(false)
            setSelectedSKU(null)
          }}
          onSuccess={() => {
            // Refresh products list
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
