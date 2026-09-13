// ============================================================================
// Seeds demo accounts (1 admin, 3 interns, 1 viewer) so you can log in and
// test the app immediately. Uses the Supabase Admin API — requires the
// SERVICE ROLE key (never expose this key to the browser/frontend).
//
// Usage:
//   1. Fill in .env.local with NEXT_PUBLIC_SUPABASE_URL and
//      SUPABASE_SERVICE_ROLE_KEY (Project Settings -> API in Supabase).
//   2. Run the schema migration + supabase/seed.sql first (see README).
//   3. npm run seed:users
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "InternERP!2024";

const demoUsers = [
  { name: "Ava Admin", email: "admin@demo.internerp.local", role: "admin", team: null },
  { name: "Ravi Sharma", email: "ravi.intern@demo.internerp.local", role: "intern", team: "AI" },
  { name: "Priya Nair", email: "priya.intern@demo.internerp.local", role: "intern", team: "Full Stack" },
  { name: "Karan Mehta", email: "karan.intern@demo.internerp.local", role: "intern", team: "Sales" },
  { name: "Leah Leadership", email: "viewer@demo.internerp.local", role: "viewer", team: null },
];

async function getTeamId(name) {
  if (!name) return null;
  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .eq("name", name)
    .single();
  if (error) {
    console.warn(`Team "${name}" not found — run supabase/seed.sql first. Skipping team link.`);
    return null;
  }
  return data.id;
}

async function upsertDemoUser(u) {
  const teamId = await getTeamId(u.team);

  // Create (or find existing) auth user
  let userId;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: u.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (createErr) {
    if (createErr.message?.toLowerCase().includes("already been registered") ||
        createErr.status === 422) {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((x) => x.email === u.email);
      if (!existing) {
        console.error(`Could not find/create ${u.email}:`, createErr.message);
        return;
      }
      userId = existing.id;
    } else {
      console.error(`Error creating ${u.email}:`, createErr.message);
      return;
    }
  } else {
    userId = created.user.id;
  }

  const { error: profileErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      name: u.name,
      email: u.email,
      role: u.role,
      team_id: teamId,
      status: "active",
      viewer_scope: "all",
    },
    { onConflict: "id" }
  );

  if (profileErr) {
    console.error(`Error upserting profile for ${u.email}:`, profileErr.message);
    return;
  }

  console.log(`Ready: ${u.role.padEnd(7)} ${u.email}  (password: ${DEMO_PASSWORD})`);
}

for (const u of demoUsers) {
  await upsertDemoUser(u);
}

console.log("\nDone. Log in at /login with any of the emails above.");
