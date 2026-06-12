# AlphaScout — Requirements

_Last updated: 2026-06-12 (rev 2: endgame climb removed — nobody climbs in our meta)_

Mobile-first scouting app for the **2026 FRC game REBUILT**, built by FRC 8810 Alphabots.
Third app in the Alpha\* series (AlphaSim → AlphaHarness → AlphaScout).
Architecture follows 4414 HighTide's TideApp pattern (Convex + shadcn, mobile-first,
dashboard landing pages per section).

## Game model (REBUILT, 2026)

- **FUEL** (foam balls): 1 point each, but **only when scored in an active HUB**.
  - AUTO (20 s): both HUBs active.
  - TELEOP: TRANSITION (10 s), then SHIFT 1–4 (25 s each) — HUB activation alternates
    between alliances each shift; END GAME (30 s): both HUBs active.
  - Scouts cannot count individual FUEL reliably → record **estimated counts** with
    coarse steppers (+1 / +5 / +10), plus a "dumped into inactive HUB" waste flag.
- **TOWER climb**:
  - AUTO: Level 1 only, 15 pts (max 2 robots per alliance) — scouted.
  - TELEOP/endgame climb (L1/L2/L3 = 10/20/30) exists in the game but is
    **not scouted**: team decision 2026-06-12, nobody climbs in our meta.
- **Ranking points**: Energized = 100 FUEL, Supercharged = 360 FUEL,
  Traversal = 50 TOWER points. Win = 3 RP, tie = 1 RP.

## Tech stack

- Bun (package manager / scripts)
- Vite + React + TypeScript (strict) — SPA, React Router 7
- Tailwind CSS v4, shadcn/ui (Base UI, not Radix), Lucide icons, next-themes, Sonner
- **Convex**: source of truth for all domain data (live queries, mutations, auth, file storage)
- Zustand: ephemeral client UI state only (never duplicate Convex data)
- dnd-kit for the pick-list Kanban
- The Blue Alliance API v3 (key lives in Convex env, fetched server-side via Convex actions)

## Auth & roles

- Convex Auth, password provider. Two roles: **admin** and **scout**.
- First registered user becomes admin; admin can promote others.
- Scouts sign in once per device; identity is attached to every report and pick list.

## Features

### 1. Event setup (admin only)
- Enter a TBA event key (e.g. `2026casd`); import via Convex action:
  - Teams: TBA key, number, nickname, city, state/province, country.
  - Qualification schedule: match key, match number, red/blue team numbers, scheduled time.
- Re-import is idempotent (upsert). No rankings/EPA/OPR/awards/playoffs import.
- Multiple events supported; one is the "active event" everything else scopes to.

### 2. Team list page
Per team row/card: number, nickname, pit status (Not Scouted / Scouted), # match
reports, pick-list tier. Tap → team detail.

### 3. Team detail view
Number, nickname, location, pit answers (incl. robot photo), all match reports,
averages (auto FUEL, teleop FUEL, total FUEL, wasted FUEL, auto-climb success
rate, driver rating, defense rating), current tier on the primary pick list.

### 4. Pit scouting form
Grid landing page of all teams showing scouted status; tap to scout.
- Drivetrain type (swerve / tank / other)
- FUEL capacity (count stepper)
- Intake: ground / human-player / both / none
- Scoring style: dumper / shooter / both
- Climb capability: can climb L1 in auto (single checkbox)
- Auto: claimed FUEL in auto (stepper), claimed auto L1 climb (toggle)
- Robot photo (camera capture → Convex file storage)
- Notes (short text)
Checkboxes/steppers, minimal typing.

### 5. Match scouting form
- Select match → app shows only the 6 teams in that match; **Convex enforces one
  scout per robot per match** (claim with conflict check inside a mutation).
- AUTO: FUEL scored (stepper +1/+5/+10), L1 climb (none / success / failed), notes.
- TELEOP: FUEL scored (stepper +1/+5/+10), FUEL dumped into inactive HUB
  (stepper, waste tracking), played defense (toggle), notes.
- No endgame section (endgame climb not scouted).
- Ratings: driver 1–10, defense 1–10 (only if played defense).
- Tags: Fast, Accurate, Good driver, Plays defense, Tippy, Broke down, Inconsistent,
  Shift-aware, Wastes fuel, Good human player.
- Submit → toast + return to match list.

### 6. Pick list page
- Kanban board (dnd-kit): Tier 1 / Tier 2 / Tier 3 / Do Not Pick / Uncategorized.
- Every imported team starts Uncategorized; drag between columns, reorder within.
- Card: number, nickname, pit status, avg driver rating, avg teleop FUEL, avg wasted FUEL.
- Each scout has **personal pick lists** (can have several); admin owns the **primary
  pick list** (starts blank).
- Import tool: merge all personal lists into the primary via consensus score
  (average tier index weighted by rank inside column; documented in code).

### 7. UX / mobile-first
- Nav header with section landing pages; hamburger on mobile.
- Landing pages are mini-dashboards (e.g. pick-list landing shows primary + my lists).
- Large buttons, steppers, minimal typing, no dense tables on scouting forms.
- Desktop OK for event setup + pick list; pit/match scouting must feel great on a phone.
- Light/dark/system theme.

## Non-goals (v1)

- Offline mode / QR sync (Convex-online by design, per team decision 2026-06-12).
- Playoff scouting, video review, TBA live rankings, multi-team data sharing.
