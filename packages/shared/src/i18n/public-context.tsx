"use client";

import { createContext, useContext } from "react";
import { type PublicCopy } from "./public-copy";

const PublicCopyContext = createContext<PublicCopy | null>(null);

export function PublicCopyProvider({
  value,
  children,
}: {
  value: PublicCopy;
  children: React.ReactNode;
}) {
  return <PublicCopyContext.Provider value={value}>{children}</PublicCopyContext.Provider>;
}

export function usePublicCopy() {
  const context = useContext(PublicCopyContext);
  if (!context) {
    throw new Error("usePublicCopy must be used within PublicCopyProvider");
  }
  return context;
}
