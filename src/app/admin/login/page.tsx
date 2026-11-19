import type { Metadata } from "next";
import { usingDemoPassword } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Team login", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/admin") ? next : "/admin";
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <p className="eyebrow">Cynbit team</p>
      <h1 className="mt-3 text-2xl font-bold">Sign in to the dashboard</h1>
      <LoginForm next={safeNext} />
      {usingDemoPassword() && (
        <p className="mt-4 rounded-xl border border-warm/30 bg-warm/10 px-4 py-3 text-xs text-warm">
          Demo mode: the password is <span className="font-mono">cynbit-demo</span>. Set ADMIN_PASSWORD to change it.
        </p>
      )}
    </div>
  );
}
