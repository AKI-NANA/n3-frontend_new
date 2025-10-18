'use client'

import { useState, useEffect } from 'react'
import { Search, Bell, Palette, Trophy, Book, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function GlobalHeader() {
  const [time, setTime] = useState({
    la: '--:--',
    ny: '--:--',
    berlin: '--:--',
    tokyo: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  })

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date()
      setTime({
        la: now.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false }),
        ny: now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }),
        berlin: now.toLocaleTimeString('en-US', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false }),
        tokyo: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false })
      })
    }

    updateClocks()
    const interval = setInterval(updateClocks, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">N3</div>
            <div>
              <h1 className="text-lg font-semibold">NAGANO-3</h1>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative hidden md:block flex-1 max-w-md mx-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="注文番号、顧客ID、商品名で検索..." 
            className="pl-10"
          />
        </div>

        {/* World Clocks */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="text-sm">
            <div className="text-muted-foreground">西海岸</div>
            <div className="font-semibold">{time.la}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">東海岸</div>
            <div className="font-semibold">{time.ny}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">ドイツ</div>
            <div className="font-semibold">{time.berlin}</div>
          </div>
          <div className="text-sm border-l pl-4">
            <div className="text-muted-foreground">日本</div>
            <div className="font-semibold text-primary">{time.tokyo}</div>
          </div>
        </div>

        {/* Exchange Rates */}
        <div className="hidden xl:flex items-center gap-3 border-l pl-4">
          <div className="text-sm">
            <div className="text-muted-foreground">USD/JPY</div>
            <div className="font-semibold">154.32</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">EUR/JPY</div>
            <div className="font-semibold">167.45</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-xs flex items-center justify-center text-white">3</span>
          </Button>
          <Button variant="ghost" size="icon">
            <Palette className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Trophy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Book className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
