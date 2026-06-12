import { internalMutation } from "./_generated/server";

// Wipe scouting reports (local dev only) — used when a schema change
// removes fields that existing rows still carry:
//   bunx convex run dev:clearReports
export const clearReports = internalMutation({
  args: {},
  handler: async (ctx) => {
    let n = 0;
    for (const table of ["matchReports", "pitReports"] as const) {
      while (true) {
        const batch = await ctx.db.query(table).take(100);
        if (batch.length === 0) break;
        for (const row of batch) {
          await ctx.db.delete(row._id);
          n++;
        }
      }
    }
    return `deleted ${n} reports`;
  },
});

// Local-dev seeding so the app can be exercised without a TBA key:
//   bunx convex run dev:seed
// Creates a fake event with 12 teams and 6 qual matches. Idempotent-ish:
// refuses to run if the event already exists.
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_key", (q) => q.eq("key", "2026dev"))
      .first();
    if (existing !== null) return "already seeded";

    const anyEvent = await ctx.db.query("events").first();
    const eventId = await ctx.db.insert("events", {
      key: "2026dev",
      name: "Dev Test Event 2026",
      year: 2026,
      isActive: anyEvent === null,
    });

    const teams = [
      [8810, "Alphabots"],
      [4414, "HighTide"],
      [254, "The Cheesy Poofs"],
      [1678, "Citrus Circuits"],
      [2910, "Jack in the Bot"],
      [6328, "Mechanical Advantage"],
      [148, "Robowranglers"],
      [118, "Robonauts"],
      [1323, "MadTown Robotics"],
      [2056, "OP Robotics"],
      [3310, "Black Hawk Robotics"],
      [604, "Quixilver"],
    ] as const;

    for (const [number, nickname] of teams) {
      await ctx.db.insert("teams", {
        eventId,
        teamKey: `frc${number}`,
        number,
        nickname,
        city: "Dev City",
        stateProv: "CA",
        country: "USA",
      });
    }

    const numbers = teams.map(([n]) => n);
    for (let m = 1; m <= 6; m++) {
      // Rotate so every team appears in 3 of 6 matches.
      const rotated = [...numbers.slice(m), ...numbers.slice(0, m)];
      await ctx.db.insert("matches", {
        eventId,
        matchKey: `2026dev_qm${m}`,
        matchNumber: m,
        redTeams: rotated.slice(0, 3),
        blueTeams: rotated.slice(3, 6),
        scheduledTime: undefined,
      });
    }

    return `seeded event 2026dev with ${teams.length} teams, 6 matches`;
  },
});
