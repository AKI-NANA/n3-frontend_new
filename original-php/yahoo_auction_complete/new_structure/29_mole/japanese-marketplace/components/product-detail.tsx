"use client"

import { useState } from "react"
import { Heart, Shield, RotateCcw, CreditCard, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ProductDetail() {
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const images = [
    "/vintage-japanese-trading-card-pokemon-charizard.jpg",
    "/pokemon-card-back-side.jpg",
    "/pokemon-card-holographic-detail.jpg",
    "/pokemon-card-condition-close-up.jpg",
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            <img
              src={images[selectedImage] || "/placeholder.svg"}
              alt="Product main image"
              className="h-full w-full object-cover"
            />
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 bg-background/80 backdrop-blur">
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Thumbnail Images */}
          <div className="flex space-x-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-square w-20 overflow-hidden rounded-md border-2 ${
                  selectedImage === index ? "border-primary" : "border-border"
                }`}
              >
                <img
                  src={image || "/placeholder.svg"}
                  alt={`Product image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              Trading Cards
            </Badge>
            <h1 className="text-3xl font-serif font-bold text-balance">
              1998 Pokémon Japanese Base Set Charizard #006 PSA 9
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">(127 reviews)</span>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold">$2,450</span>
              <span className="text-lg text-muted-foreground line-through">$2,800</span>
              <Badge variant="destructive">12% OFF</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Free shipping worldwide • 30-day return policy</p>
          </div>

          {/* Buyer Assurance Block */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-primary">Buyer Assurance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Certified Inspection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">7-Day Return Guarantee</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Secure Payment by Shopify</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Curator/Seller Profile */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Curator/Seller Profile</h3>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src="/japanese-collector-portrait.jpg" />
                  <AvatarFallback>TK</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Takeshi Yamamoto</p>
                  <p className="text-sm text-muted-foreground">
                    Selected and Inspected by Takeshi Yamamoto - Your Japanese Trading Card Expert
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-xs">4.9 • 500+ sales</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cultural Context */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Cultural Context & Story</h3>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  This iconic Charizard card represents the golden era of Pokémon's <em>Showa Retro</em> period in
                  Japan. Released during the initial Pokémon boom of 1998, this card embodies the craftsmanship and
                  attention to detail that Japanese card manufacturers were renowned for. The holographic foil technique
                  used was revolutionary for its time, creating the mesmerizing rainbow effect that collectors treasure
                  today.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Quantity:</label>
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-8 w-8 p-0"
                >
                  -
                </Button>
                <span className="px-3 py-1 text-sm">{quantity}</span>
                <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} className="h-8 w-8 p-0">
                  +
                </Button>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button size="lg" className="flex-1 h-12 text-base font-semibold">
                Add to Cart
              </Button>
              <Button variant="outline" size="lg" className="h-12 bg-transparent">
                Buy Now
              </Button>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Condition:</span>
              <span className="font-medium">PSA 9 (Mint)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Year:</span>
              <span className="font-medium">1998</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Set:</span>
              <span className="font-medium">Japanese Base Set</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Card Number:</span>
              <span className="font-medium">#006</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Authentication:</span>
              <span className="font-medium">PSA Certified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
