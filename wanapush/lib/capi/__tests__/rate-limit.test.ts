// Tests unit pour lib/capi/rate-limit.ts

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { checkAndIncrement, gcExpiredBuckets, __resetRateLimits, __getBuckets } from "../rate-limit";

describe("rate-limit", () => {
  beforeEach(() => __resetRateLimits());

  it("allows under both limits", () => {
    const r = checkAndIncrement("siteA", "1.2.3.4");
    assert.equal(r.allowed, true);
  });

  it("blocks when per-slug limit reached", () => {
    // maxPerSlug=3 pour test rapide
    for (let i = 0; i < 3; i++) {
      const r = checkAndIncrement("siteA", `1.2.3.${i}`, { maxPerSlug: 3, maxPerSlugIp: 100 });
      assert.equal(r.allowed, true);
    }
    const blocked = checkAndIncrement("siteA", "1.2.3.99", { maxPerSlug: 3, maxPerSlugIp: 100 });
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) {
      assert.equal(blocked.reason, "slug");
      assert.ok(blocked.retryAfterSec >= 0);
    }
  });

  it("blocks when per-(slug,ip) limit reached even if slug is below cap", () => {
    for (let i = 0; i < 5; i++) {
      const r = checkAndIncrement("siteA", "1.2.3.4", { maxPerSlug: 1000, maxPerSlugIp: 5 });
      assert.equal(r.allowed, true);
    }
    const blocked = checkAndIncrement("siteA", "1.2.3.4", { maxPerSlug: 1000, maxPerSlugIp: 5 });
    assert.equal(blocked.allowed, false);
    if (!blocked.allowed) assert.equal(blocked.reason, "slug_ip");
  });

  it("isolates limits per slug", () => {
    // siteA atteint la limite
    for (let i = 0; i < 3; i++) {
      checkAndIncrement("siteA", "1.1.1.1", { maxPerSlug: 3, maxPerSlugIp: 100 });
    }
    // siteB doit pouvoir continuer
    const r = checkAndIncrement("siteB", "1.1.1.1", { maxPerSlug: 3, maxPerSlugIp: 100 });
    assert.equal(r.allowed, true);
  });

  it("isolates limits per IP for same slug", () => {
    // IP 1.1.1.1 atteint la limite slug_ip
    for (let i = 0; i < 3; i++) {
      checkAndIncrement("siteA", "1.1.1.1", { maxPerSlug: 100, maxPerSlugIp: 3 });
    }
    // IP 2.2.2.2 doit pouvoir continuer
    const r = checkAndIncrement("siteA", "2.2.2.2", { maxPerSlug: 100, maxPerSlugIp: 3 });
    assert.equal(r.allowed, true);
  });

  it("resets after window expires", async () => {
    // Window de 50ms pour test rapide
    checkAndIncrement("siteA", "1.1.1.1", { maxPerSlug: 1, maxPerSlugIp: 1, windowMs: 50 });
    const immediate = checkAndIncrement("siteA", "1.1.1.1", { maxPerSlug: 1, maxPerSlugIp: 1, windowMs: 50 });
    assert.equal(immediate.allowed, false);
    await new Promise((r) => setTimeout(r, 60));
    const after = checkAndIncrement("siteA", "1.1.1.1", { maxPerSlug: 1, maxPerSlugIp: 1, windowMs: 50 });
    assert.equal(after.allowed, true);
  });

  it("gcExpiredBuckets removes expired entries", async () => {
    checkAndIncrement("siteA", "1.1.1.1", { windowMs: 30 });
    assert.ok(__getBuckets().size >= 2); // slug + slug:ip
    await new Promise((r) => setTimeout(r, 50));
    const removed = gcExpiredBuckets();
    assert.ok(removed >= 2);
    assert.equal(__getBuckets().size, 0);
  });
});
