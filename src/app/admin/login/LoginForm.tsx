"use client";

import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card mt-6 space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: pw }),
        });
        if (res.ok) {
          window.location.href = next;
        } else {
          setError((await res.json()).error ?? "Login failed");
          setBusy(false);
        }
      }}
    >
      <div>
        <label htmlFor="pw" className="label">Password</label>
        <input id="pw" type="password" autoComplete="current-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </div>
      {error && <p role="alert" className="text-sm text-hot">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
