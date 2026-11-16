/** Security audit D: lookups by movement id and tenant-wide scans that no index serves. */

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Contacts, Groups, Movements, Users } from "@/backend/infra/db/schema";
import { truncateAll } from "@/test/truncate";

beforeEach(truncateAll, 120_000);

type PlanNode = {
  "Node Type": string;
  "Relation Name"?: string;
  "Index Name"?: string;
  Plans?: PlanNode[];
};

function nodesOf(node: PlanNode): PlanNode[] {
  return [node, ...(node.Plans ?? []).flatMap(nodesOf)];
}

async function plan(query: ReturnType<typeof sql>) {
  const result = await db.execute(sql`EXPLAIN (FORMAT JSON) ${query}`);
  const rows = result.rows as { "QUERY PLAN": { Plan: PlanNode }[] }[];

  return nodesOf(rows[0]["QUERY PLAN"][0].Plan);
}

const seqScans = (nodes: PlanNode[]) =>
  nodes
    .filter((n) => n["Node Type"] === "Seq Scan")
    .map((n) => n["Relation Name"]);

async function seedTenants() {
  const [user] = await db
    .insert(Users)
    .values({ clerkId: "c_idx", name: "U", email: "u@t.pe" })
    .returning();

  const [mine, others] = await db
    .insert(Groups)
    .values([
      { name: "mine", inviteCode: "AAAAAA" },
      { name: "others", inviteCode: "BBBBBB" },
    ])
    .returning();

  const [movement] = await db
    .insert(Movements)
    .values({
      groupId: others.id,
      userId: user.id,
      type: "lend",
      amount: 100,
      date: "2026-01-01",
    })
    .returning();

  const [contact] = await db
    .insert(Contacts)
    .values({ groupId: others.id, name: "C" })
    .returning();

  await db.execute(sql`
    INSERT INTO loans (group_id, user_id, borrower_id, capital, rate_bps, installment_count, frequency, start_date, lend_movement_id)
    SELECT ${others.id}, ${user.id}, ${contact.id}, 10000, 1000, 100, 'monthly', '2026-01-01', ${movement.id}
    FROM generate_series(1, 600)`);

  await db.execute(sql`
    INSERT INTO installments (loan_id, number, due_date, amount, principal, interest)
    SELECT l.id, n, '2026-01-01', 100, 90, 10
    FROM loans l, generate_series(1, 100) n`);

  await db.execute(sql`
    INSERT INTO credit_sales (group_id, user_id, buyer_id, item, price, frequency, start_date, sale_movement_id)
    SELECT ${others.id}, ${user.id}, ${contact.id}, 'x', 10000, 'monthly', '2026-01-01', ${movement.id}
    FROM generate_series(1, 600)`);

  await db.execute(sql`
    INSERT INTO credit_sale_installments (sale_id, number, due_date, amount)
    SELECT s.id, n, '2026-01-01', 100 FROM credit_sales s, generate_series(1, 50) n`);

  await db.execute(sql`ANALYZE loans`);
  await db.execute(sql`ANALYZE installments`);
  await db.execute(sql`ANALYZE credit_sales`);
  await db.execute(sql`ANALYZE credit_sale_installments`);

  return { mine, others, movement, user };
}

describe("D-idx: lookups by movement id scan every tenant's rows", () => {
  it("VoidLoan: loans by lend_movement_id", async () => {
    await seedTenants();

    const nodes = await plan(
      sql`SELECT id FROM loans WHERE lend_movement_id = ${crypto.randomUUID()}`,
    );

    expect(seqScans(nodes)).not.toContain("loans");
  }, 120_000);

  it("VoidCreditSale: credit_sales by sale_movement_id", async () => {
    await seedTenants();

    const nodes = await plan(
      sql`SELECT id FROM credit_sales WHERE sale_movement_id = ${crypto.randomUUID()}`,
    );

    expect(seqScans(nodes)).not.toContain("credit_sales");
  }, 120_000);

  it("UndoCollection: installments reopened by repay_movement_id", async () => {
    const { movement } = await seedTenants();

    const nodes = await plan(
      sql`UPDATE installments SET status = 'pending', collected_at = NULL, repay_movement_id = NULL WHERE repay_movement_id = ${movement.id}`,
    );

    expect(seqScans(nodes)).not.toContain("installments");
  }, 120_000);

  it("UndoSaleCollection: credit_sale_installments reopened by collect_movement_id", async () => {
    const { movement } = await seedTenants();

    const nodes = await plan(
      sql`UPDATE credit_sale_installments SET status = 'pending' WHERE collect_movement_id = ${movement.id}`,
    );

    expect(seqScans(nodes)).not.toContain("credit_sale_installments");
  }, 120_000);
});

describe("D-idx: group-scoped reads (control, expected to pass)", () => {
  it("listTermsByGroup for a small group does not scan installments", async () => {
    const { mine } = await seedTenants();

    const nodes = await plan(sql`
      SELECT i.principal FROM installments i
      INNER JOIN loans l ON l.id = i.loan_id
      WHERE l.group_id = ${mine.id} AND l.status <> 'voided'`);

    expect(seqScans(nodes)).not.toContain("installments");
  }, 120_000);
});
