import { NextRequest, NextResponse } from 'next/server'
import { requireTA } from '@/lib/serverAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    // Verify TA role
    await requireTA()
    
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const lab = searchParams.get('lab')

    // Build query
    let query = supabaseAdmin
      .from('gradebook')
      .select(`
        *,
        user:users(
          email,
          first_name,
          last_name,
          section
        ),
        lab:labs(
          code,
          title
        )
      `)
      .order('verified_at', { ascending: false })

    // Apply filters if provided
    if (section) {
      query = query.eq('user.section', section)
    }

    if (lab) {
      query = query.eq('lab.code', lab)
    }

    const { data: gradebook, error } = await query

    if (error) {
      console.error('Error fetching gradebook:', error)
      return NextResponse.json(
        { error: 'Failed to fetch gradebook' },
        { status: 500 }
      )
    }

    return NextResponse.json({ gradebook })
  } catch (error) {
    console.error('Error in gradebook:', error)
    
    if ((error as Error).message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if ((error as Error).message === 'TA or admin role required') {
      return NextResponse.json(
        { error: 'TA or admin role required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}