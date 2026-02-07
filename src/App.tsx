import AuthWrapper from './components/AuthWrapper'
import Dashboard from './components/Dashboard'
import Onboarding from './components/Onboarding'

export default function App() {
  return (
    <div className="min-h-screen bg-sand">
      <AuthWrapper>
        {({ profile }) => {
          if (!profile?.goal_category || !profile?.emergency_contacts) {
            return <Onboarding profile={profile} />
          }

          return (
            <Dashboard status={profile?.status ?? 'active'} userId={profile?.id} />
          )
        }}
      </AuthWrapper>
    </div>
  )
}
