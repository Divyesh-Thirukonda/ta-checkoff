import { supabase } from './supabaseClient'
import { supabaseAdmin } from './supabaseAdmin'

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

// Client-side auth functions
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return null
  }

  // Check if email is allowed
  const allowedSuffix = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_SUFFIX || '@umn.edu'
  if (!session.user.email?.endsWith(allowedSuffix)) {
    await supabase.auth.signOut()
    return null
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()

  return user
}

export function isValidUMNEmail(email: string): boolean {
  const allowedSuffix = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_SUFFIX || '@umn.edu'
  return email.endsWith(allowedSuffix)
}