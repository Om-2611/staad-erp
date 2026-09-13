import { requireInternPortalAccess } from "@/lib/auth";
import { PortalShell } from "@/components/nav/PortalShell";

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireInternPortalAccess();
  return <PortalShell profile={profile}>{children}</PortalShell>;
}
