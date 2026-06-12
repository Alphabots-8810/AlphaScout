import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Big-button counter for fuel estimates. REBUILT fuel comes in bursts, so
// +5 exists to keep scouts off the keyboard.
export function Stepper({
  label,
  value,
  onChange,
  bigStep = 5,
  className,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  bigStep?: number;
  className?: string;
}) {
  const bump = (d: number) => onChange(Math.max(0, value + d));
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-12 text-base"
          onClick={() => bump(-bigStep)}
        >
          -{bigStep}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-12"
          onClick={() => bump(-1)}
        >
          <Minus />
        </Button>
        <div className="flex h-12 min-w-16 flex-1 items-center justify-center rounded-lg border text-2xl font-semibold tabular-nums">
          {value}
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-12"
          onClick={() => bump(1)}
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-12 text-base"
          onClick={() => bump(bigStep)}
        >
          +{bigStep}
        </Button>
      </div>
    </div>
  );
}

// One-of-N picker rendered as big buttons (no dropdowns on the field).
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="lg"
            className="h-11 flex-1 basis-0 min-w-fit"
            variant={value === opt.value ? "default" : "outline"}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// 1-10 rating as tap targets.
export function RatingRow({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm">
        {label}: <span className="font-semibold">{value}</span>
      </Label>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Button
            key={n}
            type="button"
            variant={value === n ? "default" : "outline"}
            className="h-10 px-0"
            onClick={() => onChange(n)}
          >
            {n}
          </Button>
        ))}
      </div>
    </div>
  );
}
