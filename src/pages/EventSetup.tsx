import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function EventSetup() {
  const me = useQuery(api.users.currentUser);
  const events = useQuery(api.events.listEvents);
  const users = useQuery(api.users.listUsers, me?.role === "admin" ? {} : "skip");
  const importEvent = useAction(api.events.importEvent);
  const setActive = useMutation(api.events.setActiveEvent);
  const setRole = useMutation(api.users.setRole);
  const [eventKey, setEventKey] = useState("");
  const [importing, setImporting] = useState(false);

  if (me && me.role !== "admin") {
    return <p className="text-muted-foreground">Admins only.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import event from The Blue Alliance</CardTitle>
          <CardDescription>
            Imports the team list and qualification schedule. Re-importing the
            same key updates in place (safe to run after schedule changes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              setImporting(true);
              try {
                const result = await importEvent({ eventKey });
                toast.success(
                  `Imported ${result.name}: ${result.teamCount} teams, ${result.matchCount} qual matches`,
                );
                setEventKey("");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Import failed",
                );
              } finally {
                setImporting(false);
              }
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="eventKey">TBA event key</Label>
              <Input
                id="eventKey"
                placeholder="e.g. 2026casd"
                value={eventKey}
                onChange={(e) => setEventKey(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="h-9" disabled={importing}>
              {importing ? "Importing…" : "Import"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Requires TBA_API_KEY in the Convex deployment env (
            <code>bunx convex env set TBA_API_KEY …</code>).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            The active event is what every page scopes to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {events?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing imported yet.
            </p>
          )}
          {events?.map((e) => (
            <div
              key={e._id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <span className="font-medium">{e.name}</span>{" "}
                <span className="text-sm text-muted-foreground">{e.key}</span>
              </div>
              {e.isActive ? (
                <Badge>Active</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void setActive({ eventId: e._id })}
                >
                  Make active
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scouts</CardTitle>
          <CardDescription>
            First account created became admin. Promote co-admins here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Separator className="mb-2" />
          {users?.map((u) => (
            <div
              key={u._id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <span className="font-medium">{u.name ?? u.email}</span>{" "}
                <span className="text-sm text-muted-foreground">{u.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                  {u.role ?? "scout"}
                </Badge>
                {u._id !== me?._id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void setRole({
                        userId: u._id,
                        role: u.role === "admin" ? "scout" : "admin",
                      })
                    }
                  >
                    {u.role === "admin" ? "Demote" : "Promote"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
