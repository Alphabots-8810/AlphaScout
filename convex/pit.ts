import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

export const getReport = query({
  args: { eventId: v.id("events"), teamNumber: v.number() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const pit = await ctx.db
      .query("pitReports")
      .withIndex("by_event_team", (q) =>
        q.eq("eventId", args.eventId).eq("teamNumber", args.teamNumber),
      )
      .first();
    if (pit === null) return null;
    return {
      ...pit,
      photoUrl: pit.photoStorageId
        ? await ctx.storage.getUrl(pit.photoStorageId)
        : null,
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const submitReport = mutation({
  args: {
    eventId: v.id("events"),
    teamNumber: v.number(),
    drivetrain: v.union(
      v.literal("swerve"),
      v.literal("tank"),
      v.literal("other"),
    ),
    fuelCapacity: v.number(),
    intake: v.union(
      v.literal("ground"),
      v.literal("human"),
      v.literal("both"),
      v.literal("none"),
    ),
    scoringStyle: v.union(
      v.literal("dumper"),
      v.literal("shooter"),
      v.literal("both"),
      v.literal("none"),
    ),
    canClimbL1: v.boolean(),
    autoFuelClaimed: v.number(),
    autoClimbClaimed: v.boolean(),
    photoStorageId: v.optional(v.id("_storage")),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const { eventId, teamNumber, ...fields } = args;
    const existing = await ctx.db
      .query("pitReports")
      .withIndex("by_event_team", (q) =>
        q.eq("eventId", eventId).eq("teamNumber", teamNumber),
      )
      .first();
    if (existing === null) {
      await ctx.db.insert("pitReports", {
        eventId,
        teamNumber,
        scoutId: user._id,
        ...fields,
        photoStorageId: fields.photoStorageId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, {
        scoutId: user._id,
        ...fields,
        // Keep the old photo if the new submission doesn't replace it.
        photoStorageId: fields.photoStorageId ?? existing.photoStorageId,
        updatedAt: Date.now(),
      });
    }
  },
});
