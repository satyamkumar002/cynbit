import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, checkPassword, createSession } from "@/lib/auth";
import { clientIp, jsonError, rateLimit } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 15 * 60_000)) return jsonError("Too many attempts. Wait 15 minutes.", 429);
  const parsed = z.object({ password: z.string().max(200) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await checkPassword(parsed.data.password))) return jsonError("Wrong password.", 401);

  const session = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
}
