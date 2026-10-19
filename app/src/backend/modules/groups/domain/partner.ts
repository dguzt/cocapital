import type { Member } from "./member";

/** A partner about to take a seat in a group. */
export type Partner = Omit<Member, "role">;
