import { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`border-b border-slate-100 px-5 py-4 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-sm font-semibold text-slate-900 ${className}`} {...props} />;
}

export function CardBody({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 py-4 ${className}`} {...props} />;
}

const ACCENTS = {
  indigo: "from-indigo-500 to-violet-500 bg-indigo-50 text-indigo-600",
  emerald: "from-emerald-500 to-teal-500 bg-emerald-50 text-emerald-600",
  amber: "from-amber-500 to-orange-500 bg-amber-50 text-amber-600",
  rose: "from-rose-500 to-pink-500 bg-rose-50 text-rose-600",
  sky: "from-sky-500 to-cyan-500 bg-sky-50 text-sky-600",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "indigo",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: keyof typeof ACCENTS;
}) {
  const accentClasses = ACCENTS[accent].split(" ");
  const gradientClasses = accentClasses.slice(0, 2).join(" ");
  const chipClasses = accentClasses.slice(2).join(" ");

  return (
    <Card className="group relative overflow-hidden p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradientClasses}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chipClasses}`}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  );
}
