"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser, Session, AuthChangeEvent } from "@supabase/supabase-js"

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const createUserSession = (supabaseUser: SupabaseUser): User => ({
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: (supabaseUser.user_metadata?.name as string) || supabaseUser.email?.split('@')[0] || ""
  })

  useEffect(() => {
    let mounted = true
    let initializationPromise: Promise<void> | null = null

    const initializeAuth = async () => {
      try {
        // Get initial session first
        const { data, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error("Error getting session:", error)
          setError("Failed to get session")
        } else if (data.session?.user) {
          const userSession = createUserSession(data.session.user)
          setUser(userSession)
        }
        
        setIsLoading(false)
      } catch (error) {
        if (mounted) {
          console.error("Auth initialization error:", error)
          setError("Authentication failed")
          setIsLoading(false)
        }
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return
      
      setError(null)
      if (session?.user) {
        const userSession = createUserSession(session.user)
        setUser(userSession)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    // Only initialize once
    if (!initializationPromise) {
      initializationPromise = initializeAuth()
    }

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      if (!data.user) {
        const errorMsg = "No user data received"
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      // User session will be set by the auth state change listener
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Login failed"
      console.error("Login error:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null)
      setIsLoading(true)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      
      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }
      
      if (!data.user) {
        const errorMsg = "No user data received"
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }

      // User session will be set by the auth state change listener
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Signup failed"
      console.error("Signup error:", error)
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("Logout error:", error)
        setError(error.message)
      }
      // User will be cleared by the auth state change listener
    } catch (error) {
      console.error("Logout error:", error)
      setError(error instanceof Error ? error.message : "Logout failed")
    }
  }, [])

  const contextValue = useMemo(() => ({
    user,
    login,
    signup,
    logout,
    isLoading,
    error
  }), [user, login, signup, logout, isLoading, error])

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
