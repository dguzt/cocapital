import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  localeFromAcceptLanguage,
  toLocale,
} from "@/i18n/locale";
import { withLocale } from "@/i18n/with-locale";

function request(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(url, "http://localhost"), { headers });
}

function resolvedLocale(response: Response) {
  return response.headers.get(`x-middleware-request-${LOCALE_HEADER}`);
}

describe("toLocale", () => {
  it("accepts the languages we speak", () => {
    expect(toLocale("es")).toBe("es");
    expect(toLocale("en")).toBe("en");
  });

  it("rejects anything else", () => {
    expect(toLocale("fr")).toBeNull();
    expect(toLocale(undefined)).toBeNull();
  });
});

describe("localeFromAcceptLanguage", () => {
  it("takes the first browser language we speak", () => {
    expect(localeFromAcceptLanguage("fr-FR,en-US;q=0.8,es;q=0.5")).toBe("en");
    expect(localeFromAcceptLanguage("es-PE,es;q=0.9")).toBe("es");
  });

  it("falls back to Spanish", () => {
    expect(localeFromAcceptLanguage("fr-FR")).toBe("es");
    expect(localeFromAcceptLanguage(null)).toBe("es");
  });
});

describe("withLocale", () => {
  it("lets ?l= win over the cookie and the browser, and remembers it", () => {
    const response = withLocale(
      request("/?l=en", {
        cookie: `${LOCALE_COOKIE}=es`,
        "accept-language": "es-PE",
      }),
    );

    expect(resolvedLocale(response)).toBe("en");
    expect(response.cookies.get(LOCALE_COOKIE)?.value).toBe("en");
  });

  it("uses the remembered choice over the browser", () => {
    const response = withLocale(
      request("/", {
        cookie: `${LOCALE_COOKIE}=en`,
        "accept-language": "es-PE",
      }),
    );

    expect(resolvedLocale(response)).toBe("en");
    expect(response.cookies.get(LOCALE_COOKIE)).toBeUndefined();
  });

  it("follows the browser when nothing was chosen", () => {
    const response = withLocale(
      request("/", { "accept-language": "en-US,en;q=0.9" }),
    );

    expect(resolvedLocale(response)).toBe("en");
  });

  it("opens in Spanish with just the domain", () => {
    expect(resolvedLocale(withLocale(request("/")))).toBe("es");
  });

  it("ignores an unknown ?l=", () => {
    const response = withLocale(
      request("/?l=fr", { "accept-language": "es-PE" }),
    );

    expect(resolvedLocale(response)).toBe("es");
    expect(response.cookies.get(LOCALE_COOKIE)).toBeUndefined();
  });
});

describe("dictionaries", () => {
  it("have the same error codes in both languages", () => {
    for (const section of [
      "onboarding",
      "movementSheet",
      "movementDialog",
      "creditSaleWizard",
      "cashSale",
    ] as const) {
      expect(Object.keys(dictionaries.en[section].errors).sort()).toEqual(
        Object.keys(dictionaries.es[section].errors).sort(),
      );
    }

    expect(Object.keys(dictionaries.en.join.errors).sort()).toEqual(
      Object.keys(dictionaries.es.join.errors).sort(),
    );
  });
});
