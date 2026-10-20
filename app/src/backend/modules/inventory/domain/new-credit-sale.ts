import type { ContactChoice } from "@/backend/modules/contacts/domain/contact-choice";
import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { PlannedInstallment } from "./planned-installment";

/** A credit sale as the sale form sends it. */
export type NewCreditSale = {
  buyer: ContactChoice;
  item: string;
  price: Cents;
  cost: Cents | null;
  downPayment: Cents;
  frequency: Frequency;
  startDate: ISODate;
  installments: readonly PlannedInstallment[];
};
