// Hand-written types matching supabase/migrations/0001_init.sql.
// If you evolve the schema, regenerate with the Supabase CLI instead:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type Role = "admin" | "intern" | "viewer";
export type AttendanceStatus = "present" | "absent" | "leave";
export type MarkedBy = "self" | "admin";
export type WorkLogStatus = "pending" | "approved" | "rejected";
export type AnnouncementVisibility = "all" | "interns" | "viewers" | "team";
export type ViewerScope = "all" | "team";
export type AccountStatus = "active" | "inactive";
export type Band = "A" | "B" | "C" | "D";
export type TaskFrequency = "daily" | "weekly" | "monthly";

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: Role;
          team_id: string | null;
          status: AccountStatus;
          joined_date: string;
          viewer_scope: ViewerScope;
          created_at: string;
          roll_number: string | null;
          year: string | null;
          spf_band: Band | null;
          cdc_band: Band | null;
          branch: string | null;
          section: string | null;
          backlog: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: Role;
          team_id?: string | null;
          status?: AccountStatus;
          joined_date?: string;
          viewer_scope?: ViewerScope;
          created_at?: string;
          roll_number?: string | null;
          year?: string | null;
          spf_band?: Band | null;
          cdc_band?: Band | null;
          branch?: string | null;
          section?: string | null;
          backlog?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      viewer_team_access: {
        Row: { viewer_id: string; team_id: string };
        Insert: { viewer_id: string; team_id: string };
        Update: Partial<Database["public"]["Tables"]["viewer_team_access"]["Insert"]>;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          check_in_time: string | null;
          check_out_time: string | null;
          status: AttendanceStatus;
          marked_by: MarkedBy;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          status?: AttendanceStatus;
          marked_by?: MarkedBy;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
        Relationships: [];
      };
      worklogs: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          date: string;
          description: string;
          link: string | null;
          time_spent_minutes: number | null;
          status: WorkLogStatus;
          admin_remark: string | null;
          is_milestone: boolean;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          date: string;
          description: string;
          link?: string | null;
          time_spent_minutes?: number | null;
          status?: WorkLogStatus;
          admin_remark?: string | null;
          is_milestone?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["worklogs"]["Insert"]>;
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string;
          created_by: string | null;
          visible_to: AnnouncementVisibility;
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          created_by?: string | null;
          visible_to?: AnnouncementVisibility;
          team_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          frequency: TaskFrequency;
          team_id: string | null;
          assigned_to: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          frequency: TaskFrequency;
          team_id?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_table: string;
          target_id: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_table: string;
          target_id?: string | null;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type WorkLog = Database["public"]["Tables"]["worklogs"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type AuditLogEntry = Database["public"]["Tables"]["audit_log"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
