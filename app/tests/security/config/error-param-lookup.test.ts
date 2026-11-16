import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/i18n/dictionaries";
import { messageFor } from "@/lib/message-for";

describe("onboarding ?error= lookup", () => {
  const { errors, genericError } = dictionaries.es.onboarding;

  it.each(["__proto__", "constructor", "toString", "hasOwnProperty"])(
    "?error=%s falls back to the generic message",
    (error) => {
      expect(messageFor(errors, error, genericError)).toBe(genericError);
    },
  );

  it("returns the registered message for a known key", () => {
    const [key, message] = Object.entries(errors)[0];

    expect(messageFor(errors, key, genericError)).toBe(message);
  });

  it("?error=__proto__ renders instead of throwing", () => {
    const shown = messageFor(errors, "__proto__", genericError);

    expect(() => renderToString(createElement("p", null, shown))).not.toThrow();
  });
});
