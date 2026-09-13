import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/nav/PortalShell";

export default async function ViewerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("viewer");
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
