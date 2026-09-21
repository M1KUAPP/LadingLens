# admincn and Geist

Design-language notes for rebuilding the Averis post-auth workspace, read on
September 22, 2026 from the admincn template's source and live demo, and from
Vercel's Geist pages plus the production stylesheets those pages load. Values
are quoted exactly. Anything not confirmed in a primary source is marked
unverified.

Contents:

1.  [Sources read](#sources-read)
1.  [admincn tokens](#admincn-tokens)
1.  [admincn layout shell](#admincn-layout-shell)
1.  [admincn component patterns](#admincn-component-patterns)
1.  [Geist colour system](#geist-colour-system)
1.  [Geist typography scale](#geist-typography-scale)
1.  [Geist materials, radii and shadows](#geist-materials-radii-and-shadows)
1.  [Geist components for status and waiting](#geist-components-for-status-and-waiting)
1.  [Motion notes](#motion-notes)
1.  [Geist fonts in a Vite app](#geist-fonts-in-a-vite-app)
1.  [What to take for the Averis workspace](#what-to-take-for-the-averis-workspace)
1.  [See also](#see-also)

## Sources read

- **admincn source** at
  `/Users/yk/Projects/playground.repository/shadcnstudio.repository/admincn/`.
  It is Next.js, Tailwind v4 and shadcn built on Base UI
  (`src/components/ui/badge.tsx:1-2` imports `@base-ui/react`). Paths below
  are relative to that root. The licence file was not read.
- **admincn live demo** at
  https://shadcn-nextjs-admincn-admin-template.vercel.app/, read as a text
  summary through WebFetch, not as a rendered screenshot. It opens straight
  on the dashboard with no login.
- **Geist pages**: https://vercel.com/geist/colors,
  https://vercel.com/geist/typography, https://vercel.com/geist/materials,
  https://vercel.com/geist/badge and https://vercel.com/geist/status-dot.
  Their text gives token names and intended uses but no values.
- **Geist values** come from the three stylesheets linked from
  https://vercel.com/geist/typography
  (`/vc-ap-b3331f/_next/static/immutable/chunks/*.css`), downloaded with curl
  and grepped. They are Vercel's production CSS, so the values are real, but
  the hashed file names change with each deploy. They are cited below as
  "Geist site CSS".
- **Geist font**: https://github.com/vercel/geist-font.

Not read inside the time box, so unverified: `/geist/introduction`,
`/geist/grid`, and the Geist pages for table, skeleton, spinner, loading
dots, progress, gauge, empty state, note, toast, tabs, keyboard input and any
file or drop zone component. The `geist` npm README was not read either.

## admincn tokens

### admincn colour tokens

The default theme preset is `'default'` (`src/configs/themeConfig.ts:6`). The
named presets in `src/configs/themePresets.ts` begin with Caffeine (line 11),
Claude (82), Corporate (153), Ghibli Studio (224) and Marvel (295). No
`default` key showed up in those lines, so the default appears to be the
`:root` and `.dark` values in `src/app/globals.css` (unverified that no preset
overrides them).

Those values are stock shadcn neutral: achromatic oklch (chroma 0) except for
destructive and the chart colours (`src/app/globals.css:51-118`).

| Token                    | Light                       | Dark                         |
| ------------------------ | --------------------------- | ---------------------------- |
| background               | `oklch(1 0 0)`              | `oklch(0.145 0 0)`           |
| foreground               | `oklch(0.145 0 0)`          | `oklch(0.985 0 0)`           |
| card, popover            | `oklch(1 0 0)`              | `oklch(0.205 0 0)`           |
| primary                  | `oklch(0.205 0 0)`          | `oklch(0.922 0 0)`           |
| secondary, muted, accent | `oklch(0.97 0 0)`           | `oklch(0.269 0 0)`           |
| muted-foreground         | `oklch(0.556 0 0)`          | `oklch(0.708 0 0)`           |
| border                   | `oklch(0.922 0 0)`          | `oklch(1 0 0 / 10%)`         |
| input                    | `oklch(0.922 0 0)`          | `oklch(1 0 0 / 15%)`         |
| ring                     | `oklch(0.708 0 0)`          | `oklch(0.556 0 0)`           |
| destructive              | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)`  |
| sidebar                  | `oklch(0.985 0 0)`          | `oklch(0.205 0 0)`           |
| sidebar-primary          | `oklch(0.205 0 0)`          | `oklch(0.488 0.243 264.376)` |

In dark mode the cards (0.205) sit lighter than the page (0.145), and the
sidebar matches the cards.

### admincn radius

`--radius` is `0.625rem`, 10px (`src/app/globals.css:75`). The other radii
multiply it: `sm` ×0.6 (6px), `md` ×0.8 (8px), `lg` ×1 (10px), `xl` ×1.4
(14px), `2xl` ×1.8 (18px), `3xl` ×2.2 (22px) and `4xl` ×2.6 (26px)
(`src/app/globals.css:42-48`). The radius setting offers `none` `0rem`, `sm`
`0.45rem`, `md` `0.625rem` and `lg` `0.875rem`
(`src/configs/fontConfig.ts:36-41`), and `md` is the default
(`src/configs/themeConfig.ts:8`). Cards and the header use `rounded-xl`, so
they are 14px. Badges use `rounded-4xl`, which makes them pills.

### admincn fonts

The default font is `geist` (`src/configs/themeConfig.ts:7`), mapped to
`--font-geist-sans` (`src/configs/fontConfig.ts:10`). Tailwind reads it as
`--font-sans: var(--font-geist-sans)`, with `--font-mono:
var(--font-geist-mono)` and `--font-heading: var(--font-sans)`
(`src/app/globals.css:10-12`). The fonts load through `next/font/google`
(`Geist` and `Geist_Mono`, `src/app/layout.tsx:50-56`), which only works in
Next.js. Geist Pixel Square is also loaded, through `localFont`
(`src/app/layout.tsx:135`).

### admincn density, controls and shadows

- **Density scale.** The default is `scale: 'md'`
  (`src/configs/themeConfig.ts:9`). `[data-theme-scale='sm']` sets
  `--text-sm: 0.75rem`, `--text-base: 0.85rem` and
  `--spacing: 0.222222rem`, and `lg` sets `--spacing: 0.262222rem`
  (`src/app/globals.css:228-240`). Against Tailwind's `0.25rem` step, `sm` is
  about 11% denser. The `lg` rule's `--text-lg: 1.45` has no unit (line 238),
  which looks like a bug.
- **Controls.** `.input-default` is `h-9` (36px), `.input-lg` `h-10` and
  `.input-sm` `h-8` (`src/app/globals.css:120-128`). Buttons get `px-3` at
  `h-9` and `px-4` at `h-10` (`src/app/globals.css:133-152`).
- **Card edge.** Cards use `shadow-xs ring-1 ring-foreground/10`
  (`src/components/ui/card.tsx:11`): a 1px ring at 10% of the foreground
  colour instead of a CSS border.
- **Shadow customiser.** The theme exposes `shadow-color`, `shadow-opacity`,
  `shadow-blur`, `shadow-spread` and the two offsets as variables
  (`src/configs/fontConfig.ts:75-80`). Their default values were not checked.
- **Heartbeat.** `--animate-heartbeat: heartbeat 2s infinite ease-in-out`
  pulses a box-shadow from 0 to 6px and scales to 1.03
  (`src/app/globals.css:209-226`).

## admincn layout shell

### admincn sidebar

- **Widths.** `SIDEBAR_WIDTH = '16rem'`, `SIDEBAR_WIDTH_MOBILE = '18rem'` and
  `SIDEBAR_WIDTH_ICON = '3rem'` (`src/components/ui/sidebar.tsx:22-24`).
- **Collapse.** Defaults are `sidebarVariant: 'default'`,
  `sidebarCollapsible: 'icon'` and `sidebarOpen: true`
  (`src/configs/themeConfig.ts:11-13`), passed to
  `<Sidebar collapsible={collapsible} variant={...}>`, where `default` becomes
  shadcn's `sidebar` variant (`src/components/layout/Sidebar.tsx:475`). The
  width animates with `transition-[width] duration-200 ease-linear`
  (`src/components/ui/sidebar.tsx:208`). In the default variant the rail is
  exactly 3rem with `border-r`. The floating and inset variants add `p-2` and
  size the rail to `calc(var(--sidebar-width-icon)+(--spacing(4)))`
  (`src/components/ui/sidebar.tsx:212-225`).
- **Toggle.** Cmd or Ctrl plus B (`src/components/ui/sidebar.tsx:25,94`). The
  state is saved in the `sidebar_state` cookie for seven days
  (`src/components/ui/sidebar.tsx:20-21,81`).
- **Nested items on the rail.** A collapsible group turns into a dropdown
  that opens to the right with `sideOffset={12}` and `min-w-52`
  (`src/components/layout/Sidebar.tsx:144-172`).
- **Group labels.** `text-sidebar-foreground/50 tracking-wider uppercase`
  (`src/components/layout/Sidebar.tsx:241`) on top of the base
  `h-8 rounded-md px-2 text-xs font-medium`
  (`src/components/ui/sidebar.tsx:381`).
- **Active state.** The active item gets
  `bg-primary/10 text-accent-foreground font-medium`
  (`src/components/layout/Sidebar.tsx:129`). The parent of an active child
  gets `data-active:bg-primary/5!` (lines 166 and 283).
- **Counts and external links.** Count badges are
  `bg-primary/10 rounded-full px-1.5 text-xs font-normal`, and external links
  end in a `SquareArrowOutUpRightIcon` at `size-3.5 opacity-50`
  (`src/components/layout/Sidebar.tsx:135-139`).
- **Sizes.** The `lg` menu button is `h-12`
  (`src/components/ui/sidebar.tsx:464`). Sub-items are `h-7` and hang off a
  `border-l` guide with `mx-3.5 px-2.5` (lines 607 and 642). The default
  button height was not read (unverified).
- **Expand.** Sub-menus animate their height over `duration-200` and the
  chevron rotates 90 degrees (`src/components/layout/Sidebar.tsx:289-291`).

### admincn header

The header is a floating card inside a sticky strip, not a full-bleed bar
(`src/components/layout/Header.tsx:28-33`, compact layout shown):

```tsx
<header className='sticky top-0 z-50 px-4 before:absolute before:inset-0 before:rounded-t-xl before:mask-[linear-gradient(var(--card),var(--card)_18%,transparent_100%)] before:backdrop-blur-md sm:px-6'>
  <div className='bg-card relative z-51 mx-auto mt-3 flex w-full items-center justify-between rounded-xl border px-6 py-2 max-w-348'>
```

- **Left:** a `SidebarTrigger` with a `size-5` icon, a 16px vertical
  separator, then `SearchCommand` (`src/components/layout/Header.tsx:35-43`),
  which the demo shows as a ⌘K palette.
- **Right:** icon buttons at `gap-1.5`. Notifications carry a
  `bg-destructive size-2 rounded-full` dot at `top-2 right-2.5`
  (`src/components/layout/Header.tsx:45-58`). The demo also shows a theme
  toggle and an avatar.
- **Blur.** The blur layer is masked from solid to transparent, so content
  scrolling under the header softens instead of being cut off.
- **Height.** No height is set. With `py-2` around 36px icon buttons the card
  would be about 54px including its border (derived, unverified in a
  browser).

### admincn page frame

The shell is `flex h-full`, holding `Sidebar` and a
`SidebarInset flex flex-1 flex-col` with `Header`, `main`, `Toaster` and
`Footer` (`src/app/(pages)/layout.tsx:24-40`).

- **Main.** `mx-auto size-full flex-1 px-4 py-6 sm:px-6`, plus `max-w-360`
  (90rem, 1440px) in the default `compact` layout
  (`src/configs/themeConfig.ts:10`).
- **Alignment.** The header card is `max-w-348` (87rem, 1392px), which is
  1440px less the two 24px gutters, so its edges line up with the content.
- **Footer.** `text-muted-foreground px-4 py-3 sm:px-6` at the same
  `max-w-360`, with `text-sm` links that fade to the foreground over
  `duration-300` (`src/components/layout/Footer.tsx:18-34`).
- **Page header.** No shared page-title component was checked (unverified).

## admincn component patterns

### admincn card

The card is `rounded-xl bg-card ring-1 ring-foreground/10 shadow-xs text-sm`,
a flex column with `gap` and vertical padding of `--card-spacing`. That is
`--spacing(6)`, 24px, and `data-[size=sm]` drops it to 16px
(`src/components/ui/card.tsx:10-12`). The header is a grid that puts an
optional `CardAction` in a second column (lines 19-30 and 46-50). The title
is `font-heading text-base leading-normal font-medium`, or `text-sm` in the
small card (line 36). The description is `text-muted-foreground text-sm`
(line 43).

### admincn stat card

`src/views/dashboards/statistics/statistics-card-02.tsx:23-40` stacks:

1.  An icon tile: `Avatar size='lg'` with `rounded-sm` and a `size-5` icon,
    tinted through `iconClassName`.
2.  The title in `text-base font-semibold`.
3.  A subtitle in `text-muted-foreground text-sm`.
4.  The value in `text-base font-medium`.
5.  A trend `Badge`.

The title, not the value, is the heaviest text. The demo's first row shows
Total Profit $88.5k (-18%), Profit 124K (+12.6%, Last Month), User Reach 624K
(+12.6%, Last week), Total Income $4,673 (+25.2%, Last week) and Total Expense
$1.28K (-12.2%, Last month). The sales dashboard lays widgets out on
`grid grid-cols-6 gap-6` (grep of `src/app/(pages)/dashboard/sales/page.tsx`
and `src/views/dashboards/sales/`).

### admincn badge

The badge is `inline-flex h-5 rounded-4xl border border-transparent px-2
py-0.5 text-xs font-medium gap-1` with `size-3` icons
(`src/components/ui/badge.tsx:8`). Variants are `default` (`bg-primary`),
`secondary`, `destructive` (`bg-destructive/10 text-destructive`, `/20` in
dark), `outline`, `ghost` and `link` (lines 11-19). A status badge is
therefore a 10% tint with solid text, the same shape as Geist's subtle
badges.

### admincn table

The table sits in a `relative w-full overflow-x-auto` container and is
`w-full caption-bottom text-sm`. Header rows get `border-b`, the last body row
has none, and the footer is `bg-muted/50 border-t font-medium`
(`src/components/ui/table.tsx:7-27`). Row and cell padding were not read. The
demo's invoice table shows 5 of 25 rows with client, amount, date and status.

### admincn progress, skeleton and waiting

- **Linear progress.** The track is
  `bg-muted relative flex h-1.5 w-full items-center overflow-x-hidden
rounded-full` and the indicator `bg-primary h-full transition-all`. The
  label is `text-sm font-medium` and the value
  `text-muted-foreground ml-auto text-sm tabular-nums`
  (`src/components/ui/progress.tsx:12-52`).
- **Circular progress.** An SVG ring with a `text-primary/10` or
  `text-primary/20` track. The arc animates over `duration-700` with the
  overshoot curve `cubic-bezier(0.34,1.56,0.64,1)`, or over `duration-1000
ease-in-out` (`src/components/ui/circular-progress.tsx:82-145`).
- **Skeleton.** `bg-muted animate-pulse rounded-md`
  (`src/components/ui/skeleton.tsx:4`).
- **Effects.** `src/components/ui/` also holds `dot-grid.tsx`,
  `background-ripple.tsx`, `border-beam.tsx` and `number-ticker.tsx`. They
  were not read, but they are candidates for a waiting visual.
- **Upload.** `src/components/ui/` has no dropzone or file-upload primitive.
- **Empty state.** The demo's Pages menu lists an "Empty State" page, which
  was not read.

## Geist colour system

### Geist scales and step semantics

There are ten scales: backgrounds, gray, gray-alpha, blue, red, amber, green,
teal, purple and pink. Every scale except backgrounds has ten steps, and each
step has one job (https://vercel.com/geist/colors):

| Step | Job                            |
| ---- | ------------------------------ |
| 100  | Default background             |
| 200  | Hover background               |
| 300  | Active background              |
| 400  | Default border                 |
| 500  | Hover border                   |
| 600  | Active border                  |
| 700  | High contrast background       |
| 800  | Hover high contrast background |
| 900  | Secondary text and icons       |
| 1000 | Primary text and icons         |

`--ds-background-100` is the "Default element background" and
`--ds-background-200` the "Secondary background". The page does not explain
gray against gray-alpha. The values show that gray-alpha is the same ramp as
translucent black or white, so it composites over any surface.

### Geist values in light and dark

These are the hex declarations in the Geist site CSS. The light block starts
`--ds-background-100:#fff;--ds-background-200:#fafafa` and the dark block is
scoped to `.dark,.dark-theme,.invert-theme`. The same CSS also declares
`lab()` and `oklch()` versions of every token, presumably for wide-gamut
screens (which one wins was not checked).

| Token          | Light     | Dark   |
| -------------- | --------- | ------ |
| background-100 | `#fff`    | `#000` |
| background-200 | `#fafafa` | `#000` |

| Step | gray light | gray dark | gray-alpha light | gray-alpha dark |
| ---- | ---------- | --------- | ---------------- | --------------- |
| 100  | `#f2f2f2`  | `#1a1a1a` | `#0000000d`      | `#ffffff12`     |
| 200  | `#ebebeb`  | `#1f1f1f` | `#00000015`      | `#ffffff17`     |
| 300  | `#e6e6e6`  | `#292929` | `#0000001a`      | `#ffffff21`     |
| 400  | `#eaeaea`  | `#2e2e2e` | `#00000014`      | `#ffffff24`     |
| 500  | `#c9c9c9`  | `#454545` | `#00000036`      | `#ffffff3d`     |
| 600  | `#a8a8a8`  | `#878787` | `#0000003d`      | `#ffffff82`     |
| 700  | `#8f8f8f`  | `#8f8f8f` | `#00000070`      | `#ffffff8a`     |
| 800  | `#7d7d7d`  | `#7d7d7d` | `#00000082`      | `#ffffff78`     |
| 900  | `#4d4d4d`  | `#a0a0a0` | `#000000b3`      | `#ffffff9c`     |
| 1000 | `#171717`  | `#ededed` | `#000000e8`      | `#ffffffeb`     |

| Step | blue L    | blue D    | red L     | red D     | amber L   | amber D   | green L   | green D   |
| ---- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| 100  | `#f0f7ff` | `#06193a` | `#ffeef0` | `#330a11` | `#fff6e1` | `#291800` | `#ecfdec` | `#00250a` |
| 200  | `#eaf4ff` | `#022248` | `#ffe9ea` | `#440d13` | `#fff4d4` | `#331b00` | `#e5fce7` | `#003110` |
| 300  | `#e0efff` | `#002f62` | `#ffe4e5` | `#5d0e17` | `#fff1c8` | `#4f2900` | `#d3fad1` | `#003814` |
| 400  | `#cce7ff` | `#003771` | `#ffd8d7` | `#6f101b` | `#ffdd84` | `#573200` | `#b9f5bc` | `#004616` |
| 500  | `#97ccff` | `#004287` | `#ffb5b6` | `#88151f` | `#ffc85e` | `#6c4100` | `#82eb8d` | `#00661d` |
| 600  | `#51aeff` | `#0090ff` | `#ff6a6e` | `#f32e40` | `#fa0`    | `#e99c00` | `#4ce15e` | `#009431` |
| 700  | `#0070f7` | `#0071f6` | `#fc0035` | `#f13242` | `#ffb200` | `#ffb200` | `#28a948` | `#00ab3e` |
| 800  | `#005edc` | `#005fd8` | `#e70022` | `#e2162a` | `#f90`    | `#f90`    | `#279141` | `#009335` |
| 900  | `#0064e2` | `#50a8ff` | `#d60020` | `#ff5e63` | `#a64f00` | `#f90`    | `#107d32` | `#00ca52` |
| 1000 | `#002453` | `#ebf6ff` | `#46000c` | `#ffeaed` | `#541c00` | `#fff3d9` | `#00370d` | `#daffe5` |

Teal, purple and pink exist but were not extracted. Things worth noticing:

- Light gray-400 (`#eaeaea`) is lighter than gray-300 (`#e6e6e6`). The border
  step is tuned as a border, not as a point on a smooth ramp.
- Gray-700 and gray-800 are the same in both themes.
- Blue-700 is `#0070f7` in light and `#0071f6` in dark, effectively one brand
  blue.
- In dark mode both backgrounds are pure black. Raised surfaces come from
  gray-100 (`#1a1a1a`) and edges, not from a lighter page.
- Light gray-alpha-400 (`#00000014`) is exactly the material edge colour
  below, so "default border" and the surface ring are one value.

## Geist typography scale

Sizes come from the class definitions in the Geist site CSS and uses from
https://vercel.com/geist/typography. Sans classes use
`var(--font-geist-sans)` and mono classes `var(--font-mono)`. Headings are
semibold with negative tracking, labels and copy are regular, and buttons
are medium. The weight of the "Strong" modifier was not extracted
(unverified).

| Class                | Size / line | Weight | Tracking | Stated use                                              |
| -------------------- | ----------- | ------ | -------- | ------------------------------------------------------- |
| `text-heading-72`    | 72 / 72     | 600    | -4.32px  | Introduces pages or sections (all headings)             |
| `text-heading-64`    | 64 / 64     | 600    | -3.84px  |                                                         |
| `text-heading-56`    | 56 / 56     | 600    | -3.36px  |                                                         |
| `text-heading-48`    | 48 / 56     | 600    | -2.88px  |                                                         |
| `text-heading-40`    | 40 / 48     | 600    | -2.4px   |                                                         |
| `text-heading-32`    | 32 / 40     | 600    | -1.28px  | Has a Subtle modifier (32 down to 16)                   |
| `text-heading-24`    | 24 / 32     | 600    | -0.96px  |                                                         |
| `text-heading-20`    | 20 / 26     | 600    | -0.4px   |                                                         |
| `text-heading-16`    | 16 / 24     | 600    | -0.32px  |                                                         |
| `text-heading-14`    | 14 / 20     | 600    | -0.28px  |                                                         |
| `text-label-20`      | 20 / 32     | 400    | none     | Single-line text with ample line height                 |
| `text-label-18`      | 18 / 20     | 400    | none     | Single-line text with ample line height                 |
| `text-label-16`      | 16 / 20     | 400    | none     | "Used in titles to help differentiate from regular"     |
| `text-label-14`      | 14 / 20     | 400    | none     | "Most common text style of all. Used in many menus"     |
| `text-label-13`      | 13 / 16     | 400    | none     | "Used as a secondary line next to other labels"         |
| `text-label-12`      | 12 / 16     | 400    | none     | "Used for tertiary level text in busy views"            |
| `text-label-14-mono` | 14 / 20     | 400    | none     | "Largest form of mono, to pair with larger (>14) text"  |
| `text-label-13-mono` | 13 / 20     | 400    | none     | "Used to pair with Label 14"                            |
| `text-label-12-mono` | 12 / 16     | 400    | none     |                                                         |
| `text-copy-24`       | 24 / 36     | 400    | none     | "For hero areas on marketing pages"                     |
| `text-copy-20`       | 20 / 36     | 400    | none     | "For hero areas on marketing pages"                     |
| `text-copy-18`       | 18 / 28     | 400    | none     | "Mainly for marketing, big quotes"                      |
| `text-copy-16`       | 16 / 24     | 400    | none     | "Used in simpler, larger views like Modals"             |
| `text-copy-14`       | 14 / 20     | 400    | none     | "Most commonly used text style"                         |
| `text-copy-13`       | 13 / 18     | 400    | none     | "For secondary text and views where space is a premium" |
| `text-copy-14-mono`  | 14 / 20     | 400    | none     |                                                         |
| `text-copy-13-mono`  | 13 / 18     | 400    | none     | "Used for inline code mentions"                         |
| `text-button-16`     | 16 / 20     | 500    | none     | "Largest button"                                        |
| `text-button-14`     | 14 / 20     | 500    | none     | "Default button"                                        |
| `text-button-12`     | 12 / 16     | 500    | none     | A tiny button inside an input field                     |

Labels are single lines with tight leading (label-13 is 13/16), and copy is
running text with open leading (copy-13 is 13/18). The workspace UI lives
almost entirely in label-14, label-13, copy-14 and heading-24.

## Geist materials, radii and shadows

Every material is `background-color: var(--ds-background-100)` plus a shadow
token and a radius (Geist site CSS). Descriptions are from
https://vercel.com/geist/materials.

| Class                 | Radius | Shadow token                | Described as                                           |
| --------------------- | ------ | --------------------------- | ------------------------------------------------------ |
| `material-base`       | 6px    | `--ds-shadow-border`        | "Everyday use."                                        |
| `material-small`      | 6px    | `--ds-shadow-border-small`  | "Slightly raised."                                     |
| `material-medium`     | 12px   | `--ds-shadow-border-medium` | "Further raised."                                      |
| `material-large`      | 12px   | `--ds-shadow-border-large`  | "Further raised."                                      |
| `material-tooltip`    | 6px    | `--ds-shadow-tooltip`       | "Lightest shadow." The only one with a triangular stem |
| `material-menu`       | 12px   | `--ds-shadow-menu`          | "Lift from page."                                      |
| `material-modal`      | 12px   | `--ds-shadow-modal`         | "Further lift."                                        |
| `material-fullscreen` | 16px   | `--ds-shadow-fullscreen`    | "Biggest lift."                                        |

The shadow tokens, light values unless noted (Geist site CSS):

```css
--ds-shadow-border-base: 0 0 0 1px #00000014; /* dark: #ffffff25 */
--ds-shadow-border-inset: inset 0 0 0 1px #00000014; /* dark: #ffffff1a */
--ds-shadow-background-border: 0 0 0 1px var(--ds-background-200);
--ds-shadow-border: var(--ds-shadow-border-base), var(--ds-shadow-background-border);
--ds-shadow-small: 0px 2px 2px #0000000a;
--ds-shadow-medium: 0px 2px 2px #0000000a, 0px 8px 8px -8px #0000000a;
--ds-shadow-large: 0px 2px 2px #0000000a, 0px 8px 16px -4px #0000000a;
--ds-shadow-border-small: var(--ds-shadow-border-base), var(--ds-shadow-small), var(--ds-shadow-background-border);
--ds-shadow-tooltip:
  var(--ds-shadow-border-base), 0px 1px 1px #00000005, 0px 4px 8px #0000000a, var(--ds-shadow-background-border);
--ds-shadow-menu:
  var(--ds-shadow-border-base), 0px 1px 1px #00000005, 0px 4px 8px -4px #0000000a, 0px 16px 24px -8px #0000000f,
  var(--ds-shadow-background-border);
--ds-shadow-modal:
  var(--ds-shadow-border-base), 0px 1px 1px #00000005, 0px 8px 16px -4px #0000000a, 0px 24px 32px -8px #0000000f,
  var(--ds-shadow-background-border);
```

`--ds-shadow-fullscreen` has the same layers as `--ds-shadow-modal`. The CSS
also declares stronger `--ds-shadow-small: 0px 1px 2px #00000029` and
`--ds-shadow-medium: 0px 2px 2px #00000052, 0px 8px 8px -8px #00000029`,
most likely for the dark theme (scope not checked).

The idea to copy: surfaces never use a CSS `border`. The edge is a 1px
spread shadow at 8% black, and elevation only adds faint offset layers at
2% to 6% opacity.

## Geist components for status and waiting

- **StatusDot.** The states are `QUEUED`, `BUILDING`, `ERROR`, `READY`,
  `CANCELED` and `DELETED`. An optional `label` prop shows the state in
  sentence case, and "the dot animates while `BUILDING` or `QUEUED` and goes
  static once the deployment reaches a terminal state"
  (https://vercel.com/geist/status-dot). The page does not give a colour per
  state (unverified).
- **Badge.** The variants are `gray`, `gray-subtle`, `blue`, `blue-subtle`,
  `purple`, `purple-subtle`, `amber`, `amber-subtle`, `red`, `red-subtle`,
  `pink`, `pink-subtle`, `green`, `green-subtle`, `teal`, `teal-subtle`,
  `inverted`, `trial`, `turbo` and `pill`. Sizes are `sm`, `md` and `lg`, and
  an `icon` prop adds one icon. The rule is "Keep badge content to text or
  `icon` + text. Never stack two icons or a child Badge inside a Badge"
  (https://vercel.com/geist/badge). The exact subtle colours were not
  extracted. The step semantics suggest a 100 or 200 fill with 900 text
  (unverified).
- **Not read.** Skeleton, spinner, loading dots, progress, gauge, empty
  state, note, toast, tabs, keyboard input, table, and whether Geist has a
  file or drop zone component. All unverified.

## Motion notes

- **admincn:** the sidebar width runs `duration-200 ease-linear`, sub-menus
  expand over 200ms, and footer links fade over 300ms (see the sections
  above). The circular progress arc uses
  `700ms cubic-bezier(0.34,1.56,0.64,1)`, the heartbeat pulses every 2s, and
  the skeleton uses Tailwind's `animate-pulse`.
- **Geist:** the only confirmed motion rule is that StatusDot animates in
  non-terminal states and stops in terminal ones. Durations and easing curves
  were not found (unverified).

## Geist fonts in a Vite app

- admincn's `next/font/google` import (`src/app/layout.tsx:50-56`) does not
  port to Vite.
- The official package is `geist` (`npm i geist`), under the SIL Open Font
  License 1.1 (https://github.com/vercel/geist-font). The repository README
  defers usage details to the npm README, which was not read. Whether the
  package imports cleanly outside Next.js, and where its woff2 files sit, is
  unverified.
- Two routes for Vite: copy the variable woff2 files from a geist-font GitHub
  release into `public/fonts/`, or use the Fontsource packages
  `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`. Both
  exist on npm at 5.3.0 under OFL-1.1 (`npm view`, September 22, 2026), and
  the web app already self-hosts Archivo and Martian Mono the same way.
  Either way, define `--font-geist-sans` and `--font-geist-mono` so both
  admincn's `--font-sans` mapping and Geist's type classes resolve. The file
  names below are placeholders:

```css
@font-face {
  font-family: 'Geist';
  src: url('/fonts/Geist-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

@font-face {
  font-family: 'Geist Mono';
  src: url('/fonts/GeistMono-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

:root {
  --font-geist-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-geist-mono: 'Geist Mono', ui-monospace, monospace;
}
```

## What to take for the Averis workspace

These are recommendations, not findings. Each one says which source it comes
from.

1.  **Keep shadcn's token names and fill them with Geist values.** The admincn
    primitives expect shadcn's variables, so keep the names:
    - `background` is background-100 and `sidebar` is background-200
      (`#fafafa`).
    - `muted`, `secondary` and `accent` are gray-100, and hover states use
      gray-200.
    - `border` and `input` are gray-alpha-400, and `muted-foreground` is
      gray-900.
    - `foreground` and `primary` are gray-1000, and `ring` is blue-700.

    In dark mode, follow Geist (a black page with `#1a1a1a` raised surfaces),
    not admincn (0.145 page, 0.205 cards).

2.  **Draw edges with 1px rings, not borders.** Both systems already do this
    (`ring-1 ring-foreground/10` against `0 0 0 1px #00000014`). Use
    `--ds-shadow-border` on tiles and tables, and `--ds-shadow-menu` and
    `--ds-shadow-modal` on popovers and dialogs.
3.  **Use fixed radii of 6, 12 and 16px.** Controls and inputs are 6px, cards
    and menus 12px, and full-screen overlays 16px, following the Geist
    materials. Drop admincn's multiplier, which makes cards 14px, and keep
    pill badges.
4.  **Copy the admincn sidebar dimensions exactly.** 16rem open, a 3rem icon
    rail, an 18rem mobile sheet, Cmd or Ctrl plus B, cookie persistence, and
    a 200ms linear width change. Set group labels uppercase at 50% opacity
    in `text-label-12`, and mark the active item with gray-alpha-200 and
    weight 500.
5.  **Use a floating header card.** Make it sticky and 12px from the top,
    with a 12px radius, the ring edge, `px-6 py-2` and a masked backdrop
    blur (admincn). Put the sidebar toggle, a 16px divider and ⌘K search on
    the left, and notifications, theme and the avatar on the right.
6.  **Build the page frame to 1440px.** Give `main` `py-6`, `px-6` (`px-4`
    below `sm`) and a centred maximum of 1440px, with the header at 1392px
    so their edges align (admincn). Set the page title in `text-heading-24`
    with a `text-copy-14` gray-900 line under it and the primary action
    right-aligned on the title row. This title pattern is an opinion, not
    admincn's.
7.  **Make the number the hero of a stat tile.** admincn gives title and
    value the same size. Instead, put a `text-label-13` gray-900 label over a
    `text-heading-32` value with `tabular-nums`. Add a `text-label-12` delta
    or status badge and an optional icon in the `CardAction` slot. Use the
    16px small-card padding, 12px radius and ring edge, on a `gap-6` grid.
8.  **Keep tables dense and flat.** Make the table one `material-base`
    surface with a `text-label-13` gray-900 header on background-200 and
    `text-copy-14` cells. Set IDs, hashes and durations in
    `text-label-13-mono`, separate rows with gray-alpha-400, use
    gray-alpha-100 for hover, and leave the last row without a rule (admincn
    `table.tsx:20`). A 40px row height is a choice, not a sourced value.
9.  **Use one status scheme, borrowed from StatusDot.** Map Averis job states
    to Geist's vocabulary. Queued and running states get an animated dot, and
    ready, failed and canceled are static. Show them as subtle pill badges:
    a 100-step fill and 900-step text at admincn's `h-5 text-xs font-medium`.
    The colours are a choice: queued gray, running amber, ready green, failed
    red and canceled gray.
10. **Show progress thinly and animate only while waiting.** Use admincn's
    6px `rounded-full` track on gray-100 with a gray-1000 or blue-700 fill
    and a `tabular-nums` value on the right. For waiting on a grid, show a
    skeleton grid of `material-base` tiles pulsing on gray-100. Stop the
    motion once a state is terminal, as StatusDot does, and under
    `prefers-reduced-motion`.
11. **Build the dropzone from Geist's step semantics.** Neither source
    provides one. Use a 12px-radius area on background-200 with a dashed
    gray-alpha-500 border, which is the one place a real border is needed.
    On drag-over, switch to a blue-400 border and a blue-100 fill. Put a
    `text-copy-14` instruction and the type and size limits in
    `text-label-13` gray-900.
12. **Self-host Geist variable woff2 files.** Don't port `next/font`. Serve
    Geist Sans and Geist Mono from `public/fonts` with
    `font-display: swap`, preload the sans file, and define
    `--font-geist-sans` and `--font-geist-mono` so the Geist type classes
    work unchanged.

## See also

- [Design research](README.md)
- https://vercel.com/geist/introduction
- https://www.npmjs.com/package/geist
