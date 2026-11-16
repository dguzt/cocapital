import { err, ok, type Result } from "@/lib/result";
import type { ContactError } from "./contact-error";
import type { ContactSnapshot } from "./contact-snapshot";

/** Someone the group deals with: a borrower of a loan, a buyer of a sale. */
export class Contact {
  private static readonly MAX_NAME_LENGTH = 80;

  private static readonly MAX_PHONE_LENGTH = 30;

  private constructor(
    readonly id: string,
    readonly groupId: string,
    readonly name: string,
    readonly phone: string | null,
  ) {}

  /**
   * Adds a person to the group's contacts.
   *
   * @param entry - The group, the name as typed and an optional phone.
   * @returns The contact with a fresh id, `ContactNameRequired` when the
   *   name is blank, or `ContactTooLong`.
   */
  static create(entry: {
    groupId: string;
    name: string;
    phone?: string | null;
  }): Result<Contact, ContactError> {
    const name = entry.name.trim();

    if (!name) {
      return err({
        kind: "ContactNameRequired",
        message: "a new contact needs a name",
      });
    }

    const phone = entry.phone?.trim() || null;

    if (name.length > Contact.MAX_NAME_LENGTH) {
      return err({
        kind: "ContactTooLong",
        message: `a name can be at most ${Contact.MAX_NAME_LENGTH} characters`,
        field: "name",
      });
    }

    if (phone && phone.length > Contact.MAX_PHONE_LENGTH) {
      return err({
        kind: "ContactTooLong",
        message: `a phone can be at most ${Contact.MAX_PHONE_LENGTH} characters`,
        field: "phone",
      });
    }

    return ok(new Contact(crypto.randomUUID(), entry.groupId, name, phone));
  }

  /**
   * Rebuilds a contact that already exists, without re-checking its rules.
   *
   * @param snapshot - Every field of the contact, already valid.
   * @returns The same contact.
   */
  static restore(snapshot: ContactSnapshot): Contact {
    return new Contact(
      snapshot.id,
      snapshot.groupId,
      snapshot.name,
      snapshot.phone,
    );
  }
}
