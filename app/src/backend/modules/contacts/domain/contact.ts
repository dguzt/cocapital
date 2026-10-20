import { err, ok, type Result } from "@/lib/result";
import type { ContactError } from "./contact-error";
import type { ContactSnapshot } from "./contact-snapshot";

/** Someone the group deals with: a borrower of a loan, a buyer of a sale. */
export class Contact {
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
   * @returns The contact with a fresh id, or `ContactNameRequired` when the
   *   name is blank.
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

    return ok(
      new Contact(
        crypto.randomUUID(),
        entry.groupId,
        name,
        entry.phone?.trim() || null,
      ),
    );
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
