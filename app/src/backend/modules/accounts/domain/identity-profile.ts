/** Profile handed over by the identity provider: names and email, all optional. */
export type IdentityProfile = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};
