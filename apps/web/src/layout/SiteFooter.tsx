import { Link } from 'react-router-dom'

/**
 * One footer, one mounting. The shell fixes it behind the scrolling page and
 * uncovers it at the end: the landing reserves exactly its height, so the
 * reveal is the page's only scroll.
 */
export function SiteFooter() {
  return (
    <div className="site-foot-inner">
      <Link to="/" className="site-foot-brand" aria-label="LadingLens home">
        <img
          className="site-foot-mark site-foot-mark--light"
          src="/brand/mark-colour.svg"
          alt=""
          width={28}
          height={28}
        />
        <img className="site-foot-mark site-foot-mark--dark" src="/brand/mark-dark.svg" alt="" width={28} height={28} />
        <span className="site-foot-name">LadingLens</span>
      </Link>
      <div className="site-foot-links">
        <a className="site-foot-link" href="https://github.com/Averis-T010NG/Averis" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </div>
  )
}
