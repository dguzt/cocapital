/**
 * The whole schema, one file per table.
 *
 * All money columns are integer cents (D5); every financial row is scoped by
 * group_id; identifiers are English, UI copy is Spanish.
 *
 * Ownership: users -> M1 · groups/memberships -> M2 ·
 * movements/movement_changes -> M3 · borrowers/loans/installments -> M4.
 * M5 (capital) owns no table at all: it is a pure reducer.
 */

export * from "../../../modules/accounts/adapters/out/drizzle/users.table";
export * from "./borrowers";
export * from "./groups";
export * from "./installments";
export * from "./loans";
export * from "./memberships";
export * from "./movement-changes";
export * from "./movements";
