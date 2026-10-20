import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import type { Contact } from "@/backend/modules/contacts/domain/contact";
import type { ContactRepository } from "@/backend/modules/contacts/ports/contact-repository";
import { ContactMapper } from "./contact-mapper";
import { Contacts } from "./contacts.table";

export class DrizzleContactRepository implements ContactRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async listByGroup(groupId: string): Promise<Contact[]> {
    const rows = await this.db
      .select()
      .from(Contacts)
      .where(eq(Contacts.groupId, groupId))
      .orderBy(asc(Contacts.name));

    return rows.map(ContactMapper.toDomain);
  }

  async findInGroup(
    groupId: string,
    contactId: string,
  ): Promise<Contact | null> {
    const [row] = await this.db
      .select()
      .from(Contacts)
      .where(and(eq(Contacts.id, contactId), eq(Contacts.groupId, groupId)))
      .limit(1);

    return row ? ContactMapper.toDomain(row) : null;
  }

  async add(contact: Contact): Promise<void> {
    await this.db.insert(Contacts).values(ContactMapper.toRow(contact));
  }
}
