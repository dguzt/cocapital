/** Where a ledger row of a loan leads: the loan, and for a repay its cuota. */
export type LoanTarget = {
  loanId: string;
  installmentId: string | null;
};
