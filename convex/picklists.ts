import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireUser } from "./users";

export const myLists = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const lists = await ctx.db
      .query("pickLists")
      .withIndex("by_event_owner", (q) =>
        q.eq("eventId", args.eventId).eq("ownerId", me._id),
      )
      .collect();
    return lists.filter((l) => !l.isPrimary);
  },
});

export const primaryList = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("pickLists")
      .withIndex("by_event_primary", (q) =>
        q.eq("eventId", args.eventId).eq("isPrimary", true),
      )
      .first();
  },
});

export const allPersonalLists = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lists = await ctx.db
      .query("pickLists")
      .withIndex("by_event_owner", (q) => q.eq("eventId", args.eventId))
      .collect();
    const result = [];
    for (const l of lists.filter((l) => !l.isPrimary)) {
      const owner = await ctx.db.get(l.ownerId);
      result.push({ ...l, ownerName: owner?.name ?? owner?.email ?? "?" });
    }
    return result;
  },
});

export const getList = query({
  args: { listId: v.id("pickLists") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db.get(args.listId);
  },
});

export const createList = mutation({
  args: { eventId: v.id("events"), name: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    return await ctx.db.insert("pickLists", {
      eventId: args.eventId,
      ownerId: me._id,
      name: args.name.trim() || "My pick list",
      isPrimary: false,
      t1: [],
      t2: [],
      t3: [],
      dnp: [],
      updatedAt: Date.now(),
    });
  },
});

export const ensurePrimary = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("pickLists")
      .withIndex("by_event_primary", (q) =>
        q.eq("eventId", args.eventId).eq("isPrimary", true),
      )
      .first();
    if (existing !== null) return existing._id;
    return await ctx.db.insert("pickLists", {
      eventId: args.eventId,
      ownerId: admin._id,
      name: "Primary",
      isPrimary: true,
      t1: [],
      t2: [],
      t3: [],
      dnp: [],
      updatedAt: Date.now(),
    });
  },
});

export const deleteList = mutation({
  args: { listId: v.id("pickLists") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (list === null) return;
    if (list.isPrimary) throw new Error("Cannot delete the primary list");
    if (list.ownerId !== me._id && me.role !== "admin") {
      throw new Error("Not your list");
    }
    await ctx.db.delete(args.listId);
  },
});

export const updateTiers = mutation({
  args: {
    listId: v.id("pickLists"),
    t1: v.array(v.number()),
    t2: v.array(v.number()),
    t3: v.array(v.number()),
    dnp: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (list === null) throw new Error("List not found");
    const canEdit = list.isPrimary
      ? me.role === "admin"
      : list.ownerId === me._id;
    if (!canEdit) throw new Error("Not allowed to edit this list");
    await ctx.db.patch(args.listId, {
      t1: args.t1,
      t2: args.t2,
      t3: args.t3,
      dnp: args.dnp,
      updatedAt: Date.now(),
    });
  },
});

// Consensus merge: every personal list votes. A team categorized in a list
// gets a score (T1=1, T2=2, T3=3, DNP=4) plus a small bonus for ranking
// high inside its column. The merged tier is the rounded average score
// across the lists that voted; teams no list voted on stay uncategorized.
// Within each merged column, teams sort by average score (best first).
export const mergeIntoPrimary = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const lists = (
      await ctx.db
        .query("pickLists")
        .withIndex("by_event_owner", (q) => q.eq("eventId", args.eventId))
        .collect()
    ).filter((l) => !l.isPrimary);
    if (lists.length === 0) throw new Error("No personal lists to merge");

    const TIER_SCORE = { t1: 1, t2: 2, t3: 3, dnp: 4 } as const;
    const votes = new Map<number, number[]>();
    for (const list of lists) {
      for (const tier of ["t1", "t2", "t3", "dnp"] as const) {
        const column = list[tier];
        column.forEach((teamNumber, rank) => {
          // Rank bonus spreads [0, 0.5) across the column so a team at the
          // top of someone's T2 beats a team at the bottom of it.
          const rankBonus =
            column.length > 1 ? (rank / (column.length - 1)) * 0.5 : 0;
          const score = TIER_SCORE[tier] + rankBonus;
          votes.set(teamNumber, [...(votes.get(teamNumber) ?? []), score]);
        });
      }
    }

    const merged = { t1: [] as number[], t2: [] as number[], t3: [] as number[], dnp: [] as number[] };
    const scored = [...votes.entries()]
      .map(([teamNumber, scores]) => ({
        teamNumber,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => a.avg - b.avg);
    for (const { teamNumber, avg } of scored) {
      if (avg < 1.75) merged.t1.push(teamNumber);
      else if (avg < 2.75) merged.t2.push(teamNumber);
      else if (avg < 3.75) merged.t3.push(teamNumber);
      else merged.dnp.push(teamNumber);
    }

    const primary = await ctx.db
      .query("pickLists")
      .withIndex("by_event_primary", (q) =>
        q.eq("eventId", args.eventId).eq("isPrimary", true),
      )
      .first();
    if (primary === null) {
      const id = await ctx.db.insert("pickLists", {
        eventId: args.eventId,
        ownerId: admin._id,
        name: "Primary",
        isPrimary: true,
        ...merged,
        updatedAt: Date.now(),
      });
      return id;
    }
    await ctx.db.patch(primary._id, { ...merged, updatedAt: Date.now() });
    return primary._id;
  },
});
