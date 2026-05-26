import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/auth/config";

const isProtectedRoute = createRouteMatcher([
  "/office(.*)",
  "/create-organization(.*)",
  "/select-role(.*)",
  "/cons/profile/me(.*)",
  "/cons/tickets(.*)",
  "/tickets(.*)",
  "/api/store/profile(.*)",
  "/api/auth/actor(.*)",
  "/api/workspace(.*)",
  "/api/store/events(.*)",
  "/api/store/users(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isClerkConfigured()) {
    return NextResponse.next();
  }

  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
