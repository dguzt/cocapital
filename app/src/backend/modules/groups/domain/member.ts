/** A partner as the group knows them: who they are and the seat they hold. */
export type Member = {
  userId: string;
  name: string;
  role: "creator" | "member";
};
