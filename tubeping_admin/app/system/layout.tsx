"use client";

import AdminShell from "../_components/admin-shell";

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
