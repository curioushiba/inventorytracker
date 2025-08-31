import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    
    // Basic validation
    if (!event.event_type || !event.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Optional: Store in Supabase for analysis
    // Note: You'll need to create an analytics_events table in your Supabase database
    try {
      await supabase.from('analytics_events').insert({
        event_type: event.event_type,
        event_data: event.event_data,
        user_id: event.user_id,
        timestamp: event.timestamp,
        session_id: event.session_id,
        user_agent: event.user_agent,
        url: event.url,
        pwa_mode: event.pwa_mode
      });
    } catch (dbError) {
      // Fallback: Log to console if database insert fails
      console.log('Analytics event (DB unavailable):', {
        type: event.event_type,
        data: event.event_data,
        user: event.user_id,
        pwa: event.pwa_mode
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}