import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const CLIMB_LABEL: Record<string, string> = {
  none: "No climb",
  failed: "Failed",
  l1: "L1",
  l2: "L2",
  l3: "L3",
  success: "L1 ✓",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function TeamDetailDialog({
  eventId,
  teamNumber,
  onClose,
}: {
  eventId: Id<"events">;
  teamNumber: number;
  onClose: () => void;
}) {
  const detail = useQuery(api.teams.teamDetail, { eventId, teamNumber });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-hidden p-0">
        {!detail ? (
          <div className="p-6">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[85dvh]">
            <div className="space-y-4 p-6">
              <DialogHeader className="p-0">
                <DialogTitle>
                  {detail.team.number} · {detail.team.nickname}
                </DialogTitle>
                <DialogDescription>
                  {[detail.team.city, detail.team.stateProv, detail.team.country]
                    .filter(Boolean)
                    .join(", ")}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2">
                <Stat
                  label="Avg auto fuel"
                  value={detail.stats.avgAutoFuel ?? "—"}
                />
                <Stat
                  label="Avg teleop fuel"
                  value={detail.stats.avgTeleopFuel ?? "—"}
                />
                <Stat
                  label="Avg tower pts"
                  value={detail.stats.avgTowerPoints ?? "—"}
                />
                <Stat
                  label="Avg driver"
                  value={detail.stats.avgDriverRating ?? "—"}
                />
                <Stat
                  label="Avg wasted fuel"
                  value={detail.stats.avgWastedFuel ?? "—"}
                />
                <Stat label="Reports" value={detail.stats.reportCount} />
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 font-semibold">Pit scouting</h3>
                {detail.pit === null ? (
                  <p className="text-sm text-muted-foreground">
                    Not pit scouted yet.
                  </p>
                ) : (
                  <div className="space-y-2 text-sm">
                    {detail.pit.photoUrl && (
                      <img
                        src={detail.pit.photoUrl}
                        alt={`Team ${teamNumber} robot`}
                        className="max-h-56 w-full rounded-lg object-cover"
                      />
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{detail.pit.drivetrain}</Badge>
                      <Badge variant="secondary">
                        {detail.pit.fuelCapacity} fuel cap
                      </Badge>
                      <Badge variant="secondary">
                        intake: {detail.pit.intake}
                      </Badge>
                      <Badge variant="secondary">{detail.pit.scoringStyle}</Badge>
                      {detail.pit.canClimbL1 && <Badge>L1</Badge>}
                      {detail.pit.canClimbL2 && <Badge>L2</Badge>}
                      {detail.pit.canClimbL3 && <Badge>L3</Badge>}
                      {detail.pit.autoClimbClaimed && (
                        <Badge variant="outline">claims auto climb</Badge>
                      )}
                      <Badge variant="outline">
                        claims {detail.pit.autoFuelClaimed} auto fuel
                      </Badge>
                    </div>
                    {detail.pit.notes && (
                      <p className="text-muted-foreground">{detail.pit.notes}</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 font-semibold">Match reports</h3>
                {detail.reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No submitted reports.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {detail.reports.map((r) => (
                      <div key={r._id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Q{r.matchNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            by {r.scoutName}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          Auto {r.autoFuel} fuel
                          {r.autoClimb !== "none" &&
                            ` · auto climb ${CLIMB_LABEL[r.autoClimb]}`}{" "}
                          · Teleop {r.teleopFuel} fuel
                          {r.teleopWastedFuel > 0 &&
                            ` (${r.teleopWastedFuel} wasted)`}{" "}
                          · Endgame {CLIMB_LABEL[r.endgameClimb]} · Driver{" "}
                          {r.driverRating}/10
                          {r.playedDefense &&
                            r.defenseRating !== undefined &&
                            ` · Defense ${r.defenseRating}/10`}
                        </p>
                        {r.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {r.tags.map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {(r.autoNotes || r.teleopNotes || r.endgameNotes) && (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {[r.autoNotes, r.teleopNotes, r.endgameNotes]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
