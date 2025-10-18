"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Shield, AlertTriangle, RefreshCw,
  Search, Plus, Trash2, TrendingUp
} from "lucide-react"
import { createClient } from '@supabase/supabase-js'
import { ManualVeROEntryDialog } from './ManualVeROEntryDialog'

interface VeROBrand {
  id: string
  brand_name: string
  brand_name_ja: string
  keywords: string[]
  force_used_condition: boolean
  recommended_condition: string
  notes: string
  violation_count: number
  last_violation_date: string
  is_active: boolean
}

export default function VeROManagementTab() {
  const [brands, setBrands] = useState<VeROBrand[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchVeROBrands = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('vero_brand_rules')
        .select('*')
        .order('violation_count', { ascending: false })

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('VeROブランド取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVeROBrands()
  }, [])

  const filteredBrands = brands.filter(brand => {
    if (!searchQuery) return true
    return (
      brand.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.brand_name_ja?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const getRiskBadgeColor = (count: number) => {
    if (count >= 100) return "bg-red-500"
    if (count >= 50) return "bg-orange-500"
    if (count >= 20) return "bg-yellow-500"
    return "bg-blue-500"
  }

  return (
    <div className="space-y-6">
      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              登録ブランド数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{brands.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              累計違反回数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {brands.reduce((sum, b) => sum + (b.violation_count || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              高リスクブランド
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {brands.filter(b => b.violation_count >= 50).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 警告 */}
      <Alert className="border-orange-500 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-sm text-orange-800">
          <strong>VeROブランド：</strong> 新品での出品は避け、<strong>LIKE_NEW</strong>で出品してください。
        </AlertDescription>
      </Alert>

      {/* 検索とアクションボタン */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="ブランド名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <ManualVeROEntryDialog />
      </div>

      {/* テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>VeROブランド一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ブランド名</TableHead>
                  <TableHead>日本語名</TableHead>
                  <TableHead className="text-center">違反回数</TableHead>
                  <TableHead>推奨コンディション</TableHead>
                  <TableHead>新品出品</TableHead>
                  <TableHead>備考</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.brand_name}</TableCell>
                    <TableCell>{brand.brand_name_ja}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={getRiskBadgeColor(brand.violation_count)}>
                        {brand.violation_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{brand.recommended_condition}</Badge>
                    </TableCell>
                    <TableCell>
                      {brand.force_used_condition ? (
                        <Badge variant="destructive">禁止</Badge>
                      ) : (
                        <Badge variant="secondary">許可</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                      {brand.notes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
