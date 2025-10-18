export function ShippingColorLegend() {
  return (
    <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
      <div className="text-sm font-semibold mb-3">色の説明</div>
      <div className="grid grid-cols-2 gap-4">
        {/* 配送会社（文字色） */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">配送会社（文字色）</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-orange-600 font-bold">●</span>
              <span>CPASS / SpeedPAK</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-600 font-bold">●</span>
              <span>Eloji / e-logi</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-bold">●</span>
              <span>日本郵便</span>
            </div>
          </div>
        </div>

        {/* 配送業者（枠色） */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">実際の配送業者（枠色）</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-400 rounded"></div>
              <span>FedEx</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-400 rounded"></div>
              <span>DHL</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-amber-600 rounded"></div>
              <span>UPS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-red-400 rounded"></div>
              <span>日本郵便</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
