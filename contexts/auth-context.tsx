"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user
        const userSession = { id: u.id, email: u.email || "", name: (u.user_metadata as any)?.name || "" }
        setUser(userSession)
        localStorage.setItem("inventory-user", JSON.stringify(userSession))
      } else {
        setUser(null)
        localStorage.removeItem("inventory-user")
      }
      setIsLoading(false)
    })
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      if (u) {
        const userSession = { id: u.id, email: u.email || "", name: (u.user_metadata as any)?.name || "" }
        setUser(userSession)
        localStorage.setItem("inventory-user", JSON.stringify(userSession))
      }
      setIsLoading(false)
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return false
      const u = data.user
      if (!u) return false
      const userSession = { id: u.id, email: u.email || "", name: (u.user_metadata as any)?.name || "" }
      setUser(userSession)
      localStorage.setItem("inventory-user", JSON.stringify(userSession))
      return true
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) return false
      const u = data.user
      if (!u) return false
      const userSession = { id: u.id, email: u.email || "", name: (u.user_metadata as any)?.name || "" }
      setUser(userSession)
      localStorage.setItem("inventory-user", JSON.stringify(userSession))
      return true
    } catch (error) {
      console.error("Signup error:", error)
      return false
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    localStorage.removeItem("inventory-user")
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
