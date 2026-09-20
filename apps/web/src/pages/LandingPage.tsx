import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import Moon01Icon from '@hugeicons/core-free-icons/Moon01Icon'
import Sun01Icon from '@hugeicons/core-free-icons/Sun01Icon'
import PauseIcon from '@hugeicons/core-free-icons/PauseIcon'
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon'
import { HeroFilm } from '../components/HeroFilm'
import { Button } from '../components/ui/Controls'
import { readTheme, toggleTheme, type Theme } from '../lib/theme'
import './landing-page.css'

export function LandingPage() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [still] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const filmRef = useRef<HTMLVideoElement>(null)
  const [filmPaused, setFilmPaused] = useState(false)

  const lockupSrc =
    theme === 'dark' ? '/brand/lockup-dark.svg' : '/brand/lockup-colour.svg'

  const toggleFilm = () => {
    setFilmPaused((paused) => !paused)
    const video = filmRef.current
    if (!video) {
      return
    }
    try {
      if (filmPaused) {
        const playAttempt = video.play()
        if (playAttempt) {
          void playAttempt.catch(() => {})
        }
      } else {
        video.pause()
      }
    } catch {
      // Sandboxed environments may not implement media playback.
    }
  }

  return (
    <main className="land">
      <div className="land-film" aria-hidden="true">
        <HeroFilm reducedMotion={still} videoRef={filmRef} />
        <div className="land-veil" />
      </div>
      <header className="land-head">
        <div className="land-brand">
          <img
            className="land-lockup"
            src={lockupSrc}
            alt="LadingLens"
            width={172}
            height={32}
          />
        </div>
        <Button
          variant="ghost"
          className="land-icon"
          aria-label={
            theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
          }
          onClick={() => setTheme(toggleTheme(theme))}
        >
          <HugeiconsIcon
            icon={theme === 'dark' ? Sun01Icon : Moon01Icon}
            size={20}
            aria-hidden="true"
          />
        </Button>
        {!still && (
          <Button
            variant="ghost"
            className="land-film-toggle"
            aria-label={filmPaused ? 'Play film' : 'Pause film'}
            aria-pressed={filmPaused}
            onClick={toggleFilm}
          >
            <HugeiconsIcon
              icon={filmPaused ? PlayIcon : PauseIcon}
              size={20}
              aria-hidden="true"
            />
            <span className="land-film-toggle-label">
              {filmPaused ? 'Play film' : 'Pause film'}
            </span>
          </Button>
        )}
        <Link className="land-go" to="/judge">
          Open live demo
        </Link>
      </header>
      <div className="land-body">
        <div className="land-plate">
          <p className="land-eyebrow">Shipping inbox control</p>
          <h1 className="land-title">Account for every shipping document.</h1>
        </div>
        <dl className="land-facts">
          <div className="land-fact">
            <dt className="land-fact-term">Gate 1</dt>
            <dd className="land-fact-copy">
              Every incoming email is captured and accounted for.
            </dd>
          </div>
          <div className="land-fact">
            <dt className="land-fact-term">Gate 2</dt>
            <dd className="land-fact-copy">
              Expected shipments are reconciled to the case ledger
              independently of the inbox.
            </dd>
          </div>
          <div className="land-fact">
            <dt className="land-fact-term">Human authority</dt>
            <dd className="land-fact-copy">
              Decisions without enough evidence return{' '}
              <span className="land-data">NEEDS_REVIEW</span>; a named person
              keeps release authority.
            </dd>
          </div>
        </dl>
      </div>
      <div className="land-strip" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  )
}
