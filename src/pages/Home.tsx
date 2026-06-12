import { useQuery } from "convex/react";
import { ClipboardList, ListOrdered, Users, Wrench } from "lucide-react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveEvent } from "@/lib/useActiveEvent";

export function Home() {
  const me = useQuery(api.users.currentUser);
  const event = useActiveEvent();
  const teams = useQuery(
    api.teams.listWithStats,
    event ? { eventId: event._id } : "skip",
  );
  const matches = useQuery(
    api.matches.listMatches,
    event ? { eventId: event._id } : "skip",
  );

  if (event === undefined) return <Skeleton className="h-40 w-full" />;

  if (event === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No event configured</CardTitle>
          <CardDescription>
            {me?.role === "admin" ? (
              <>
                Head to{" "}
                <Link className="underline" to="/setup">
                  Event setup
                </Link>{" "}
                and import a TBA event to get started.
              </>
            ) : (
              "Ask your admin to import an event in Event setup."
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pitScouted = teams?.filter((t) => t.pitScouted).length ?? 0;
  const reportTotal =
    teams?.reduce((s, t) => s + t.stats.reportCount, 0) ?? 0;
  const matchesDone =
    matches?.filter((m) => m.submittedCount >= 6).length ?? 0;

  const tiles = [
    {
      to: "/matches",
      icon: ClipboardList,
      title: "Match scouting",
      desc: `${reportTotal} reports · ${matchesDone}/${matches?.length ?? 0} matches fully covered`,
    },
    {
      to: "/pit",
      icon: Wrench,
      title: "Pit scouting",
      desc: `${pitScouted}/${teams?.length ?? 0} teams scouted`,
    },
    {
      to: "/teams",
      icon: Users,
      title: "Teams",
      desc: `${teams?.length ?? 0} teams at ${event.key}`,
    },
    {
      to: "/picklists",
      icon: ListOrdered,
      title: "Pick lists",
      desc: "Personal lists + primary",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {me?.name ?? me?.email}
          {me?.role === "admin" && " (admin)"}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <t.icon className="size-5" /> {t.title}
                </CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
