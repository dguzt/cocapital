/** A rewrite of a credit sale's pending cuotas about to be recorded. */
export type PlanChangeEntry = {
  saleId: string;
  userId: string;
  fromCount: number;
  toCount: number;
};
