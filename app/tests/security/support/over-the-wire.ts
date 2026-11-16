import { proposeEditAction } from "@/backend/modules/movements/adapters/in/next/movement-actions";

/** Calls the edit action the way a crafted request can: with arguments the signature does not declare. */
export const proposeEditOverTheWire = proposeEditAction as (
  ...args: unknown[]
) => ReturnType<typeof proposeEditAction>;
