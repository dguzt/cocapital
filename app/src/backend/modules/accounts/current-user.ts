/**
 * M1 · the auth seam (UC-101). Everything server-side gets the current user
 * from HERE, never from Clerk directly — so usecase tests fake one function.
 * The Users mirror is written on first authed request (no webhooks in MVP).
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { Users } from "../../infra/db/schema";

export type SessionUser = {
  id: string;
  clerkId: string;
  name: string;
  email: string;
};

/** Current DB user, mirroring from Clerk on first sight. Null if signed out. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await db
    .select()
    .from(Users)
    .where(eq(Users.clerkId, clerkId));
  if (existing[0]) return existing[0];

  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] ||
    "Socio";
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  // Concurrent first requests can race — the unique clerk_id decides, loser re-reads.
  const inserted = await db
    .insert(Users)
    .values({ clerkId, name, email })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];
  const [row] = await db.select().from(Users).where(eq(Users.clerkId, clerkId));
  return row ?? null;
}

/** Like getCurrentUser but for pages that require auth (proxy guarantees it). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated request past the proxy guard");
  return user;
}
