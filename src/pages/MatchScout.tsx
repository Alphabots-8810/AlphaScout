import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChoiceRow, RatingRow, Stepper } from "@/components/scout/Stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/lib/useActiveEvent";

const TAGS = [
  "Fast",
  "Accurate",
  "Good driver",
  "Plays defense",
  "Tippy",
  "Broke down",
  "Inconsistent",
  "Shift-aware",
  "Wastes fuel",
  "Good human player",
];

type AutoClimb = "none" | "success" | "failed";

export function MatchScout() {
  const { matchNumber: matchParam } = useParams();
  const matchNumber = Number(matchParam);
  const navigate = useNavigate();
  const event = useActiveEvent();
  const board = useQuery(
    api.matches.matchBoard,
    event ? { eventId: event._id, matchNumber } : "skip",
  );
  const claimRobot = useMutation(api.matches.claimRobot);
  const releaseClaim = useMutation(api.matches.releaseClaim);
  const submitReport = useMutation(api.matches.submitReport);

  // Scouting form state (only meaningful once a claim exists).
  const [autoFuel, setAutoFuel] = useState(0);
  const [autoClimb, setAutoClimb] = useState<AutoClimb>("none");
  const [autoNotes, setAutoNotes] = useState("");
  const [teleopFuel, setTeleopFuel] = useState(0);
  const [teleopWastedFuel, setTeleopWastedFuel] = useState(0);
  const [playedDefense, setPlayedDefense] = useState(false);
  const [teleopNotes, setTeleopNotes] = useState("");
  const [driverRating, setDriverRating] = useState(5);
  const [defenseRating, setDefenseRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (!event || !board) return <Skeleton className="h-60 w-full" />;

  const mine = board.slots.find((s) => s.isMine && s.status === "claimed");

  const claim = async (teamNumber: number) => {
    setBusy(true);
    try {
      await claimRobot({ eventId: event._id, matchNumber, teamNumber });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!mine?.reportId) return;
    setBusy(true);
    try {
      await submitReport({
        reportId: mine.reportId as Id<"matchReports">,
        autoFuel,
        autoClimb,
        autoNotes,
        teleopFuel,
        teleopWastedFuel,
        playedDefense,
        teleopNotes,
        driverRating,
        defenseRating: playedDefense ? defenseRating : undefined,
        tags,
      });
      toast.success(`Q${matchNumber} · ${mine.teamNumber} submitted`);
      void navigate("/matches");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  if (!mine) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div>
          <h1 className="text-lg font-bold">Q{matchNumber} · pick a robot</h1>
          <p className="text-sm text-muted-foreground">
            One scout per robot — claiming locks it for you.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {board.slots.map((s) => (
            <Button
              key={s.teamNumber}
              variant="outline"
              disabled={busy || s.status !== "open"}
              onClick={() => void claim(s.teamNumber)}
              className={cn(
                "flex h-20 flex-col items-center justify-center gap-0.5",
                s.alliance === "red"
                  ? "border-red-500/50 data-disabled:opacity-60"
                  : "border-blue-500/50 data-disabled:opacity-60",
              )}
            >
              <span className="text-lg font-bold tabular-nums">
                {s.teamNumber}
              </span>
              <span className="max-w-full truncate text-xs text-muted-foreground">
                {s.status === "open"
                  ? (s.nickname ?? "")
                  : `${s.status} · ${s.scoutName}`}
              </span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            Q{matchNumber} ·{" "}
            <span
              className={
                mine.alliance === "red"
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400"
              }
            >
              {mine.teamNumber}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">{mine.nickname}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={async () => {
            await releaseClaim({
              reportId: mine.reportId as Id<"matchReports">,
            });
          }}
        >
          Release
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Auto (20s · both hubs active)</h2>
        <Stepper label="Fuel scored" value={autoFuel} onChange={setAutoFuel} />
        <ChoiceRow
          label="L1 climb (15 pts)"
          value={autoClimb}
          onChange={setAutoClimb}
          options={[
            { value: "none", label: "No attempt" },
            { value: "success", label: "Climbed" },
            { value: "failed", label: "Failed" },
          ]}
        />
        <Textarea
          placeholder="Auto notes"
          value={autoNotes}
          onChange={(e) => setAutoNotes(e.target.value)}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold">Teleop</h2>
        <Stepper
          label="Fuel scored (active hub)"
          value={teleopFuel}
          onChange={setTeleopFuel}
        />
        <Stepper
          label="Fuel wasted (inactive hub)"
          value={teleopWastedFuel}
          onChange={setTeleopWastedFuel}
        />
        <label className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm font-medium">Played defense</span>
          <Switch checked={playedDefense} onCheckedChange={setPlayedDefense} />
        </label>
        <Textarea
          placeholder="Teleop notes"
          value={teleopNotes}
          onChange={(e) => setTeleopNotes(e.target.value)}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-semibold">Ratings & tags</h2>
        <RatingRow
          label="Driver rating"
          value={driverRating}
          onChange={setDriverRating}
        />
        {playedDefense && (
          <RatingRow
            label="Defense rating"
            value={defenseRating}
            onChange={setDefenseRating}
          />
        )}
        <div className="space-y-1.5">
          <Label className="text-sm">Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <Badge
                  key={tag}
                  variant={active ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5 text-sm"
                  onClick={() =>
                    setTags(
                      active ? tags.filter((t) => t !== tag) : [...tags, tag],
                    )
                  }
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
        </div>
      </section>

      <Button
        className="h-12 w-full text-base"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? "Submitting…" : `Submit Q${matchNumber} · ${mine.teamNumber}`}
      </Button>
    </div>
  );
}
