"use client"

import { useState } from "react"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { InventoryProvider } from "@/contexts/inventory-context"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { InventoryDashboard } from "@/components/dashboard/inventory-dashboard"
import { Button } from "@/components/ui/button"
import { Package, LogOut, Sparkles } from "lucide-react"

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-secondary/10 to-primary/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <SignupForm onToggleMode={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  )
}

function MainApp() {
  const { user, logout } = useAuth()

  return (
    <InventoryProvider>
      <div className="min-h-screen bg-background">
        {/* Premium header with glassmorphism */}
        <header className="sticky top-0 z-50 glass border-b border-border/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-primary to-secondary p-2.5 rounded-xl shadow-premium">
                  <Package className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Inventory Tracker</h1>
                  <Sparkles className="h-4 w-4 text-secondary" />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground font-medium">Welcome, {user?.name}</span>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content with enhanced spacing */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <InventoryDashboard />
        </main>
      </div>
    </InventoryProvider>
  )
}

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Loading background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-2xl animate-pulse"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="bg-gradient-to-br from-primary to-secondary p-4 rounded-2xl shadow-premium-lg mb-6 inline-block">
            <Package className="h-12 w-12 text-primary-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground font-medium">Loading your inventory...</p>
        </div>
      </div>
    )
  }

  return user ? <MainApp /> : <AuthPage />
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
