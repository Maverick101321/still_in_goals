import { useEffect, useState } from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type Profile = {
  id: string
  status: 'active' | 'slumping' | 'SOS'
  goal_category: string | null
  goal_description: string | null
  streak_count: number | null
  emergency_contacts: string[] | null
}

type AuthWrapperProps = {
  children: (payload: { session: Session | null; profile: Profile | null }) => React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return
      setSession(data.session ?? null)
      setLoading(false)
      if (data.session?.user) {
        await loadProfile(data.session.user)
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        await loadProfile(nextSession.user)
      } else {
        setProfile(null)
      }
    })

    init()

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (user: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,status,goal_category,goal_description,streak_count')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to load profile', error)
      return
    }

    let profileRow = data

    if (!profileRow) {
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        'User'

      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          display_name: displayName,
        })
        .select('user_id,status,goal_category,goal_description,streak_count')
        .single()

      if (insertError) {
        console.error('Failed to create profile', insertError)
        return
      }

      profileRow = insertData
    }

    const { data: contactsData, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('contact_email')
      .eq('user_id', user.id)

    if (contactsError) {
      console.error('Failed to load emergency contacts', contactsError)
    }

    const emergencyContacts = contactsData?.map((row) => row.contact_email) ?? null

    setProfile({
      id: profileRow.user_id,
      status: profileRow.status,
      goal_category: profileRow.goal_category,
      goal_description: profileRow.goal_description,
      streak_count: profileRow.streak_count,
      emergency_contacts: emergencyContacts,
    })
  }

  if (loading) {
    return <div className="p-6 text-lg">Loading…</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-sand p-6">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-8">
          <h1 className="text-3xl font-display mb-2">Welcome back</h1>
          <p className="text-slate-600 mb-6">Log in to keep your streak alive.</p>
          <Auth
            supabaseClient={supabase}
            providers={['google']}
            appearance={{ theme: ThemeSupa }}
            theme="default"
          />
        </div>
      </div>
    )
  }

  return <>{children({ session, profile })}</>
}
