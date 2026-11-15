import { expect, type Page, test } from "@playwright/test";

import { openInGroup, openSessionAs, PARTNER_A } from "./support/partner";

test.describe.configure({ mode: "serial" });

const SHOTS = process.env.QA_SHOTS;

async function shot(page: Page, name: string) {
  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  }
}

/**
 * Sigue después de grupos.spec.ts. El navegador de las pruebas está en
 * español: solo ?l=en o el selector cambian el idioma.
 */
test.describe("español e inglés", () => {
  test("con solo el dominio el landing sale en español", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "El capital de tu negocio",
    );
  });

  test("?l=en abre el landing en inglés y el selector vuelve al español", async ({
    page,
  }) => {
    await page.goto("/?l=en");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Your business capital",
    );
    await shot(page, "en-01-landing");

    await page.getByRole("button", { name: "Español" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "El capital de tu negocio",
    );
  });

  test("la app recuerda el inglés en todas sus pantallas", async ({
    browser,
  }) => {
    const partnerA = await openSessionAs(browser, PARTNER_A);

    await partnerA.goto("/?l=en");

    await expect(
      partnerA.getByText("Which group are you working on?"),
    ).toBeVisible();
    await shot(partnerA, "en-02-groups");

    await partnerA.getByRole("link", { name: /Capital E2E/ }).click();

    await expect(
      partnerA.getByRole("button", { name: "Add movement" }).first(),
    ).toBeVisible();
    await expect(partnerA.getByText("Available cash").first()).toBeVisible();
    await shot(partnerA, "en-03-dashboard");

    await openInGroup(partnerA, "/prestamos");
    await expect(
      partnerA.getByRole("link", { name: "New loan" }).first(),
    ).toBeVisible();
    await shot(partnerA, "en-04-loans");

    await openInGroup(partnerA, "/ventas");
    await expect(partnerA.getByText("Installment sales").first()).toBeVisible();
    await shot(partnerA, "en-05-sales");

    await openInGroup(partnerA, "/actividad");
    await expect(
      partnerA.getByRole("banner").getByText("Activity", { exact: true }),
    ).toBeVisible();
    await shot(partnerA, "en-06-activity");

    await partnerA.getByRole("button", { name: "Español" }).first().click();

    await expect(
      partnerA.getByRole("banner").getByText("Actividad", { exact: true }),
    ).toBeVisible();
  });
});
