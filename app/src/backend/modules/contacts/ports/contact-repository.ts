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
   * Tells whether a contact belongs to the group.
   *
   * @param groupId - The group asking.
   * @param contactId - The contact.
   * @returns True when the contact is the group's.
   */
  existsInGroup(groupId: string, contactId: string): Promise<boolean>;

  /**
   * Stores a new contact.
   *
   * @param contact - The contact to store.
   */
  add(contact: Contact): Promise<void>;
}
