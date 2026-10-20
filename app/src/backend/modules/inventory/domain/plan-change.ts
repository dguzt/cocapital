/** A rewrite of a credit sale's pending cuotas, as the activity shows it. */
export type PlanChange = {
  id: string;
  saleId: string;
  buyerName: string;
  item: string;
  fromCount: number;
  toCount: number;
  authorName: string;
  createdAt: Date;
};
