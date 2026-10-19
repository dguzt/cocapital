/** How and by whom a change was decided. */
export type ChangeDecision = {
  status: "approved" | "rejected";
  decidedBy: string;
  decidedAt: Date;
};
