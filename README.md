# AlphaScout

_Last updated: 2026-06-12_

Mobile-first scouting app for FRC 8810 Alphabots, **2026 season REBUILT**. Third entry in the Alpha\* series
([AlphaSim](https://github.com/Alphabots-8810/AlphaSim) →
[AlphaHarness](https://github.com/Alphabots-8810/AlphaHarness) → AlphaScout).

The approach comes straight from 4414 HighTide mentor Kenny Sandon's
["Scouting app in 20 minutes" TideApp tutorial](https://www.chiefdelphi.com/t/scouting-app-in-20-minutes-tideapp-tutorial/520424) —
same architecture (Convex realtime backend + shadcn/ui), swapped to the REBUILT game model, written with Claude Code.

## Features

- **Event setup (admin)** — enter a TBA event key to import the team list and qualification
  schedule; re-imports are idempotent (safe to re-run after schedule changes); multiple events
  supported, one active at a time.
- **Team list / team detail** — pit status, report counts, per-team averages (auto/teleop FUEL,
  wasted FUEL, auto climb success rate, driver/defense ratings).
- **Pit scouting** — grid-style landing page, checkbox/stepper forms (drivetrain, FUEL capacity,
  intake, dumper/shooter, auto L1 climb capability, claimed auto numbers), robot photos stored
  in Convex file storage.
- **Match scouting** — pick a match, **claim a robot** (a Convex mutation enforces one robot,
  one scout per match), then a phone-sized form: AUTO fuel + L1 climb, TELEOP fuel + *fuel
  wasted into the inactive HUB* (REBUILT's SHIFT mechanic), 1–10 ratings, tags.
- **Pick lists** — dnd-kit kanban (Tier 1/2/3/DNP/unsorted). Every scout has their own personal
  list; the admin holds the primary and can **merge everyone's lists in one click by consensus
  score** (tier votes + in-column rank bonus).
- Light/dark theme (254 blue), realtime sync everywhere (Convex live queries), role-based
  permissions (first account is auto-admin, admins can promote others).

## Stack

Bun · Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui
(Base UI) · React Router 7 · Convex (database + auth + file storage + live queries)
· @convex-dev/auth (password login) · dnd-kit · TBA API v3.

## Quick start

```sh
bun install
bunx convex dev          # first run: log in / create a Convex project
# in another terminal:
bun run dev
```

`bunx convex dev` writes the deployment URL into `.env.local`. Then:

1. **Auth keys** — `bunx @convex-dev/auth --web-server-url http://localhost:5173`
   (generates JWT_PRIVATE_KEY/JWKS on the deployment).
2. **TBA key** — request one at thebluealliance.com/account, then
   `bunx convex env set TBA_API_KEY <key>`.
3. Open the app, register the first account (becomes admin automatically), import an event.

No TBA key handy? Seed fake data for testing: `bunx convex run dev:seed`.

For a real competition: host the frontend on any static host (Vercel/Netlify/Pages), deploy the
backend with `bunx convex deploy`. Scouts need internet at the venue — this app is deliberately
online-first (the same trade-off 4414 runs in practice), with no offline/QR mode.

## Design notes

- REBUILT FUEL can't be counted ball-by-ball from the stands, so the form uses ±1/±5 steppers
  for honest estimates; fuel wasted into the inactive HUB is tracked as its own field, because
  SHIFT awareness is a real differentiator between robots.
- The endgame TOWER climb (10/20/30 points) exists in REBUILT but is **deliberately not
  scouted** — nobody climbs in our district's meta, and the form stays lean. Only the AUTO L1
  climb (15 points) is tracked. If your district differs, the old endgame section is in git
  history (v0.1).
- `convex/_generated` is committed on purpose (official Convex convention).

## License

MIT
