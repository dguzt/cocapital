import { expect, type Page, test } from "@playwright/test";

import {
  addMovement,
  capital,
  openSessionAs,
  PARTNER_A,
  PARTNER_B,
} from "./support/partner";

test.describe.configure({ mode: "serial" });

/**
 * Sigue la historia de partners.spec.ts: el mismo grupo, que termina con
 * S/ 865 en efectivo y S/ 150 prestados.
 */
test.describe("vender al contado y en cuotas", () => {
  let partnerA: Page;
  let partnerB: Page;

  test.beforeAll(async ({ browser }) => {
    partnerA = await openSessionAs(browser, PARTNER_A);
    partnerB = await openSessionAs(browser, PARTNER_B);
  });

  test("Vender abre su página y la venta al contado mueve inventario a efectivo", async () => {
    await addMovement(partnerA, { type: "Compra", amount: "120" });

    await expect(capital(partnerA, "inventory")).toHaveText("S/ 120.00");

    await partnerA.getByRole("button", { name: "Agregar movimiento" }).click();
    await partnerA.getByRole("button", { name: /^Venta/ }).click();

    await expect(partnerA).toHaveURL("/ventas/nueva");

    await partnerA.locator("#cash-price").fill("100");
    await partnerA.locator("#cash-cost").fill("60");
    await partnerA.getByRole("button", { name: "Registrar venta" }).click();

    await expect(partnerA).toHaveURL("/");
    await expect(capital(partnerA, "cash")).toHaveText("S/ 845.00");
    await expect(capital(partnerA, "inventory")).toHaveText("S/ 60.00");
    await expect(capital(partnerA, "total")).toHaveText("S/ 1,055.00");
  });

  test("el cronograma de la venta en cuotas tiene que cuadrar para confirmar", async () => {
    await partnerA.goto("/ventas/nueva");
    await partnerA.getByRole("button", { name: "En cuotas" }).click();

    await partnerA
      .getByRole("button", { name: "Elegir o crear comprador" })
      .click();
    await partnerA
      .getByPlaceholder("Buscar o escribir un nombre nuevo")
      .fill("Comprador E2E");
    await partnerA
      .getByRole("button", { name: 'Crear "Comprador E2E"' })
      .click();

    await partnerA.locator("#item").fill("Licuadora");
    await partnerA.locator("#price").fill("100");
    await partnerA.locator("#cost").fill("60");
    await partnerA.locator("#down").fill("20");
    await partnerA.locator("#count").fill("3");

    const cuota = (n: number) =>
      partnerA
        .getByRole("listitem")
        .filter({ hasText: `Cuota ${n}` })
        .getByRole("textbox");

    await expect(cuota(1)).toHaveValue("26.66");
    await expect(cuota(2)).toHaveValue("26.66");
    await expect(cuota(3)).toHaveValue("26.68");
    await expect(partnerA.getByText("coincide ✓")).toBeVisible();

    const confirm = partnerA.getByRole("button", { name: "Confirmar venta" });

    await cuota(2).fill("30");

    await expect(partnerA.getByText("difiere +S/ 3.34")).toBeVisible();
    await expect(confirm).toBeDisabled();

    await cuota(3).fill("23.34");

    await expect(partnerA.getByText("coincide ✓")).toBeVisible();
    await expect(confirm).toBeEnabled();

    await confirm.click();

    await expect(partnerA).toHaveURL(/\/ventas\/[0-9a-f-]+$/);

    await partnerA.goto("/");

    await expect(capital(partnerA, "cash")).toHaveText("S/ 865.00");
    await expect(capital(partnerA, "inventory")).toHaveText("S/ 0.00");
    await expect(capital(partnerA, "receivable")).toHaveText("S/ 48.00");
    await expect(capital(partnerA, "total")).toHaveText("S/ 1,063.00");
  });

  test("cobrar una cuota recupera costo y suma el margen", async () => {
    await partnerA.goto("/ventas");
    await partnerA.getByText("Comprador E2E").first().click();

    await partnerA.getByRole("button", { name: "Cobrar" }).first().click();
    await partnerA.getByRole("button", { name: "Confirmar cobro" }).click();

    await expect(partnerA.getByText("Cobro registrado")).toBeVisible();

    await partnerA.goto("/");

    await expect(capital(partnerA, "cash")).toHaveText("S/ 891.66");
    await expect(capital(partnerA, "receivable")).toHaveText("S/ 32.00");
    await expect(capital(partnerA, "total")).toHaveText("S/ 1,073.66");
  });

  test("cambiar el plan no mueve el capital y queda en la actividad", async () => {
    await partnerA.goto("/ventas");
    await partnerA.getByText("Comprador E2E").first().click();

    await partnerA.getByRole("button", { name: "Cambiar plan" }).click();

    const dialog = partnerA.getByRole("dialog", { name: "Cambiar plan" });

    await dialog.locator("#replan-count").fill("4");

    await expect(dialog.getByText("coincide ✓")).toBeVisible();

    await dialog.getByRole("button", { name: "Guardar plan" }).click();

    await expect(
      partnerA.getByText("Plan cambiado · 2 → 4 cuotas"),
    ).toBeVisible();

    await partnerA.goto("/actividad");

    await expect(
      partnerA
        .getByText("Plan cambiado · Comprador E2E · Licuadora")
        .filter({ visible: true }),
    ).toBeVisible();

    await partnerA.goto("/");

    await expect(capital(partnerA, "total")).toHaveText("S/ 1,073.66");
  });

  test("anular la venta necesita el OK y devuelve el capital a antes de la venta", async () => {
    await partnerA.goto("/ventas");
    await partnerA.getByText("Comprador E2E").first().click();

    await partnerA.getByRole("button", { name: "Anular venta" }).click();

    await expect(
      partnerA.getByText("también se anulan 2 cobros"),
    ).toBeVisible();

    await partnerA.getByRole("button", { name: "Enviar anulación" }).click();

    await expect(
      partnerA.getByText("Anulación pendiente — falta el OK de tu socio"),
    ).toBeVisible();

    await partnerB.goto("/");
    await partnerB.getByRole("button", { name: "Aprobar" }).click();

    await expect(capital(partnerB, "cash")).toHaveText("S/ 845.00");
    await expect(capital(partnerB, "inventory")).toHaveText("S/ 60.00");
    await expect(capital(partnerB, "receivable")).toHaveText("S/ 0.00");
    await expect(capital(partnerB, "total")).toHaveText("S/ 1,055.00");
  });
});
