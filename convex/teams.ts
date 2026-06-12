import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUser } from "./users";

const ENDGAME_POINTS: Record<string, number> = {
  none: 0,
  failed: 0,
  l1: 10,
  l2: 20,
  l3: 30,
};

export function computeStats(reports: Doc<"matchReports">[]) {
  const submitted = reports.filter((r) => r.status === "submitted");
  const n = submitted.length;
  if (n === 0) {
    return {
      reportCount: 0,
      avgAutoFuel: null,
      avgTeleopFuel: null,
      avgTotalFuel: null,
      avgWastedFuel: null,
      avgTowerPoints: null,
      avgDriverRating: null,
      avgDefenseRating: null,
      climbCounts: { none: 0, l1: 0, l2: 0, l3: 0, failed: 0 },
      autoClimbSuccessRate: null,
    };
  }
  const avg = (f: (r: Doc<"matchReports">) => number) =>
    Math.round((submitted.reduce((s, r) => s + f(r), 0) / n) * 10) / 10;

  const climbCounts = { none: 0, l1: 0, l2: 0, l3: 0, failed: 0 };
  for (const r of submitted) climbCounts[r.endgameClimb] += 1;

  const defenseReports = submitted.filter(
    (r) => r.playedDefense && r.defenseRating !== undefined,
  );

  return {
    reportCount: n,
    avgAutoFuel: avg((r) => r.autoFuel),
    avgTeleopFuel: avg((r) => r.teleopFuel),
    avgTotalFuel: avg((r) => r.autoFuel + r.teleopFuel),
    avgWastedFuel: avg((r) => r.teleopWastedFuel),
    avgTowerPoints: avg(
      (r) =>
        (r.autoClimb === "success" ? 15 : 0) + ENDGAME_POINTS[r.endgameClimb],
    ),
    avgDriverRating: avg((r) => r.driverRating),
    avgDefenseRating:
      defenseReports.length > 0
        ? Math.round(
            (defenseReports.reduce((s, r) => s + (r.defenseRating ?? 0), 0) /
              defenseReports.length) *
              10,
          ) / 10
        : null,
    climbCounts,
    autoClimbSuccessRate:
      Math.round(
        (submitted.filter((r) => r.autoClimb === "success").length / n) * 100,
      ) / 100,
  };
}

async function reportsForTeam(
  ctx: QueryCtx,
  eventId: Id<"events">,
  teamNumber: number,
) {
  return await ctx.db
    .query("matchReports")
    .withIndex("by_event_team", (q) =>
      q.eq("eventId", eventId).eq("teamNumber", teamNumber),
    )
    .collect();
}

async function reportsByTeam(ctx: QueryCtx, eventId: Id<"events">) {
  const all = await ctx.db
    .query("matchReports")
    .withIndex("by_event_team", (q) => q.eq("eventId", eventId))
    .collect();
  const byTeam = new Map<number, Doc<"matchReports">[]>();
  for (const r of all) {
    const list = byTeam.get(r.teamNumber) ?? [];
    list.push(r);
    byTeam.set(r.teamNumber, list);
  }
  return byTeam;
}

export const listWithStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const pitReports = await ctx.db
      .query("pitReports")
      .withIndex("by_event_team", (q) => q.eq("eventId", args.eventId))
      .collect();
    const pitByTeam = new Set(pitReports.map((p) => p.teamNumber));

    const primary = await ctx.db
      .query("pickLists")
      .withIndex("by_event_primary", (q) =>
        q.eq("eventId", args.eventId).eq("isPrimary", true),
      )
      .first();
    const tierOf = (teamNumber: number): string | null => {
      if (!primary) return null;
      if (primary.t1.includes(teamNumber)) return "Tier 1";
      if (primary.t2.includes(teamNumber)) return "Tier 2";
      if (primary.t3.includes(teamNumber)) return "Tier 3";
      if (primary.dnp.includes(teamNumber)) return "DNP";
      return null;
    };

    const byTeam = await reportsByTeam(ctx, args.eventId);
    return teams
      .sort((a, b) => a.number - b.number)
      .map((team) => ({
        ...team,
        pitScouted: pitByTeam.has(team.number),
        tier: tierOf(team.number),
        stats: computeStats(byTeam.get(team.number) ?? []),
      }));
  },
});

export const teamDetail = query({
  args: { eventId: v.id("events"), teamNumber: v.number() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const team = await ctx.db
      .query("teams")
      .withIndex("by_event_number", (q) =>
        q.eq("eventId", args.eventId).eq("number", args.teamNumber),
      )
      .first();
    if (team === null) return null;

    const pit = await ctx.db
      .query("pitReports")
      .withIndex("by_event_team", (q) =>
        q.eq("eventId", args.eventId).eq("teamNumber", args.teamNumber),
      )
      .first();

    const reports = (
      await reportsForTeam(ctx, args.eventId, args.teamNumber)
    ).filter((r) => r.status === "submitted");

    const scoutNames = new Map<string, string>();
    for (const r of reports) {
      if (!scoutNames.has(r.scoutId)) {
        const scout = await ctx.db.get(r.scoutId);
        scoutNames.set(r.scoutId, scout?.name ?? scout?.email ?? "unknown");
      }
    }

    return {
      team,
      pit: pit
        ? {
            ...pit,
            photoUrl: pit.photoStorageId
              ? await ctx.storage.getUrl(pit.photoStorageId)
              : null,
          }
        : null,
      reports: reports
        .sort((a, b) => a.matchNumber - b.matchNumber)
        .map((r) => ({ ...r, scoutName: scoutNames.get(r.scoutId) })),
      stats: computeStats(reports),
    };
  },
});
