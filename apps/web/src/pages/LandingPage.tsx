import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import Moon01Icon from '@hugeicons/core-free-icons/Moon01Icon'
import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon'
import { HeroFilm } from '../components/HeroFilm'
import { Button } from '../components/ui/Controls'
import { readTheme, toggleTheme, type Theme } from '../lib/theme'
import './landing-page.css'

export function LandingPage() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const lockupSrc = theme === 'dark' ? '/brand/lockup-dark.svg' : '/brand/lockup-colour.svg'
  const markSrc = theme === 'dark' ? '/brand/mark-dark.svg' : '/brand/mark-colour.svg'

  return (
    <main className="land">
      {/* The ground, not a banner: the clip runs behind the whole sheet with
          the canvas fading in off its edges. It resolves against the sheet,
          not this column, so .land must never become a containing block. */}
      <div className="land-film" aria-hidden="true">
        <HeroFilm reducedMotion={still} />
        <div className="land-veil" />
      </div>
      <header className="land-head">
        <img className="land-lockup" src={lockupSrc} alt="LadingLens" width={172} height={32} />
        <img className="land-mark" src={markSrc} alt="LadingLens" width={32} height={32} />
        <Button
          variant="ghost"
          className="land-theme"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(toggleTheme(theme))}
        >
          <HugeiconsIcon icon={theme === 'dark' ? Sun01Icon : Moon01Icon} size={20} aria-hidden="true" />
        </Button>
        <Link className="land-go" to="/auth">
          Get Started
        </Link>
      </header>
      <div className="land-body">
        <div className="land-plate">
          <p className="land-eyebrow">Shipping inbox control</p>
          <h1 className="land-title">Account for every shipping document.</h1>
        </div>
        {/* Supporting, not load-bearing: the hero line is the argument and
            the top row is the way in. Below 720px the facts come off rather
            than the page growing a scrollbar. */}
        <dl className="land-facts">
          <div className="land-fact">
            <dt className="land-fact-term">Gate 1</dt>
            <dd className="land-fact-copy">Every incoming email is captured and accounted for.</dd>
          </div>
          <div className="land-fact">
            <dt className="land-fact-term">Gate 2</dt>
            <dd className="land-fact-copy">
              Expected shipments are reconciled to the case ledger independently of the inbox.
            </dd>
          </div>
          <div className="land-fact">
            <dt className="land-fact-term">Human authority</dt>
            <dd className="land-fact-copy">
              Decisions without enough evidence return <span className="land-data">NEEDS_REVIEW</span>; a named person
              keeps release authority.
            </dd>
          </div>
        </dl>
      </div>
      <div className="land-strip" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  )
}
