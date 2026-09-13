import { User, Mail, Shield, Layers, CalendarDays } from "lucide-react";
import { requireActiveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Avatar, Badge } from "@/components/ui/Badge";
import { PortalShell } from "@/components/nav/PortalShell";
import { ProfileForm } from "@/app/settings/ProfileForm";
import { PasswordForm } from "@/app/settings/PasswordForm";

const ROLE_LABEL = { admin: "Admin", intern: "Intern", viewer: "Leadership (View-only)" } as const;

export default async function SettingsPage() {
  const profile = await requireActiveProfile();
  const supabase = await createClient();

  const { data: team } = profile.team_id
    ? await supabase.from("teams").select("name").eq("id", profile.team_id).single()
    : { data: null };

  return (
    <PortalShell profile={profile}>
      <PageHeader title="Profile Settings" description="Manage your account details and password." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="h-fit lg:col-span-1">
          <CardBody className="flex flex-col items-center py-8 text-center">
            <Avatar name={profile.name} />
            <p className="mt-3 text-sm font-semibold text-slate-900">{profile.name}</p>
            <p className="text-xs text-slate-500">{profile.email}</p>
            <Badge className="mt-3 bg-indigo-50 text-indigo-700">{ROLE_LABEL[profile.role]}</Badge>

            <div className="mt-6 w-full space-y-2.5 border-t border-slate-100 pt-4 text-left text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {profile.email}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Shield className="h-3.5 w-3.5 text-slate-400" /> {ROLE_LABEL[profile.role]}
              </div>
              {team && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Layers className="h-3.5 w-3.5 text-slate-400" /> {team.name}
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Joined {formatDate(profile.joined_date)}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-600" /> Profile
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ProfileForm name={profile.name} />
              <p className="mt-3 text-xs text-slate-400">
                Email, role, and team are managed by your admin — contact them for changes.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-indigo-600" /> Change password
              </CardTitle>
            </CardHeader>
            <CardBody>
              <PasswordForm />
            </CardBody>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
