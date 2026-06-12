import { useMutation, useQuery } from "convex/react";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChoiceRow, Stepper } from "@/components/scout/Stepper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useActiveEvent } from "@/lib/useActiveEvent";

type Drivetrain = "swerve" | "tank" | "other";
type Intake = "ground" | "human" | "both" | "none";
type ScoringStyle = "dumper" | "shooter" | "both" | "none";

export function PitForm() {
  const { teamNumber: teamParam } = useParams();
  const teamNumber = Number(teamParam);
  const navigate = useNavigate();
  const event = useActiveEvent();
  const existing = useQuery(
    api.pit.getReport,
    event ? { eventId: event._id, teamNumber } : "skip",
  );
  const generateUploadUrl = useMutation(api.pit.generateUploadUrl);
  const submit = useMutation(api.pit.submitReport);

  const [drivetrain, setDrivetrain] = useState<Drivetrain>("swerve");
  const [fuelCapacity, setFuelCapacity] = useState(0);
  const [intake, setIntake] = useState<Intake>("ground");
  const [scoringStyle, setScoringStyle] = useState<ScoringStyle>("dumper");
  const [canClimbL1, setCanClimbL1] = useState(false);
  const [autoFuelClaimed, setAutoFuelClaimed] = useState(0);
  const [autoClimbClaimed, setAutoClimbClaimed] = useState(false);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (existing && !loaded.current) {
      loaded.current = true;
      setDrivetrain(existing.drivetrain);
      setFuelCapacity(existing.fuelCapacity);
      setIntake(existing.intake);
      setScoringStyle(existing.scoringStyle);
      setCanClimbL1(existing.canClimbL1);
      setAutoFuelClaimed(existing.autoFuelClaimed);
      setAutoClimbClaimed(existing.autoClimbClaimed);
      setNotes(existing.notes);
    }
  }, [existing]);

  if (!event || existing === undefined)
    return <Skeleton className="h-60 w-full" />;

  const save = async () => {
    setSaving(true);
    try {
      let photoStorageId: Id<"_storage"> | undefined;
      if (photo) {
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": photo.type },
          body: photo,
        });
        if (!res.ok) throw new Error("Photo upload failed");
        const { storageId } = (await res.json()) as {
          storageId: Id<"_storage">;
        };
        photoStorageId = storageId;
      }
      await submit({
        eventId: event._id,
        teamNumber,
        drivetrain,
        fuelCapacity,
        intake,
        scoringStyle,
        canClimbL1,
        autoFuelClaimed,
        autoClimbClaimed,
        photoStorageId,
        notes,
      });
      toast.success(`Pit report saved for ${teamNumber}`);
      void navigate("/pit");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-lg font-bold">Pit · Team {teamNumber}</h1>
        {existing && (
          <p className="text-sm text-muted-foreground">
            Already scouted — saving updates the existing report.
          </p>
        )}
      </div>

      <ChoiceRow
        label="Drivetrain"
        value={drivetrain}
        onChange={setDrivetrain}
        options={[
          { value: "swerve", label: "Swerve" },
          { value: "tank", label: "Tank" },
          { value: "other", label: "Other" },
        ]}
      />
      <ChoiceRow
        label="Intake"
        value={intake}
        onChange={setIntake}
        options={[
          { value: "ground", label: "Ground" },
          { value: "human", label: "Human" },
          { value: "both", label: "Both" },
          { value: "none", label: "None" },
        ]}
      />
      <ChoiceRow
        label="Scoring style"
        value={scoringStyle}
        onChange={setScoringStyle}
        options={[
          { value: "dumper", label: "Dumper" },
          { value: "shooter", label: "Shooter" },
          { value: "both", label: "Both" },
          { value: "none", label: "None" },
        ]}
      />
      <Stepper
        label="Fuel capacity"
        value={fuelCapacity}
        onChange={setFuelCapacity}
      />

      <Separator />

      <label className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm font-medium">Can climb L1 (auto, 15 pts)</span>
        <Checkbox
          checked={canClimbL1}
          onCheckedChange={(c) => setCanClimbL1(c === true)}
        />
      </label>

      <Stepper
        label="Claimed auto fuel"
        value={autoFuelClaimed}
        onChange={setAutoFuelClaimed}
      />
      <label className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm font-medium">Claims L1 climb in auto</span>
        <Switch
          checked={autoClimbClaimed}
          onCheckedChange={setAutoClimbClaimed}
        />
      </label>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">Robot photo</Label>
        {existing?.photoUrl && !photo && (
          <img
            src={existing.photoUrl}
            alt="Current robot"
            className="max-h-48 w-full rounded-lg object-cover"
          />
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          onClick={() => fileInput.current?.click()}
        >
          <Camera className="mr-1" />
          {photo
            ? photo.name
            : existing?.photoUrl
              ? "Replace photo"
              : "Take photo"}
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-sm">
          Notes
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else worth knowing"
        />
      </div>

      <Button
        className="h-12 w-full text-base"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save pit report"}
      </Button>
    </div>
  );
}
