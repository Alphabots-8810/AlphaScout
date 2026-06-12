import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { TeamDetailDialog } from "@/components/teams/TeamDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveEvent } from "@/lib/useActiveEvent";

export function Teams() {
  const event = useActiveEvent();
  const teams = useQuery(
    api.teams.listWithStats,
    event ? { eventId: event._id } : "skip",
  );
  const [filter, setFilter] = useState("");
  const [openTeam, setOpenTeam] = useState<number | null>(null);

  if (event === null)
    return <p className="text-muted-foreground">No active event.</p>;
  if (!teams) return <Skeleton className="h-60 w-full" />;

  const filtered = teams.filter(
    (t) =>
      String(t.number).includes(filter) ||
      t.nickname.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search team number or name…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="h-11"
      />
      <div className="grid gap-2">
        {filtered.map((t) => (
          <Card
            key={t._id}
            className="cursor-pointer py-3 transition-colors hover:bg-muted/50"
            onClick={() => setOpenTeam(t.number)}
          >
            <CardContent className="flex items-center gap-3 px-4">
              <span className="w-14 text-lg font-bold tabular-nums">
                {t.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.nickname}</p>
                <p className="text-xs text-muted-foreground">
                  {t.stats.reportCount} match reports
                  {t.stats.avgTotalFuel !== null &&
                    ` · ${t.stats.avgTotalFuel} avg fuel`}
                  {t.stats.avgTowerPoints !== null &&
                    ` · ${t.stats.avgTowerPoints} avg tower`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge variant={t.pitScouted ? "default" : "outline"}>
                  {t.pitScouted ? "Pit ✓" : "No pit"}
                </Badge>
                {t.tier && <Badge variant="secondary">{t.tier}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {event && openTeam !== null && (
        <TeamDetailDialog
          eventId={event._id}
          teamNumber={openTeam}
          onClose={() => setOpenTeam(null)}
        />
      )}
    </div>
  );
}
