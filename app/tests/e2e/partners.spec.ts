import { expect, type Page, test } from "@playwright/test";

import {
  addMovement,
  capital,
  openSessionAs,
  PARTNER_A,
  PARTNER_B,
} from "./support/partner";

test.describe.configure({ mode: "serial" });

test.describe("dos socios comparten un capital", () => {
  let partnerA: Page;
  let partnerB: Page;

  test.beforeAll(async ({ browser }) => {
    partnerA = await openSessionAs(browser, PARTNER_A);
    partnerB = await openSessionAs(browser, PARTNER_B);
  });

  test("A crea el grupo y B entra con el enlace de invitación", async () => {
    await partnerA.getByLabel("Nombre del grupo").fill("Capital E2E");
    await partnerA.getByRole("button", { name: "Crear grupo" }).click();

    const inviteLink = partnerA.getByText(/\/join\/[A-Z0-9]+/);
    const link = await inviteLink.textContent();
    const code = link?.match(/\/join\/([A-Z0-9]+)/)?.[1];

    expect(code).toBeTruthy();

    await partnerB.goto(`/join/${code}`);

    await expect(partnerB).toHaveURL("/");
    await expect(capital(partnerB, "cash")).toHaveText("S/ 0.00");

    await partnerA.reload();

    await expect(partnerA.getByText("Falta tu socio")).toHaveCount(0);
  });

  test("un aporte y un gasto mueven el efectivo", async () => {
    await addMovement(partnerA, {
      type: "Aporte",
      amount: "1000",
    });

    await expect(capital(partnerA, "cash")).toHaveText("S/ 1,000.00");

    await addMovement(partnerA, {
      type: "Gasto",
      amount: "50",
      concept: "Gasto E2E",
    });

    await expect(capital(partnerA, "cash")).toHaveText("S/ 950.00");
  });

  test("un préstamo pasa el capital de efectivo a prestado", async () => {
    await partnerA.goto("/prestamos/nuevo");

    await partnerA
      .getByRole("button", { name: "Elegir o crear prestatario" })
      .click();
    await partnerA
      .getByPlaceholder("Buscar o escribir un nombre nuevo")
      .fill("Prestatario E2E");
    await partnerA
      .getByRole("button", { name: 'Crear "Prestatario E2E"' })
      .click();

    await partnerA.locator("#capital").fill("300");
    await partnerA.locator("#rate").fill("10");
    await partnerA.locator("#count").fill("2");

    await partnerA.getByRole("button", { name: "Confirmar préstamo" }).click();

    await expect(partnerA).toHaveURL(/\/prestamos\/[0-9a-f-]+$/);

    await partnerA.goto("/");

    await expect(capital(partnerA, "cash")).toHaveText("S/ 650.00");
    await expect(capital(partnerA, "lent")).toHaveText("S/ 300.00");
    await expect(capital(partnerA, "total")).toHaveText("S/ 950.00");
  });

  test("cobrar una cuota devuelve capital más interés al efectivo", async () => {
    await partnerA.goto("/prestamos");
    await partnerA.getByText("Prestatario E2E").first().click();

    await partnerA.getByRole("button", { name: "Cobrar" }).first().click();
    await partnerA.getByRole("button", { name: "Confirmar cobro" }).click();

    await expect(partnerA.getByText("Cobro registrado")).toBeVisible();

    await partnerA.goto("/");

    await expect(capital(partnerA, "cash")).toHaveText("S/ 815.00");
    await expect(capital(partnerA, "lent")).toHaveText("S/ 150.00");
    await expect(capital(partnerA, "total")).toHaveText("S/ 965.00");
  });

  test("anular un gasto necesita la aprobación del otro socio", async () => {
    await partnerA.goto("/actividad");

    await partnerA
      .getByText("Gasto E2E")
      .filter({ visible: true })
      .first()
      .click();

    await partnerA.getByRole("button", { name: "Anular" }).click();

    await expect(
      partnerA.getByText("Anulación enviada — falta el OK de tu socio"),
    ).toBeVisible();

    await expect(
      partnerA.getByText("OK pendiente").filter({ visible: true }),
    ).toBeVisible();

    await partnerA.goto("/");

    await expect(capital(partnerA, "cash")).toHaveText("S/ 815.00");

    await partnerB.goto("/");
    await partnerB.getByRole("button", { name: "Aprobar" }).click();

    await expect(capital(partnerB, "cash")).toHaveText("S/ 865.00");

    await partnerA.reload();

    await expect(capital(partnerA, "cash")).toHaveText("S/ 865.00");
  });
});
