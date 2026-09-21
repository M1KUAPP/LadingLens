import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import ArrowDown02Icon from '@hugeicons/core-free-icons/ArrowDown02Icon'
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon'
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon'
import { LandingNav } from '../features/landing/LandingNav'
import { Stagger } from '../features/landing/Stagger'
import { REVEAL_AT, inkIsPaper, sceneOpacities } from '../features/landing/scroll-math'
import { useVideoScrub } from '../features/landing/useVideoScrub'
import './landing-page.css'

// The MotionSites clip the page is built around: cloud, then a container
// ship on a dark sea. Its host sends open CORS, which the frame bank needs.
const FILM_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4'

type SceneProps = {
  opacity: number
  className: string
  children: (live: boolean) => ReactNode
}

// A scene fades with the scroll; its children rise in once it passes the
// reveal threshold, and only then do its links take the pointer.
function Scene({ opacity, className, children }: SceneProps) {
  const live = opacity > REVEAL_AT
  return (
    <section className={`land-scene ${className}`} style={{ opacity }} data-live={live || undefined}>
      {children(live)}
    </section>
  )
}

// A link in a scene that is not showing leaves the tab order and the
// accessibility tree; the scene's text stays readable.
function reach(live: boolean) {
  return live ? {} : ({ tabIndex: -1, 'aria-hidden': true } as const)
}

export function LandingPage() {
  const { trackRef, videoRef, canvasRef, progress, canvasLive } = useVideoScrub(FILM_SRC)
  const [hero, statement, close] = sceneOpacities(progress)

  return (
    <main className="land">
      <div className="land-track" ref={trackRef}>
        <span id="top" className="land-anchor land-anchor--top" />
        <span id="reconcile" className="land-anchor land-anchor--reconcile" />
        <span id="review" className="land-anchor land-anchor--review" />
        <div className="land-stage">
          <video
            ref={videoRef}
            className="land-video"
            src={FILM_SRC}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <canvas
            ref={canvasRef}
            className="land-canvas"
            width={1920}
            height={1080}
            data-live={canvasLive || undefined}
            aria-hidden="true"
          />
          <div className="land-overlay">
            <LandingNav paper={inkIsPaper(progress)} />
            <Scene opacity={hero} className="land-scene--hero">
              {(live) => (
                <>
                  <Stagger visible={live}>
                    <h1 className="land-title">Account for every shipping document.</h1>
                  </Stagger>
                  <Stagger visible={live} delay={150}>
                    <p className="land-subtitle">Every email captured and accounted for</p>
                  </Stagger>
                  <div className="land-hero-next">
                    <Stagger visible={live} delay={300}>
                      <a href="#reconcile" className="land-circle" aria-label="Next: reconciliation" {...reach(live)}>
                        <HugeiconsIcon icon={ArrowRight02Icon} size={18} aria-hidden="true" />
                      </a>
                    </Stagger>
                  </div>
                </>
              )}
            </Scene>
            <Scene opacity={statement} className="land-scene--statement">
              {(live) => (
                <>
                  <Stagger visible={live}>
                    <h2 className="land-statement">
                      Expected shipments reconciled <span className="land-soft">to the case ledger</span>{' '}
                      <span className="land-faint">independently of the inbox</span>
                    </h2>
                  </Stagger>
                  <div className="land-rail">
                    <Stagger visible={live} delay={200}>
                      <a href="#review" className="land-circle" aria-label="Next: human review" {...reach(live)}>
                        <HugeiconsIcon icon={ArrowDown02Icon} size={18} aria-hidden="true" />
                      </a>
                    </Stagger>
                    <Stagger visible={live} delay={350}>
                      <div className="land-dots" aria-hidden="true">
                        <span />
                        <span data-active="" />
                        <span />
                      </div>
                    </Stagger>
                    <Stagger visible={live} delay={500}>
                      <a
                        href="#top"
                        className="land-circle land-circle--small"
                        aria-label="Back to top"
                        {...reach(live)}
                      >
                        <HugeiconsIcon icon={ArrowUp01Icon} size={16} aria-hidden="true" />
                      </a>
                    </Stagger>
                  </div>
                </>
              )}
            </Scene>
            <Scene opacity={close} className="land-scene--close">
              {(live) => (
                <div className="land-close">
                  <Stagger visible={live}>
                    <p className="land-eyebrow">
                      <span className="land-data">NEEDS_REVIEW</span> <span aria-hidden="true">|</span> Human authority
                    </p>
                  </Stagger>
                  <Stagger visible={live} delay={150}>
                    <h2 className="land-closing">
                      <span>Held for review,</span> <span>released by a person.</span>
                    </h2>
                  </Stagger>
                  <Stagger visible={live} delay={300}>
                    <Link to="/auth" className="land-cta" {...reach(live)}>
                      Enter the demo
                      <span className="land-cta-dot" aria-hidden="true">
                        <HugeiconsIcon icon={ArrowRight02Icon} size={16} />
                      </span>
                    </Link>
                  </Stagger>
                </div>
              )}
            </Scene>
          </div>
        </div>
      </div>
    </main>
  )
}
