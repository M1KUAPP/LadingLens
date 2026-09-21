import { useNavigate } from 'react-router-dom'
import { Button, Field } from '../components/ui/Controls'
import { ensureGuestSession } from '../lib/guest-session'
import { readTheme } from '../lib/theme'
import './auth-page.css'

export function AuthPage() {
  const navigate = useNavigate()
  const lockupSrc =
    readTheme() === 'dark'
      ? '/brand/lockup-dark.svg'
      : '/brand/lockup-colour.svg'

  const enterAsGuest = () => {
    ensureGuestSession()
    navigate('/inbox')
  }

  return (
    <main className="auth">
      <section className="auth-intro" aria-label="About this demo">
        <img
          className="auth-lockup"
          src={lockupSrc}
          alt="LadingLens"
          width={172}
          height={32}
        />
        <div className="auth-intro-body">
          <p className="auth-eyebrow">Operator demonstration</p>
          <p className="auth-headline">
            Every shipping document, checked against its evidence.
          </p>
          <p className="auth-copy">
            Walk the inbox, comparison, review, and reconciliation views for
            a synthetic shipping operation.
          </p>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-panel-inner">
          <div className="auth-panel-head">
            <h1 className="auth-heading" id="auth-heading">
              Sign in
            </h1>
            <p className="auth-subhead">
              Guest access is the only entry for this demo.
            </p>
          </div>
          <div className="auth-fields">
            <Field
              label="Email"
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
            />
            <Field label="Password" type="password" autoComplete="off" />
          </div>
          <Button className="auth-submit" onClick={enterAsGuest}>
            Sign in as Guest
          </Button>
        </div>
      </section>
    </main>
  )
}
