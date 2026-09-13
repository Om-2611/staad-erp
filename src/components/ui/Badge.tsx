type StatusKind =
  | "pending"
  | "approved"
  | "rejected"
  | "present"
  | "absent"
  | "leave"
  | "active"
  | "inactive"
  | "milestone";

const STATUS_CLASSES: Record<StatusKind, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  absent: "bg-red-50 text-red-700 ring-red-200",
  leave: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
  milestone: "bg-violet-50 text-violet-700 ring-violet-200",
};

const DOT_CLASSES: Record<StatusKind, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  present: "bg-emerald-500",
  absent: "bg-red-500",
  leave: "bg-amber-500",
  active: "bg-emerald-500",
  inactive: "bg-slate-400",
  milestone: "bg-violet-500",
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status.toLowerCase() as StatusKind) ?? "pending";
  const cls = STATUS_CLASSES[key] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  const dot = DOT_CLASSES[key] ?? "bg-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ${className}`}
    >
      {children}
    </span>
  );
}

const AVATAR_PALETTE = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-cyan-500",
  "from-fuchsia-500 to-purple-500",
];

function hashToIndex(input: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

/** Colorful initials avatar, deterministic per name so it stays stable across renders. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const gradient = AVATAR_PALETTE[hashToIndex(name, AVATAR_PALETTE.length)];
  const sizeClasses = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <span
      className={`inline-flex ${sizeClasses} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} font-semibold text-white`}
    >
      {initials || "?"}
    </span>
  );
}
