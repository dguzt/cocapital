import { expect, type Page, test } from "@playwright/test";

import {
  addMovement,
  capital,
  dismissToasts,
  GROUP_PANEL,
  openInGroup,
  openSessionAs,
  PARTNER_A,
  PARTNER_B,
} from "./support/partner";

test.describe.configure({ mode: "serial" });

const SHOTS = process.env.QA_SHOTS;

async function shot(page: Page, name: string) {
  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
  }
}

/**
 * Sigue después de ventas.spec.ts: A y B comparten "Capital E2E" con
 * S/ 845 en efectivo. A abre un grupo propio y luego invita a B.
 */
test.describe("usarlo solo y en varios grupos", () => {
  let partnerA: Page;
  let partnerB: Page;
  let sharedPanel: string;
  let soloPanel: string;

  test.beforeAll(async ({ browser }) => {
    partnerA = await openSessionAs(browser, PARTNER_A);
    partnerB = await openSessionAs(browser, PARTNER_B);
  });

  test("con un solo grupo, «/» entra directo a su panel", async () => {
    await expect(partnerA).toHaveURL(GROUP_PANEL);

    sharedPanel = partnerA.url();

    await expect(capital(partnerA, "cash")).toHaveText("S/ 845.00");
    await shot(partnerA, "01-panel-grupo-compartido");
  });

  test("A crea un segundo grupo desde el selector y queda solo en él", async () => {
    await partnerA.getByRole("button", { name: "Cambiar de grupo" }).click();
    await shot(partnerA, "02-selector-abierto");

    await partnerA.getByRole("menuitem", { name: "Crear otro grupo" }).click();

    await expect(partnerA).toHaveURL("/grupos/nuevo");
    await shot(partnerA, "03-nuevo-grupo");

    await partnerA.getByLabel("Nombre del grupo").fill("Mi tienda");

    await Promise.all([
      partnerA.waitForURL(GROUP_PANEL),
      partnerA.getByRole("button", { name: "Crear grupo" }).click(),
    ]);

    soloPanel = partnerA.url();

    expect(soloPanel).not.toBe(sharedPanel);

    await expect(partnerA.getByText("Estás solo en este grupo")).toBeVisible();
    await expect(capital(partnerA, "cash")).toHaveText("S/ 0.00");
    await shot(partnerA, "04-panel-grupo-solo");
  });

  test("solo, anular un gasto se aplica al instante y queda en la actividad", async () => {
    await addMovement(partnerA, { type: "Aporte", amount: "200" });
    await addMovement(partnerA, {
      type: "Gasto",
      amount: "30",
      concept: "Gasto solo",
    });

    await expect(capital(partnerA, "cash")).toHaveText("S/ 170.00");

    await openInGroup(partnerA, "/actividad");

    await partnerA
      .getByText("Gasto solo")
      .filter({ visible: true })
      .first()
      .click();
    await shot(partnerA, "05-dialogo-anular-solo");

    await partnerA.getByRole("button", { name: "Anular" }).click();

    await expect(partnerA.getByText("Movimiento anulado")).toBeVisible();
    await shot(partnerA, "06-toast-anulado-al-instante");

    await expect(
      partnerA.getByText("OK pendiente").filter({ visible: true }),
    ).toHaveCount(0);

    await dismissToasts(partnerA);

    await openInGroup(partnerA);

    await expect(capital(partnerA, "cash")).toHaveText("S/ 200.00");
  });

  test("los movimientos del grupo solo no tocan el grupo compartido", async () => {
    await partnerA.goto(sharedPanel);

    await expect(capital(partnerA, "cash")).toHaveText("S/ 845.00");
  });

  test("con dos grupos, «/» pregunta en cuál trabajar", async () => {
    await partnerA.goto("/");

    await expect(
      partnerA.getByText("¿En qué grupo vas a trabajar?"),
    ).toBeVisible();
    await expect(
      partnerA.getByRole("link", { name: /Capital E2E/ }),
    ).toBeVisible();
    await expect(
      partnerA.getByRole("link", { name: /Mi tienda/ }),
    ).toBeVisible();
    await shot(partnerA, "07-tus-grupos");

    await partnerA.getByRole("link", { name: /Mi tienda/ }).click();

    await expect(partnerA).toHaveURL(soloPanel);
  });

  test("cambiar de grupo desde Préstamos te deja en Préstamos del otro grupo", async () => {
    await openInGroup(partnerA, "/prestamos");

    await partnerA.getByRole("button", { name: "Cambiar de grupo" }).click();
    await partnerA.getByRole("menuitem", { name: /Capital E2E/ }).click();

    await expect(partnerA).toHaveURL(`${sharedPanel}/prestamos`);
    await expect(partnerA.getByText("Prestatario E2E").first()).toBeVisible();
    await shot(partnerA, "08-cambio-a-prestamos-del-otro-grupo");
  });

  test("B no puede abrir el grupo de A sin ser socio", async () => {
    const response = await partnerB.goto(soloPanel);

    expect(response?.status()).toBe(404);
    await expect(partnerB.getByText("Mi tienda")).toHaveCount(0);
    await expect(
      partnerB.getByText("No encontramos esta página"),
    ).toBeVisible();
    await shot(partnerB, "09-grupo-ajeno-404");

    const loans = await partnerB.goto(`${soloPanel}/prestamos`);

    expect(loans?.status()).toBe(404);
  });

  test("B se une al grupo de A aunque ya tenga otro, y vuelve la doble confirmación", async () => {
    await partnerA.goto(soloPanel);

    const link = await partnerA.getByText(/\/join\/[A-Z0-9]+/).textContent();
    const code = link?.match(/\/join\/([A-Z0-9]+)/)?.[1];

    expect(code).toBeTruthy();

    await partnerB.goto(`/join/${code}`);

    await expect(partnerB).toHaveURL(soloPanel);
    await expect(capital(partnerB, "cash")).toHaveText("S/ 200.00");
    await shot(partnerB, "10-b-entra-al-grupo-de-a");

    await partnerA.reload();

    await expect(partnerA.getByText("Estás solo en este grupo")).toHaveCount(0);

    await addMovement(partnerA, {
      type: "Gasto",
      amount: "15",
      concept: "Gasto con socio",
    });

    await openInGroup(partnerA, "/actividad");

    await partnerA
      .getByText("Gasto con socio")
      .filter({ visible: true })
      .first()
      .click();

    await partnerA.getByRole("button", { name: "Anular" }).click();

    await expect(
      partnerA.getByText("Anulación enviada — falta el OK de otro socio"),
    ).toBeVisible();
    await shot(partnerA, "11-con-socio-pide-ok");

    await openInGroup(partnerB);

    await expect(partnerB.getByText(/propone 1 cambio/)).toBeVisible();
    await shot(partnerB, "12-b-ve-quien-propone");

    await partnerB.getByRole("button", { name: "Aprobar" }).click();

    await expect(capital(partnerB, "cash")).toHaveText("S/ 200.00");
  });

  test("B ahora tiene dos grupos y «/» le pregunta en cuál trabajar", async () => {
    await partnerB.goto("/");

    await expect(
      partnerB.getByRole("link", { name: /Capital E2E/ }),
    ).toBeVisible();
    await expect(
      partnerB.getByRole("link", { name: /Mi tienda/ }),
    ).toBeVisible();
  });

  test("en escritorio el selector vive en el sidebar", async () => {
    await partnerA.setViewportSize({ width: 1280, height: 800 });
    await partnerA.goto(soloPanel);

    await partnerA.getByRole("button", { name: "Cambiar de grupo" }).click();

    await expect(
      partnerA.getByRole("menuitem", { name: /Capital E2E/ }),
    ).toBeVisible();
    await shot(partnerA, "13-escritorio-selector");
  });
});
