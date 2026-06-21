import Link from "next/link";

export default function TenantNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">This page isn&apos;t set up yet</h1>
      <p className="mt-2 max-w-sm text-slate-500">
        We couldn&apos;t find a business at this address. The link may be mistyped or the business
        may not be active.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700"
      >
        Go to ReviewLoop
      </Link>
    </main>
  );
}
