import { describe, expect, it } from "vitest";
import type { MovementType } from "../../movements/domain/movement";
import {
  type CapitalInstallment,
  type CapitalMovement,
  deriveCapital,
} from "./derive";

const mv = (
  type: MovementType,
  amount: number,
  extra: Partial<CapitalMovement> = {},
): CapitalMovement => ({
  type,
  amount,
  costo: null,
  status: "active",
  ...extra,
});

const inst = (
  principal: number,
  interest: number,
  status: CapitalInstallment["status"],
): CapitalInstallment => ({ principal, interest, status });

describe("deriveCapital — movement effects", () => {
  it("empty ledger = all zeros", () => {
    expect(deriveCapital([], [])).toEqual({
      total: 0,
      efectivo: 0,
      inventario: 0,
      prestado: 0,
      gananciaCobrada: 0,
      gananciaEsperada: 0,
    });
  });
  it("contribute adds cash; expense removes it", () => {
    const s = deriveCapital([mv("contribute", 50000), mv("expense", 1000)], []);
    expect(s.efectivo).toBe(49000);
    expect(s.total).toBe(49000);
  });
  it("buy moves cash → inventario (total unchanged)", () => {
    const s = deriveCapital(
      [mv("contribute", 50000), mv("buy_inventory", 20000)],
      [],
    );
    expect(s.efectivo).toBe(30000);
    expect(s.inventario).toBe(20000);
    expect(s.total).toBe(50000);
  });
  it("sell with costo realizes the margin into total", () => {
    // bought at 100, sold at 120 → total grows by 20
    const s = deriveCapital(
      [
        mv("contribute", 10000),
        mv("buy_inventory", 10000),
        mv("sell_inventory", 12000, { costo: 10000 }),
      ],
      [],
    );
    expect(s.efectivo).toBe(12000);
    expect(s.inventario).toBe(0);
    expect(s.total).toBe(12000);
  });
  it("sell without costo = zero margin (cost defaults to amount)", () => {
    const s = deriveCapital(
      [
        mv("contribute", 10000),
        mv("buy_inventory", 10000),
        mv("sell_inventory", 12000),
      ],
      [],
    );
    expect(s.efectivo).toBe(12000);
    expect(s.inventario).toBe(-2000); // visible drift, never silent
    expect(s.total).toBe(10000);
  });
  it("voided movements are excluded everywhere", () => {
    const s = deriveCapital(
      [mv("contribute", 50000), mv("expense", 99999, { status: "voided" })],
      [],
    );
    expect(s.total).toBe(50000);
  });
});

describe("deriveCapital — lending (realized-only, D3 #5)", () => {
  // Karina's seed loan: S/300 @ 10% × 4 → cuotas of 82.50 (75 + 7.50)
  const lentLedger = [mv("contribute", 50000), mv("lend", 30000)];
  const freshLoan = [
    inst(7500, 750, "pendiente"),
    inst(7500, 750, "pendiente"),
    inst(7500, 750, "pendiente"),
    inst(7500, 750, "pendiente"),
  ];

  it("creating a loan moves principal cash → Prestado; total unchanged", () => {
    const s = deriveCapital(lentLedger, freshLoan);
    expect(s.efectivo).toBe(20000);
    expect(s.prestado).toBe(30000);
    expect(s.total).toBe(50000); // no expected interest in total
    expect(s.gananciaEsperada).toBe(3000);
    expect(s.gananciaCobrada).toBe(0);
  });

  it("collecting a cuota: cash + cuota, Prestado − principal, ganancia realized", () => {
    const afterCobro = [...lentLedger, mv("repay", 8250)];
    const oneCollected = [
      inst(7500, 750, "cobrada"),
      inst(7500, 750, "pendiente"),
      inst(7500, 750, "pendiente"),
      inst(7500, 750, "pendiente"),
    ];
    const s = deriveCapital(afterCobro, oneCollected);
    expect(s.efectivo).toBe(28250);
    expect(s.prestado).toBe(22500);
    expect(s.gananciaCobrada).toBe(750);
    expect(s.gananciaEsperada).toBe(2250);
    // Total grew by exactly the collected interest: 50000 + 750.
    expect(s.total).toBe(50750);
  });

  it("fully collected loan: total = original + all interest", () => {
    const ledger = [
      ...lentLedger,
      mv("repay", 8250),
      mv("repay", 8250),
      mv("repay", 8250),
      mv("repay", 8250),
    ];
    const done = freshLoan.map((i) => ({ ...i, status: "cobrada" as const }));
    const s = deriveCapital(ledger, done);
    expect(s.prestado).toBe(0);
    expect(s.gananciaCobrada).toBe(3000);
    expect(s.total).toBe(53000);
  });

  it("is deterministic over the same ledger", () => {
    const a = deriveCapital(lentLedger, freshLoan);
    const b = deriveCapital([...lentLedger], [...freshLoan]);
    expect(a).toEqual(b);
  });
});
