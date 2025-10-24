import { supabaseAdmin } from './supabaseAdmin'
import { cookies } from 'next/headers'

export type User = {
  id: string
  auth_user_id: string
  email: string
  first_name?: string
  last_name?: string
  section?: string
  role: 'student' | 'ta' | 'admin'
  initials?: string
}

export async function getCurrentUserServer(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    
    // Get session from cookies - this is a simplified approach
    // In a real app, you'd want to verify the JWT token properly
    const accessToken = cookieStore.get('sb-access-token')?.value
    
    if (!accessToken) {
      return null
    }

    const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(accessToken)
    
    if (!authUser) {
      return null
    }

    // Check if email is allowed
    const allowedSuffix = process.env.ALLOWED_EMAIL_SUFFIX || '@umn.edu'
    if (!authUser.email?.endsWith(allowedSuffix)) {
      return null
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single()

    return user
  } catch (error) {
    console.error('Error getting current user server:', error)
    return null
  }
}

export async function requireTA(): Promise<User> {
  const user = await getCurrentUserServer()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  if (user.role !== 'ta' && user.role !== 'admin') {
    throw new Error('TA or admin role required')
  }
  
  return user
}