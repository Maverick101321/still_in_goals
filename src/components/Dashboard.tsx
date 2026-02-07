import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type DashboardProps = {
  status: 'active' | 'slumping' | 'SOS'
  userId?: string
  partnerName?: string
}

export default function Dashboard({ status, userId, partnerName }: DashboardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [checkInText, setCheckInText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const formattedPartnerName = useMemo(() => partnerName ?? 'Your partner', [partnerName])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId) return

    setSaving(true)
    setMessage(null)

    const nowIso = new Date().toISOString()

    const { error: insertError } = await supabase.from('checkins').insert({
      user_id: userId,
      content: checkInText,
      created_at: nowIso,
    })

    if (insertError) {
      setSaving(false)
      setMessage('Could not save check-in. Please try again.')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_checkin_at: nowIso, status: 'active' })
      .eq('id', userId)

    if (updateError) {
      setSaving(false)
      setMessage('Saved check-in, but failed to update your profile.')
      return
    }

    setSaving(false)
    setCheckInText('')
    setModalOpen(false)
    setMessage('Check-in saved. Keep going!')
  }

  return (
    <div className="min-h-screen bg-sand text-ink px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-display">Daily Momentum</h1>
          <p className="text-slate-600 mt-2">Stay honest, stay consistent.</p>
        </header>

        {status === 'SOS' ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-red-50 border border-red-200 p-6">
              <h2 className="text-2xl font-display text-red-700">You missed 3 days!</h2>
              <p className="text-red-600 mt-2">
                Your accountability partner is ready to help you reset the streak.
              </p>
            </div>

            <div className="rounded-3xl bg-white shadow-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-400">Your Accountability Partner</p>
                <h3 className="text-2xl font-display mt-2">{formattedPartnerName}</h3>
              </div>
              <button className="rounded-2xl bg-ink text-white px-6 py-3 font-semibold">
                Start Chat
              </button>
            </div>
          </div>
        ) : (
          <div className="grid place-items-center">
            <button
              onClick={() => setModalOpen(true)}
              className="h-44 w-44 md:h-56 md:w-56 rounded-full bg-sunrise text-white text-2xl md:text-3xl font-display shadow-glow transition hover:scale-105"
            >
              Check-In
            </button>
            {message ? <p className="mt-6 text-olive">{message}</p> : null}
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
            <h2 className="text-2xl font-display mb-4">What did you do today?</h2>
            <form onSubmit={handleSubmit}>
              <textarea
                value={checkInText}
                onChange={(event) => setCheckInText(event.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-slate-200 p-4 focus:outline-none focus:ring-2 focus:ring-sunrise"
                placeholder="Write a quick recap..."
                required
              />
              {message ? <p className="text-red-600 mt-3">{message}</p> : null}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-ink text-white px-5 py-3 font-semibold disabled:opacity-70"
                >
                  {saving ? 'Saving…' : 'Save Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
