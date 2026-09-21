/**
 * One footer, one mounting. The shell fixes it behind the scrolling page and
 * uncovers it at the end: the landing reserves exactly its height, so the
 * reveal is the page's only scroll.
 */
export function SiteFooter() {
  return (
    <div className="site-foot-inner">
      <div className="site-foot-links">
        <a className="site-foot-link" href="https://github.com/Averis-T010NG/Averis" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </div>
  )
}
