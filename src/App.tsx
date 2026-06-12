import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useConvexAuth,
  useMutation,
} from "convex/react";
import { useEffect } from "react";
import { Route, Routes } from "react-router";
import { api } from "../convex/_generated/api";
import { SignInForm } from "@/components/auth/SignInForm";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { EventSetup } from "@/pages/EventSetup";
import { Home } from "@/pages/Home";
import { Matches } from "@/pages/Matches";
import { MatchScout } from "@/pages/MatchScout";
import { PickListBoard } from "@/pages/PickListBoard";
import { PickLists } from "@/pages/PickLists";
import { Pit } from "@/pages/Pit";
import { PitForm } from "@/pages/PitForm";
import { Teams } from "@/pages/Teams";

function EnsureRole() {
  const { isAuthenticated } = useConvexAuth();
  const ensureRole = useMutation(api.users.ensureRole);
  useEffect(() => {
    if (isAuthenticated) void ensureRole({});
  }, [isAuthenticated, ensureRole]);
  return null;
}

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-dvh items-center justify-center">
          <Skeleton className="h-32 w-80" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
      <Authenticated>
        <EnsureRole />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="setup" element={<EventSetup />} />
            <Route path="teams" element={<Teams />} />
            <Route path="pit" element={<Pit />} />
            <Route path="pit/:teamNumber" element={<PitForm />} />
            <Route path="matches" element={<Matches />} />
            <Route path="matches/:matchNumber" element={<MatchScout />} />
            <Route path="picklists" element={<PickLists />} />
            <Route path="picklists/:listId" element={<PickListBoard />} />
          </Route>
        </Routes>
      </Authenticated>
    </>
  );
}
