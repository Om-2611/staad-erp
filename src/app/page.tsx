import Link from "next/link";

// Middleware redirects "/" to /login (signed out) or the caller's portal home
// (signed in). This only renders as a fallback if middleware is bypassed.
export default function RootPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-slate-900">STAAD ERP</h1>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-slate-700 underline">
          Go to login
        </Link>
      </div>
    </div>
  );
}
