import type { Metadata } from "next";
import { StatusLookup } from "./StatusLookup";

export const metadata: Metadata = { title: "Track your BitElevate application" };

export default async function StatusPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="eyebrow">BitElevate</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Track your application</h1>
      <p className="mt-2 text-muted">Enter the code you got after applying and the email you applied with.</p>
      <div className="mt-8">
        <StatusLookup initialCode={code ?? ""} />
      </div>
    </div>
  );
}
