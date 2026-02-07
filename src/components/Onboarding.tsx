import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from './AuthWrapper'

type OnboardingProps = {
  profile: Profile | null
}

export default function Onboarding({ profile }: OnboardingProps) {
  const [goalCategory, setGoalCategory] = useState(profile?.goal_category ?? '')
  const [goalDetail, setGoalDetail] = useState(profile?.goal_description ?? '')
  const [contacts, setContacts] = useState(
    profile?.emergency_contacts ? profile.emergency_contacts.join(', ') : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile?.id) return

    setSaving(true)
    setError(null)

    try {
      const cleanContacts = contacts
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          goal_category: goalCategory || null,
          goal_description: goalDetail || null,
        })
        .eq('user_id', profile.id)

      if (updateError) {
        throw updateError
      }

      const { error: deleteError } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('user_id', profile.id)

      if (deleteError) {
        throw deleteError
      }

      if (cleanContacts.length) {
        const contactRows = cleanContacts.map((contact) => ({
          user_id: profile.id,
          contact_email: contact,
          contact_name: contact,
        }))

        const { error: insertError } = await supabase
          .from('emergency_contacts')
          .insert(contactRows)

        if (insertError) {
          throw insertError
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert(message)
      setError('Could not save onboarding info. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-3xl bg-white shadow-xl p-8"
      >
        <h1 className="text-3xl font-display mb-2">Set your north star</h1>
        <p className="text-slate-600 mb-8">
          This helps your accountability partner and SOS system support you.
        </p>

        <label className="block text-sm font-medium mb-2">Goal category</label>
        <select
          value={goalCategory}
          onChange={(event) => setGoalCategory(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-sunrise bg-white"
          required
        >
          <option value="" disabled>
            Select a category
          </option>
          <option value="health">Health / Fitness</option>
          <option value="academic">Academic / Exams</option>
          <option value="career_switch">Career Switch</option>
        </select>

        <label className="block text-sm font-medium mb-2">Exact goal</label>
        <input
          value={goalDetail}
          onChange={(event) => setGoalDetail(event.target.value)}
          placeholder="Run a 5k, finish CS101, land a PM role..."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-sunrise"
        />

        <label className="block text-sm font-medium mb-2">Emergency contacts</label>
        <textarea
          value={contacts}
          onChange={(event) => setContacts(event.target.value)}
          placeholder="Comma separated phone numbers or emails"
          rows={3}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-sunrise"
        />

        {error ? <p className="text-red-600 mb-4">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-ink text-white py-3 font-semibold tracking-wide disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </button>
      </form>
    </div>
  )
}
