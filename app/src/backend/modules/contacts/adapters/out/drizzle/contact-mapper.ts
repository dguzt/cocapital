import { Contact } from "@/backend/modules/contacts/domain/contact";
import type { Contacts } from "./contacts.table";

type ContactRow = typeof Contacts.$inferSelect;

/** Translates between the contacts table and the Contact entity. */
export class ContactMapper {
  /**
   * Builds the entity from its row.
   *
   * @param row - The row of the contacts table.
   * @returns The contact as the domain knows it.
   */
  static toDomain(row: ContactRow): Contact {
    return Contact.restore({
      id: row.id,
      groupId: row.groupId,
      name: row.name,
      phone: row.phone,
    });
  }

  /**
   * Builds the row that stores a contact.
   *
   * @param contact - The entity to store.
   * @returns The values for an insert into the contacts table.
   */
  static toRow(contact: Contact): typeof Contacts.$inferInsert {
    return {
      id: contact.id,
      groupId: contact.groupId,
      name: contact.name,
      phone: contact.phone,
    };
  }
}
