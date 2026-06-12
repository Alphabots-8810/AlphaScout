# AlphaScout

_Last updated: 2026-06-12_

Mobile-first scouting app for the **2026 FRC game REBUILT**, built by FRC 8810
Alphabots. Third entry in the Alpha\* series
([AlphaSim](https://github.com/Alphabots-8810/AlphaSim) →
[AlphaHarness](https://github.com/Alphabots-8810/AlphaHarness) → AlphaScout).

Directly inspired by Kenny Sandon's (FRC 4414 HighTide)
["Scouting app in 20 minutes" TideApp tutorial](https://www.chiefdelphi.com/t/scouting-app-in-20-minutes-tideapp-tutorial/520424)
— same architecture (Convex realtime backend + shadcn/ui), adapted to REBUILT
and written with Claude Code.

## What it does

- **Event setup (admin)** — import teams + qualification schedule from The
  Blue Alliance by event key; re-import is idempotent; multiple events with
  one active at a time.
- **Team list / team detail** — pit status, report counts, per-team averages
  (auto/teleop FUEL, wasted FUEL, auto-climb success rate, driver/defense
  ratings).
- **Pit scouting** — grid landing page, checkbox/stepper form (drivetrain,
  FUEL capacity, intake, dumper/shooter, auto L1 climb capability, auto
  claims), robot photo via Convex file storage.
- **Match scouting** — pick a match, **claim a robot** (Convex mutation
  enforces one scout per robot per match), then a phone-sized form: AUTO fuel
  + L1 climb, TELEOP fuel + *fuel wasted into the inactive HUB* (REBUILT's
  SHIFT mechanic), 1–10 ratings, tags.
- **Pick lists** — dnd-kit Kanban (Tier 1/2/3/DNP/Uncategorized). Every scout
  keeps personal lists; the admin owns the primary and can **merge all
  personal lists by consensus score** (tier vote + in-column rank bonus).
- Light/dark theme, realtime sync everywhere (Convex live queries), roles
  (first account = admin, admins promote others).

## Stack

Bun · Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui
(Base UI) · React Router 7 · Convex (DB + auth + file storage + live queries)
· @convex-dev/auth (password) · dnd-kit · TBA API v3.

## Getting started

```sh
bun install
bunx convex dev          # first run: log in / create a Convex project
# in another terminal:
bun run dev
```

`bunx convex dev` writes `.env.local` with your deployment URL. Then:

1. **Auth keys** — `bunx @convex-dev/auth --web-server-url http://localhost:5173`
   (generates JWT_PRIVATE_KEY/JWKS on the deployment).
2. **TBA key** — get one at thebluealliance.com/account, then
   `bunx convex env set TBA_API_KEY <key>`.
3. Open the app, create the first account (becomes admin), import an event.

No TBA key handy? Seed fake data instead: `bunx convex run dev:seed`.

For competition, deploy the frontend anywhere static (Vercel/Netlify/Pages)
and run `bunx convex deploy`. Scouts need internet at the venue — this app is
deliberately online-first (same trade-off 4414 runs); there is no offline/QR
mode.

## Notes

- REBUILT FUEL can't be counted ball-by-ball from the stands; the form uses
  ±1/±5 steppers for honest estimates, and tracks inactive-HUB waste
  separately because SHIFT awareness is a real skill gap between robots.
- Endgame TOWER climbing (10/20/30 pts) exists in REBUILT but is deliberately
  **not scouted** — in our regional meta nobody climbs, so the form stays
  lean. Only the AUTO L1 climb (15 pts) is tracked. If your events differ,
  the old endgame section lives in git history (v0.1).
- `convex/_generated` is committed on purpose (Convex convention).

## License

MIT
