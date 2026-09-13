import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/nav/PortalShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
