import type { Contact } from "@/backend/modules/contacts/domain/contact";

/** Storage of the people each group deals with. */
export interface ContactRepository {
  /**
   * Lists a group's contacts.
   *
   * @param groupId - The group.
   * @returns Its contacts, by name.
   */
  listByGroup(groupId: string): Promise<Contact[]>;

  /**
   * Finds a contact, only if it belongs to the group.
   *
   * @param groupId - The group asking.
   * @param contactId - The contact.
   * @returns The contact, or null.
   */
  findInGroup(groupId: string, contactId: string): Promise<Contact | null>;

  /**
   * Stores a new contact.
   *
   * @param contact - The contact to store.
   */
  add(contact: Contact): Promise<void>;
}
