import type { Contact } from "@/backend/modules/contacts/domain/contact";

/** A contact as a Client Component can hold it. */
export type ContactView = {
  id: string;
  name: string;
};

/**
 * Turns a contact into plain data for the browser.
 *
 * @param contact - The contact.
 * @returns Its id and name.
 */
export function toContactView(contact: Contact): ContactView {
  return { id: contact.id, name: contact.name };
}
