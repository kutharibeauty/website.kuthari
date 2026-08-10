'use client'

import { useEffect, useState } from 'react'
import { createClient, createStaffClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Client-side session hook — replaces Clerk's useAuth()/useUser().
 *
 * On the admin/delivery portal it reads the SEPARATE staff session cookie; on
 * the store it reads the customer session. The two are independent, so an admin
 * page always sees the admin identity (with admin_profile_id for permissions),
 * regardless of whether a store session also exists.
 */
export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const onStaffPath =
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/delivery'))
    const supabase = onStaffPath ? createStaffClient() : createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setIsLoaded(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoaded(true)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, isLoaded, isSignedIn: !!user }
}
