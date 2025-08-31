"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { 
  Home, 
  Package, 
  Search, 
  BarChart3, 
  Settings, 
  Plus,
  type LucideIcon 
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface BottomNavItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
  badge?: number
  disabled?: boolean
}

export interface MobileBottomNavigationProps {
  items?: BottomNavItem[]
  onAddAction?: () => void
  className?: string
  showAddButton?: boolean
}

const defaultNavItems: BottomNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    path: '/',
  },
  {
    id: 'inventory',
    label: 'Items',
    icon: Package,
    path: '/inventory',
  },
  {
    id: 'search',
    label: 'Search',
    icon: Search,
    path: '/search',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
  },
]

export function MobileBottomNavigation({
  items = defaultNavItems,
  onAddAction,
  className,
  showAddButton = true,
}: MobileBottomNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { triggerSelectionHaptic } = useHapticFeedback()

  const handleNavigation = (item: BottomNavItem) => {
    if (item.disabled || pathname === item.path) return
    
    triggerSelectionHaptic()
    router.push(item.path)
  }

  const handleAddAction = () => {
    triggerSelectionHaptic()
    onAddAction?.()
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border",
          "pb-safe-bottom", // Safe area for devices with home indicator
          className
        )}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {items.map((item) => {
            const isItemActive = isActive(item.path)
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                disabled={item.disabled}
                onClick={() => handleNavigation(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 h-auto min-h-[44px] touch-manipulation transition-colors",
                  "hover:bg-accent/50 active:bg-accent/70",
                  isItemActive && "text-primary bg-primary/10",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="relative">
                  <item.icon 
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isItemActive ? "text-primary" : "text-muted-foreground"
                    )} 
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center min-w-[20px]">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span 
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isItemActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Floating Add Button */}
      {showAddButton && onAddAction && (
        <Button
          onClick={handleAddAction}
          className={cn(
            "fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90 active:bg-primary/80",
            "touch-manipulation transition-all duration-200",
            "hover:scale-105 active:scale-95"
          )}
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Bottom spacing to prevent content from being hidden behind nav */}
      <div className="h-20 w-full" aria-hidden="true" />
    </>
  )
}