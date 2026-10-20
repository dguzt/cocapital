import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { CreditSaleInstallment } from "./credit-sale-installment";
import type { CreditSaleStatus } from "./credit-sale-status";

/** Every field of a credit sale that already exists. */
export type CreditSaleSnapshot = {
  id: string;
  groupId: string;
  userId: string;
  buyer: { id: string; name: string };
  item: string;
  price: Cents;
  cost: Cents | null;
  frequency: Frequency;
  startDate: ISODate;
  status: CreditSaleStatus;
  saleMovementId: string;
  installments: readonly CreditSaleInstallment[];
};
