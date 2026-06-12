import { useMutation, useQuery } from "convex/react";
import { Crown, Merge, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveEvent } from "@/lib/useActiveEvent";

export function PickLists() {
  const navigate = useNavigate();
  const event = useActiveEvent();
  const me = useQuery(api.users.currentUser);
  const myLists = useQuery(
    api.picklists.myLists,
    event ? { eventId: event._id } : "skip",
  );
  const primary = useQuery(
    api.picklists.primaryList,
    event ? { eventId: event._id } : "skip",
  );
  const allLists = useQuery(
    api.picklists.allPersonalLists,
    event && me?.role === "admin" ? { eventId: event._id } : "skip",
  );
  const createList = useMutation(api.picklists.createList);
  const deleteList = useMutation(api.picklists.deleteList);
  const ensurePrimary = useMutation(api.picklists.ensurePrimary);
  const merge = useMutation(api.picklists.mergeIntoPrimary);
  const [newName, setNewName] = useState("");

  if (event === null)
    return <p className="text-muted-foreground">No active event.</p>;
  if (!event || myLists === undefined) return <Skeleton className="h-60 w-full" />;

  const listSummary = (l: {
    t1: number[];
    t2: number[];
    t3: number[];
    dnp: number[];
  }) =>
    `T1 ${l.t1.length} · T2 ${l.t2.length} · T3 ${l.t3.length} · DNP ${l.dnp.length}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="size-5" /> Primary pick list
          </CardTitle>
          <CardDescription>
            Admin-owned. Build it by hand or merge everyone's lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {primary ? (
            <>
              <Link to={`/picklists/${primary._id}`}>
                <Button variant="outline">Open primary</Button>
              </Link>
              <span className="text-sm text-muted-foreground">
                {listSummary(primary)}
              </span>
            </>
          ) : me?.role === "admin" ? (
            <Button
              variant="outline"
              onClick={async () => {
                const id = await ensurePrimary({ eventId: event._id });
                void navigate(`/picklists/${id}`);
              }}
            >
              Create primary list
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              Not created yet.
            </span>
          )}
          {me?.role === "admin" && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await merge({ eventId: event._id });
                  toast.success("Merged all personal lists into primary");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Merge failed",
                  );
                }
              }}
            >
              <Merge className="mr-1 size-4" /> Merge personal lists
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My pick lists</CardTitle>
          <CardDescription>
            Yours alone — the admin merges these into the primary with a
            consensus score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {myLists.map((l) => (
            <div
              key={l._id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <Link to={`/picklists/${l._id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {listSummary(l)}
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void deleteList({ listId: l._id })}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const id = await createList({
                eventId: event._id,
                name: newName,
              });
              setNewName("");
              void navigate(`/picklists/${id}`);
            }}
          >
            <Input
              placeholder="New list name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="submit" variant="outline">
              <Plus className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {me?.role === "admin" && allLists && allLists.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Everyone's lists</CardTitle>
            <CardDescription>What the merge will consume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {allLists.map((l) => (
              <Link
                key={l._id}
                to={`/picklists/${l._id}`}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {listSummary(l)}
                  </p>
                </div>
                <Badge variant="secondary">{l.ownerName}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
