import { useState, type RefObject } from 'react'
import './hero-film.css'

const POSTER_SRC = '/media/ladinglens-port-poster.webp'
const WEBM_SRC = '/media/ladinglens-port-loop.webm'
const MP4_SRC = '/media/ladinglens-port-loop.mp4'

export function HeroFilm({
  reducedMotion,
  videoRef
}: {
  reducedMotion: boolean
  videoRef?: RefObject<HTMLVideoElement | null>
}) {
  const [ready, setReady] = useState(false)
  const [posterReady, setPosterReady] = useState(false)

  const poster = (
    <img
      className="hero-film-poster"
      data-testid="hero-poster"
      data-ready={posterReady ? 'true' : undefined}
      src={POSTER_SRC}
      alt=""
      onLoad={() => setPosterReady(true)}
    />
  )

  if (reducedMotion) {
    return poster
  }

  return (
    <>
      {poster}
      <video
        ref={videoRef}
        className="hero-film-video"
        data-testid="hero-video"
        data-ready={ready ? 'true' : undefined}
        poster={POSTER_SRC}
        muted
        playsInline
        loop
        autoPlay
        preload="auto"
        aria-hidden="true"
        onCanPlay={() => setReady(true)}
      >
        <source src={WEBM_SRC} type="video/webm" />
        <source src={MP4_SRC} type="video/mp4" />
      </video>
    </>
  )
}
