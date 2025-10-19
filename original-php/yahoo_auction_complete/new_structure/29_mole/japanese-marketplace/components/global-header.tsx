"use client"

import { Search, ShoppingCart, Globe, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useState } from "react"

export function GlobalHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Trust Badge */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="text-xl font-serif font-bold text-foreground">日本コレクション</div>
              <Badge variant="secondary" className="text-xs font-medium">
                Japan Certified Goods
              </Badge>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search Japanese Niche Collections..."
                className="w-full pl-10 pr-4 h-11 text-base"
              />
            </div>
          </div>

          {/* Navigation Links - Desktop */}
          <nav className="hidden lg:flex items-center space-x-6">
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              All Collections
            </a>
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Trading Card Experts
            </a>
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Vintage Denim
            </a>
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              New Arrivals
            </a>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Language/Currency Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <Globe className="h-4 w-4 mr-1" />
                  EN/USD
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>English / USD</DropdownMenuItem>
                <DropdownMenuItem>日本語 / JPY</DropdownMenuItem>
                <DropdownMenuItem>中文 / CNY</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cart */}
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">0</Badge>
            </Button>

            {/* Profile/Login */}
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Profile</span>
            </Button>

            {/* Mobile Menu */}
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Search Japanese Collections..." className="w-full pl-10 pr-4" />
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t py-4">
            <nav className="flex flex-col space-y-3">
              <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
                All Collections
              </a>
              <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
                Trading Card Experts
              </a>
              <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
                Vintage Denim
              </a>
              <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
                New Arrivals
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
