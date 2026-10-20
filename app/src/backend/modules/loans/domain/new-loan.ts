import type { ContactChoice } from "@/backend/modules/contacts/domain/contact-choice";
import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { ScheduledInstallment } from "./scheduled-installment";

/** A loan as the wizard sends it: to an existing or a new contact. */
export type NewLoan = {
  borrower: ContactChoice;
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  startDate: ISODate;
  installments: readonly ScheduledInstallment[];
};
