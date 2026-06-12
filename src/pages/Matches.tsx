import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveEvent } from "@/lib/useActiveEvent";

export function Matches() {
  const event = useActiveEvent();
  const matches = useQuery(
    api.matches.listMatches,
    event ? { eventId: event._id } : "skip",
  );

  if (event === null)
    return <p className="text-muted-foreground">No active event.</p>;
  if (!matches) return <Skeleton className="h-60 w-full" />;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Match scouting</h1>
        <p className="text-sm text-muted-foreground">
          Pick a match, claim a robot, scout it.
        </p>
      </div>
      <div className="grid gap-2">
        {matches.map((m) => (
          <Link key={m._id} to={`/matches/${m.matchNumber}`}>
            <Card className="py-3 transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 px-4">
                <span className="w-12 shrink-0 font-bold">
                  Q{m.matchNumber}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm tabular-nums">
                  <span className="truncate text-red-600 dark:text-red-400">
                    {m.redTeams.join("  ")}
                  </span>
                  <span className="truncate text-blue-600 dark:text-blue-400">
                    {m.blueTeams.join("  ")}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {m.myClaim !== undefined && (
                    <Badge>yours: {m.myClaim}</Badge>
                  )}
                  <Badge
                    variant={m.submittedCount >= 6 ? "default" : "secondary"}
                  >
                    {m.submittedCount}/6
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {matches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No qualification schedule yet — import or re-import the event once
            the schedule is posted.
          </p>
        )}
      </div>
    </div>
  );
}
