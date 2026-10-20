import { Contact } from "@/backend/modules/contacts/domain/contact";
import type { ContactChoice } from "@/backend/modules/contacts/domain/contact-choice";
import type { ContactError } from "@/backend/modules/contacts/domain/contact-error";
import type { ContactRepository } from "@/backend/modules/contacts/ports/contact-repository";
import { err, ok, type Result } from "@/lib/result";

export type ResolveContactInput = {
  groupId: string;
  choice: ContactChoice;
};

/** Turns the person picked in a form into a contact of the group. */
export class ResolveContact {
  static inject = ["contacts"] as const;

  constructor(private readonly contacts: ContactRepository) {}

  /**
   * Checks a picked contact belongs to the group, or adds a new one.
   *
   * @param input - The group and the person picked or typed.
   * @returns The contact's id and name, or `ContactNotFound` or
   *   `ContactNameRequired`.
   */
  async execute(
    input: ResolveContactInput,
  ): Promise<Result<{ contactId: string; name: string }, ContactError>> {
    const { choice } = input;

    if ("id" in choice) {
      const found = await this.contacts.findInGroup(input.groupId, choice.id);

      if (!found) {
        return err({
          kind: "ContactNotFound",
          message: "contact does not exist in this group",
          contactId: choice.id,
        });
      }

      return ok({ contactId: found.id, name: found.name });
    }

    const contact = Contact.create({
      groupId: input.groupId,
      name: choice.name,
      phone: choice.phone,
    });

    if (!contact.ok) {
      return contact;
    }

    await this.contacts.add(contact.value);

    return ok({ contactId: contact.value.id, name: contact.value.name });
  }
}
