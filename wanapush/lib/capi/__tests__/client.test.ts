// Tests unit pour lib/capi/client.ts
// On mocke fetch pour valider le comportement sans hit réel à Meta.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendEvents, __testing } from "../client";
import type { ServerEvent } from "../types";

const SAMPLE_EVENT: ServerEvent = {
  event_name: "PageView",
  event_time: 1700000000,
  event_id: "test-event-id-123",
  event_source_url: "https://wanapush.com/sites/test/",
  action_source: "website",
  user_data: {
    client_ip_address: "203.0.113.42",
    client_user_agent: "Mozilla/5.0",
  },
};

/** Crée un mock fetch qui retourne une réponse JSON donnée. */
function mockFetch(
  responses: Array<{ status: number; body: unknown } | "network-error">,
): typeof fetch {
  let call = 0;
  return (async (..._args: unknown[]) => {
    const r = responses[call++] ?? responses[responses.length - 1];
    if (r === "network-error") {
      throw new Error("ECONNRESET");
    }
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

describe("buildEventsUrl", () => {
  it("constructs Meta Graph URL with pixelId and access_token", () => {
    const url = __testing.buildEventsUrl("1234567890", "EAAtoken123");
    assert.match(url, /^https:\/\/graph\.facebook\.com\/v24\.0\/1234567890\/events\?access_token=/);
    assert.ok(url.includes("EAAtoken123"));
  });
});

describe("parseMetaError", () => {
  const { parseMetaError } = __testing;

  it("categorizes auth errors (code 190)", () => {
    const err = parseMetaError(400, {
      error: { message: "Invalid token", type: "OAuthException", code: 190, fbtrace_id: "Abc" },
    });
    assert.equal(err.category, "auth");
    assert.equal(err.retryable, false);
    assert.equal(err.metaCode, 190);
  });

  it("categorizes validation errors (code 100)", () => {
    const err = parseMetaError(400, {
      error: { message: "Invalid parameter", type: "GraphMethodException", code: 100 },
    });
    assert.equal(err.category, "validation");
    assert.equal(err.retryable, false);
  });

  it("categorizes rate limit (code 4) as retryable", () => {
    const err = parseMetaError(400, {
      error: { message: "Rate limit hit", code: 4 },
    });
    assert.equal(err.category, "rate_limit");
    assert.equal(err.retryable, true);
  });

  it("categorizes 5xx server errors as transient retryable", () => {
    const err = parseMetaError(503, {});
    assert.equal(err.category, "transient");
    assert.equal(err.retryable, true);
  });

  it("categorizes unknown error structure as unknown", () => {
    const err = parseMetaError(400, { weird: "shape" });
    assert.equal(err.category, "unknown");
    assert.equal(err.retryable, false);
  });
});

describe("backoffDelay", () => {
  it("returns 0 or positive integers", () => {
    for (let i = 1; i <= 5; i++) {
      const d = __testing.backoffDelay(i);
      assert.ok(d >= 0, `delay should be >= 0 (attempt ${i})`);
      assert.ok(Number.isInteger(d), `delay should be integer (attempt ${i})`);
    }
  });

  it("grows exponentially within bounds", () => {
    // Test plusieurs runs pour s'affranchir du jitter
    const samples = Array.from({ length: 50 }, () => __testing.backoffDelay(3));
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Attempt 3 = 4000ms ±25% jitter → moyenne attendue ~4000ms
    assert.ok(avg > 3000 && avg < 5000, `avg delay attempt 3 = ${avg}, attendu ~4000ms`);
  });
});

describe("sendEvents — success cases", () => {
  it("returns ok:true on Meta 200 response", async () => {
    const fetchMock = mockFetch([
      { status: 200, body: { events_received: 1, messages: [], fbtrace_id: "AbCdEf123" } },
    ]);
    const result = await sendEvents("1234567890", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.eventsReceived, 1);
      assert.equal(result.fbtraceId, "AbCdEf123");
      assert.equal(result.attempts, 1);
    }
  });

  it("sends test_event_code when provided", async () => {
    let capturedBody: unknown;
    const fetchMock = (async (input: unknown, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ events_received: 1, messages: [], fbtrace_id: "x" }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    await sendEvents("123", "token", [SAMPLE_EVENT], {
      fetchImpl: fetchMock,
      testEventCode: "TEST12345",
    });
    assert.equal((capturedBody as { test_event_code?: string }).test_event_code, "TEST12345");
  });

  it("includes partner_agent in payload", async () => {
    let capturedBody: unknown;
    const fetchMock = (async (input: unknown, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ events_received: 1, messages: [], fbtrace_id: "x" }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    await sendEvents("123", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
    assert.equal((capturedBody as { partner_agent?: string }).partner_agent, "wanapush-saas-1.0");
  });
});

describe("sendEvents — error cases", () => {
  it("returns validation error on invalid params (no retry)", async () => {
    const fetchMock = mockFetch([
      {
        status: 400,
        body: { error: { message: "Invalid parameter", code: 100, fbtrace_id: "x" } },
      },
    ]);
    const result = await sendEvents("123", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.category, "validation");
      assert.equal(result.attempts, 1); // pas de retry sur validation
    }
  });

  it("returns auth error on invalid token (no retry)", async () => {
    const fetchMock = mockFetch([
      { status: 400, body: { error: { message: "Invalid token", code: 190, fbtrace_id: "x" } } },
    ]);
    const result = await sendEvents("123", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.category, "auth");
      assert.equal(result.attempts, 1);
    }
  });

  it("returns validation error on empty events array (no fetch)", async () => {
    let fetchCalled = false;
    const fetchMock = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const result = await sendEvents("123", "token", [], { fetchImpl: fetchMock });
    assert.equal(result.ok, false);
    assert.equal(fetchCalled, false);
    if (!result.ok) {
      assert.equal(result.error.category, "validation");
    }
  });
});

describe("sendEvents — retry behavior", () => {
  it("retries on 503 then succeeds", async () => {
    // Patch RETRY pour accélérer le test
    const originalBase = __testing.RETRY.baseDelayMs;
    __testing.RETRY.baseDelayMs = 1; // 1ms au lieu de 1000ms pour test rapide

    try {
      const fetchMock = mockFetch([
        { status: 503, body: { error: { message: "Service unavailable", code: 1 } } },
        { status: 200, body: { events_received: 1, messages: [], fbtrace_id: "ok" } },
      ]);
      const result = await sendEvents("123", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.attempts, 2);
      }
    } finally {
      __testing.RETRY.baseDelayMs = originalBase;
    }
  });

  it("retries on rate limit (code 4) up to maxAttempts", async () => {
    const originalBase = __testing.RETRY.baseDelayMs;
    __testing.RETRY.baseDelayMs = 1;

    try {
      const fetchMock = mockFetch([
        { status: 400, body: { error: { message: "Rate limit", code: 4 } } },
        { status: 400, body: { error: { message: "Rate limit", code: 4 } } },
        { status: 400, body: { error: { message: "Rate limit", code: 4 } } },
      ]);
      const result = await sendEvents("123", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.error.category, "rate_limit");
        assert.equal(result.attempts, 3); // tous les retries épuisés
      }
    } finally {
      __testing.RETRY.baseDelayMs = originalBase;
    }
  });

  it("retries on network error", async () => {
    const originalBase = __testing.RETRY.baseDelayMs;
    __testing.RETRY.baseDelayMs = 1;

    try {
      const fetchMock = mockFetch([
        "network-error",
        { status: 200, body: { events_received: 1, messages: [], fbtrace_id: "ok" } },
      ]);
      const result = await sendEvents("123", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.attempts, 2);
      }
    } finally {
      __testing.RETRY.baseDelayMs = originalBase;
    }
  });

  it("does NOT retry on validation errors (4xx with code 100)", async () => {
    let calls = 0;
    const fetchMock = (async () => {
      calls++;
      return new Response(
        JSON.stringify({ error: { message: "Invalid parameter", code: 100 } }),
        { status: 400 },
      );
    }) as unknown as typeof fetch;
    await sendEvents("123", "token", [SAMPLE_EVENT], { fetchImpl: fetchMock });
    assert.equal(calls, 1, "validation error should not trigger retry");
  });
});
