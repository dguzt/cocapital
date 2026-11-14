import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

export const PARTNER_A = "socio.a+clerk_test@example.com";
export const PARTNER_B = "socio.b+clerk_test@example.com";

/** Abre un navegador aislado con la sesión de Clerk del socio y lo deja en el panel. */
export async function openSessionAs(
  browser: Browser,
  email: string,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();

  await setupClerkTestingToken({ page });
  await page.goto("/");

  await clerk.signIn({ page, emailAddress: email });

  await page.goto("/");

  return page;
}

/** Abre una página del grupo en el que el socio está trabajando, p. ej. `/prestamos`. */
export async function openInGroup(page: Page, path = "") {
  const current = page.url().match(/\/g\/[0-9a-f-]+/)?.[0];

  if (current) {
    await page.goto(`${current}${path}`);

    return;
  }

  await page.goto("/");

  await expect(page).toHaveURL(IN_GROUP);

  await openInGroup(page, path);
}

/** Cualquier página dentro de un grupo. */
export const IN_GROUP = /\/g\/[0-9a-f-]+/;

/** El panel de un grupo. */
export const GROUP_PANEL = /\/g\/[0-9a-f-]+$/;

/** Cifra del panel por su test id: `cash`, `lent`, `inventory`, `receivable` o `total`. */
export function capital(
  page: Page,
  bucket: "cash" | "lent" | "inventory" | "receivable" | "total",
): Locator {
  return page.getByTestId(`capital-${bucket}`);
}

/** Registra un movimiento manual desde el botón "Agregar movimiento" del panel. */
export async function addMovement(
  page: Page,
  movement: { type: string; amount: string; concept?: string },
) {
  const sheet = page.getByRole("dialog", { name: "Nuevo movimiento" });

  await page.getByRole("button", { name: "Agregar movimiento" }).click();

  await expect(sheet).toBeVisible();

  await sheet
    .getByRole("button", { name: new RegExp(`^${movement.type}`) })
    .click();

  await sheet.getByLabel("Monto (S/)").fill(movement.amount);

  if (movement.concept) {
    await sheet.getByLabel("Concepto · opcional").fill(movement.concept);
  }

  await sheet.getByRole("button", { name: "Guardar movimiento" }).click();

  await expect(sheet).toBeHidden();

  await dismissToasts(page);
}

/** Aleja el puntero (Sonner pausa un toast con el puntero encima) y espera a que los toasts se vayan. */
export async function dismissToasts(page: Page) {
  await page.mouse.move(0, 0);

  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
}
