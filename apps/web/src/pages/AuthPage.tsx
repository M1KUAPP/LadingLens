import { Link, useNavigate } from 'react-router-dom'
import { SilkCanvas } from '../components/SilkCanvas'
import { Button, Field } from '../components/ui/Controls'
import { VerdictCheckGlyph, VerdictCrossGlyph, VerdictHoldGlyph } from '../components/ui/Icons'
import { ensureGuestSession } from '../lib/guest-session'
import { readTheme } from '../lib/theme'
import './auth-page.css'

export function AuthPage() {
  const navigate = useNavigate()
  const dark = readTheme() === 'dark'

  const enterAsGuest = () => {
    ensureGuestSession()
    navigate('/inbox')
  }

  return (
    <main className="auth">
      <section className="auth-form" aria-labelledby="auth-heading">
        <div className="auth-stack">
          <Link to="/" className="auth-brand" aria-label="LadingLens home">
            <img
              className="auth-lockup"
              src={dark ? '/brand/lockup-dark.svg' : '/brand/lockup-colour.svg'}
              alt=""
              width={172}
              height={32}
            />
          </Link>
          <div className="auth-head">
            <h1 className="auth-heading" id="auth-heading">
              Sign in
            </h1>
            <p className="auth-subhead">Guest access is the only entry for this demo.</p>
          </div>
          <div className="auth-fields">
            <Field label="Email" type="email" autoComplete="off" placeholder="name@company.com" />
            <Field label="Password" type="password" autoComplete="off" />
          </div>
          <p className="auth-note">Synthetic data only. Nothing you type is stored or sent.</p>
          <Button className="auth-submit" onClick={enterAsGuest}>
            Sign in as Guest
          </Button>
        </div>
      </section>
      <section className="auth-panel" aria-label="About this demo">
        <div className="auth-card">
          <SilkCanvas className="auth-silk" />
          <div className="auth-card-head">
            <p className="auth-headline">Every shipping document, checked against its evidence.</p>
            <p className="auth-copy">
              Walk the inbox, comparison, review, and reconciliation views for a synthetic shipping operation.
            </p>
          </div>
          <div className="auth-notch">
            <svg className="auth-notch-shape" viewBox="0 0 1094 249" aria-hidden="true">
              <path
                d="M0.263672 16.8809C0.263672 8.0443 7.42712 0.880859 16.2637 0.880859H786.394H999.115C1012.37 0.880859 1023.12 11.626 1023.12 24.8808L1023.12 47.3809C1023.12 60.6357 1033.86 71.3809 1047.12 71.3809H1069.6C1082.85 71.3809 1093.6 82.126 1093.6 95.3809L1093.6 232.881C1093.6 241.717 1086.43 248.881 1077.6 248.881H16.2637C7.42716 248.881 0.263672 241.717 0.263672 232.881V16.8809Z"
                fill="currentColor"
              />
            </svg>
            <span className="auth-notch-mark">
              <img src={dark ? '/brand/mark-dark.svg' : '/brand/mark-colour.svg'} alt="" width={32} height={32} />
            </span>
            <div className="auth-notch-body">
              <p className="auth-notch-title">Match, mismatch, held.</p>
              <p className="auth-notch-copy">Short of evidence, a named person decides.</p>
              <div className="auth-verdicts" aria-hidden="true">
                <span className="auth-verdict auth-verdict--match">
                  <VerdictCheckGlyph size={20} />
                </span>
                <span className="auth-verdict auth-verdict--mismatch">
                  <VerdictCrossGlyph size={20} />
                </span>
                <span className="auth-verdict auth-verdict--held">
                  <VerdictHoldGlyph size={20} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
