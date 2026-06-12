import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const climbResult = v.union(
  v.literal("none"),
  v.literal("success"),
  v.literal("failed"),
);

export const endgameClimb = v.union(
  v.literal("none"),
  v.literal("l1"),
  v.literal("l2"),
  v.literal("l3"),
  v.literal("failed"),
);

export const tier = v.union(
  v.literal("t1"),
  v.literal("t2"),
  v.literal("t3"),
  v.literal("dnp"),
);

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    // AlphaScout: assigned on first sign-in; first user becomes admin
    role: v.optional(v.union(v.literal("admin"), v.literal("scout"))),
  })
    .index("email", ["email"])
    .index("by_role", ["role"]),

  events: defineTable({
    key: v.string(), // TBA event key, e.g. "2026casd"
    name: v.string(),
    year: v.number(),
    isActive: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_active", ["isActive"]),

  teams: defineTable({
    eventId: v.id("events"),
    teamKey: v.string(), // "frc8810"
    number: v.number(),
    nickname: v.string(),
    city: v.optional(v.string()),
    stateProv: v.optional(v.string()),
    country: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_number", ["eventId", "number"]),

  matches: defineTable({
    eventId: v.id("events"),
    matchKey: v.string(), // "2026casd_qm10"
    matchNumber: v.number(),
    redTeams: v.array(v.number()),
    blueTeams: v.array(v.number()),
    scheduledTime: v.optional(v.number()), // epoch ms
  })
    .index("by_event", ["eventId"])
    .index("by_event_number", ["eventId", "matchNumber"]),

  pitReports: defineTable({
    eventId: v.id("events"),
    teamNumber: v.number(),
    scoutId: v.id("users"),
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
    canClimbL2: v.boolean(),
    canClimbL3: v.boolean(),
    autoFuelClaimed: v.number(),
    autoClimbClaimed: v.boolean(),
    photoStorageId: v.optional(v.id("_storage")),
    notes: v.string(),
    updatedAt: v.number(),
  }).index("by_event_team", ["eventId", "teamNumber"]),

  // One row per (match, robot). Created on claim, filled on submit —
  // the claim mutation is what enforces one scout per robot per match.
  matchReports: defineTable({
    eventId: v.id("events"),
    matchNumber: v.number(),
    teamNumber: v.number(),
    alliance: v.union(v.literal("red"), v.literal("blue")),
    scoutId: v.id("users"),
    status: v.union(v.literal("claimed"), v.literal("submitted")),
    autoFuel: v.number(),
    autoClimb: climbResult,
    autoNotes: v.string(),
    teleopFuel: v.number(),
    teleopWastedFuel: v.number(), // dumped into inactive HUB
    playedDefense: v.boolean(),
    teleopNotes: v.string(),
    endgameClimb: endgameClimb,
    endgameNotes: v.string(),
    driverRating: v.number(), // 1-10
    defenseRating: v.optional(v.number()), // 1-10, only if playedDefense
    tags: v.array(v.string()),
    updatedAt: v.number(),
  })
    .index("by_event_match", ["eventId", "matchNumber"])
    .index("by_event_match_team", ["eventId", "matchNumber", "teamNumber"])
    .index("by_event_team", ["eventId", "teamNumber"])
    .index("by_scout", ["scoutId"]),

  pickLists: defineTable({
    eventId: v.id("events"),
    ownerId: v.id("users"),
    name: v.string(),
    isPrimary: v.boolean(),
    // Team numbers per tier, in ranked order. Teams absent from every
    // tier are Uncategorized (computed client-side).
    t1: v.array(v.number()),
    t2: v.array(v.number()),
    t3: v.array(v.number()),
    dnp: v.array(v.number()),
    updatedAt: v.number(),
  })
    .index("by_event_owner", ["eventId", "ownerId"])
    .index("by_event_primary", ["eventId", "isPrimary"]),
});
