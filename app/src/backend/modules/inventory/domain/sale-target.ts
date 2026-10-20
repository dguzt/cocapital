/** Where a ledger row of a credit sale leads: the sale, and for a cobro its cuota. */
export type SaleTarget = {
  saleId: string;
  installmentId: string | null;
};
