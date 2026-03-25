"use client";

import { createContext, useContext } from "react";
import { type AdminCopy } from "./admin-copy";

const AdminCopyContext = createContext<AdminCopy | null>(null);

export function AdminCopyProvider({
  value,
  children,
}: {
  value: AdminCopy;
  children: React.ReactNode;
}) {
  return <AdminCopyContext.Provider value={value}>{children}</AdminCopyContext.Provider>;
}

export function useAdminCopy() {
  const context = useContext(AdminCopyContext);
  if (!context) {
    throw new Error("useAdminCopy must be used within AdminCopyProvider");
  }
  return context;
}
