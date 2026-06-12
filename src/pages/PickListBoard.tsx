import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/lib/useActiveEvent";
import { useDroppable } from "@dnd-kit/core";

const COLUMNS = [
  { id: "t1", label: "Tier 1" },
  { id: "t2", label: "Tier 2" },
  { id: "t3", label: "Tier 3" },
  { id: "dnp", label: "Do Not Pick" },
  { id: "unc", label: "Uncategorized" },
] as const;

type ColumnId = (typeof COLUMNS)[number]["id"];
type Columns = Record<ColumnId, number[]>;

type TeamInfo = {
  nickname: string;
  pitScouted: boolean;
  avgDriver: number | null;
  avgTeleopFuel: number | null;
  avgWasted: number | null;
};

function TeamCard({
  teamNumber,
  info,
  disabled,
  overlay,
}: {
  teamNumber: number;
  info: TeamInfo | undefined;
  disabled: boolean;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: teamNumber, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border bg-card p-2.5 text-sm shadow-xs",
        !disabled && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && !overlay && "opacity-40",
        overlay && "shadow-lg",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold tabular-nums">{teamNumber}</span>
        {info?.pitScouted && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            pit ✓
          </Badge>
        )}
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {info?.nickname ?? ""}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        drv {info?.avgDriver ?? "—"} · fuel {info?.avgTeleopFuel ?? "—"} · wst{" "}
        {info?.avgWasted ?? "—"}
      </p>
    </div>
  );
}

function Column({
  id,
  label,
  teamNumbers,
  teamInfo,
  disabled,
}: {
  id: ColumnId;
  label: string;
  teamNumbers: number[];
  teamInfo: Map<number, TeamInfo>;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 w-56 shrink-0 flex-col gap-1.5 rounded-xl border bg-muted/30 p-2",
        isOver && "ring-2 ring-ring",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary">{teamNumbers.length}</Badge>
      </div>
      <SortableContext items={teamNumbers} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-1.5">
          {teamNumbers.map((n) => (
            <TeamCard
              key={n}
              teamNumber={n}
              info={teamInfo.get(n)}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function PickListBoard() {
  const { listId } = useParams();
  const event = useActiveEvent();
  const me = useQuery(api.users.currentUser);
  const list = useQuery(api.picklists.getList, {
    listId: listId as Id<"pickLists">,
  });
  const teams = useQuery(
    api.teams.listWithStats,
    event ? { eventId: event._id } : "skip",
  );
  const updateTiers = useMutation(api.picklists.updateTiers);

  const [columns, setColumns] = useState<Columns | null>(null);
  const [activeTeam, setActiveTeam] = useState<number | null>(null);
  const dragging = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const teamInfo = useMemo(() => {
    const map = new Map<number, TeamInfo>();
    for (const t of teams ?? []) {
      map.set(t.number, {
        nickname: t.nickname,
        pitScouted: t.pitScouted,
        avgDriver: t.stats.avgDriverRating,
        avgTeleopFuel: t.stats.avgTeleopFuel,
        avgWasted: t.stats.avgWastedFuel,
      });
    }
    return map;
  }, [teams]);

  // Server doc + team list -> local board state (skip while dragging).
  useEffect(() => {
    if (!list || !teams || dragging.current) return;
    const categorized = new Set([
      ...list.t1,
      ...list.t2,
      ...list.t3,
      ...list.dnp,
    ]);
    setColumns({
      t1: list.t1,
      t2: list.t2,
      t3: list.t3,
      dnp: list.dnp,
      unc: teams.map((t) => t.number).filter((n) => !categorized.has(n)),
    });
  }, [list, teams]);

  if (!list || !teams || !columns) return <Skeleton className="h-60 w-full" />;

  const canEdit = list.isPrimary
    ? me?.role === "admin"
    : me?._id === list.ownerId;

  const findColumn = (id: number | string): ColumnId | null => {
    if (typeof id === "string" && COLUMNS.some((c) => c.id === id))
      return id as ColumnId;
    for (const c of COLUMNS) {
      if (columns[c.id].includes(Number(id))) return c.id;
    }
    return null;
  };

  const onDragStart = (e: DragStartEvent) => {
    dragging.current = true;
    setActiveTeam(Number(e.active.id));
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(active.id as number);
    const to = findColumn(over.id as number | string);
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      if (!prev) return prev;
      const team = Number(active.id);
      const fromItems = prev[from].filter((n) => n !== team);
      const overIndex =
        typeof over.id === "number"
          ? prev[to].indexOf(over.id as number)
          : prev[to].length;
      const toItems = [...prev[to]];
      toItems.splice(overIndex < 0 ? toItems.length : overIndex, 0, team);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTeam(null);
    dragging.current = false;
    if (!over) return;
    const col = findColumn(active.id as number);
    if (!col) return;
    setColumns((prev) => {
      if (!prev) return prev;
      const team = Number(active.id);
      const items = [...prev[col]];
      const oldIndex = items.indexOf(team);
      const newIndex =
        typeof over.id === "number" ? items.indexOf(over.id as number) : -1;
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        items.splice(oldIndex, 1);
        items.splice(newIndex, 0, team);
      }
      const next = { ...prev, [col]: items };
      void updateTiers({
        listId: list._id,
        t1: next.t1,
        t2: next.t2,
        t3: next.t3,
        dnp: next.dnp,
      });
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">
          {list.name}
          {list.isPrimary && <Badge className="ml-2">Primary</Badge>}
        </h1>
        <p className="text-sm text-muted-foreground">
          {canEdit
            ? "Drag teams between tiers. Order inside a tier is your ranking."
            : "Read-only view."}
        </p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((c) => (
            <Column
              key={c.id}
              id={c.id}
              label={c.label}
              teamNumbers={columns[c.id]}
              teamInfo={teamInfo}
              disabled={!canEdit}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTeam !== null && (
            <TeamCard
              teamNumber={activeTeam}
              info={teamInfo.get(activeTeam)}
              disabled
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
