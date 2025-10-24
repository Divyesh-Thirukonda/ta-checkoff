import { NextRequest, NextResponse } from 'next/server'
import { requireTA } from '@/lib/serverAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    // Verify TA role
    await requireTA()
    
    const { path } = await request.json()
    
    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      )
    }

    // Generate signed URL with 30 min expiry
    const { data, error } = await supabaseAdmin.storage
      .from('videos')
      .createSignedUrl(path, 60 * 30) // 30 minutes

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      )
    }

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (error) {
    console.error('Error in signed-url:', error)
    
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