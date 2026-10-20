import type { Contact } from "@/backend/modules/contacts/domain/contact";
import type { ContactRepository } from "@/backend/modules/contacts/ports/contact-repository";

export type ListContactsInput = {
  groupId: string;
};

/** Reads the people a group can lend or sell to again. */
export class ListContacts {
  static inject = ["contacts"] as const;

  constructor(private readonly contacts: ContactRepository) {}

  /**
   * Lists the contacts.
   *
   * @param input - The group.
   * @returns Its contacts, by name.
   */
  async execute(input: ListContactsInput): Promise<Contact[]> {
    return this.contacts.listByGroup(input.groupId);
  }
}
