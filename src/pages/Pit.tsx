import { useQuery } from "convex/react";
import { Check } from "lucide-react";
import { Link } from "react-router";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/lib/useActiveEvent";

// Dashboard-style landing: a grid of every team, green when scouted.
export function Pit() {
  const event = useActiveEvent();
  const teams = useQuery(
    api.teams.listWithStats,
    event ? { eventId: event._id } : "skip",
  );

  if (event === null)
    return <p className="text-muted-foreground">No active event.</p>;
  if (!teams) return <Skeleton className="h-60 w-full" />;

  const done = teams.filter((t) => t.pitScouted).length;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Pit scouting</h1>
        <p className="text-sm text-muted-foreground">
          {done}/{teams.length} teams scouted — tap a team to scout it
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {teams.map((t) => (
          <Link
            key={t._id}
            to={`/pit/${t.number}`}
            className={cn(
              "relative flex h-20 flex-col items-center justify-center rounded-lg border p-1 transition-colors",
              t.pitScouted
                ? "border-green-600/40 bg-green-500/10 hover:bg-green-500/20"
                : "hover:bg-muted",
            )}
          >
            {t.pitScouted && (
              <Check className="absolute top-1 right-1 size-4 text-green-600" />
            )}
            <span className="text-lg font-bold tabular-nums">{t.number}</span>
            <span className="w-full truncate text-center text-xs text-muted-foreground">
              {t.nickname}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
