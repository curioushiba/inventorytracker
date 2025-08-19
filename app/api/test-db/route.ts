import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'NEXT_PUBLIC_SUPABASE_URL is not set' 
      }, { status: 500 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set' 
      }, { status: 500 })
    }

    // Test database connection
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select('count', { count: 'exact', head: true })

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('count', { count: 'exact', head: true })

    const { data: activitiesData, error: activitiesError } = await supabase
      .from('activities')
      .select('count', { count: 'exact', head: true })

    const results = {
      success: true,
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      tables: {
        items: {
          exists: !itemsError,
          error: itemsError?.message || null
        },
        categories: {
          exists: !categoriesError,
          error: categoriesError?.message || null
        },
        activities: {
          exists: !activitiesError,
          error: activitiesError?.message || null
        }
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
