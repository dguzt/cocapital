/** Every field of a contact that already exists. */
export type ContactSnapshot = {
  id: string;
  groupId: string;
  name: string;
  phone: string | null;
};
