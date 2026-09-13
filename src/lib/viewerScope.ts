import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

/**
 * Returns the list of team IDs a viewer is allowed to see, or `null` when
 * their scope is "all" (no restriction). Used to scope dashboard queries to
 * match what RLS already enforces at the row level — keeping the UI's
 * aggregate counts (e.g. "total interns") consistent with a team-restricted
 * viewer's actual visibility instead of leaking org-wide totals.
 */
export async function getViewerTeamIds(profile: Profile): Promise<string[] | null> {
  if (profile.role !== "viewer" || profile.viewer_scope === "all") return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("viewer_team_access")
    .select("team_id")
    .eq("viewer_id", profile.id);

  return (data ?? []).map((r) => r.team_id);
}
