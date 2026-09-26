import http from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import { savedCards } from "../src/billing.js";

test("lists a customer's saved cards", async () => {
  const server = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end('{"data":[{"id":"card_1"}]}');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.STRIPE_BASE = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await savedCards("cus_123")).length, 1);
  } finally {
    server.close();
  }
});
