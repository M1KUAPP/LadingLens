export async function scrollAt(page, options) {
  const { selector, distance, pixelsPerSecond, suspendedClasses = [] } = options

  if (typeof selector !== 'string' || selector.trim() === '') {
    throw new Error('scrollAt requires a CSS selector.')
  }
  if (!Number.isFinite(distance) || distance < 0) {
    throw new Error('scrollAt requires a non-negative distance.')
  }
  if (!Number.isFinite(pixelsPerSecond) || pixelsPerSecond <= 0) {
    throw new Error('scrollAt requires a positive pixelsPerSecond value.')
  }
  if (!Array.isArray(suspendedClasses) || suspendedClasses.some((name) => typeof name !== 'string')) {
    throw new Error('scrollAt suspendedClasses must be an array of strings.')
  }

  return page.evaluate(
    async ({ selector, distance, pixelsPerSecond, suspendedClasses }) => {
      const target = document.querySelector(selector)
      if (!target) {
        throw new Error(`No element matches ${selector}.`)
      }

      const root = document.documentElement
      suspendedClasses.forEach((name) => root.classList.add(name))
      try {
        let moved = 0
        let previousFrame

        await new Promise((resolve) => {
          const frame = (timestamp) => {
            if (previousFrame === undefined) {
              previousFrame = timestamp
              requestAnimationFrame(frame)
              return
            }

            const displacement = Math.min(
              distance - moved,
              ((timestamp - previousFrame) / 1000) * pixelsPerSecond
            )
            previousFrame = timestamp
            moved += displacement
            target.scrollBy({ top: displacement, left: 0 })

            if (moved >= distance) {
              resolve()
            } else {
              requestAnimationFrame(frame)
            }
          }

          requestAnimationFrame(frame)
        })
      } finally {
        suspendedClasses.forEach((name) => root.classList.remove(name))
      }
    },
    { selector, distance, pixelsPerSecond, suspendedClasses }
  )
}
