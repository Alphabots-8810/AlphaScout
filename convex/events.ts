import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireAdmin } from "./users";

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

async function tbaFetch(path: string): Promise<unknown> {
  const key = process.env.TBA_API_KEY;
  if (!key) {
    throw new Error(
      "TBA_API_KEY is not set in the Convex deployment environment",
    );
  }
  const res = await fetch(`${TBA_BASE}${path}`, {
    headers: { "X-TBA-Auth-Key": key },
  });
  if (!res.ok) {
    throw new Error(`TBA ${path} failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").collect();
  },
});

export const activeEvent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();
  },
});

export const setActiveEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").collect();
    for (const e of events) {
      if (e.isActive && e._id !== args.eventId) {
        await ctx.db.patch(e._id, { isActive: false });
      }
    }
    await ctx.db.patch(args.eventId, { isActive: true });
  },
});

export const assertAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
  },
});

type TbaTeam = {
  key: string;
  team_number: number;
  nickname: string | null;
  city: string | null;
  state_prov: string | null;
  country: string | null;
};

type TbaMatch = {
  key: string;
  comp_level: string;
  match_number: number;
  time: number | null;
  alliances: {
    red: { team_keys: string[] };
    blue: { team_keys: string[] };
  };
};

type TbaEvent = { name: string; year: number };

export const importEvent = action({
  args: { eventKey: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ name: string; teamCount: number; matchCount: number }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    await ctx.runQuery(internal.events.assertAdmin, {});

    const eventKey = args.eventKey.trim().toLowerCase();
    const event = (await tbaFetch(`/event/${eventKey}`)) as TbaEvent;
    const teams = (await tbaFetch(
      `/event/${eventKey}/teams/simple`,
    )) as TbaTeam[];
    const matches = (await tbaFetch(
      `/event/${eventKey}/matches/simple`,
    )) as TbaMatch[];

    const quals = matches
      .filter((m) => m.comp_level === "qm")
      .sort((a, b) => a.match_number - b.match_number);

    const toNumber = (teamKey: string) => Number(teamKey.replace("frc", ""));

    await ctx.runMutation(internal.events.saveImport, {
      eventKey,
      name: event.name,
      year: event.year,
      teams: teams.map((t) => ({
        teamKey: t.key,
        number: t.team_number,
        nickname: t.nickname ?? `Team ${t.team_number}`,
        city: t.city ?? undefined,
        stateProv: t.state_prov ?? undefined,
        country: t.country ?? undefined,
      })),
      matches: quals.map((m) => ({
        matchKey: m.key,
        matchNumber: m.match_number,
        redTeams: m.alliances.red.team_keys.map(toNumber),
        blueTeams: m.alliances.blue.team_keys.map(toNumber),
        scheduledTime: m.time !== null ? m.time * 1000 : undefined,
      })),
    });

    return {
      name: event.name,
      teamCount: teams.length,
      matchCount: quals.length,
    };
  },
});

export const saveImport = internalMutation({
  args: {
    eventKey: v.string(),
    name: v.string(),
    year: v.number(),
    teams: v.array(
      v.object({
        teamKey: v.string(),
        number: v.number(),
        nickname: v.string(),
        city: v.optional(v.string()),
        stateProv: v.optional(v.string()),
        country: v.optional(v.string()),
      }),
    ),
    matches: v.array(
      v.object({
        matchKey: v.string(),
        matchNumber: v.number(),
        redTeams: v.array(v.number()),
        blueTeams: v.array(v.number()),
        scheduledTime: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Upsert event; first imported event becomes active.
    let event = await ctx.db
      .query("events")
      .withIndex("by_key", (q) => q.eq("key", args.eventKey))
      .first();
    if (event === null) {
      const anyEvent = await ctx.db.query("events").first();
      const id = await ctx.db.insert("events", {
        key: args.eventKey,
        name: args.name,
        year: args.year,
        isActive: anyEvent === null,
      });
      event = (await ctx.db.get(id))!;
    } else {
      await ctx.db.patch(event._id, { name: args.name, year: args.year });
    }

    for (const t of args.teams) {
      const existing = await ctx.db
        .query("teams")
        .withIndex("by_event_number", (q) =>
          q.eq("eventId", event._id).eq("number", t.number),
        )
        .first();
      if (existing === null) {
        await ctx.db.insert("teams", { eventId: event._id, ...t });
      } else {
        await ctx.db.patch(existing._id, { ...t });
      }
    }

    for (const m of args.matches) {
      const existing = await ctx.db
        .query("matches")
        .withIndex("by_event_number", (q) =>
          q.eq("eventId", event._id).eq("matchNumber", m.matchNumber),
        )
        .first();
      if (existing === null) {
        await ctx.db.insert("matches", { eventId: event._id, ...m });
      } else {
        await ctx.db.patch(existing._id, { ...m });
      }
    }
  },
});
