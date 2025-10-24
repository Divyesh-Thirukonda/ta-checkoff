import { NextRequest, NextResponse } from 'next/server'

function isValidUMNEmail(email: string): boolean {
  const allowedSuffix = process.env.ALLOWED_EMAIL_SUFFIX || '@umn.edu'
  return email.endsWith(allowedSuffix)
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!isValidUMNEmail(email)) {
      return NextResponse.json(
        { error: 'Only @umn.edu email addresses are allowed' },
        { status: 403 }
      )
    }

    return NextResponse.json({ allowed: true })
  } catch (error) {
    console.error('Error in enforce-umn:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}