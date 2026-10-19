import type { User } from "@/backend/modules/accounts/domain/user";

/** A partner as a plain object — the only shape a Client Component can receive. */
export type UserView = {
  id: string;
  name: string;
  email: string;
};

/** Turns the User entity into its plain view for the UI. */
export function toUserView(user: User): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
