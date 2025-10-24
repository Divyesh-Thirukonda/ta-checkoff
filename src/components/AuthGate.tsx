'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@/lib/auth'

interface AuthGateProps {
  children: React.ReactNode
  requireRole?: 'student' | 'ta' | 'admin'
}

export default function AuthGate({ children, requireRole }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkUser()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUserProfile(authUserId: string) {
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      setUser(userProfile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  async function handleAuth() {
    try {
      setError('')
      
      // Check if email is allowed
      const allowedSuffix = '@umn.edu'
      if (!email.endsWith(allowedSuffix)) {
        setError('Only @umn.edu email addresses are allowed')
        return
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        
        if (error) throw error
        
        if (data.user) {
          // Create user profile
          await supabase.from('users').insert({
            auth_user_id: data.user.id,
            email: data.user.email!,
            role: 'student'
          })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
      }
    } catch (error) {
      setError((error as Error).message)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              UMN Lab Checkoff System
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address (@umn.edu)"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Check role requirements
  if (requireRole && user.role !== requireRole && user.role !== 'admin') {
    if (requireRole === 'ta' && user.role !== 'ta') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">This page requires TA or admin privileges.</p>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}