import { describe, expect, it } from "vitest";

import { Contact } from "@/backend/modules/contacts/domain/contact";

describe("Contact.create", () => {
  it("trims the name and the phone", () => {
    const result = Contact.create({
      groupId: "g-1",
      name: "  Karina  ",
      phone: " 999 111 222 ",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.name).toBe("Karina");
    expect(result.value.phone).toBe("999 111 222");
    expect(result.value.groupId).toBe("g-1");
  });

  it("keeps a blank phone as no phone", () => {
    const result = Contact.create({
      groupId: "g-1",
      name: "Karina",
      phone: "  ",
    });

    expect(result.ok && result.value.phone).toBeNull();
  });

  it("refuses a blank name", () => {
    const result = Contact.create({ groupId: "g-1", name: "   " });

    expect(!result.ok && result.error.kind).toBe("ContactNameRequired");
  });
});
