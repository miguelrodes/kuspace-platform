import { NextRequest, NextResponse } from "next/server";
import { isPublicDemoMode } from "@/lib/demo-mode";
import { createDemoSandbox } from "@/lib/demo/sandbox-seed";
import { SANDBOX_COOKIE } from "@/lib/demo/sandbox";

export async function POST(request: NextRequest) {
  if (!isPublicDemoMode())
    return NextResponse.json(
      { error: "Demo entry is disabled." },
      { status: 404 },
    );
  // Next dev can normalize nextUrl to 0.0.0.0; validate against the browser-facing Host.
  const origin = request.headers.get("origin");
  const expectedOrigin =
    request.nextUrl.protocol +
    "//" +
    (request.headers.get("host") ?? request.nextUrl.host);
  if (origin !== expectedOrigin)
    return NextResponse.json(
      { error: "Same-origin requests only." },
      { status: 403 },
    );
  const body = await request.json().catch(() => null);
  if (!body || !["recruiter", "consumer"].includes(body.role))
    return NextResponse.json({ error: "Choose a demo role." }, { status: 400 });
  const response = NextResponse.json(createDemoSandbox(body.role), {
    headers: { "Cache-Control": "no-store" },
  });
  // This marker grants no database identity: it only activates a restricted UI shell.
  response.cookies.set(SANDBOX_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
  });
  return response;
}
