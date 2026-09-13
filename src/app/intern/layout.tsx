import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/nav/PortalShell";

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("intern");
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
