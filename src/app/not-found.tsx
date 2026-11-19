import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-bold">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-muted">The link may be wrong or the blueprint may have expired (demo data resets when the server restarts).</p>
      <Link href="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  );
}
