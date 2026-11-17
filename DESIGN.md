---
# gstack: design-md-format=spec
name: Earmark
description: Quiet, premium utility where album covers bring the colour and friends' names speak in their own voice.
colors:
  ground: '#F7F7F5'
  surface: '#FFFFFF'
  text: '#121314'
  text-muted: '#6B6F73'
  line: '#E6E6E2'
  ink: '#121314'
  on-ink: '#F7F7F5'
  accent: '#B68A3A'
  success: '#2E7D4F'
  warning: '#B26A00'
  error: '#B3261E'
  dark-ground: '#0D0E0F'
  dark-surface: '#17181A'
  dark-text: '#EDEDEA'
  dark-text-muted: '#9A9EA2'
  dark-line: '#26282B'
  dark-accent: '#C99D4E'
  dark-success: '#5CBF85'
  dark-warning: '#E3A13B'
  dark-error: '#F2867E'
typography:
  display:
    fontFamily: Source Sans 3
    fontWeight: 700
    fontSize: 48px
    letterSpacing: -0.025em
  title:
    fontFamily: Source Sans 3
    fontWeight: 700
    fontSize: 28px
    letterSpacing: -0.02em
  body:
    fontFamily: Source Sans 3
    fontSize: 1rem
    lineHeight: 1.5
  label:
    fontFamily: Source Sans 3
    fontWeight: 600
    fontSize: 0.875rem
  person:
    fontFamily: Instrument Serif
    fontWeight: 400
    fontSize: 1.125rem
rounded:
  cover: 4px
  sm: 4px
  md: 8px
  lg: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.on-ink}'
    rounded: '{rounded.md}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    borderColor: '{colors.line}'
    rounded: '{rounded.md}'
  search:
    backgroundColor: '{colors.surface}'
    borderColor: '{colors.line}'
    rounded: '{rounded.full}'
  cover:
    rounded: '{rounded.cover}'
  earmark:
    backgroundColor: '{colors.accent}'
---

# Earmark

## Overview

**Creative North Star:** a calm, premium shelf where the covers are the colour and the people who recommended them have their own voice, because the one thing Earmark should be remembered for is that it remembers who told you.
**Product context:** free, open-source, install-free web app (PWA) that keeps one to-listen list for albums, local to the device. Users are album listeners who get recommendations from friends, reviews and videos. Peers: Side B (minimal iOS), Record Club and Musicboard (social rating), streaming apps (dark and glossy).
**Mode per surface:** Queue, Album and Settings are Operate. The README and the demo are Persuade.
**Reference sites:** [Side B](https://www.producthunt.com/products/side-b), [Record Club](https://apps.apple.com/app/id6478712233) (research via search results only; no screenshots taken).
**Key characteristics:**

- Covers sit like real record sleeves on a quiet near-white or near-black ground.
- Friends' names appear in a serif, the only serif in the app.
- A small brass folded corner (the earmark) marks every album a friend recommended.
- Ink-black main buttons; no bright accents competing with covers.

## Colors

**Strategy:** Restrained. Neutrals carry the interface; covers supply colour; brass appears only as the earmark.
**Light or dark:** follows the device setting. Light is used in daylight browsing; dark keeps the shelf quiet at night when people pick what to play.
Ink is the interaction colour: primary buttons, the selected tab underline and the selected rating segment. Brass is never used for text or buttons, only for the earmark fold, so it keeps one meaning: "a friend marked this". Muted text is for metadata (year, length). In dark mode surfaces step up in lightness (ground to surface) instead of using shadows alone, and the earmark brass lightens to #C99D4E to keep its contrast. Status colours appear as text or icons on neutral surfaces, never as filled banners.

## Typography

Source Sans 3 (Google Fonts, SIL Open Font License) covers every functional role: screen titles at 700 with tight tracking, album titles at 600, body at 400, labels at 600. Instrument Serif (Google Fonts, OFL, single weight 400) is reserved for people: "from Priya", recommender notes and the confirmation-row name field. Always upright; never italic, never for interface text. Both families are self-hosted and precached for offline use (OFL permits this). Scale: 48 / 28 / 22 / 17 / 16 / 14 px; headings differ from body by size, not only weight. Source Sans 3 is not on the overused-display list; its job here is to stay out of the way.

## Layout

Phone: one column, 20 px side padding, cover grid `repeat(auto-fill, minmax(150px, 1fr))` with 28 px row and 20 px column gaps, sticky Pick for me bar fading into the ground. Laptop: same grid up to 1120 px, four to six covers across, Pick for me beside the tabs. Generous vertical rhythm: 80 px between major sections on marketing pages, 24 px inside screens. Lists use hairline dividers (`line`) instead of boxes.

## Elevation & Depth

Only covers have elevation: `0 1px 2px rgba(18,19,20,.08), 0 8px 24px -8px rgba(18,19,20,.28)` in light, `0 1px 2px rgba(0,0,0,.5), 0 10px 28px -10px rgba(0,0,0,.8)` in dark. Everything else is flat, separated by hairlines or surface steps. No glows, no zero-offset halos.

## Shapes

Covers 4 px (sleeve corners). Buttons, inputs, segmented controls 8 px. The search box is fully rounded. Sheets and phone frames 20 px. The earmark is a right triangle in the top-right corner of a cover: 22 px on grid cards, 36 px on the Album screen, with a 1 px soft drop shadow so it reads as a fold.

## Components

- **Primary button:** ink fill, on-ink text, 44 px minimum height; hover darkens 6%, focus-visible 2 px ink outline offset 2 px, disabled 40% opacity.
- **Secondary button:** surface fill, line border; same states.
- **Search:** rounded, 48 px tall, 17 px text; focus shows the ink outline.
- **Cover card:** cover with shadow, title (one line, truncated), artist and meta in muted, "from <name>" in Instrument Serif; earmark only when a recommender exists; "Sample" badge top-left on samples.
- **Confirmation row:** cover thumbnail, "Saved to To listen. Who recommended it?" label, serif name field with a hairline underline; stays until the next action.
- **Rating:** segmented control (Loved, Liked, Not for me); selected segment ink-filled; tap again to clear.
- **Alerts and toasts:** neutral surface, status colour on the leading bold phrase only.

## Do's and Don'ts

- Do keep brass for the earmark only.
- Do set every person's name and note in Instrument Serif, upright.
- Do let covers be the only colour on a screen.
- Do use hairlines and surface steps, not boxes, to separate content.
- Don't put a card inside a card or wrap grid items in bordered boxes.
- Don't use italics, gradients, glows or neon accents.
- Don't use brass or status colours as text on light backgrounds.
- Don't add a second serif or a decorative display face.

## Motion

- **Approach:** minimal-functional.
- **Easing:** enter(ease-out) exit(ease-out) move(ease-in-out).
- **Duration:** micro(80ms) short(180ms) medium(300ms) long(450ms).
- **The one authored moment:** the Pick for me reveal, where the chosen cover rises into the result card (300 ms ease-out). Disabled under prefers-reduced-motion.

## Decisions Log

| Date       | Decision                                                                  | Rationale                                                                                                                                |
| ---------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-17 | Initial design system created                                             | /design-consultation from the reviewed Backlog plan; memorable thing: "it remembers who told me"                                         |
| 2026-11-17 | Highlighter yellow replaced by brass, ink primary buttons, sleeve shadows | Owner asked for a more premium look                                                                                                      |
| 2026-11-17 | Source Sans 3 replaces Inter from the plan                                | Inter is on the overused-display list; both are OFL and self-hostable; Satoshi rejected because Fontshare self-hosting terms are unclear |
