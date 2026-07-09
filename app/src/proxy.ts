/**
 * Next 16 renamed `middleware` → `proxy` (see bundled docs); Clerk's
 * clerkMiddleware works as the exported proxy function. Everything is
 * auth-protected except the sign-in/up screens — /join/[code] included,
 * so an invited partner signs up first and lands back on the invite.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// "/" is public: it renders the landing for visitors, the Panel for members.
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
