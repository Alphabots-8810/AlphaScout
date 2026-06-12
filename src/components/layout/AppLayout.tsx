import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  CalendarCog,
  ClipboardList,
  Home,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  Sun,
  Users,
  Wrench,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/pit", label: "Pit", icon: Wrench },
  { to: "/matches", label: "Matches", icon: ClipboardList },
  { to: "/picklists", label: "Pick lists", icon: ListOrdered },
  { to: "/setup", label: "Event setup", icon: CalendarCog, adminOnly: true },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const me = useQuery(api.users.currentUser);
  return (
    <>
      {NAV.filter((n) => !n.adminOnly || me?.role === "admin").map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <n.icon className="size-4" />
          {n.label}
        </NavLink>
      ))}
    </>
  );
}

export function AppLayout() {
  const { signOut } = useAuthActions();
  const { resolvedTheme, setTheme } = useTheme();
  const me = useQuery(api.users.currentUser);
  const activeEvent = useQuery(api.events.activeEvent);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu />
                </Button>
              }
            />
            <SheetContent side="left" className="w-64 p-4">
              <SheetHeader className="p-0 pb-4">
                <SheetTitle>AlphaScout</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1">
                <NavItems onNavigate={() => setNavOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>

          <span className="text-base font-bold tracking-tight">AlphaScout</span>
          {activeEvent && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {activeEvent.name}
            </Badge>
          )}

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <NavItems />
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {me?.name ?? me?.email}
              {me?.role === "admin" && " · admin"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void signOut()}>
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
