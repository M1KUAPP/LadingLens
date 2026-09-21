// Gate: fail if any slide overflows its 1920x1080 frame or any element escapes it.
// Run this BEFORE building the PDF. Exit 1 means do not ship.
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'

const deck = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
await p.goto(pathToFileURL(deck).href, { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)

const n = await p.evaluate(() => document.querySelectorAll('.slide').length)
let bad = 0

for (let i = 1; i <= n; i++) {
  const r = await p.evaluate((k) => {
    const all = [...document.querySelectorAll('.slide')]
    all.forEach((s, j) => s.toggleAttribute('data-active', j === k - 1))
    const d = document.getElementById('deck')
    if (d) d.style.transform = 'none'
    const s = all[k - 1]
    const f = s.getBoundingClientRect()
    const escapes = []
    s.querySelectorAll('*').forEach((el) => {
      if (el.classList.contains('plinth') || el.classList.contains('bg')) return
      const q = el.getBoundingClientRect()
      if (q.width === 0 || q.height === 0) return
      const over = Math.max(q.bottom - f.bottom, q.right - f.right)
      if (over > 1.5) {
        escapes.push(
          `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || '-'} +${Math.round(over)}px`
        )
      }
    })

    // A column that outgrows its track is painted straight over the furniture
    // below it. Neither the frame check nor the .box check sees that: the
    // slide never scrolls and no box spills. So collide the content against
    // what actually sits at the foot of the slide. Compare against the
    // furniture's own painted children, not its box, because a full-width
    // strip is mostly empty space that nothing is really hitting.
    const furniture = []
    s.querySelectorAll('.coverfoot, .foot, .strip').forEach((f) => {
      f.querySelectorAll('*').forEach((el) => {
        if (el.children.length) return
        const q = el.getBoundingClientRect()
        if (q.width > 0 && q.height > 0 && (el.textContent.trim() || el.tagName === 'IMG')) {
          furniture.push({ el: f, q })
        }
      })
    })
    s.querySelectorAll('*').forEach((el) => {
      // scrim and bg are full-bleed backdrop layers; they cover everything by design
      if (['plinth', 'bg', 'scrim'].some((c) => el.classList.contains(c))) return
      if (el.children.length) return
      const q = el.getBoundingClientRect()
      if (q.width === 0 || q.height === 0) return
      for (const f of furniture) {
        if (f.el.contains(el)) continue
        const dy = Math.min(q.bottom, f.q.bottom) - Math.max(q.top, f.q.top)
        const dx = Math.min(q.right, f.q.right) - Math.max(q.left, f.q.left)
        if (dy > 2 && dx > 2) {
          escapes.push(
            `overlaps ${f.el.className.split(' ')[0]}: ` +
              `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || '-'} by ${Math.round(dy)}px`
          )
          break
        }
      }
    })

    // Content spilling out of a component still reads as broken even though it
    // sits inside the frame, so every .box is measured as its own container.
    s.querySelectorAll('.box').forEach((box) => {
      const b = box.getBoundingClientRect()
      const pad = getComputedStyle(box)
      const lim = b.bottom - parseFloat(pad.paddingBottom) - parseFloat(pad.borderBottomWidth)
      box.querySelectorAll(':scope > *').forEach((el) => {
        const q = el.getBoundingClientRect()
        if (q.width === 0 || q.height === 0) return
        if (q.bottom - lim > 1.5) {
          escapes.push(
            `spill .box > ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || '-'}` +
              ` +${Math.round(q.bottom - lim)}px`
          )
        }
      })
    })
    return {
      scrollY: s.scrollHeight - s.clientHeight,
      scrollX: s.scrollWidth - s.clientWidth,
      escapes: [...new Set(escapes)].slice(0, 5),
    }
  }, i)

  const fail = r.scrollY > 1 || r.scrollX > 1 || r.escapes.length > 0
  if (fail) bad++
  console.log(
    `${fail ? 'FAIL' : 'ok  '} slide ${String(i).padStart(2, '0')}` +
      ` y+${r.scrollY} x+${r.scrollX}` +
      (r.escapes.length ? `  ESCAPES: ${r.escapes.join(' | ')}` : '')
  )
}

await b.close()
console.log(bad ? `\n${bad} slide(s) overflow - DO NOT SHIP` : '\nall slides fit')
process.exit(bad ? 1 : 0)
