import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { climbResult } from "./schema";
import { requireUser } from "./users";

export const listMatches = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const reports = await ctx.db
      .query("matchReports")
      .withIndex("by_event_match", (q) => q.eq("eventId", args.eventId))
      .collect();

    const byMatch = new Map<number, Doc<"matchReports">[]>();
    for (const r of reports) {
      const list = byMatch.get(r.matchNumber) ?? [];
      list.push(r);
      byMatch.set(r.matchNumber, list);
    }

    return matches
      .sort((a, b) => a.matchNumber - b.matchNumber)
      .map((m) => {
        const rs = byMatch.get(m.matchNumber) ?? [];
        return {
          ...m,
          submittedCount: rs.filter((r) => r.status === "submitted").length,
          claimedCount: rs.filter((r) => r.status === "claimed").length,
          myClaim: rs.find(
            (r) => r.scoutId === me._id && r.status === "claimed",
          )?.teamNumber,
        };
      });
  },
});

export const matchBoard = query({
  args: { eventId: v.id("events"), matchNumber: v.number() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const match = await ctx.db
      .query("matches")
      .withIndex("by_event_number", (q) =>
        q.eq("eventId", args.eventId).eq("matchNumber", args.matchNumber),
      )
      .first();
    if (match === null) return null;

    const reports = await ctx.db
      .query("matchReports")
      .withIndex("by_event_match", (q) =>
        q.eq("eventId", args.eventId).eq("matchNumber", args.matchNumber),
      )
      .collect();

    const slot = async (teamNumber: number, alliance: "red" | "blue") => {
      const report = reports.find((r) => r.teamNumber === teamNumber);
      const team = await ctx.db
        .query("teams")
        .withIndex("by_event_number", (q) =>
          q.eq("eventId", args.eventId).eq("number", teamNumber),
        )
        .first();
      let scoutName: string | null = null;
      if (report) {
        const scout = await ctx.db.get(report.scoutId);
        scoutName = scout?.name ?? scout?.email ?? "unknown";
      }
      return {
        teamNumber,
        alliance,
        nickname: team?.nickname ?? null,
        status: report?.status ?? "open",
        scoutName,
        isMine: report?.scoutId === me._id,
        reportId: report?._id ?? null,
      };
    };

    return {
      match,
      slots: [
        ...(await Promise.all(match.redTeams.map((t) => slot(t, "red")))),
        ...(await Promise.all(match.blueTeams.map((t) => slot(t, "blue")))),
      ],
    };
  },
});

async function getClaim(
  ctx: MutationCtx,
  eventId: Id<"events">,
  matchNumber: number,
  teamNumber: number,
) {
  return await ctx.db
    .query("matchReports")
    .withIndex("by_event_match_team", (q) =>
      q
        .eq("eventId", eventId)
        .eq("matchNumber", matchNumber)
        .eq("teamNumber", teamNumber),
    )
    .first();
}

// One scout per robot per match: this mutation is the gate. Convex runs
// mutations serially per document range, so two scouts claiming the same
// robot cannot both pass the existing-row check.
export const claimRobot = mutation({
  args: {
    eventId: v.id("events"),
    matchNumber: v.number(),
    teamNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const match = await ctx.db
      .query("matches")
      .withIndex("by_event_number", (q) =>
        q.eq("eventId", args.eventId).eq("matchNumber", args.matchNumber),
      )
      .first();
    if (match === null) throw new Error("Match not found");
    const alliance = match.redTeams.includes(args.teamNumber)
      ? "red"
      : match.blueTeams.includes(args.teamNumber)
        ? "blue"
        : null;
    if (alliance === null) throw new Error("Team is not in this match");

    const existing = await getClaim(
      ctx,
      args.eventId,
      args.matchNumber,
      args.teamNumber,
    );
    if (existing !== null) {
      if (existing.scoutId === me._id) return existing._id;
      const scout = await ctx.db.get(existing.scoutId);
      throw new Error(
        `Already ${existing.status} by ${scout?.name ?? scout?.email ?? "another scout"}`,
      );
    }

    return await ctx.db.insert("matchReports", {
      eventId: args.eventId,
      matchNumber: args.matchNumber,
      teamNumber: args.teamNumber,
      alliance,
      scoutId: me._id,
      status: "claimed",
      autoFuel: 0,
      autoClimb: "none",
      autoNotes: "",
      teleopFuel: 0,
      teleopWastedFuel: 0,
      playedDefense: false,
      teleopNotes: "",
      driverRating: 5,
      tags: [],
      updatedAt: Date.now(),
    });
  },
});

export const releaseClaim = mutation({
  args: { reportId: v.id("matchReports") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const report = await ctx.db.get(args.reportId);
    if (report === null) return;
    if (report.scoutId !== me._id && me.role !== "admin") {
      throw new Error("Not your claim");
    }
    if (report.status === "submitted") throw new Error("Already submitted");
    await ctx.db.delete(args.reportId);
  },
});

export const getReport = query({
  args: { reportId: v.id("matchReports") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db.get(args.reportId);
  },
});

export const submitReport = mutation({
  args: {
    reportId: v.id("matchReports"),
    autoFuel: v.number(),
    autoClimb: climbResult,
    autoNotes: v.string(),
    teleopFuel: v.number(),
    teleopWastedFuel: v.number(),
    playedDefense: v.boolean(),
    teleopNotes: v.string(),
    driverRating: v.number(),
    defenseRating: v.optional(v.number()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const { reportId, ...fields } = args;
    const report = await ctx.db.get(reportId);
    if (report === null) throw new Error("Report not found");
    if (report.scoutId !== me._id) throw new Error("Not your claim");
    if (fields.driverRating < 1 || fields.driverRating > 10) {
      throw new Error("Driver rating must be 1-10");
    }
    if (
      fields.defenseRating !== undefined &&
      (fields.defenseRating < 1 || fields.defenseRating > 10)
    ) {
      throw new Error("Defense rating must be 1-10");
    }
    await ctx.db.patch(reportId, {
      ...fields,
      defenseRating: fields.playedDefense ? fields.defenseRating : undefined,
      status: "submitted",
      updatedAt: Date.now(),
    });
  },
});
