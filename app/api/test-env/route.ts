import { NextResponse } from 'next/server'

export async function GET() {
  const envVars = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    allEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  }

  return NextResponse.json({
    success: true,
    message: 'Environment variables check',
    data: envVars
  })
}
