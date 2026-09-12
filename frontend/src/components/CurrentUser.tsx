"use client";

import { createContext, useContext } from "react";
import type { PublicUser } from "@/lib/auth-store";

const CurrentUserContext = createContext<PublicUser | null>(null);

export function CurrentUserProvider({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
