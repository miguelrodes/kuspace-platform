import { NextRequest, NextResponse } from "next/server";
import { SANDBOX_COOKIE } from "./sandbox";

export function sandboxBoundary(request: NextRequest, enabled: boolean) {
  if (!enabled || request.cookies.get(SANDBOX_COOKIE)?.value !== "1")
    return null;
  const path = request.nextUrl.pathname;
  if (path === "/api/demo/session") return NextResponse.next();
  if (
    path.startsWith("/api/") ||
    path.startsWith("/trpc/") ||
    !["GET", "HEAD"].includes(request.method)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message:
            "Choose a demo role on the start page. Demo edits are local to this tab; database and payment actions are unavailable.",
          status: 403,
          code: "DEMO_SANDBOX",
        },
      },
      { status: 403 },
    );
  }
  if (path === "/office" || path.startsWith("/office/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/demo" + path;
    return NextResponse.rewrite(url);
  }
  if (
    [
      "/select-role",
      "/create-organization",
      "/auth/continue",
      "/login",
      "/sign-in",
      "/sign-up",
    ].some((prefix) => path === prefix || path.startsWith(prefix + "/"))
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}
