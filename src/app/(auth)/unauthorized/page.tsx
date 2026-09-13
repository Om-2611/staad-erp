import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-slate-900">Account not active</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your account has no active profile, or has been deactivated. Please contact your
          administrator.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
