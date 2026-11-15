import { type NextRequest, NextResponse } from "next/server";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_PARAM,
  localeFromAcceptLanguage,
  toLocale,
} from "@/i18n/locale";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Resolves the visitor's language and hands it to the rest of the request.
 * Order: the ?l= param, the remembered choice, the browser, Spanish.
 * @param request - the incoming request
 * @returns a response that carries the locale header, and remembers ?l= in a cookie
 */
export function withLocale(request: NextRequest): NextResponse {
  const fromParam = toLocale(request.nextUrl.searchParams.get(LOCALE_PARAM));

  const locale =
    fromParam ??
    toLocale(request.cookies.get(LOCALE_COOKIE)?.value) ??
    localeFromAcceptLanguage(request.headers.get("accept-language"));

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({ request: { headers } });

  if (fromParam) {
    response.cookies.set(LOCALE_COOKIE, fromParam, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
  }

  return response;
}
