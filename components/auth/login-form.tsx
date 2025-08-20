"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { Package, Sparkles } from "lucide-react"

interface LoginFormProps {
  onToggleMode: () => void
}

export function LoginForm({ onToggleMode }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const result = await login(email, password)

    if (!result.success) {
      setError(result.error || "Invalid email or password")
    }

    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto glass shadow-premium-xl">
      <CardHeader className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-primary to-secondary p-4 rounded-2xl shadow-premium-lg">
            <Package className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-base">Sign in to your premium inventory management account</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-background/50 backdrop-blur-sm border-border/60 focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 bg-background/50 backdrop-blur-sm border-border/60 focus:border-primary/50 transition-colors"
            />
          </div>
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="text-destructive text-sm text-center font-medium">{error}</div>
            </div>
          )}
          <Button 
            type="submit" 
            className="w-full h-11 text-base font-medium" 
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Sign In</span>
              </div>
            )}
          </Button>
        </form>
        <div className="pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground text-center">
            Don't have an account?{" "}
            <button 
              onClick={onToggleMode} 
              className="text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Create account
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
