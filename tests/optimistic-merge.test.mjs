import assert from "node:assert/strict";
import test from "node:test";
import { mergeRows } from "../lib/optimistic-merge.js";

const server = [
  { id: "a", name: "علف", amount: 100 },
  { id: "b", name: "دوا", amount: 50 },
];
const add = (status, extra = {}) => ({
  status,
  serverAt: 0,
  patches: [{ scope: "expenses", type: "add", id: "n", row: { name: "جديد", amount: 30 }, delta: 30 }],
  ...extra,
});

test("pending add shows at the top right away and counts in the total", () => {
  const { rows, delta } = mergeRows("expenses", server, [add("pending")], 1000);
  assert.deepEqual(rows.map((row) => row.id), ["n", "a", "b"]);
  assert.equal(rows[0].pending, true);
  assert.equal(delta, 30);
});

test("failed add rolls back to the server rows", () => {
  const { rows, delta } = mergeRows("expenses", server, [add("error")], 1000);
  assert.deepEqual(rows, server);
  assert.equal(delta, 0);
});

test("finished add stays until the server rows include it, then is not counted twice", () => {
  const before = mergeRows("expenses", server, [add("done", { serverAt: 5000 })], 1000);
  assert.deepEqual(before.rows.map((row) => row.id), ["n", "a", "b"]);
  assert.equal(before.rows[0].pending, false);
  const synced = [{ id: "n", name: "جديد", amount: 30 }, ...server];
  const after = mergeRows("expenses", synced, [add("done", { serverAt: 5000 })], 9000);
  assert.deepEqual(after.rows, synced);
  assert.equal(after.delta, 0);
});

test("finished add that a newer render does not list is not kept as a ghost row", () => {
  const { rows, delta } = mergeRows("expenses", server, [add("done", { serverAt: 5000 })], 6000);
  assert.deepEqual(rows, server);
  assert.equal(delta, 0);
});

test("update applies while pending, rolls back on error, and yields to a newer render", () => {
  const op = (status, serverAt = 0) => ({
    status,
    serverAt,
    patches: [{ scope: "expenses", type: "update", id: "a", changes: { amount: 120 }, delta: 20 }],
  });
  assert.equal(mergeRows("expenses", server, [op("pending")], 1000).rows[0].amount, 120);
  assert.equal(mergeRows("expenses", server, [op("error")], 1000).rows[0].amount, 100);
  assert.equal(mergeRows("expenses", server, [op("done", 9000)], 1000).rows[0].amount, 120);
  const fresh = [{ ...server[0], amount: 120 }, server[1]];
  const after = mergeRows("expenses", fresh, [op("done", 9000)], 9500);
  assert.equal(after.rows[0].amount, 120);
  assert.equal(after.delta, 0);
});

test("remove hides the row, error brings it back, server removal ends the patch", () => {
  const op = (status) => ({ status, serverAt: 5000, patches: [{ scope: "expenses", type: "remove", id: "b", delta: -50 }] });
  assert.deepEqual(mergeRows("expenses", server, [op("pending")], 1000).rows.map((row) => row.id), ["a"]);
  assert.deepEqual(mergeRows("expenses", server, [op("error")], 1000).rows, server);
  const gone = mergeRows("expenses", [server[0]], [op("done")], 9000);
  assert.deepEqual(gone.rows.map((row) => row.id), ["a"]);
  assert.equal(gone.delta, 0);
});

test("two payments sent back to back both reduce the balance", () => {
  const people = [{ id: "c", remaining: 1000 }];
  const pay = (amount, status = "pending") => ({
    status,
    serverAt: 0,
    patches: [{ scope: "customers", type: "update", id: "c", increment: { remaining: -amount }, delta: -amount }],
  });
  const both = mergeRows("customers", people, [pay(300), pay(200.5)], 1000);
  assert.equal(both.rows[0].remaining, 499.5);
  assert.equal(both.delta, -500.5);
  const oneFailed = mergeRows("customers", people, [pay(300), pay(200.5, "error")], 1000);
  assert.equal(oneFailed.rows[0].remaining, 700);
});

test("patches for other scopes are ignored", () => {
  const { rows, delta } = mergeRows("sales", server, [add("pending")], 1000);
  assert.deepEqual(rows, server);
  assert.equal(delta, 0);
});
